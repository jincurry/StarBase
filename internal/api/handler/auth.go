package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/jincurry/starbase/internal/api/middleware"
	"github.com/jincurry/starbase/internal/config"
	"github.com/jincurry/starbase/internal/model"
	"github.com/jincurry/starbase/internal/pkg/apperror"
	"github.com/jincurry/starbase/internal/pkg/crypto"
	"github.com/jincurry/starbase/internal/service"
)

type AuthHandler struct {
	cfg  *config.Config
	auth *service.AuthService
	sync *service.SyncService
}

func NewAuth(cfg *config.Config, auth *service.AuthService, sync *service.SyncService) *AuthHandler {
	return &AuthHandler{cfg: cfg, auth: auth, sync: sync}
}

func (h *AuthHandler) Login(c *gin.Context) {
	state, err := crypto.RandomToken(16)
	if err != nil {
		respond(c, apperror.Internal("Couldn't start sign-in"))
		return
	}
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("starbase_oauth_state", state, 600, "/", "", h.cfg.CookieSecure, true)
	c.Redirect(http.StatusFound, h.auth.OAuthURL(state))
}

func (h *AuthHandler) Callback(c *gin.Context) {
	state := c.Query("state")
	code := c.Query("code")
	saved, _ := c.Cookie("starbase_oauth_state")
	if state == "" || code == "" || state != saved {
		c.Redirect(http.StatusFound, h.cfg.WebURL+"/?error=oauth_state")
		return
	}
	token, user, err := h.auth.HandleCallback(c.Request.Context(), code)
	if err != nil {
		// Don't leak raw OAuth/decoder errors in the URL.
		c.Redirect(http.StatusFound, h.cfg.WebURL+"/?error=oauth_failed")
		return
	}
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(middleware.SessionCookieName, token, 60*60*24*30, "/", "", h.cfg.CookieSecure, true)
	c.SetCookie("starbase_oauth_state", "", -1, "/", "", h.cfg.CookieSecure, true)

	// If first time, send the user to /welcome; otherwise to /inbox.
	state2, _ := h.sync.State(c.Request.Context(), user.ID)
	dest := "/inbox"
	if state2 == nil || !state2.InitialSyncCompleted {
		dest = "/welcome"
	}
	c.Redirect(http.StatusFound, h.cfg.WebURL+dest)
}

func (h *AuthHandler) Logout(c *gin.Context) {
	token, _ := c.Cookie(middleware.SessionCookieName)
	if token != "" {
		_ = h.auth.Logout(c.Request.Context(), token)
	}
	c.SetCookie(middleware.SessionCookieName, "", -1, "/", "", h.cfg.CookieSecure, true)
	c.Status(http.StatusNoContent)
}

func (h *AuthHandler) Me(c *gin.Context) {
	user, _ := c.Get(middleware.CtxUserKey)
	u := user.(*model.User)
	state, _ := h.sync.State(c.Request.Context(), u.ID)
	c.JSON(200, gin.H{"user": u, "sync": state})
}
