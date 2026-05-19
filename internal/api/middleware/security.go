package middleware

import "github.com/gin-gonic/gin"

// SecurityHeaders sets a conservative baseline of HTTP security headers
// on every response. HSTS is gated on `secure` (i.e. served over HTTPS)
// — sending it over plain HTTP would lock browsers out on the next
// upgrade.
func SecurityHeaders(secure bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.Writer.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		h.Set("Permissions-Policy", "interest-cohort=(), camera=(), microphone=(), geolocation=()")
		if secure {
			// 1 year, include subdomains, allow preload list submission.
			h.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		c.Next()
	}
}
