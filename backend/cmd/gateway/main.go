// Command gateway is the single public entry point. It reverse-proxies requests
// to the internal microservices, centralising CORS, security headers and edge
// rate limiting so the services themselves stay private.
package main

import (
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
	"time"

	"galuhaksara/internal/platform/config"
	"galuhaksara/internal/platform/httpx"
	"galuhaksara/internal/platform/middleware"
	"galuhaksara/internal/platform/server"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	// Each route prefix maps to an internal service base URL.
	routes := map[string]string{
		"/api/auth":     config.Get("AUTH_URL", "http://localhost:8081"),
		"/api/wiki":     config.Get("WIKI_URL", "http://localhost:8082"),
		"/api/quiz":     config.Get("QUIZ_URL", "http://localhost:8083"),
		"/api/translit": config.Get("TRANSLIT_URL", "http://localhost:8084"),
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "gateway"})
	})

	for prefix, target := range routes {
		proxy, err := newProxy(target, prefix, log)
		if err != nil {
			log.Error("invalid upstream", "prefix", prefix, "target", target, "error", err)
			os.Exit(1)
		}
		// Trailing slash makes this a subtree handler covering everything below.
		mux.Handle(prefix+"/", proxy)
	}

	origins := strings.Split(config.Get("CORS_ORIGINS", "http://localhost:3000"), ",")
	handler := middleware.Chain(mux,
		middleware.Recoverer(log),
		middleware.Logger(log),
		gatewaySecurityHeaders,
		middleware.CORS(origins),
		middleware.RateLimit(30, 60),
	)

	server.Run(":"+config.Get("PORT", "8080"), handler, log)
}

// newProxy builds a reverse proxy to target, stripping the route prefix so the
// upstream service sees clean paths (e.g. /api/wiki/articles -> /articles).
func newProxy(target, prefix string, log *slog.Logger) (http.Handler, error) {
	base, err := url.Parse(target)
	if err != nil {
		return nil, err
	}
	rp := httputil.NewSingleHostReverseProxy(base)
	rp.ErrorHandler = func(w http.ResponseWriter, _ *http.Request, err error) {
		log.Error("upstream error", "target", target, "error", err)
		httpx.Error(w, http.StatusBadGateway, "upstream service unavailable")
	}
	rp.FlushInterval = 100 * time.Millisecond

	defaultDirector := rp.Director
	rp.Director = func(r *http.Request) {
		defaultDirector(r)
		r.URL.Path = strings.TrimPrefix(r.URL.Path, prefix)
		if r.URL.Path == "" {
			r.URL.Path = "/"
		}
		r.Host = base.Host
	}
	return rp, nil
}

// gatewaySecurityHeaders is a relaxed CSP suitable for an API edge that returns
// JSON only (the browser-facing CSP lives in the Next.js frontend).
func gatewaySecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "no-referrer")
		next.ServeHTTP(w, r)
	})
}
