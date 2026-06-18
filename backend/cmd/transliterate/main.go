// Command transliterate runs the stateless Latin → Aksara Sunda microservice.
package main

import (
	"log/slog"
	"net/http"
	"os"
	"strings"

	"galuhaksara/internal/platform/config"
	"galuhaksara/internal/platform/middleware"
	"galuhaksara/internal/platform/server"
	"galuhaksara/internal/transliterate"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	mux := http.NewServeMux()
	transliterate.NewHandler().Routes(mux)

	origins := strings.Split(config.Get("CORS_ORIGINS", "http://localhost:3000"), ",")
	handler := middleware.Chain(mux,
		middleware.Recoverer(log),
		middleware.Logger(log),
		middleware.SecurityHeaders,
		middleware.CORS(origins),
		middleware.RateLimit(20, 40),
	)

	server.Run(":"+config.Get("PORT", "8084"), handler, log)
}
