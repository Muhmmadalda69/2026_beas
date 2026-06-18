// Package wiki owns the encyclopedia content about Aksara Sunda: articles,
// their categories, public read access and admin-only writes.
package wiki

import (
	"context"
	"errors"
	"time"
)

// ErrNotFound is returned when an article does not exist.
var ErrNotFound = errors.New("article not found")

// ErrValidation wraps a user-facing validation message.
type ErrValidation struct{ Msg string }

func (e ErrValidation) Error() string { return e.Msg }

// Article is a single encyclopedia entry.
type Article struct {
	ID          string    `json:"id"`
	Slug        string    `json:"slug"`
	Title       string    `json:"title"`
	TitleAksara string    `json:"title_aksara"`
	Category    string    `json:"category"`
	Summary     string    `json:"summary"`
	Content     string    `json:"content"` // Markdown
	ReadMinutes int       `json:"read_minutes"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// ArticleInput is the mutable payload accepted from admins.
type ArticleInput struct {
	Title       string `json:"title"`
	TitleAksara string `json:"title_aksara"`
	Category    string `json:"category"`
	Summary     string `json:"summary"`
	Content     string `json:"content"`
}

// ListFilter narrows a public listing.
type ListFilter struct {
	Category string
	Search   string
}

// Repository is the persistence port for articles.
type Repository interface {
	List(ctx context.Context, f ListFilter) ([]Article, error)
	GetBySlug(ctx context.Context, slug string) (*Article, error)
	Create(ctx context.Context, a Article) (*Article, error)
	Update(ctx context.Context, id string, a Article) (*Article, error)
	Delete(ctx context.Context, id string) error
	Categories(ctx context.Context) ([]string, error)
}
