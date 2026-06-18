// Package auth owns admin identity and authentication. It exposes login and
// token issuance; every other service trusts the JWTs it mints.
package auth

import (
	"context"
	"errors"
	"time"
)

// ErrInvalidCredentials is returned for any failed login. It is intentionally
// generic so as not to reveal whether a username exists.
var ErrInvalidCredentials = errors.New("invalid username or password")

// Admin roles, ordered by privilege. superadmin can manage admins and view
// developer documentation; admin can manage content only.
const (
	RoleSuperadmin = "superadmin"
	RoleAdmin      = "admin"
)

// ErrAdminNotFound is returned when an admin account does not exist.
var ErrAdminNotFound = errors.New("admin not found")

// ErrLastSuperadmin guards against removing the only superadmin.
var ErrLastSuperadmin = errors.New("cannot remove the last superadmin")

// Admin is a back-office user allowed to manage content.
type Admin struct {
	ID           string    `json:"id"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"-"` // never serialised
	Role         string    `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
}

// Repository is the persistence port for admins.
type Repository interface {
	GetByUsername(ctx context.Context, username string) (*Admin, error)
	Create(ctx context.Context, username, passwordHash, role string) (*Admin, error)
	Count(ctx context.Context) (int, error)
	List(ctx context.Context) ([]Admin, error)
	Delete(ctx context.Context, id string) error
	SetRole(ctx context.Context, username, role string) error
	CountByRole(ctx context.Context, role string) (int, error)
}
