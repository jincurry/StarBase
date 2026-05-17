package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/jincurry/starbase/internal/api/middleware"
	"github.com/jincurry/starbase/internal/config"
	"github.com/jincurry/starbase/internal/model"
	"github.com/jincurry/starbase/internal/service"
)

type AccountHandler struct {
	cfg     *config.Config
	account *service.AccountService
}

func NewAccount(cfg *config.Config, a *service.AccountService) *AccountHandler {
	return &AccountHandler{cfg: cfg, account: a}
}

func (h *AccountHandler) Disconnect(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	if err := h.account.Disconnect(c.Request.Context(), u.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": "internal", "message": err.Error()})
		return
	}
	c.SetCookie(middleware.SessionCookieName, "", -1, "/", "", h.cfg.CookieSecure, true)
	c.Status(http.StatusNoContent)
}

func (h *AccountHandler) Delete(c *gin.Context) {
	u := c.MustGet(middleware.CtxUserKey).(*model.User)
	// Require the user to retype their GitHub username as a typo guard.
	var body struct {
		Confirm string `json:"confirm"`
	}
	_ = c.ShouldBindJSON(&body)
	if body.Confirm != u.Username {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "confirmation_mismatch",
			"message": "Type your GitHub username exactly to confirm deletion",
		})
		return
	}
	if err := h.account.DeleteAll(c.Request.Context(), u.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": "internal", "message": err.Error()})
		return
	}
	c.SetCookie(middleware.SessionCookieName, "", -1, "/", "", h.cfg.CookieSecure, true)
	c.Status(http.StatusNoContent)
}
