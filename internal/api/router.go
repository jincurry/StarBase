package api

import (
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"github.com/jincurry/starbase/internal/api/handler"
	"github.com/jincurry/starbase/internal/api/middleware"
	"github.com/jincurry/starbase/internal/config"
	"github.com/jincurry/starbase/internal/github"
	"github.com/jincurry/starbase/internal/service"
)

type Deps struct {
	Cfg     *config.Config
	GH      *github.Client
	Auth    *service.AuthService
	Sync    *service.SyncService
	Star    *service.StarService
	Tag     *service.TagService
	Review  *service.ReviewService
	Event   *service.EventService
	AI      *service.AIService
	Prefs   *service.PreferencesService
	Notif   *service.NotificationService
	Account *service.AccountService
}

func New(d Deps) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{d.Cfg.WebURL},
		AllowMethods:     []string{"GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	}))
	// CSRF — reject state-changing requests whose Origin doesn't match
	// WebURL or PublicURL (some flows like OAuth callback come from
	// PublicURL itself).
	r.Use(middleware.CSRFOrigin([]string{d.Cfg.WebURL, d.Cfg.PublicURL}))

	r.GET("/healthz", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"ok": true}) })

	authH := handler.NewAuth(d.Cfg, d.Auth, d.Sync)
	syncH := handler.NewSync(d.Sync)
	starH := handler.NewStars(d.Star)
	tagH := handler.NewTags(d.Tag)
	reviewH := handler.NewReview(d.Review, d.Star)
	eventsH := handler.NewEvents(d.Event)
	shareH := handler.NewShare(d.Cfg, d.Star)
	rssH := handler.NewRSS(d.Cfg, d.Star)
	aiH := handler.NewAI(d.AI)
	accountH := handler.NewAccount(d.Cfg, d.Account)
	prefsH := handler.NewPreferences(d.Prefs)
	notifH := handler.NewNotifications(d.Notif)
	rateH := handler.NewRateLimit(d.GH)

	aiBudget := middleware.AIBudget(d.Cfg.AIBudgetPerMin, time.Minute)

	api := r.Group("/api")
	{
		api.GET("/auth/github", authH.Login)
		api.GET("/auth/github/callback", authH.Callback)
		api.POST("/auth/logout", authH.Logout)
		// Public read-only view of a shared star.
		api.GET("/share/:token", shareH.Public)
	}

	authed := api.Group("")
	authed.Use(middleware.Auth(d.Auth))
	{
		authed.GET("/auth/me", authH.Me)

		authed.POST("/sync/initial", syncH.Initial)
		authed.POST("/sync/incremental", syncH.Incremental)
		authed.POST("/sync/reconcile", syncH.Reconcile)
		authed.GET("/sync/status", syncH.Status)

		authed.GET("/stars", starH.List)
		authed.GET("/stars/inbox", starH.Inbox)
		authed.GET("/stars/:id", starH.Get)
		authed.PATCH("/stars/:id", starH.Patch)
		authed.POST("/stars/:id/view", starH.View)
		authed.GET("/stars/:id/readme", starH.Readme)
		authed.POST("/stars/:id/tags", tagH.Attach)
		authed.DELETE("/stars/:id/tags/:tagId", tagH.Detach)

		authed.GET("/tags", tagH.List)
		authed.POST("/tags", tagH.Create)
		authed.PATCH("/tags/:id", tagH.Update)
		authed.DELETE("/tags/:id", tagH.Delete)

		authed.GET("/review", reviewH.Get)
		authed.POST("/review/:starId/seen", reviewH.MarkSeen)

		authed.GET("/stats", starH.Stats)
		authed.POST("/events", eventsH.Record)

		// V1.3 — share + RSS
		authed.POST("/stars/:id/share", shareH.Create)
		authed.DELETE("/stars/:id/share", shareH.Revoke)
		authed.GET("/feed/stars.atom", rssH.Stars)

		// V2.0 — AI (budgeted)
		authed.GET("/ai/status", aiH.Status)
		authed.POST("/stars/:id/ai/suggest-tags", aiBudget, aiH.SuggestTags)
		authed.POST("/stars/:id/ai/summarize", aiBudget, aiH.Summarize)

		// Account
		authed.POST("/account/disconnect", accountH.Disconnect)
		authed.POST("/account/delete", accountH.Delete)

		// Preferences
		authed.GET("/preferences", prefsH.Get)
		authed.PUT("/preferences", prefsH.Update)

		// Notifications
		authed.GET("/notifications", notifH.List)
		authed.POST("/notifications/:id/read", notifH.MarkRead)
		authed.POST("/notifications/read-all", notifH.MarkAllRead)

		// GitHub rate limit (most recently observed by our client)
		authed.GET("/github/rate-limit", rateH.Get)
	}

	return r
}
