package github

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

var (
	ErrUnauthorized = errors.New("github: unauthorized")
	ErrForbidden    = errors.New("github: forbidden")
	ErrNotFound     = errors.New("github: not found")
	ErrRateLimited  = errors.New("github: rate limited")
)

// Repo as returned by the GitHub starred endpoint.
type Repo struct {
	ID              int64    `json:"id"`
	Owner           Owner    `json:"owner"`
	Name            string   `json:"name"`
	FullName        string   `json:"full_name"`
	Description     string   `json:"description"`
	HTMLURL         string   `json:"html_url"`
	Homepage        string   `json:"homepage"`
	Language        string   `json:"language"`
	Topics          []string `json:"topics"`
	StargazersCount int      `json:"stargazers_count"`
	ForksCount      int      `json:"forks_count"`
	OpenIssuesCount int      `json:"open_issues_count"`
	License         *License `json:"license"`
	Archived        bool     `json:"archived"`
	UpdatedAt       time.Time `json:"updated_at"`
	PushedAt        time.Time `json:"pushed_at"`
}

type Owner struct {
	Login string `json:"login"`
}

type License struct {
	SPDXID string `json:"spdx_id"`
	Key    string `json:"key"`
}

// StarredEntry pairs a repo with the time the user starred it.
type StarredEntry struct {
	StarredAt time.Time `json:"starred_at"`
	Repo      Repo      `json:"repo"`
}

type Client struct {
	http  *http.Client
	rl    *limiter
	base  string
	agent string
}

type limiter struct {
	mu       sync.Mutex
	interval time.Duration
	next     time.Time
}

func (l *limiter) wait(ctx context.Context) error {
	l.mu.Lock()
	wait := time.Until(l.next)
	if wait < 0 {
		wait = 0
	}
	l.next = time.Now().Add(wait + l.interval)
	l.mu.Unlock()
	if wait <= 0 {
		return nil
	}
	t := time.NewTimer(wait)
	defer t.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-t.C:
		return nil
	}
}

func New(ratePerSec float64) *Client {
	if ratePerSec <= 0 {
		ratePerSec = 1
	}
	return &Client{
		http:  &http.Client{Timeout: 30 * time.Second},
		rl:    &limiter{interval: time.Duration(float64(time.Second) / ratePerSec)},
		base:  "https://api.github.com",
		agent: "starbase/0.1 (+https://github.com/jincurry/starbase)",
	}
}

func (c *Client) do(ctx context.Context, token, method, path string, params url.Values) (*http.Response, error) {
	if err := c.rl.wait(ctx); err != nil {
		return nil, err
	}
	u := c.base + path
	if params != nil {
		u += "?" + params.Encode()
	}
	req, err := http.NewRequestWithContext(ctx, method, u, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/vnd.github.star+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	req.Header.Set("User-Agent", c.agent)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	res, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	switch res.StatusCode {
	case http.StatusUnauthorized:
		res.Body.Close()
		return nil, ErrUnauthorized
	case http.StatusForbidden:
		// Could be rate limit
		if res.Header.Get("X-RateLimit-Remaining") == "0" {
			res.Body.Close()
			return nil, ErrRateLimited
		}
		res.Body.Close()
		return nil, ErrForbidden
	case http.StatusNotFound:
		res.Body.Close()
		return nil, ErrNotFound
	case http.StatusTooManyRequests:
		res.Body.Close()
		return nil, ErrRateLimited
	}
	if res.StatusCode >= 500 {
		res.Body.Close()
		return nil, fmt.Errorf("github: server error %d", res.StatusCode)
	}
	if res.StatusCode >= 400 {
		b, _ := io.ReadAll(res.Body)
		res.Body.Close()
		return nil, fmt.Errorf("github: %d %s", res.StatusCode, strings.TrimSpace(string(b)))
	}
	return res, nil
}

// GetMe returns the authenticated user.
func (c *Client) GetMe(ctx context.Context, token string) (id int64, username, avatar string, err error) {
	res, err := c.do(ctx, token, http.MethodGet, "/user", nil)
	if err != nil {
		return 0, "", "", err
	}
	defer res.Body.Close()
	var u struct {
		ID        int64  `json:"id"`
		Login     string `json:"login"`
		AvatarURL string `json:"avatar_url"`
	}
	if err := json.NewDecoder(res.Body).Decode(&u); err != nil {
		return 0, "", "", err
	}
	return u.ID, u.Login, u.AvatarURL, nil
}

// IterStarred iterates the authenticated user's starred repos, calling fn for each.
// The handler receives entries newest-first (GitHub's default).
func (c *Client) IterStarred(ctx context.Context, token string, fn func(StarredEntry) error) error {
	page := 1
	for {
		params := url.Values{}
		params.Set("per_page", "100")
		params.Set("page", strconv.Itoa(page))
		res, err := c.do(ctx, token, http.MethodGet, "/user/starred", params)
		if err != nil {
			return err
		}
		var entries []StarredEntry
		if err := json.NewDecoder(res.Body).Decode(&entries); err != nil {
			res.Body.Close()
			return err
		}
		res.Body.Close()
		if len(entries) == 0 {
			return nil
		}
		for _, e := range entries {
			if err := fn(e); err != nil {
				return err
			}
		}
		if len(entries) < 100 {
			return nil
		}
		page++
	}
}

// GetRepo fetches a single repo's public metadata.
func (c *Client) GetRepo(ctx context.Context, token, fullName string) (*Repo, error) {
	res, err := c.do(ctx, token, http.MethodGet, "/repos/"+fullName, nil)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	var r Repo
	if err := json.NewDecoder(res.Body).Decode(&r); err != nil {
		return nil, err
	}
	return &r, nil
}
