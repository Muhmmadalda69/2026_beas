package wiki

import (
	"errors"
	"net/http"

	"galuhaksara/internal/platform/httpx"
	"galuhaksara/internal/platform/middleware"
)

// Handler is the HTTP transport for the wiki service.
type Handler struct {
	svc *Service
}

// NewHandler builds the wiki HTTP handler.
func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// Routes registers public read routes and admin-only write routes. Writes are
// wrapped with authMW so only authenticated admins can mutate content.
func (h *Handler) Routes(mux *http.ServeMux, authMW middleware.Middleware) {
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	// Public reads.
	mux.HandleFunc("GET /articles", h.list)
	mux.HandleFunc("GET /articles/{slug}", h.getBySlug)
	mux.HandleFunc("GET /categories", h.categories)

	// Admin writes.
	mux.Handle("POST /articles", authMW(http.HandlerFunc(h.create)))
	mux.Handle("PUT /articles/{id}", authMW(http.HandlerFunc(h.update)))
	mux.Handle("DELETE /articles/{id}", authMW(http.HandlerFunc(h.delete)))
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	f := ListFilter{
		Category: r.URL.Query().Get("category"),
		Search:   r.URL.Query().Get("q"),
	}
	items, err := h.svc.List(r.Context(), f)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not load articles")
		return
	}
	httpx.OK(w, items)
}

func (h *Handler) getBySlug(w http.ResponseWriter, r *http.Request) {
	a, err := h.svc.Get(r.Context(), r.PathValue("slug"))
	if errors.Is(err, ErrNotFound) {
		httpx.Error(w, http.StatusNotFound, "article not found")
		return
	}
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not load article")
		return
	}
	httpx.OK(w, a)
}

func (h *Handler) categories(w http.ResponseWriter, r *http.Request) {
	cats, err := h.svc.Categories(r.Context())
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not load categories")
		return
	}
	httpx.OK(w, cats)
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	var in ArticleInput
	if err := httpx.DecodeJSON(w, r, &in); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	a, err := h.svc.Create(r.Context(), in)
	if h.writeErr(w, err) {
		return
	}
	httpx.Created(w, a)
}

func (h *Handler) update(w http.ResponseWriter, r *http.Request) {
	var in ArticleInput
	if err := httpx.DecodeJSON(w, r, &in); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	a, err := h.svc.Update(r.Context(), r.PathValue("id"), in)
	if h.writeErr(w, err) {
		return
	}
	httpx.OK(w, a)
}

func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	err := h.svc.Delete(r.Context(), r.PathValue("id"))
	if h.writeErr(w, err) {
		return
	}
	httpx.JSON(w, http.StatusNoContent, nil)
}

// writeErr maps domain errors to HTTP responses; returns true if it handled one.
func (h *Handler) writeErr(w http.ResponseWriter, err error) bool {
	if err == nil {
		return false
	}
	var ve ErrValidation
	switch {
	case errors.As(err, &ve):
		httpx.Error(w, http.StatusBadRequest, ve.Msg)
	case errors.Is(err, ErrNotFound):
		httpx.Error(w, http.StatusNotFound, "article not found")
	default:
		httpx.Error(w, http.StatusInternalServerError, "could not process request")
	}
	return true
}
