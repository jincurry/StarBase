package handler

import (
	"github.com/gin-gonic/gin"

	"github.com/jincurry/starbase/internal/api/middleware"
	"github.com/jincurry/starbase/internal/model"
	"github.com/jincurry/starbase/internal/pkg/apperror"
	"github.com/jincurry/starbase/internal/service"
)

type EventsHandler struct {
	ev *service.EventService
}

func NewEvents(e *service.EventService) *EventsHandler { return &EventsHandler{ev: e} }

func (h *EventsHandler) Record(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	var body struct {
		Event      string         `json:"event"`
		Properties map[string]any `json:"properties"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Event == "" {
		respond(c, apperror.BadRequest("event name required"))
		return
	}
	if err := h.ev.Record(c.Request.Context(), u.ID, body.Event, body.Properties); err != nil {
		respond(c, err)
		return
	}
	c.Status(204)
}
