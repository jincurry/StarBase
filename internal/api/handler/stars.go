package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/jincurry/starbase/internal/api/middleware"
	"github.com/jincurry/starbase/internal/model"
	"github.com/jincurry/starbase/internal/pkg/apperror"
	"github.com/jincurry/starbase/internal/service"
)

type StarsHandler struct {
	star *service.StarService
}

func NewStars(s *service.StarService) *StarsHandler { return &StarsHandler{star: s} }

func (h *StarsHandler) List(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	f := service.StarFilter{
		Status:   c.Query("status"),
		Language: c.Query("language"),
		Query:    c.Query("q"),
		Sort:     c.DefaultQuery("sort", "starred-desc"),
	}
	if t := c.Query("tag"); t != "" && t != "all" {
		id, _ := strconv.ParseInt(t, 10, 64)
		f.TagID = id
	}
	if c.Query("has_note") == "true" {
		f.HasNote = true
	}
	if v := c.Query("is_starred"); v != "" {
		b := v == "true"
		f.IsStarred = &b
	}
	if p, err := strconv.Atoi(c.DefaultQuery("page", "1")); err == nil {
		f.Page = p
	}
	if p, err := strconv.Atoi(c.DefaultQuery("page_size", "50")); err == nil {
		f.PageSize = p
	}
	stars, total, err := h.star.List(c.Request.Context(), u.ID, f)
	if err != nil {
		respond(c, apperror.BadRequest(err.Error()))
		return
	}
	c.JSON(200, gin.H{"items": stars, "total": total, "page": f.Page, "page_size": f.PageSize})
}

func (h *StarsHandler) Inbox(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	f := service.StarFilter{
		Status:   string(model.StatusInbox),
		PageSize: 200,
	}
	stars, total, err := h.star.List(c.Request.Context(), u.ID, f)
	if err != nil {
		respond(c, err)
		return
	}
	c.JSON(200, gin.H{"items": stars, "total": total})
}

func (h *StarsHandler) Get(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		respond(c, apperror.BadRequest("Invalid star id"))
		return
	}
	star, err := h.star.Get(c.Request.Context(), u.ID, id)
	if err != nil {
		respond(c, err)
		return
	}
	c.JSON(200, star)
}

func (h *StarsHandler) Patch(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		respond(c, apperror.BadRequest("Invalid star id"))
		return
	}
	var body struct {
		Status   *string `json:"status"`
		Note     *string `json:"note"`
		Watching *bool   `json:"watching"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		respond(c, apperror.BadRequest("Invalid request body"))
		return
	}
	star, err := h.star.Patch(c.Request.Context(), u.ID, id, service.Patch{
		Status: body.Status, Note: body.Note, Watching: body.Watching,
	})
	if err != nil {
		respond(c, err)
		return
	}
	c.JSON(200, star)
}

func (h *StarsHandler) View(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := h.star.MarkViewed(c.Request.Context(), u.ID, id); err != nil {
		respond(c, err)
		return
	}
	c.Status(204)
}

func (h *StarsHandler) Readme(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		respond(c, apperror.BadRequest("Invalid star id"))
		return
	}
	md, err := h.star.Readme(c.Request.Context(), u.ID, id)
	if err != nil {
		respond(c, apperror.New(502, "upstream_failed", "Couldn't fetch README from GitHub", ""))
		return
	}
	c.JSON(200, gin.H{"content": md})
}

func (h *StarsHandler) Activity(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		respond(c, apperror.BadRequest("Invalid star id"))
		return
	}
	act, err := h.star.Activity(c.Request.Context(), u.ID, id)
	if err != nil {
		respond(c, apperror.New(502, "upstream_failed", "Couldn't fetch activity from GitHub", ""))
		return
	}
	c.JSON(200, act)
}

func (h *StarsHandler) Stats(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	stats, err := h.star.Stats(c.Request.Context(), u.ID)
	if err != nil {
		respond(c, err)
		return
	}
	c.JSON(200, stats)
}
