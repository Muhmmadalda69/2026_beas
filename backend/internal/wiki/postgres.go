package wiki

import (
	"context"
	_ "embed"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed schema.sql
var schemaSQL string

// PostgresRepository persists articles in PostgreSQL.
type PostgresRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresRepository wires the repository to a connection pool.
func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

// Migrate creates the schema if needed.
func (r *PostgresRepository) Migrate(ctx context.Context) error {
	_, err := r.pool.Exec(ctx, schemaSQL)
	return err
}

const columns = `id, slug, title, title_aksara, category, summary, content, read_minutes, created_at, updated_at`

func scanArticle(row pgx.Row) (*Article, error) {
	var a Article
	err := row.Scan(&a.ID, &a.Slug, &a.Title, &a.TitleAksara, &a.Category,
		&a.Summary, &a.Content, &a.ReadMinutes, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

// List returns articles ordered by recency, filtered by category/search.
func (r *PostgresRepository) List(ctx context.Context, f ListFilter) ([]Article, error) {
	q := `SELECT ` + columns + ` FROM articles WHERE 1=1`
	args := []any{}
	if f.Category != "" {
		args = append(args, f.Category)
		q += fmt.Sprintf(" AND category = $%d", len(args))
	}
	if f.Search != "" {
		args = append(args, "%"+f.Search+"%")
		q += fmt.Sprintf(" AND (title ILIKE $%d OR summary ILIKE $%d)", len(args), len(args))
	}
	q += " ORDER BY updated_at DESC LIMIT 200"

	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []Article{}
	for rows.Next() {
		a, err := scanArticle(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *a)
	}
	return out, rows.Err()
}

// GetBySlug returns one article or ErrNotFound.
func (r *PostgresRepository) GetBySlug(ctx context.Context, slug string) (*Article, error) {
	a, err := scanArticle(r.pool.QueryRow(ctx, `SELECT `+columns+` FROM articles WHERE slug = $1`, slug))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return a, err
}

// Create inserts an article, resolving slug collisions with a numeric suffix.
func (r *PostgresRepository) Create(ctx context.Context, a Article) (*Article, error) {
	slug, err := r.uniqueSlug(ctx, a.Slug, "")
	if err != nil {
		return nil, err
	}
	const q = `INSERT INTO articles (slug, title, title_aksara, category, summary, content, read_minutes)
	           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ` + columns
	return scanArticle(r.pool.QueryRow(ctx, q, slug, a.Title, a.TitleAksara,
		a.Category, a.Summary, a.Content, a.ReadMinutes))
}

// Update modifies an article by id or returns ErrNotFound.
func (r *PostgresRepository) Update(ctx context.Context, id string, a Article) (*Article, error) {
	slug, err := r.uniqueSlug(ctx, a.Slug, id)
	if err != nil {
		return nil, err
	}
	const q = `UPDATE articles SET slug=$1, title=$2, title_aksara=$3, category=$4,
	           summary=$5, content=$6, read_minutes=$7, updated_at=now()
	           WHERE id=$8 RETURNING ` + columns
	res, err := scanArticle(r.pool.QueryRow(ctx, q, slug, a.Title, a.TitleAksara,
		a.Category, a.Summary, a.Content, a.ReadMinutes, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return res, err
}

// Delete removes an article or returns ErrNotFound.
func (r *PostgresRepository) Delete(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM articles WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// Categories returns distinct category names.
func (r *PostgresRepository) Categories(ctx context.Context) ([]string, error) {
	rows, err := r.pool.Query(ctx, `SELECT DISTINCT category FROM articles ORDER BY category`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []string{}
	for rows.Next() {
		var c string
		if err := rows.Scan(&c); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// uniqueSlug returns base, or base-2/base-3/… if already taken by another row.
func (r *PostgresRepository) uniqueSlug(ctx context.Context, base, excludeID string) (string, error) {
	candidate := base
	for i := 2; ; i++ {
		var existing string
		err := r.pool.QueryRow(ctx,
			`SELECT id FROM articles WHERE slug = $1 AND ($2 = '' OR id <> $2::uuid)`,
			candidate, excludeID).Scan(&existing)
		if errors.Is(err, pgx.ErrNoRows) {
			return candidate, nil
		}
		if err != nil {
			return "", err
		}
		candidate = fmt.Sprintf("%s-%d", base, i)
	}
}
