package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/jincurry/starbase/internal/api/middleware"
	"github.com/jincurry/starbase/internal/config"
	"github.com/jincurry/starbase/internal/model"
	"github.com/jincurry/starbase/internal/pkg/apperror"
	"github.com/jincurry/starbase/internal/service"
)

type ShareHandler struct {
	cfg  *config.Config
	star *service.StarService
}

func NewShare(cfg *config.Config, s *service.StarService) *ShareHandler {
	return &ShareHandler{cfg: cfg, star: s}
}

func (h *ShareHandler) Create(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		respond(c, apperror.BadRequest("Invalid star id"))
		return
	}
	tok, err := h.star.CreateShareToken(c.Request.Context(), u.ID, id)
	if err != nil {
		respond(c, err)
		return
	}
	c.JSON(200, gin.H{
		"token": tok,
		"url":   h.cfg.WebURL + "/share/" + tok,
	})
}

func (h *ShareHandler) Revoke(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := h.star.RevokeShareToken(c.Request.Context(), u.ID, id); err != nil {
		respond(c, err)
		return
	}
	c.Status(204)
}

func (h *ShareHandler) Public(c *gin.Context) {
	tok := c.Param("token")
	p, err := h.star.PublicByToken(c.Request.Context(), tok)
	if err != nil {
		respond(c, apperror.NotFound("Share link not found"))
		return
	}
	c.JSON(200, p)
}
