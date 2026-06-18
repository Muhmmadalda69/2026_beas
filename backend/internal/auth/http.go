package auth

import (
	"errors"
	"net/http"
	"strings"

	"galuhaksara/internal/platform/httpx"
	"galuhaksara/internal/platform/middleware"
)

// Handler is the HTTP transport for the auth service.
type Handler struct {
	svc *Service
}

// NewHandler builds the auth HTTP handler.
func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// Routes registers public and protected routes on the mux. authMW guards
// endpoints needing any valid admin token; superadminMW restricts account
// management to superadmins (RBAC).
func (h *Handler) Routes(mux *http.ServeMux, authMW, superadminMW middleware.Middleware) {
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("POST /login", h.login)
	// /me lets the frontend validate a stored token and read the current admin.
	mux.Handle("GET /me", authMW(http.HandlerFunc(h.me)))

	// Admin account management — superadmin only.
	mux.Handle("GET /admins", superadminMW(http.HandlerFunc(h.listAdmins)))
	mux.Handle("POST /admins", superadminMW(http.HandlerFunc(h.createAdmin)))
	mux.Handle("DELETE /admins/{id}", superadminMW(http.HandlerFunc(h.deleteAdmin)))
}

func (h *Handler) listAdmins(w http.ResponseWriter, r *http.Request) {
	admins, err := h.svc.ListAdmins(r.Context())
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not load admins")
		return
	}
	httpx.OK(w, admins)
}

type createAdminRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

func (h *Handler) createAdmin(w http.ResponseWriter, r *http.Request) {
	var req createAdminRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	admin, err := h.svc.CreateAdmin(r.Context(), req.Username, req.Password, req.Role)
	var ve ErrValidationUser
	switch {
	case errors.As(err, &ve):
		httpx.Error(w, http.StatusBadRequest, ve.Error())
	case err != nil:
		httpx.Error(w, http.StatusInternalServerError, "could not create admin")
	default:
		httpx.Created(w, admin)
	}
}

func (h *Handler) deleteAdmin(w http.ResponseWriter, r *http.Request) {
	err := h.svc.DeleteAdmin(r.Context(), r.PathValue("id"))
	switch {
	case errors.Is(err, ErrLastSuperadmin):
		httpx.Error(w, http.StatusConflict, "tidak bisa menghapus superadmin terakhir")
	case errors.Is(err, ErrAdminNotFound):
		httpx.Error(w, http.StatusNotFound, "admin tidak ditemukan")
	case err != nil:
		httpx.Error(w, http.StatusInternalServerError, "could not delete admin")
	default:
		httpx.JSON(w, http.StatusNoContent, nil)
	}
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	if strings.TrimSpace(req.Username) == "" || req.Password == "" {
		httpx.Error(w, http.StatusBadRequest, "username and password are required")
		return
	}
	result, err := h.svc.Login(r.Context(), req.Username, req.Password)
	if errors.Is(err, ErrInvalidCredentials) {
		httpx.Error(w, http.StatusUnauthorized, "invalid username or password")
		return
	}
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not process login")
		return
	}
	httpx.OK(w, result)
}

func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFrom(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	httpx.OK(w, map[string]string{
		"id":       claims.Subject,
		"username": claims.Username,
		"role":     claims.Role,
	})
}
