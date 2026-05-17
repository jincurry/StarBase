package middleware

import (
	"net/http"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"
)

// CSRFOrigin rejects state-changing requests whose Origin (or, when
// missing, Referer) doesn't match the configured WebURL. Simple and
// adequate for cookie-based session auth where the browser will refuse
// to send custom headers cross-origin without CORS approval — combined
// with the existing strict CORS config, this closes the gap.
//
// GET/HEAD/OPTIONS are exempt.
func CSRFOrigin(allowed []string) gin.HandlerFunc {
	// Normalise to scheme://host (drop trailing slash, ignore path/query).
	norm := func(s string) string {
		u, err := url.Parse(strings.TrimRight(s, "/"))
		if err != nil || u.Scheme == "" {
			return ""
		}
		return u.Scheme + "://" + u.Host
	}
	allow := map[string]bool{}
	for _, a := range allowed {
		if n := norm(a); n != "" {
			allow[n] = true
		}
	}
	return func(c *gin.Context) {
		m := c.Request.Method
		if m == http.MethodGet || m == http.MethodHead || m == http.MethodOptions {
			c.Next()
			return
		}
		got := c.GetHeader("Origin")
		if got == "" {
			got = c.GetHeader("Referer")
		}
		if got != "" {
			if n := norm(got); n != "" && allow[n] {
				c.Next()
				return
			}
		}
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"code":    "csrf_origin",
			"message": "request rejected: origin not allowed",
		})
	}
}
