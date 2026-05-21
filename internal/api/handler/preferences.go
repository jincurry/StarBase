package handler

import (
	"github.com/gin-gonic/gin"

	"github.com/jincurry/starbase/internal/api/middleware"
	"github.com/jincurry/starbase/internal/model"
	"github.com/jincurry/starbase/internal/pkg/apperror"
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
		respond(c, err)
		return
	}
	c.JSON(200, p)
}

func (h *PreferencesHandler) Update(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	var body struct {
		StaleInboxDays      *int    `json:"stale_inbox_days"`
		AutoArchiveOnUnstar *bool   `json:"auto_archive_on_unstar"`
		Locale              *string `json:"locale"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		respond(c, apperror.BadRequest("Invalid request body"))
		return
	}
	p, err := h.prefs.Update(c.Request.Context(), u.ID, body.StaleInboxDays, body.AutoArchiveOnUnstar, body.Locale)
	if err != nil {
		respond(c, apperror.BadRequest(err.Error()))
		return
	}
	c.JSON(200, p)
}
