package handler

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/jincurry/starbase/internal/pkg/apperror"
)

// respond renders an error to the client. *apperror.Error values are
// passed through with their declared status/code/message; bare error
// values are logged server-side and returned as a generic 500 to avoid
// leaking pgx / GitHub error details into the response body.
func respond(c *gin.Context, err error) {
	if err == nil {
		return
	}
	var ae *apperror.Error
	if errors.As(err, &ae) {
		c.AbortWithStatusJSON(ae.Status, ae)
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

// notFoundFromErr returns an apperror if the message looks like a
// not-found signal from services that hand-rolled `errors.New("not found")`.
// Lets us keep service-layer error returns simple without classifying
// every error site explicitly.
func notFoundFromErr(err error, msg string) *apperror.Error {
	if err != nil && strings.Contains(strings.ToLower(err.Error()), "not found") {
		return apperror.NotFound(msg)
	}
	return apperror.Internal(msg)
}
