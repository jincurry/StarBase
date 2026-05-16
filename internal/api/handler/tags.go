package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/jincurry/starbase/internal/api/middleware"
	"github.com/jincurry/starbase/internal/model"
	"github.com/jincurry/starbase/internal/service"
)

type TagsHandler struct {
	tag *service.TagService
}

func NewTags(t *service.TagService) *TagsHandler { return &TagsHandler{tag: t} }

func (h *TagsHandler) List(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	tags, err := h.tag.List(c.Request.Context(), u.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": "internal", "message": err.Error()})
		return
	}
	c.JSON(200, gin.H{"items": tags})
}

func (h *TagsHandler) Create(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	var body struct {
		Name  string `json:"name"`
		Color string `json:"color"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "bad_request", "message": err.Error()})
		return
	}
	t, err := h.tag.Create(c.Request.Context(), u.ID, body.Name, body.Color)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "bad_request", "message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, t)
}

func (h *TagsHandler) Delete(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := h.tag.Delete(c.Request.Context(), u.ID, id); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": "not_found", "message": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *TagsHandler) Attach(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	starID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var body struct {
		TagID int64 `json:"tag_id"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "bad_request", "message": err.Error()})
		return
	}
	if err := h.tag.Attach(c.Request.Context(), u.ID, starID, body.TagID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "bad_request", "message": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *TagsHandler) Detach(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	starID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	tagID, _ := strconv.ParseInt(c.Param("tagId"), 10, 64)
	if err := h.tag.Detach(c.Request.Context(), u.ID, starID, tagID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": "bad_request", "message": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}
