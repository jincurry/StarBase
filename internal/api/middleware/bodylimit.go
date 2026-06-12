package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// BodyLimit caps request body size. Anything larger fails the next
// body read with http.MaxBytesError, which surfaces to the caller as a
// 400 from the JSON binder. 1 MiB covers any legitimate StarBase
// payload (the largest is a markdown note) with plenty of headroom.
func BodyLimit(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Body != nil {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		}
		c.Next()
	}
}
