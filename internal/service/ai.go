package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jincurry/starbase/internal/github"
	"github.com/jincurry/starbase/internal/model"
)

// AIService talks to the Claude (Anthropic) API to provide suggest-tags
// and summarize-readme features. Outputs are cached in ai_outputs so a
// detail-panel revisit doesn't burn tokens.
//
// The service no-ops gracefully when ANTHROPIC_API_KEY is missing —
// /api/stars/:id/ai/* returns 503 "AI features not configured", and the
// frontend hides the buttons accordingly.
type AIService struct {
	db     *pgxpool.Pool
	gh     *github.Client
	auth   *AuthService
	apiKey string
	model  string
	http   *http.Client
}

func NewAI(db *pgxpool.Pool, gh *github.Client, auth *AuthService, apiKey, modelID string) *AIService {
	if modelID == "" {
		modelID = "claude-haiku-4-5-20251001"
	}
	return &AIService{
		db:     db,
		gh:     gh,
		auth:   auth,
		apiKey: apiKey,
		model:  modelID,
		http:   &http.Client{Timeout: 60 * time.Second},
	}
}

func (a *AIService) Enabled() bool {
	return a.apiKey != ""
}

// --- public surface ----------------------------------------------------------

type TagSuggestion struct {
	Suggestions []SuggestedTag `json:"suggestions"`
	Model       string         `json:"model"`
	CachedAt    time.Time      `json:"cached_at"`
}

type SuggestedTag struct {
	Name   string `json:"name"`
	Reason string `json:"reason"`
}

type Summary struct {
	Text     string    `json:"text"`
	Model    string    `json:"model"`
	CachedAt time.Time `json:"cached_at"`
}

// SuggestTags returns up to 5 tag suggestions for the given star, biased
// toward the user's existing tag vocabulary.
func (a *AIService) SuggestTags(ctx context.Context, userID, starID int64) (*TagSuggestion, error) {
	if !a.Enabled() {
		return nil, ErrAIDisabled
	}
	repoID, repoFullName, desc, topics, err := a.repoInfo(ctx, userID, starID)
	if err != nil {
		return nil, err
	}
	// Cache check.
	if hit, err := a.readCache(ctx, repoID, "tag_suggestions"); err == nil && hit != nil {
		var t TagSuggestion
		if err := json.Unmarshal(hit.content, &t); err == nil {
			t.CachedAt = hit.created
			t.Model = hit.model
			return &t, nil
		}
	}

	existing, err := a.userTagNames(ctx, userID)
	if err != nil {
		return nil, err
	}
	readme := a.fetchReadme(ctx, userID, repoFullName)

	prompt := buildTagPrompt(repoFullName, desc, topics, readme, existing)
	out, err := a.callClaude(ctx, prompt, 600)
	if err != nil {
		return nil, err
	}
	suggestions := parseTagSuggestions(out)
	t := TagSuggestion{Suggestions: suggestions, Model: a.model, CachedAt: time.Now()}
	a.writeCache(ctx, repoID, "tag_suggestions", t)
	return &t, nil
}

// Summarize returns a 2-3 sentence summary of the repo's README.
func (a *AIService) Summarize(ctx context.Context, userID, starID int64) (*Summary, error) {
	if !a.Enabled() {
		return nil, ErrAIDisabled
	}
	repoID, repoFullName, desc, _, err := a.repoInfo(ctx, userID, starID)
	if err != nil {
		return nil, err
	}
	if hit, err := a.readCache(ctx, repoID, "summary"); err == nil && hit != nil {
		var s Summary
		if err := json.Unmarshal(hit.content, &s); err == nil {
			s.CachedAt = hit.created
			s.Model = hit.model
			return &s, nil
		}
	}
	readme := a.fetchReadme(ctx, userID, repoFullName)
	prompt := buildSummaryPrompt(repoFullName, desc, readme)
	out, err := a.callClaude(ctx, prompt, 350)
	if err != nil {
		return nil, err
	}
	s := Summary{Text: strings.TrimSpace(out), Model: a.model, CachedAt: time.Now()}
	a.writeCache(ctx, repoID, "summary", s)
	return &s, nil
}

// --- helpers -----------------------------------------------------------------

func (a *AIService) repoInfo(ctx context.Context, userID, starID int64) (int64, string, string, []string, error) {
	var repoID int64
	var fullName, desc string
	var topics []string
	err := a.db.QueryRow(ctx, `
		SELECT r.id, r.full_name, COALESCE(r.description,''), COALESCE(r.topics, '{}'::text[])
		FROM user_starred_repos usr JOIN repos r ON r.id = usr.repo_id
		WHERE usr.id=$1 AND usr.user_id=$2
	`, starID, userID).Scan(&repoID, &fullName, &desc, &topics)
	if err != nil {
		return 0, "", "", nil, err
	}
	return repoID, fullName, desc, topics, nil
}

