// Package jwt issues and verifies short-lived HS256 access tokens. It is the
// single source of truth for token claims so that every service validates
// tokens identically using a shared secret.
package jwt

import (
	"errors"
	"fmt"
	"time"

	gojwt "github.com/golang-jwt/jwt/v5"
)

// ErrInvalidToken is returned for any malformed, expired or untrusted token.
var ErrInvalidToken = errors.New("invalid or expired token")

// Claims is the application-specific JWT payload.
type Claims struct {
	Username string `json:"username"`
	Role     string `json:"role"`
	gojwt.RegisteredClaims
}

// Manager signs and parses tokens with a fixed secret and TTL.
type Manager struct {
	secret []byte
	ttl    time.Duration
	issuer string
}

// New builds a Manager. The secret must be kept private to the backend.
func New(secret string, ttl time.Duration) *Manager {
	return &Manager{secret: []byte(secret), ttl: ttl, issuer: "galuh-aksara"}
}

// Generate mints a signed token for the given subject.
func (m *Manager) Generate(adminID, username, role string) (string, time.Time, error) {
	expiresAt := time.Now().Add(m.ttl)
	claims := Claims{
		Username: username,
		Role:     role,
		RegisteredClaims: gojwt.RegisteredClaims{
			Subject:   adminID,
			Issuer:    m.issuer,
			IssuedAt:  gojwt.NewNumericDate(time.Now()),
			ExpiresAt: gojwt.NewNumericDate(expiresAt),
		},
	}
	token := gojwt.NewWithClaims(gojwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(m.secret)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("sign token: %w", err)
	}
	return signed, expiresAt, nil
}

// Parse validates a token's signature, algorithm and expiry, returning claims.
func (m *Manager) Parse(tokenStr string) (*Claims, error) {
	claims := &Claims{}
	_, err := gojwt.ParseWithClaims(tokenStr, claims, func(t *gojwt.Token) (any, error) {
		// Reject any algorithm other than the one we sign with to prevent
		// algorithm-confusion attacks (e.g. "none" or RS256 key reuse).
		if _, ok := t.Method.(*gojwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return m.secret, nil
	}, gojwt.WithValidMethods([]string{"HS256"}), gojwt.WithIssuer(m.issuer))
	if err != nil || claims.Subject == "" {
		return nil, ErrInvalidToken
	}
	return claims, nil
}
