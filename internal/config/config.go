package config

import (
	"fmt"
	"strings"

	"github.com/spf13/viper"
)

type Config struct {
	HTTPAddr   string
	PublicURL  string
	WebURL     string
	DBURL      string

	GitHubClientID     string
	GitHubClientSecret string
	GitHubCallback     string

	TokenKey      string
	SessionSecret string

	WorkerConcurrency int
	GitHubRatePerSec  float64
}

func Load() (*Config, error) {
	v := viper.New()
	v.SetEnvPrefix("STARBASE")
	v.AutomaticEnv()
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	v.SetDefault("HTTP_ADDR", ":8080")
	v.SetDefault("PUBLIC_URL", "http://localhost:8080")
	v.SetDefault("WEB_URL", "http://localhost:3000")
	v.SetDefault("DB_URL", "postgres://starbase:starbase@localhost:5432/starbase?sslmode=disable")
	v.SetDefault("WORKER_CONCURRENCY", 2)
	v.SetDefault("GITHUB_RATE_PER_SEC", 1.0)
	v.SetDefault("GITHUB_CALLBACK", "http://localhost:8080/api/auth/github/callback")

	cfg := &Config{
		HTTPAddr:           v.GetString("HTTP_ADDR"),
		PublicURL:          v.GetString("PUBLIC_URL"),
		WebURL:             v.GetString("WEB_URL"),
		DBURL:              v.GetString("DB_URL"),
		GitHubClientID:     v.GetString("GITHUB_CLIENT_ID"),
		GitHubClientSecret: v.GetString("GITHUB_CLIENT_SECRET"),
		GitHubCallback:     v.GetString("GITHUB_CALLBACK"),
		TokenKey:           v.GetString("TOKEN_KEY"),
		SessionSecret:      v.GetString("SESSION_SECRET"),
		WorkerConcurrency:  v.GetInt("WORKER_CONCURRENCY"),
		GitHubRatePerSec:   v.GetFloat64("GITHUB_RATE_PER_SEC"),
	}

	if cfg.TokenKey == "" {
		return nil, fmt.Errorf("STARBASE_TOKEN_KEY is required (32-byte hex string)")
	}
	if len(cfg.TokenKey) != 64 {
		return nil, fmt.Errorf("STARBASE_TOKEN_KEY must be a 64-char hex string (32 bytes)")
	}
	return cfg, nil
}