func (a *AIService) userTagNames(ctx context.Context, userID int64) ([]string, error) {
	rows, err := a.db.Query(ctx, `SELECT name FROM tags WHERE user_id=$1 ORDER BY name`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []string{}
	for rows.Next() {
		var n string
		if err := rows.Scan(&n); err != nil {
			return nil, err
		}
		out = append(out, n)
	}
	return out, nil
}

// fetchReadme is best-effort; AI features still work without one.
func (a *AIService) fetchReadme(ctx context.Context, userID int64, fullName string) string {
	tok, err := a.auth.AccessTokenFor(ctx, userID)
	if err != nil {
		return ""
	}
	md, err := a.gh.GetReadme(ctx, tok, fullName)
	if err != nil {
		return ""
	}
	// Truncate aggressively; Claude doesn't need a 100KB README to summarize.
	if len(md) > 8000 {
		md = md[:8000] + "\n\n…[truncated]"
	}
	return md
}

type cachedRow struct {
	content []byte
	model   string
	created time.Time
}

func (a *AIService) readCache(ctx context.Context, repoID int64, kind string) (*cachedRow, error) {
	var c cachedRow
	err := a.db.QueryRow(ctx, `
		SELECT content::text, COALESCE(model,''), created_at
		FROM ai_outputs WHERE repo_id=$1 AND kind=$2
	`, repoID, kind).Scan(&c.content, &c.model, &c.created)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}

func (a *AIService) writeCache(ctx context.Context, repoID int64, kind string, v any) {
	raw, err := json.Marshal(v)
	if err != nil {
		return
	}
	_, _ = a.db.Exec(ctx, `
		INSERT INTO ai_outputs (repo_id, kind, content, model)
		VALUES ($1, $2, $3::jsonb, $4)
		ON CONFLICT (repo_id, kind) DO UPDATE
		   SET content=EXCLUDED.content, model=EXCLUDED.model, created_at=now()
	`, repoID, kind, string(raw), a.model)
}

// callClaude sends a single user-message request to the Anthropic Messages API
// and returns the text from the first content block. We deliberately use
// raw HTTP (no SDK dep) — the call shape is small and stable.
func (a *AIService) callClaude(ctx context.Context, prompt string, maxTokens int) (string, error) {
	body := map[string]any{
		"model":      a.model,
		"max_tokens": maxTokens,
		"messages": []map[string]any{
			{"role": "user", "content": prompt},
		},
	}
	raw, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.anthropic.com/v1/messages", bytes.NewReader(raw))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", a.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	res, err := a.http.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	if res.StatusCode >= 400 {
		b, _ := io.ReadAll(res.Body)
		return "", fmt.Errorf("anthropic: %d %s", res.StatusCode, strings.TrimSpace(string(b)))
	}
	var parsed struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
	}
	if err := json.NewDecoder(res.Body).Decode(&parsed); err != nil {
		return "", err
	}
	var sb strings.Builder
	for _, c := range parsed.Content {
		if c.Type == "text" {
			sb.WriteString(c.Text)
		}
	}
	return sb.String(), nil
}

// Suppress unused warning when sync builds without ai usage.
var _ = model.StatusInbox

func buildTagPrompt(fullName, desc string, topics []string, readme string, existing []string) string {
	existingHint := "(none yet)"
	if len(existing) > 0 {
		existingHint = strings.Join(existing, ", ")
	}
	topicHint := "(none)"
	if len(topics) > 0 {
		topicHint = strings.Join(topics, ", ")
	}
	rd := readme
	if len(rd) > 4000 {
		rd = rd[:4000] + "\n…[truncated]"
	}
	return fmt.Sprintf(`You are helping someone organize their GitHub starred repos with tags.

Repo: %s
Description: %s
GitHub topics: %s

User's existing tag vocabulary (prefer reusing these when they fit):
%s

README excerpt:
%s

Suggest 3–5 short, lowercase, kebab-case tags that would help this user find this repo later. Strongly prefer reusing an existing tag if it fits. Each suggestion should be 1–3 words.

Return ONLY a JSON array, no commentary. Schema:
[{"name": "string", "reason": "one sentence"}]`,
		fullName, fallback(desc, "(no description)"), topicHint, existingHint, fallback(rd, "(no readme)"))
}

func buildSummaryPrompt(fullName, desc, readme string) string {
	rd := readme
	if rd == "" {
		rd = "(no readme available — summarise from the description alone)"
	}
	return fmt.Sprintf(`Summarize what this GitHub repo is and who would use it, in 2–3 sentences.
Write for a developer skimming their inbox — no marketing fluff, no "this is a tool that…" opener.

Repo: %s
Description: %s

README:
%s`,
		fullName, fallback(desc, "(none)"), rd)
}

func fallback(s, d string) string {
	if strings.TrimSpace(s) == "" {
		return d
	}
	return s
}

// parseTagSuggestions extracts a JSON array of {name, reason} from Claude's
// reply, tolerating ```json fences and stray prose.
func parseTagSuggestions(reply string) []SuggestedTag {
	s := strings.TrimSpace(reply)
	if i := strings.Index(s, "["); i >= 0 {
		if j := strings.LastIndex(s, "]"); j > i {
			s = s[i : j+1]
		}
	}
	var out []SuggestedTag
	if err := json.Unmarshal([]byte(s), &out); err != nil {
		return nil
	}
	// Defensive: lowercase, kebab-case, dedupe, cap at 5.
	seen := map[string]bool{}
	result := make([]SuggestedTag, 0, len(out))
	for _, t := range out {
		name := normalizeTag(t.Name)
		if name == "" || seen[name] {
			continue
		}
		seen[name] = true
		result = append(result, SuggestedTag{Name: name, Reason: strings.TrimSpace(t.Reason)})
		if len(result) >= 5 {
			break
		}
	}
	return result
}

func normalizeTag(s string) string {
	s = strings.TrimSpace(strings.ToLower(s))
	s = strings.ReplaceAll(s, "_", "-")
	s = strings.ReplaceAll(s, " ", "-")
	var b strings.Builder
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			b.WriteRune(r)
		}
	}
	out := b.String()
	if len(out) > 32 {
		out = out[:32]
	}
	return out
}
