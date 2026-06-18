package auth

import (
	"context"
	"errors"
	"log/slog"
	"strings"
	"time"
	"unicode/utf8"

	"galuhaksara/internal/platform/jwt"
	"galuhaksara/internal/platform/password"
)

var (
	// ErrEmailTaken is returned when registering an already-used email.
	ErrEmailTaken = errors.New("email already registered")
	// ErrUserNotFound is returned for unknown users.
	ErrUserNotFound = errors.New("user not found")
)

// User is an end-user (quiz player), distinct from an Admin.
type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Provider  string    `json:"provider"` // "password" or "google"
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

// UserRepository is the persistence port for users.
type UserRepository interface {
	GetUserByEmail(ctx context.Context, email string) (*User, string, error) // also returns password hash
	GetUserByProvider(ctx context.Context, provider, sub string) (*User, error)
	CreateUser(ctx context.Context, email, name, passwordHash, provider, sub string) (*User, error)
}

// UserService implements user registration, login and OAuth upsert.
type UserService struct {
	repo UserRepository
	jwt  *jwt.Manager
	log  *slog.Logger
}

// NewUserService constructs the user service.
func NewUserService(repo UserRepository, jwtMgr *jwt.Manager, log *slog.Logger) *UserService {
	return &UserService{repo: repo, jwt: jwtMgr, log: log}
}

// UserAuthResult is returned on successful auth.
type UserAuthResult struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expires_at"`
	User      *User     `json:"user"`
}

// Register creates a password-based user account.
func (s *UserService) Register(ctx context.Context, email, name, plain string) (*UserAuthResult, error) {
	email = normalizeEmail(email)
	name = strings.TrimSpace(name)
	if !validEmail(email) {
		return nil, ErrValidationUser("email tidak valid")
	}
	if utf8.RuneCountInString(name) < 2 {
		return nil, ErrValidationUser("nama minimal 2 karakter")
	}
	if utf8.RuneCountInString(plain) < 8 {
		return nil, ErrValidationUser("kata sandi minimal 8 karakter")
	}
	if existing, _, err := s.repo.GetUserByEmail(ctx, email); err != nil {
		return nil, err
	} else if existing != nil {
		return nil, ErrEmailTaken
	}
	hash, err := password.Hash(plain)
	if err != nil {
		return nil, err
	}
	user, err := s.repo.CreateUser(ctx, email, name, hash, "password", "")
	if err != nil {
		return nil, err
	}
	return s.issue(user)
}

// Login authenticates a password-based user.
func (s *UserService) Login(ctx context.Context, email, plain string) (*UserAuthResult, error) {
	email = normalizeEmail(email)
	user, hash, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	storedHash := dummyHash
	if user != nil && hash != "" {
		storedHash = hash
	}
	if !password.Verify(storedHash, plain) || user == nil || hash == "" {
		return nil, ErrInvalidCredentials
	}
	return s.issue(user)
}

// OAuthUpsert finds or creates a user from a verified external identity (e.g.
// Google) and issues a token. The caller must have verified the identity.
func (s *UserService) OAuthUpsert(ctx context.Context, provider, sub, email, name string) (*UserAuthResult, error) {
	email = normalizeEmail(email)
	if provider == "" || sub == "" {
		return nil, ErrValidationUser("provider dan sub wajib diisi")
	}
	// Try by provider identity first, then by email (link accounts).
	user, err := s.repo.GetUserByProvider(ctx, provider, sub)
	if err != nil {
		return nil, err
	}
	if user == nil {
		if byEmail, _, err := s.repo.GetUserByEmail(ctx, email); err != nil {
			return nil, err
		} else if byEmail != nil {
			user = byEmail
		}
	}
	if user == nil {
		if name == "" {
			name = strings.SplitN(email, "@", 2)[0]
		}
		user, err = s.repo.CreateUser(ctx, email, name, "", provider, sub)
		if err != nil {
			return nil, err
		}
	}
	return s.issue(user)
}

func (s *UserService) issue(user *User) (*UserAuthResult, error) {
	token, expiresAt, err := s.jwt.Generate(user.ID, user.Name, user.Role)
	if err != nil {
		return nil, err
	}
	return &UserAuthResult{Token: token, ExpiresAt: expiresAt, User: user}, nil
}

// ErrValidationUser is a user-facing validation error for the user flows.
type ErrValidationUser string

func (e ErrValidationUser) Error() string { return string(e) }

func normalizeEmail(s string) string { return strings.ToLower(strings.TrimSpace(s)) }

func validEmail(s string) bool {
	at := strings.IndexByte(s, '@')
	return at > 0 && at < len(s)-1 && strings.Contains(s[at:], ".")
}
