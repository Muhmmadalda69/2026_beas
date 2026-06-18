package quiz

import (
	"errors"
	"net/http"

	"galuhaksara/internal/platform/httpx"
	"galuhaksara/internal/platform/middleware"
)

// Handler is the HTTP transport for the quiz service.
type Handler struct {
	svc *Service
}

// NewHandler builds the quiz HTTP handler.
func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// Routes registers public play routes and admin-only management routes.
func (h *Handler) Routes(mux *http.ServeMux, authMW middleware.Middleware) {
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	// Public play.
	mux.HandleFunc("GET /levels", h.listLevels)
	mux.HandleFunc("GET /levels/{id}", h.getLevel)
	mux.HandleFunc("POST /levels/{id}/play", h.play)
	mux.HandleFunc("POST /submit", h.submit)
	mux.HandleFunc("GET /leaderboard", h.leaderboard)

	// Admin management.
	mux.Handle("POST /levels", authMW(http.HandlerFunc(h.createLevel)))
	mux.Handle("PUT /levels/{id}", authMW(http.HandlerFunc(h.updateLevel)))
	mux.Handle("DELETE /levels/{id}", authMW(http.HandlerFunc(h.deleteLevel)))
	mux.Handle("GET /levels/{id}/questions", authMW(http.HandlerFunc(h.listQuestions)))
	mux.Handle("POST /levels/{id}/questions", authMW(http.HandlerFunc(h.createQuestion)))
	mux.Handle("PUT /questions/{id}", authMW(http.HandlerFunc(h.updateQuestion)))
	mux.Handle("DELETE /questions/{id}", authMW(http.HandlerFunc(h.deleteQuestion)))
}

// ----- public -----

func (h *Handler) listLevels(w http.ResponseWriter, r *http.Request) {
	userID := ""
	if claims, ok := middleware.ClaimsFrom(r.Context()); ok {
		userID = claims.Subject
	}
	levels, err := h.svc.ListLevels(r.Context(), userID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not load levels")
		return
	}
	httpx.OK(w, levels)
}

func (h *Handler) getLevel(w http.ResponseWriter, r *http.Request) {
	l, err := h.svc.GetLevel(r.Context(), r.PathValue("id"))
	if h.writeErr(w, err) {
		return
	}
	httpx.OK(w, l)
}

func (h *Handler) play(w http.ResponseWriter, r *http.Request) {
	userID := ""
	if claims, ok := middleware.ClaimsFrom(r.Context()); ok {
		userID = claims.Subject
	}
	sess, err := h.svc.Play(r.Context(), r.PathValue("id"), userID)
	if h.writeErr(w, err) {
		return
	}
	httpx.OK(w, sess)
}

type submitRequest struct {
	SessionID string   `json:"session_id"`
	Answers   []Answer `json:"answers"`
}

func (h *Handler) submit(w http.ResponseWriter, r *http.Request) {
	var req submitRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	if req.SessionID == "" {
		httpx.Error(w, http.StatusBadRequest, "session_id is required")
		return
	}
	// Optional identity: when the player is logged in, record their attempt.
	userID, username := "", ""
	if claims, ok := middleware.ClaimsFrom(r.Context()); ok {
		userID, username = claims.Subject, claims.Username
	}
	res, err := h.svc.Submit(r.Context(), req.SessionID, userID, username, req.Answers)
	if h.writeErr(w, err) {
		return
	}
	httpx.OK(w, res)
}

func (h *Handler) leaderboard(w http.ResponseWriter, r *http.Request) {
	entries, err := h.svc.Leaderboard(r.Context(), 50)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "could not load leaderboard")
		return
	}
	httpx.OK(w, entries)
}

// ----- admin: levels -----

func (h *Handler) createLevel(w http.ResponseWriter, r *http.Request) {
	var in LevelInput
	if err := httpx.DecodeJSON(w, r, &in); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	l, err := h.svc.CreateLevel(r.Context(), in)
	if h.writeErr(w, err) {
		return
	}
	httpx.Created(w, l)
}

func (h *Handler) updateLevel(w http.ResponseWriter, r *http.Request) {
	var in LevelInput
	if err := httpx.DecodeJSON(w, r, &in); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	l, err := h.svc.UpdateLevel(r.Context(), r.PathValue("id"), in)
	if h.writeErr(w, err) {
		return
	}
	httpx.OK(w, l)
}

func (h *Handler) deleteLevel(w http.ResponseWriter, r *http.Request) {
	if h.writeErr(w, h.svc.DeleteLevel(r.Context(), r.PathValue("id"))) {
		return
	}
	httpx.JSON(w, http.StatusNoContent, nil)
}

// ----- admin: questions -----

func (h *Handler) listQuestions(w http.ResponseWriter, r *http.Request) {
	qs, err := h.svc.ListQuestions(r.Context(), r.PathValue("id"))
	if h.writeErr(w, err) {
		return
	}
	httpx.OK(w, qs)
}

func (h *Handler) createQuestion(w http.ResponseWriter, r *http.Request) {
	var in QuestionInput
	if err := httpx.DecodeJSON(w, r, &in); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	q, err := h.svc.CreateQuestion(r.Context(), r.PathValue("id"), in)
	if h.writeErr(w, err) {
		return
	}
	httpx.Created(w, q)
}

func (h *Handler) updateQuestion(w http.ResponseWriter, r *http.Request) {
	var in QuestionInput
	if err := httpx.DecodeJSON(w, r, &in); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	q, err := h.svc.UpdateQuestion(r.Context(), r.PathValue("id"), in)
	if h.writeErr(w, err) {
		return
	}
	httpx.OK(w, q)
}

func (h *Handler) deleteQuestion(w http.ResponseWriter, r *http.Request) {
	if h.writeErr(w, h.svc.DeleteQuestion(r.Context(), r.PathValue("id"))) {
		return
	}
	httpx.JSON(w, http.StatusNoContent, nil)
}

// writeErr maps domain errors to HTTP responses; returns true if handled.
func (h *Handler) writeErr(w http.ResponseWriter, err error) bool {
	if err == nil {
		return false
	}
	var ve ErrValidation
	switch {
	case errors.As(err, &ve):
		httpx.Error(w, http.StatusBadRequest, ve.Msg)
	case errors.Is(err, ErrNotFound):
		httpx.Error(w, http.StatusNotFound, "not found")
	case errors.Is(err, ErrLevelLocked):
		httpx.Error(w, http.StatusForbidden, "selesaikan level sebelumnya dulu untuk membuka level ini")
	case errors.Is(err, ErrNoQuestions):
		httpx.Error(w, http.StatusConflict, "this level has no questions yet")
	case errors.Is(err, ErrSessionExpired):
		httpx.Error(w, http.StatusGone, "quiz session expired, please restart")
	case errors.Is(err, ErrSessionUsed):
		httpx.Error(w, http.StatusConflict, "this quiz was already submitted")
	default:
		httpx.Error(w, http.StatusInternalServerError, "could not process request")
	}
	return true
}
