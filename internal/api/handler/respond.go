package handler

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/jincurry/starbase/internal/pkg/apperror"
	"github.com/jincurry/starbase/internal/service"
)

// respond renders an error to the client. The mapping is:
//
//   - *apperror.Error → passed through as-is.
//   - service sentinel errors (ErrNotFound / ErrInvalidStatus / etc) →
//     mapped to the right HTTP status with a safe message.
//   - anything else → logged server-side, 500 generic message.
//
// Raw error strings (which may contain SQL or GitHub API details) are
// never surfaced in the response body.
func respond(c *gin.Context, err error) {
	if err == nil {
		return
	}

	var ae *apperror.Error
	if errors.As(err, &ae) {
		c.AbortWithStatusJSON(ae.Status, ae)
		return
	}

	switch {
	case errors.Is(err, service.ErrNotFound):
		c.AbortWithStatusJSON(http.StatusNotFound, apperror.NotFound("Not found"))
		return
	case errors.Is(err, service.ErrInvalidInput),
		errors.Is(err, service.ErrInvalidStatus):
		c.AbortWithStatusJSON(http.StatusBadRequest, apperror.BadRequest(err.Error()))
		return
	case errors.Is(err, service.ErrConflict):
		c.AbortWithStatusJSON(http.StatusConflict, apperror.Conflict(err.Error()))
		return
	case errors.Is(err, service.ErrAIDisabled):
		c.AbortWithStatusJSON(http.StatusServiceUnavailable,
			apperror.New(http.StatusServiceUnavailable, "ai_disabled", "AI features not configured", ""))
		return
	case errors.Is(err, service.ErrDisconnected):
		c.AbortWithStatusJSON(http.StatusUnauthorized,
			apperror.Unauthorized("Your GitHub connection has been removed — sign in again."))
		return
	}

	// Log the raw error for ops; show a generic message to the caller.
	slog.Default().Error("unhandled handler error",
		"path", c.FullPath(),
		"method", c.Request.Method,
		"err", err,
	)
	c.AbortWithStatusJSON(http.StatusInternalServerError, apperror.Internal("Something went wrong."))
}
