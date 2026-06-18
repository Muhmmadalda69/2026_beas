package auth

import (
	"crypto/subtle"
	"errors"
	"net/http"
	"strings"

	"galuhaksara/internal/platform/httpx"
	"galuhaksara/internal/platform/middleware"
)

// UserHandler is the HTTP transport for end-user authentication.
type UserHandler struct {
	svc            *UserService
	internalSecret string
}

// NewUserHandler builds the user handler. internalSecret guards the OAuth
// upsert endpoint so only the trusted frontend (server-to-server) may call it.
func NewUserHandler(svc *UserService, internalSecret string) *UserHandler {
	return &UserHandler{svc: svc, internalSecret: internalSecret}
}

// Routes registers user auth routes.
func (h *UserHandler) Routes(mux *http.ServeMux, authMW middleware.Middleware) {
	mux.HandleFunc("POST /users/register", h.register)
	mux.HandleFunc("POST /users/login", h.login)
	mux.HandleFunc("POST /users/oauth", h.oauth)
	mux.Handle("GET /users/me", authMW(http.HandlerFunc(h.me)))
}

type registerRequest struct {
	Email    string `json:"email"`
	Name     string `json:"name"`
	Password string `json:"password"`
}

func (h *UserHandler) register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	res, err := h.svc.Register(r.Context(), req.Email, req.Name, req.Password)
	if h.writeErr(w, err) {
		return
	}
	httpx.Created(w, res)
}

type userLoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *UserHandler) login(w http.ResponseWriter, r *http.Request) {
	var req userLoginRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	res, err := h.svc.Login(r.Context(), req.Email, req.Password)
	if h.writeErr(w, err) {
		return
	}
	httpx.OK(w, res)
}

type oauthRequest struct {
	Provider string `json:"provider"`
	Sub      string `json:"sub"`
	Email    string `json:"email"`
	Name     string `json:"name"`
}

func (h *UserHandler) oauth(w http.ResponseWriter, r *http.Request) {
	// Constant-time check of the shared internal secret.
	got := r.Header.Get("X-Internal-Secret")
	if h.internalSecret == "" ||
		subtle.ConstantTimeCompare([]byte(got), []byte(h.internalSecret)) != 1 {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req oauthRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	res, err := h.svc.OAuthUpsert(r.Context(), strings.ToLower(req.Provider), req.Sub, req.Email, req.Name)
	if h.writeErr(w, err) {
		return
	}
	httpx.OK(w, res)
}

func (h *UserHandler) me(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFrom(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	httpx.OK(w, map[string]string{
		"id":   claims.Subject,
		"name": claims.Username,
		"role": claims.Role,
	})
}

func (h *UserHandler) writeErr(w http.ResponseWriter, err error) bool {
	if err == nil {
		return false
	}
	var ve ErrValidationUser
	switch {
	case errors.As(err, &ve):
		httpx.Error(w, http.StatusBadRequest, ve.Error())
	case errors.Is(err, ErrEmailTaken):
		httpx.Error(w, http.StatusConflict, "email sudah terdaftar")
	case errors.Is(err, ErrInvalidCredentials):
		httpx.Error(w, http.StatusUnauthorized, "email atau kata sandi salah")
	default:
		httpx.Error(w, http.StatusInternalServerError, "tidak dapat memproses permintaan")
	}
	return true
}
