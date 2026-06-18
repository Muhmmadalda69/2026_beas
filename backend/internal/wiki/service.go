package wiki

import (
	"context"
	"regexp"
	"strings"
	"unicode/utf8"
)

// Service implements the wiki use cases on top of a Repository.
type Service struct {
	repo Repository
}

// NewService constructs the wiki service.
func NewService(repo Repository) *Service { return &Service{repo: repo} }

// List returns articles matching the filter.
func (s *Service) List(ctx context.Context, f ListFilter) ([]Article, error) {
	return s.repo.List(ctx, f)
}

// Get returns a single article by slug.
func (s *Service) Get(ctx context.Context, slug string) (*Article, error) {
	return s.repo.GetBySlug(ctx, slug)
}

// Categories returns the distinct category names.
func (s *Service) Categories(ctx context.Context) ([]string, error) {
	return s.repo.Categories(ctx)
}

// Create validates input, derives slug + read time, and persists a new article.
func (s *Service) Create(ctx context.Context, in ArticleInput) (*Article, error) {
	a, err := buildArticle(in)
	if err != nil {
		return nil, err
	}
	a.Slug = Slugify(in.Title)
	return s.repo.Create(ctx, a)
}

// Update validates and persists changes to an existing article.
func (s *Service) Update(ctx context.Context, id string, in ArticleInput) (*Article, error) {
	a, err := buildArticle(in)
	if err != nil {
		return nil, err
	}
	a.Slug = Slugify(in.Title)
	return s.repo.Update(ctx, id, a)
}

// Delete removes an article by id.
func (s *Service) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func buildArticle(in ArticleInput) (Article, error) {
	in.Title = strings.TrimSpace(in.Title)
	in.Category = strings.TrimSpace(in.Category)
	in.Summary = strings.TrimSpace(in.Summary)
	in.Content = strings.TrimSpace(in.Content)
	if utf8.RuneCountInString(in.Title) < 3 {
		return Article{}, ErrValidation{"title must be at least 3 characters"}
	}
	if in.Category == "" {
		return Article{}, ErrValidation{"category is required"}
	}
	if utf8.RuneCountInString(in.Content) < 10 {
		return Article{}, ErrValidation{"content is too short"}
	}
	return Article{
		Title:       in.Title,
		TitleAksara: strings.TrimSpace(in.TitleAksara),
		Category:    in.Category,
		Summary:     in.Summary,
		Content:     in.Content,
		ReadMinutes: readMinutes(in.Content),
	}, nil
}

// readMinutes estimates reading time at ~200 words per minute (min 1).
func readMinutes(content string) int {
	words := len(strings.Fields(content))
	m := words / 200
	if m < 1 {
		return 1
	}
	return m
}

var (
	nonSlug   = regexp.MustCompile(`[^a-z0-9]+`)
	trimDash  = regexp.MustCompile(`^-+|-+$`)
	multiDash = regexp.MustCompile(`-{2,}`)
)

// Slugify converts a title into a URL-safe slug.
func Slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = nonSlug.ReplaceAllString(s, "-")
	s = multiDash.ReplaceAllString(s, "-")
	s = trimDash.ReplaceAllString(s, "")
	if s == "" {
		s = "artikel"
	}
	return s
}
