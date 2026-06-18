package auth

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"galuhaksara/internal/platform/jwt"
	"galuhaksara/internal/platform/password"
)

// Service implements the authentication use cases.
type Service struct {
	repo Repository
	jwt  *jwt.Manager
	log  *slog.Logger
}

// NewService constructs the auth service.
func NewService(repo Repository, jwtMgr *jwt.Manager, log *slog.Logger) *Service {
	return &Service{repo: repo, jwt: jwtMgr, log: log}
}

// LoginResult is returned to the transport layer on successful login.
type LoginResult struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expires_at"`
	Admin     *Admin    `json:"admin"`
}

// Login verifies credentials and issues a signed access token. To resist user
// enumeration and timing attacks, a bcrypt comparison runs even when the user
// does not exist, and all failures return the same generic error.
func (s *Service) Login(ctx context.Context, username, plain string) (*LoginResult, error) {
	username = strings.TrimSpace(strings.ToLower(username))
	admin, err := s.repo.GetByUsername(ctx, username)
	if err != nil {
		return nil, err
	}

	hash := dummyHash
	if admin != nil {
		hash = admin.PasswordHash
	}
	if !password.Verify(hash, plain) || admin == nil {
		return nil, ErrInvalidCredentials
	}

	token, expiresAt, err := s.jwt.Generate(admin.ID, admin.Username, admin.Role)
	if err != nil {
		return nil, err
	}
	return &LoginResult{Token: token, ExpiresAt: expiresAt, Admin: admin}, nil
}

// SeedDefaultAdmin creates an initial admin when none exist, so a fresh
// deployment is immediately usable.
func (s *Service) SeedDefaultAdmin(ctx context.Context, username, plain string, usingDefault bool) error {
	n, err := s.repo.Count(ctx)
	if err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	hash, err := password.Hash(plain)
	if err != nil {
		return err
	}
	// The bootstrap account is a superadmin so the system is fully manageable.
	if _, err := s.repo.Create(ctx, strings.ToLower(username), hash, RoleSuperadmin); err != nil {
		return err
	}
	if usingDefault {
		s.log.Warn("seeded default superadmin with built-in password — change ADMIN_PASSWORD in production", "username", username)
	} else {
		s.log.Info("seeded superadmin", "username", username)
	}
	return nil
}

// EnsureSuperadmin guarantees at least one superadmin exists. On an existing
// deployment that only had plain admins, it promotes the configured account so
// RBAC remains operable after upgrade.
func (s *Service) EnsureSuperadmin(ctx context.Context, username string) error {
	n, err := s.repo.CountByRole(ctx, RoleSuperadmin)
	if err != nil || n > 0 {
		return err
	}
	username = strings.ToLower(strings.TrimSpace(username))
	if err := s.repo.SetRole(ctx, username, RoleSuperadmin); err != nil {
		return err
	}
	s.log.Warn("no superadmin found — promoted account to superadmin", "username", username)
	return nil
}

// ListAdmins returns all admin accounts (superadmin only).
func (s *Service) ListAdmins(ctx context.Context) ([]Admin, error) {
	return s.repo.List(ctx)
}

// CreateAdmin creates a new admin/superadmin account (superadmin only).
func (s *Service) CreateAdmin(ctx context.Context, username, plain, role string) (*Admin, error) {
	username = strings.ToLower(strings.TrimSpace(username))
	if len(username) < 3 {
		return nil, ErrValidationUser("nama pengguna minimal 3 karakter")
	}
	if len(plain) < 8 {
		return nil, ErrValidationUser("kata sandi minimal 8 karakter")
	}
	if role != RoleAdmin && role != RoleSuperadmin {
		return nil, ErrValidationUser("peran tidak valid")
	}
	if existing, err := s.repo.GetByUsername(ctx, username); err != nil {
		return nil, err
	} else if existing != nil {
		return nil, ErrValidationUser("nama pengguna sudah dipakai")
	}
	hash, err := password.Hash(plain)
	if err != nil {
		return nil, err
	}
	return s.repo.Create(ctx, username, hash, role)
}

// DeleteAdmin removes an admin, refusing to delete the final superadmin.
func (s *Service) DeleteAdmin(ctx context.Context, id string) error {
	admins, err := s.repo.List(ctx)
	if err != nil {
		return err
	}
	var target *Admin
	for i := range admins {
		if admins[i].ID == id {
			target = &admins[i]
			break
		}
	}
	if target == nil {
		return ErrAdminNotFound
	}
	if target.Role == RoleSuperadmin {
		supers := 0
		for _, a := range admins {
			if a.Role == RoleSuperadmin {
				supers++
			}
		}
		if supers <= 1 {
			return ErrLastSuperadmin
		}
	}
	return s.repo.Delete(ctx, id)
}

// dummyHash is a valid bcrypt hash of a random string. Comparing against it for
// unknown users keeps login latency constant regardless of user existence.
const dummyHash = "$2a$12$C6UzMDM.H6dfI/f/IKcEeO3Wy1xQzQ9eGFNkZ3sVcJ8e1nKQ6m3iK"
