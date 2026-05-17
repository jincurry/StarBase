package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/jincurry/starbase/internal/api/middleware"
	"github.com/jincurry/starbase/internal/model"
	"github.com/jincurry/starbase/internal/service"
)

type AIHandler struct {
	ai *service.AIService
}

func NewAI(a *service.AIService) *AIHandler { return &AIHandler{ai: a} }

func (h *AIHandler) Status(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"enabled": h.ai.Enabled()})
}

func (h *AIHandler) SuggestTags(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "bad_request", "message": "bad id"})
		return
	}
	if !h.ai.Enabled() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"code": "ai_disabled", "message": "AI features not configured"})
		return
	}
	out, err := h.ai.SuggestTags(c.Request.Context(), u.ID, id)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"code": "ai_failed", "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *AIHandler) Summarize(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "bad_request", "message": "bad id"})
		return
	}
	if !h.ai.Enabled() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"code": "ai_disabled", "message": "AI features not configured"})
		return
	}
	out, err := h.ai.Summarize(c.Request.Context(), u.ID, id)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"code": "ai_failed", "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}
