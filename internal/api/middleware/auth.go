package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/jincurry/starbase/internal/service"
)

const (
	SessionCookieName = "starbase_session"
	CtxUserKey        = "starbase_user"
)

// Auth requires a valid session cookie; stores the resolved user in context.
func Auth(svc *service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		token, err := c.Cookie(SessionCookieName)
		if err != nil || token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"code":    "unauthorized",
				"message": "Sign in with GitHub to continue.",
			})
			return
		}
		user, err := svc.UserFromSession(c.Request.Context(), token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"code":    "unauthorized",
				"message": "Your session has expired. Please sign in again.",
			})
			return
		}
		c.Set(CtxUserKey, user)
		c.Next()
	}
}
