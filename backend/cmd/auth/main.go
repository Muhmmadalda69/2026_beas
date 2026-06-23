// Command auth runs the authentication microservice.
package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"galuhaksara/internal/auth"
	"galuhaksara/internal/platform/config"
	"galuhaksara/internal/platform/database"
	"galuhaksara/internal/platform/jwt"
	"galuhaksara/internal/platform/middleware"
	"galuhaksara/internal/platform/server"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	ctx := context.Background()

	pool, err := database.Connect(ctx, config.Get("AUTH_DATABASE_URL",
		"postgres://galuh:galuh@localhost:5432/galuh_auth?sslmode=disable"))
	if err != nil {
		log.Error("database connect failed", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	repo := auth.NewPostgresRepository(pool)
	if err := repo.Migrate(ctx); err != nil {
		log.Error("migration failed", "error", err)
		os.Exit(1)
	}

	jwtMgr := jwt.New(config.MustSecret("JWT_SECRET"), config.GetDuration("JWT_TTL", 12*time.Hour))
	svc := auth.NewService(repo, jwtMgr, log)

	adminUser := config.Get("ADMIN_USERNAME", "admin")
	adminPass := os.Getenv("ADMIN_PASSWORD")
	usingDefault := adminPass == ""
	if usingDefault {
		adminPass = "admin12345"
	}
	if err := svc.SeedDefaultAdmin(ctx, adminUser, adminPass, usingDefault); err != nil {
		log.Error("seed admin failed", "error", err)
		os.Exit(1)
	}
	// Guarantee a superadmin exists (also upgrades older admin-only deployments).
	if err := svc.EnsureSuperadmin(ctx, adminUser); err != nil {
		log.Error("ensure superadmin failed", "error", err)
		os.Exit(1)
	}

	authMW := middleware.RequireAuth(jwtMgr)
	superadminMW := middleware.RequireRole(jwtMgr, auth.RoleSuperadmin)
	mux := http.NewServeMux()
	auth.NewHandler(svc).Routes(mux, authMW, superadminMW)

	// End-user authentication (quiz players), including Google OAuth upsert.
	userSvc := auth.NewUserService(repo, jwtMgr, log)
	auth.NewUserHandler(
		userSvc,
		config.Get("INTERNAL_API_SECRET", ""),
		config.Get("GOOGLE_CLIENT_ID", ""),
	).Routes(mux, authMW)

	origins := strings.Split(config.Get("CORS_ORIGINS", "http://localhost:3000"), ",")
	handler := middleware.Chain(mux,
		middleware.Recoverer(log),
		middleware.Logger(log),
		middleware.SecurityHeaders,
		middleware.CORS(origins),
		middleware.RateLimit(5, 10), // logins are sensitive: keep the bucket small
	)

	server.Run(":"+config.Get("PORT", "8081"), handler, log)
}
