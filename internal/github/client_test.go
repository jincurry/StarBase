package github

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// newTestClient returns a Client whose base URL points at the test server.
// Rate limit set high so tests don't sleep.
func newTestClient(srv *httptest.Server) *Client {
	c := New(100) // 100 req/s for tests
	c.base = srv.URL
	return c
}

func TestIterStarredPagination(t *testing.T) {
	calls := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/user/starred" {
			http.NotFound(w, r)
			return
		}
		calls++
		page := r.URL.Query().Get("page")
		w.Header().Set("Content-Type", "application/json")
		switch page {
		case "1":
			// 100 entries on page 1 — client must request page 2.
			var sb strings.Builder
			sb.WriteString("[")
			for i := 0; i < 100; i++ {
				if i > 0 {
					sb.WriteString(",")
				}
				fmt.Fprintf(&sb, `{"starred_at":"2024-01-%02dT00:00:00Z","repo":{"id":%d,"name":"r%d","full_name":"o/r%d","owner":{"login":"o"}}}`, (i%27)+1, i, i, i)
			}
			sb.WriteString("]")
			w.Write([]byte(sb.String()))
		case "2":
			w.Write([]byte(`[{"starred_at":"2023-12-31T00:00:00Z","repo":{"id":999,"name":"last","full_name":"o/last","owner":{"login":"o"}}}]`))
		default:
			t.Fatalf("unexpected page %q", page)
		}
	}))
	defer srv.Close()

	c := newTestClient(srv)
	got := 0
	err := c.IterStarred(context.Background(), "tok", func(e StarredEntry) error {
		got++
		return nil
	})
	if err != nil {
		t.Fatalf("IterStarred: %v", err)
	}
	if got != 101 {
		t.Fatalf("entries=%d want 101", got)
	}
	if calls != 2 {
		t.Fatalf("calls=%d want 2", calls)
	}
}

func TestUnauthorizedMapping(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer srv.Close()

	c := newTestClient(srv)
	_, _, _, err := c.GetMe(context.Background(), "bad")
	if !errors.Is(err, ErrUnauthorized) {
		t.Fatalf("err=%v want ErrUnauthorized", err)
	}
}

func TestRateLimitMapping(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("X-RateLimit-Remaining", "0")
		w.WriteHeader(http.StatusForbidden)
	}))
	defer srv.Close()

	c := newTestClient(srv)
	_, _, _, err := c.GetMe(context.Background(), "tok")
	if !errors.Is(err, ErrRateLimited) {
		t.Fatalf("err=%v want ErrRateLimited", err)
	}
}

func TestNotFoundMapping(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()
	c := newTestClient(srv)
	_, err := c.GetRepo(context.Background(), "tok", "o/r")
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("err=%v want ErrNotFound", err)
	}
}

func TestGetMeDecodesUser(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"id":42,"login":"alex","avatar_url":"https://example/a.png"}`))
	}))
	defer srv.Close()
	c := newTestClient(srv)
	id, login, avatar, err := c.GetMe(context.Background(), "tok")
	if err != nil {
		t.Fatal(err)
	}
	if id != 42 || login != "alex" || avatar == "" {
		t.Fatalf("got %d %q %q", id, login, avatar)
	}
}

func TestGetLatestReleaseDecodes(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/releases/latest") {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"tag_name":"v1.2.3","name":"Big fixes","published_at":"2026-01-15T10:00:00Z"}`))
	}))
	defer srv.Close()
	c := newTestClient(srv)
	rel, err := c.GetLatestRelease(context.Background(), "tok", "o/r")
	if err != nil {
		t.Fatal(err)
	}
	if rel.TagName != "v1.2.3" || rel.Name != "Big fixes" {
		t.Fatalf("decoded %+v", rel)
	}
}

func TestGetLatestReleaseNoReleases(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()
	c := newTestClient(srv)
	_, err := c.GetLatestRelease(context.Background(), "tok", "o/r")
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("err=%v want ErrNotFound", err)
	}
}

func TestGetReadmeDecodesBase64(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/readme") {
			http.NotFound(w, r)
			return
		}
		// GitHub returns base64 with line wrapping.
		raw := "# Hello\n\nThis is the README."
		enc := base64.StdEncoding.EncodeToString([]byte(raw))
		// Inject a newline to mimic GitHub's wrapping.
		mid := len(enc) / 2
		enc = enc[:mid] + "\n" + enc[mid:]
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"content":%q,"encoding":"base64"}`, enc)
	}))
	defer srv.Close()
	c := newTestClient(srv)
	md, err := c.GetReadme(context.Background(), "tok", "o/r")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(md, "# Hello") {
		t.Fatalf("decoded=%q", md)
	}
}

func TestAuthorizationHeaderSent(t *testing.T) {
	gotAuth := ""
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		w.Write([]byte(`{}`))
	}))
	defer srv.Close()
	c := newTestClient(srv)
	_, _, _, _ = c.GetMe(context.Background(), "tok-xyz")
	if gotAuth != "Bearer tok-xyz" {
		t.Fatalf("Authorization=%q", gotAuth)
	}
}
