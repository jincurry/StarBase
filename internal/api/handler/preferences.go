package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/jincurry/starbase/internal/api/middleware"
	"github.com/jincurry/starbase/internal/model"
	"github.com/jincurry/starbase/internal/service"
)

type PreferencesHandler struct {
	prefs *service.PreferencesService
}

func NewPreferences(p *service.PreferencesService) *PreferencesHandler {
	return &PreferencesHandler{prefs: p}
}

func (h *PreferencesHandler) Get(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	p, err := h.prefs.Get(c.Request.Context(), u.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": "internal", "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, p)
}

func (h *PreferencesHandler) Update(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	var body struct {
		StaleInboxDays      *int  `json:"stale_inbox_days"`
		AutoArchiveOnUnstar *bool `json:"auto_archive_on_unstar"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "bad_request", "message": err.Error()})
		return
	}
	p, err := h.prefs.Update(c.Request.Context(), u.ID, body.StaleInboxDays, body.AutoArchiveOnUnstar)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "bad_request", "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, p)
}
