package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/jincurry/starbase/internal/api/middleware"
	"github.com/jincurry/starbase/internal/config"
	"github.com/jincurry/starbase/internal/model"
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
		c.JSON(http.StatusBadRequest, gin.H{"code": "bad_request", "message": "bad id"})
		return
	}
	tok, err := h.star.CreateShareToken(c.Request.Context(), u.ID, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": "internal", "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"token": tok,
		"url":   h.cfg.WebURL + "/share/" + tok,
	})
}

func (h *ShareHandler) Revoke(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := h.star.RevokeShareToken(c.Request.Context(), u.ID, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": "internal", "message": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// Public is unauthenticated — returns the read-only view of a shared star.
func (h *ShareHandler) Public(c *gin.Context) {
	tok := c.Param("token")
	p, err := h.star.PublicByToken(c.Request.Context(), tok)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": "not_found", "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, p)
}
