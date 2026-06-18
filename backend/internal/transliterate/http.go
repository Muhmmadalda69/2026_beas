package transliterate

import (
	"net/http"
	"strings"
	"unicode/utf8"

	"galuhaksara/internal/platform/httpx"
)

// Handler exposes the transliteration engine over HTTP. The service is
// stateless, so the handler holds no dependencies.
type Handler struct{}

// NewHandler constructs the transliterate HTTP handler.
func NewHandler() *Handler { return &Handler{} }

// Routes registers the service endpoints on a ServeMux.
func (h *Handler) Routes(mux *http.ServeMux) {
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("POST /transliterate", h.transliterate)
	mux.HandleFunc("GET /chart", h.chart)
}

type transliterateRequest struct {
	Text string `json:"text"`
}

type transliterateResponse struct {
	Input  string `json:"input"`
	Aksara string `json:"aksara"`
}

func (h *Handler) transliterate(w http.ResponseWriter, r *http.Request) {
	var req transliterateRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	req.Text = strings.TrimSpace(req.Text)
	if req.Text == "" {
		httpx.Error(w, http.StatusBadRequest, "text is required")
		return
	}
	if utf8.RuneCountInString(req.Text) > 5000 {
		httpx.Error(w, http.StatusRequestEntityTooLarge, "text exceeds 5000 characters")
		return
	}
	httpx.OK(w, transliterateResponse{Input: req.Text, Aksara: Transliterate(req.Text)})
}

func (h *Handler) chart(w http.ResponseWriter, _ *http.Request) {
	httpx.OK(w, Chart())
}
