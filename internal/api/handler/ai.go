package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/jincurry/starbase/internal/api/middleware"
	"github.com/jincurry/starbase/internal/model"
	"github.com/jincurry/starbase/internal/pkg/apperror"
	"github.com/jincurry/starbase/internal/service"
)

type AIHandler struct {
	ai *service.AIService
}

func NewAI(a *service.AIService) *AIHandler { return &AIHandler{ai: a} }

func (h *AIHandler) Status(c *gin.Context) {
	c.JSON(200, gin.H{"enabled": h.ai.Enabled()})
}

func (h *AIHandler) SuggestTags(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		respond(c, apperror.BadRequest("Invalid star id"))
		return
	}
	if !h.ai.Enabled() {
		respond(c, apperror.New(503, "ai_disabled", "AI features not configured", ""))
		return
	}
	out, err := h.ai.SuggestTags(c.Request.Context(), u.ID, id)
	if err != nil {
		respond(c, apperror.New(502, "ai_failed", "Couldn't reach the AI provider", err.Error()))
		return
	}
	c.JSON(200, out)
}

func (h *AIHandler) Summarize(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		respond(c, apperror.BadRequest("Invalid star id"))
		return
	}
	if !h.ai.Enabled() {
		respond(c, apperror.New(503, "ai_disabled", "AI features not configured", ""))
		return
	}
	out, err := h.ai.Summarize(c.Request.Context(), u.ID, id)
	if err != nil {
		respond(c, apperror.New(502, "ai_failed", "Couldn't reach the AI provider", err.Error()))
		return
	}
	c.JSON(200, out)
}
