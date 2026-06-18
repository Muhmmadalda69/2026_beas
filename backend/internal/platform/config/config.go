// Package config loads service configuration from environment variables.
// Every microservice reads only the keys it needs; sane defaults keep local
// development friction-free while production overrides via real env vars.
package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

// Get returns the env var or a fallback when unset/empty.
func Get(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

// GetInt parses an int env var, falling back on error.
func GetInt(key string, fallback int) int {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

// GetDuration parses a Go duration string (e.g. "15m"), falling back on error.
func GetDuration(key string, fallback time.Duration) time.Duration {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return fallback
}

// MustSecret returns a required secret, falling back to a clearly-marked dev
// default. The default is intentionally obvious so it is never mistaken for a
// production key.
func MustSecret(key string) string {
	return Get(key, "dev-insecure-change-me-in-production-please-32b")
}
