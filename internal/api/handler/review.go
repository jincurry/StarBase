package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/jincurry/starbase/internal/api/middleware"
	"github.com/jincurry/starbase/internal/model"
	"github.com/jincurry/starbase/internal/service"
)

type ReviewHandler struct {
	review *service.ReviewService
	star   *service.StarService
}

func NewReview(r *service.ReviewService, s *service.StarService) *ReviewHandler {
	return &ReviewHandler{review: r, star: s}
}

func (h *ReviewHandler) Get(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	p, err := h.review.Build(c.Request.Context(), u.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": "internal", "message": err.Error()})
		return
	}
	c.JSON(200, p)
}

func (h *ReviewHandler) MarkSeen(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	id, _ := strconv.ParseInt(c.Param("starId"), 10, 64)
	if err := h.star.MarkReviewed(c.Request.Context(), u.ID, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": "internal", "message": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}
