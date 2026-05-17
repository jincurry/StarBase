package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/jincurry/starbase/internal/github"
)

type RateLimitHandler struct {
	gh *github.Client
}

func NewRateLimit(gh *github.Client) *RateLimitHandler { return &RateLimitHandler{gh: gh} }

// Get returns the most recently observed GitHub rate-limit state.
// All zeros means we haven't made any GitHub calls yet on this process.
func (h *RateLimitHandler) Get(c *gin.Context) {
	lim, rem, reset := h.gh.RateLimit()
	c.JSON(http.StatusOK, gin.H{
		"limit":     lim,
		"remaining": rem,
		"reset_at":  reset,
	})
}

// Update tag rename endpoint signature in handler/tags.go too.
