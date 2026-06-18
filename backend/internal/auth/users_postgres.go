package auth

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

// User persistence methods on the shared PostgresRepository.

func scanUser(row pgx.Row) (*User, string, error) {
	var u User
	var hash *string
	err := row.Scan(&u.ID, &u.Email, &u.Name, &hash, &u.Provider, &u.Role, &u.CreatedAt)
	if err != nil {
		return nil, "", err
	}
	h := ""
	if hash != nil {
		h = *hash
	}
	return &u, h, nil
}

const userCols = `id, email, name, password_hash, provider, role, created_at`

// GetUserByEmail returns the user and password hash, or (nil,"",nil) if absent.
func (r *PostgresRepository) GetUserByEmail(ctx context.Context, email string) (*User, string, error) {
	u, h, err := scanUser(r.pool.QueryRow(ctx, `SELECT `+userCols+` FROM users WHERE email = $1`, email))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, "", nil
	}
	if err != nil {
		return nil, "", err
	}
	return u, h, nil
}

// GetUserByProvider looks up a user by external identity.
func (r *PostgresRepository) GetUserByProvider(ctx context.Context, provider, sub string) (*User, error) {
	u, _, err := scanUser(r.pool.QueryRow(ctx,
		`SELECT `+userCols+` FROM users WHERE provider = $1 AND provider_sub = $2`, provider, sub))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return u, nil
}

// CreateUser inserts a new user. passwordHash and sub may be empty.
func (r *PostgresRepository) CreateUser(ctx context.Context, email, name, passwordHash, provider, sub string) (*User, error) {
	var hashArg *string
	if passwordHash != "" {
		hashArg = &passwordHash
	}
	const q = `INSERT INTO users (email, name, password_hash, provider, provider_sub, role)
	           VALUES ($1,$2,$3,$4,$5,'user')
	           RETURNING ` + userCols
	u, _, err := scanUser(r.pool.QueryRow(ctx, q, email, name, hashArg, provider, sub))
	if isUniqueViolationAuth(err) {
		return nil, ErrEmailTaken
	}
	return u, err
}

func isUniqueViolationAuth(err error) bool {
	type coder interface{ SQLState() string }
	var c coder
	if errors.As(err, &c) {
		return c.SQLState() == "23505"
	}
	return false
}
