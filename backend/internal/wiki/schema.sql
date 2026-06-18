CREATE TABLE IF NOT EXISTS articles (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug         TEXT UNIQUE NOT NULL,
    title        TEXT NOT NULL,
    title_aksara TEXT NOT NULL DEFAULT '',
    category     TEXT NOT NULL,
    summary      TEXT NOT NULL DEFAULT '',
    content      TEXT NOT NULL,
    read_minutes INT NOT NULL DEFAULT 1,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
