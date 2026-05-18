package handler

import (
	"github.com/gin-gonic/gin"

	"github.com/jincurry/starbase/internal/api/middleware"
	"github.com/jincurry/starbase/internal/model"
	"github.com/jincurry/starbase/internal/service"
)

type SyncHandler struct {
	sync *service.SyncService
}

func NewSync(s *service.SyncService) *SyncHandler { return &SyncHandler{sync: s} }

func (h *SyncHandler) Initial(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	var body struct {
		InboxCount int `json:"inbox_count"`
	}
	_ = c.ShouldBindJSON(&body)
	if body.InboxCount == 0 {
		body.InboxCount = 30
	}
	id, err := h.sync.Enqueue(c.Request.Context(), u.ID, service.JobInitial, service.InitialPayload{InboxCount: body.InboxCount})
	if err != nil {
		respond(c, err)
		return
	}
	c.JSON(202, gin.H{"job_id": id})
}

func (h *SyncHandler) Incremental(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	id, err := h.sync.Enqueue(c.Request.Context(), u.ID, service.JobIncremental, nil)
	if err != nil {
		respond(c, err)
		return
	}
	c.JSON(202, gin.H{"job_id": id})
}

func (h *SyncHandler) Reconcile(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	id, err := h.sync.Enqueue(c.Request.Context(), u.ID, service.JobReconcile, nil)
	if err != nil {
		respond(c, err)
		return
	}
	c.JSON(202, gin.H{"job_id": id})
}

func (h *SyncHandler) Status(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	state, err := h.sync.State(c.Request.Context(), u.ID)
	if err != nil {
		respond(c, err)
		return
	}
	job, _ := h.sync.CurrentJob(c.Request.Context(), u.ID)
	c.JSON(200, gin.H{"state": state, "job": job})
}
