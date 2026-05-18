package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/jincurry/starbase/internal/api/middleware"
	"github.com/jincurry/starbase/internal/model"
	"github.com/jincurry/starbase/internal/service"
)

type NotificationsHandler struct {
	notif *service.NotificationService
}

func NewNotifications(n *service.NotificationService) *NotificationsHandler {
	return &NotificationsHandler{notif: n}
}

func (h *NotificationsHandler) List(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	out, err := h.notif.List(c.Request.Context(), u.ID)
	if err != nil {
		respond(c, err)
		return
	}
	c.JSON(200, gin.H{"items": out})
}

func (h *NotificationsHandler) MarkRead(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := h.notif.MarkRead(c.Request.Context(), u.ID, id); err != nil {
		respond(c, err)
		return
	}
	c.Status(204)
}

func (h *NotificationsHandler) MarkAllRead(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	if err := h.notif.MarkAllRead(c.Request.Context(), u.ID); err != nil {
		respond(c, err)
		return
	}
	c.Status(204)
}
