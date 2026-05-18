package handler

import (
	"encoding/xml"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/jincurry/starbase/internal/api/middleware"
	"github.com/jincurry/starbase/internal/config"
	"github.com/jincurry/starbase/internal/model"
	"github.com/jincurry/starbase/internal/service"
)

// RSSHandler serves a per-user Atom feed of recent stars. The endpoint
// itself is session-authed (cookie), so for now this is a personal feed
// users can drop into Reeder / NetNewsWire / Feedly. A token-based public
// feed could come later under V1.3 share extensions.
type RSSHandler struct {
	cfg  *config.Config
	star *service.StarService
}

func NewRSS(cfg *config.Config, s *service.StarService) *RSSHandler {
	return &RSSHandler{cfg: cfg, star: s}
}

type atomFeed struct {
	XMLName xml.Name    `xml:"feed"`
	XMLNS   string      `xml:"xmlns,attr"`
	Title   string      `xml:"title"`
	Link    atomLink    `xml:"link"`
	Updated string      `xml:"updated"`
	ID      string      `xml:"id"`
	Author  atomAuthor  `xml:"author"`
	Entries []atomEntry `xml:"entry"`
}

type atomLink struct {
	Href string `xml:"href,attr"`
	Rel  string `xml:"rel,attr,omitempty"`
}

type atomAuthor struct {
	Name string `xml:"name"`
}

type atomEntry struct {
	Title   string   `xml:"title"`
	Link    atomLink `xml:"link"`
	ID      string   `xml:"id"`
	Updated string   `xml:"updated"`
	Summary string   `xml:"summary"`
}

func (h *RSSHandler) Stars(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	stars, _, err := h.star.List(c.Request.Context(), u.ID, service.StarFilter{
		Status:   "all",
		Sort:     "starred-desc",
		PageSize: 50,
	})
	if err != nil {
		respond(c, err)
		return
	}

	now := time.Now().UTC().Format(time.RFC3339)
	feedURL := h.cfg.PublicURL + "/api/feed/stars.atom"
	feed := atomFeed{
		XMLNS:   "http://www.w3.org/2005/Atom",
		Title:   "Your StarBase — recent stars",
		Link:    atomLink{Href: feedURL, Rel: "self"},
		Updated: now,
		ID:      feedURL,
		Author:  atomAuthor{Name: u.Username},
	}
	for _, s := range stars {
		repoURL := s.Repo.HTMLURL
		if repoURL == "" {
			repoURL = "https://github.com/" + s.Repo.FullName
		}
		feed.Entries = append(feed.Entries, atomEntry{
			Title:   s.Repo.FullName,
			Link:    atomLink{Href: repoURL},
			ID:      fmt.Sprintf("urn:starbase:repo:%d", s.Repo.GitHubRepoID),
			Updated: s.StarredAt.UTC().Format(time.RFC3339),
			Summary: s.Repo.Description,
		})
	}

	out, err := xml.MarshalIndent(feed, "", "  ")
	if err != nil {
		respond(c, err)
		return
	}
	c.Header("Content-Type", "application/atom+xml; charset=utf-8")
	c.String(http.StatusOK, xml.Header+string(out))
}
