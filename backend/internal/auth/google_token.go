package auth

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// errGoogleNotConfigured is returned when no accepted Google client ID is set,
// so the handler can answer 503 rather than a generic auth failure.
var errGoogleNotConfigured = errors.New("google client id not configured")

type googleIdentity struct {
	sub   string
	email string
	name  string
}

var googleHTTPClient = &http.Client{Timeout: 10 * time.Second}

// verifyGoogleIDToken validates a Google id_token using Google's tokeninfo
// endpoint and checks that its audience matches the configured client ID. This
// avoids pulling in a JWKS/JWT verification dependency while still being secure:
// Google only returns 200 for tokens it signed and that are unexpired, and we
// additionally pin the audience and issuer.
func verifyGoogleIDToken(ctx context.Context, idToken string, clientIDs []string) (googleIdentity, error) {
	// Accept the id_token if its audience matches any configured client ID.
	// Different platforms mint id_tokens with their own client ID as `aud`
	// (web for the website, iOS/Android for the mobile app), so the backend
	// must trust the whole set — not just the web client.
	accepted := make([]string, 0, len(clientIDs))
	for _, id := range clientIDs {
		if s := strings.TrimSpace(id); s != "" {
			accepted = append(accepted, s)
		}
	}
	if len(accepted) == 0 {
		return googleIdentity{}, errGoogleNotConfigured
	}

	endpoint := "https://oauth2.googleapis.com/tokeninfo?id_token=" +
		url.QueryEscape(idToken)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return googleIdentity{}, err
	}
	res, err := googleHTTPClient.Do(req)
	if err != nil {
		return googleIdentity{}, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return googleIdentity{}, errors.New("invalid token")
	}

	var payload struct {
		Aud           string `json:"aud"`
		Sub           string `json:"sub"`
		Email         string `json:"email"`
		EmailVerified string `json:"email_verified"`
		Name          string `json:"name"`
		Iss           string `json:"iss"`
	}
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		return googleIdentity{}, err
	}

	audOK := false
	for _, id := range accepted {
		if payload.Aud == id {
			audOK = true
			break
		}
	}
	if !audOK {
		return googleIdentity{}, errors.New("audience mismatch")
	}
	if payload.Iss != "accounts.google.com" &&
		payload.Iss != "https://accounts.google.com" {
		return googleIdentity{}, errors.New("issuer mismatch")
	}
	if payload.Sub == "" || payload.Email == "" {
		return googleIdentity{}, errors.New("incomplete profile")
	}
	if payload.EmailVerified != "true" {
		return googleIdentity{}, errors.New("email not verified")
	}

	return googleIdentity{
		sub:   payload.Sub,
		email: payload.Email,
		name:  payload.Name,
	}, nil
}
