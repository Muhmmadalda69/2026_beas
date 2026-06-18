package auth

import (
	"context"
	_ "embed"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed schema.sql
var schemaSQL string

// PostgresRepository persists admins in PostgreSQL.
type PostgresRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresRepository wires the repository to a connection pool.
func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

// Migrate creates the schema if it does not yet exist.
func (r *PostgresRepository) Migrate(ctx context.Context) error {
	_, err := r.pool.Exec(ctx, schemaSQL)
	return err
}

// GetByUsername looks up an admin; returns (nil, nil) when not found.
func (r *PostgresRepository) GetByUsername(ctx context.Context, username string) (*Admin, error) {
	const q = `SELECT id, username, password_hash, role, created_at
	           FROM admins WHERE username = $1`
	var a Admin
	err := r.pool.QueryRow(ctx, q, username).
		Scan(&a.ID, &a.Username, &a.PasswordHash, &a.Role, &a.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &a, nil
}

// Create inserts a new admin and returns the stored row.
func (r *PostgresRepository) Create(ctx context.Context, username, hash, role string) (*Admin, error) {
	const q = `INSERT INTO admins (username, password_hash, role)
	           VALUES ($1, $2, $3)
	           RETURNING id, username, password_hash, role, created_at`
	var a Admin
	err := r.pool.QueryRow(ctx, q, username, hash, role).
		Scan(&a.ID, &a.Username, &a.PasswordHash, &a.Role, &a.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

// Count returns the number of admins, used to decide whether to seed.
func (r *PostgresRepository) Count(ctx context.Context) (int, error) {
	var n int
	err := r.pool.QueryRow(ctx, `SELECT count(*) FROM admins`).Scan(&n)
	return n, err
}

// List returns all admin accounts ordered by creation time.
func (r *PostgresRepository) List(ctx context.Context) ([]Admin, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, username, password_hash, role, created_at FROM admins ORDER BY created_at ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Admin{}
	for rows.Next() {
		var a Admin
		if err := rows.Scan(&a.ID, &a.Username, &a.PasswordHash, &a.Role, &a.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

// Delete removes an admin by id.
func (r *PostgresRepository) Delete(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM admins WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrAdminNotFound
	}
	return nil
}

// SetRole updates an admin's role (used to ensure a superadmin exists).
func (r *PostgresRepository) SetRole(ctx context.Context, username, role string) error {
	_, err := r.pool.Exec(ctx, `UPDATE admins SET role = $1 WHERE username = $2`, role, username)
	return err
}

// CountByRole counts admins with a given role.
func (r *PostgresRepository) CountByRole(ctx context.Context, role string) (int, error) {
	var n int
	err := r.pool.QueryRow(ctx, `SELECT count(*) FROM admins WHERE role = $1`, role).Scan(&n)
	return n, err
}
