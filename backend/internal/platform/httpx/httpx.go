// Package httpx centralises JSON encoding, request decoding and a consistent
// error envelope so handlers stay thin and responses stay uniform.
package httpx

import (
	"encoding/json"
	"errors"
	"net/http"
)

// Envelope is the shape of every JSON response body.
type Envelope struct {
	Data  any    `json:"data,omitempty"`
	Error string `json:"error,omitempty"`
}

// JSON writes v as JSON with the given status code.
func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v != nil {
		_ = json.NewEncoder(w).Encode(v)
	}
}

// OK writes a 200 with the data wrapped in an envelope.
func OK(w http.ResponseWriter, data any) { JSON(w, http.StatusOK, Envelope{Data: data}) }

// Created writes a 201 with the data wrapped in an envelope.
func Created(w http.ResponseWriter, data any) { JSON(w, http.StatusCreated, Envelope{Data: data}) }

// Error writes a status code plus a safe, human-readable message. Internal
// details are never leaked; callers log the underlying error themselves.
func Error(w http.ResponseWriter, status int, msg string) {
	JSON(w, status, Envelope{Error: msg})
}

// DecodeJSON strictly decodes the request body into dst, rejecting unknown
// fields and oversized payloads to limit attack surface.
func DecodeJSON(w http.ResponseWriter, r *http.Request, dst any) error {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20) // 1 MiB cap
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return errors.New("invalid request body")
	}
	if dec.More() {
		return errors.New("request body must contain a single JSON object")
	}
	return nil
}
