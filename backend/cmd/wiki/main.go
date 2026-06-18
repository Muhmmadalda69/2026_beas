// Command wiki runs the encyclopedia (wiki) microservice.
package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"galuhaksara/internal/platform/config"
	"galuhaksara/internal/platform/database"
	"galuhaksara/internal/platform/jwt"
	"galuhaksara/internal/platform/middleware"
	"galuhaksara/internal/platform/server"
	"galuhaksara/internal/wiki"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	ctx := context.Background()

	pool, err := database.Connect(ctx, config.Get("WIKI_DATABASE_URL",
		"postgres://galuh:galuh@localhost:5432/galuh_wiki?sslmode=disable"))
	if err != nil {
		log.Error("database connect failed", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	repo := wiki.NewPostgresRepository(pool)
	if err := repo.Migrate(ctx); err != nil {
		log.Error("migration failed", "error", err)
		os.Exit(1)
	}

	svc := wiki.NewService(repo)
	if err := svc.Seed(ctx); err != nil {
		log.Error("seed failed", "error", err)
		os.Exit(1)
	}

	jwtMgr := jwt.New(config.MustSecret("JWT_SECRET"), config.GetDuration("JWT_TTL", 12*time.Hour))

	mux := http.NewServeMux()
	wiki.NewHandler(svc).Routes(mux, middleware.RequireAuth(jwtMgr))

	origins := strings.Split(config.Get("CORS_ORIGINS", "http://localhost:3000"), ",")
	handler := middleware.Chain(mux,
		middleware.Recoverer(log),
		middleware.Logger(log),
		middleware.SecurityHeaders,
		middleware.CORS(origins),
		middleware.RateLimit(20, 40),
	)

	server.Run(":"+config.Get("PORT", "8082"), handler, log)
}
