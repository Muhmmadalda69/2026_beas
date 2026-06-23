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
	googleClientID string
}

// NewUserHandler builds the user handler. internalSecret guards the OAuth
// upsert endpoint so only the trusted frontend (server-to-server) may call it.
// googleClientID is the OAuth client ID accepted as the audience of mobile
// Google id_tokens (reuse the existing web client ID).
func NewUserHandler(svc *UserService, internalSecret, googleClientID string) *UserHandler {
	return &UserHandler{
		svc:            svc,
		internalSecret: internalSecret,
		googleClientID: googleClientID,
	}
}

// Routes registers user auth routes.
func (h *UserHandler) Routes(mux *http.ServeMux, authMW middleware.Middleware) {
	mux.HandleFunc("POST /users/register", h.register)
	mux.HandleFunc("POST /users/login", h.login)
	mux.HandleFunc("POST /users/oauth", h.oauth)
	mux.HandleFunc("POST /users/google", h.google)
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

type googleRequest struct {
	IDToken string `json:"id_token"`
}

// google verifies a Google id_token (obtained by the mobile app via
// google_sign_in) directly with Google, then upserts the user. No shared secret
// is needed, so it is safe to call from a public client.
func (h *UserHandler) google(w http.ResponseWriter, r *http.Request) {
	var req googleRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	if strings.TrimSpace(req.IDToken) == "" {
		httpx.Error(w, http.StatusBadRequest, "id_token wajib diisi")
		return
	}
	identity, err := verifyGoogleIDToken(r.Context(), req.IDToken, h.googleClientID)
	if err != nil {
		if errors.Is(err, errGoogleNotConfigured) {
			httpx.Error(w, http.StatusServiceUnavailable, "login google tidak aktif")
			return
		}
		httpx.Error(w, http.StatusUnauthorized, "verifikasi google gagal")
		return
	}
	res, err := h.svc.OAuthUpsert(r.Context(), "google", identity.sub, identity.email, identity.name)
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
