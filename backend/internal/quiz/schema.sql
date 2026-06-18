CREATE TABLE IF NOT EXISTS levels (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number      INT UNIQUE NOT NULL,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    difficulty  TEXT NOT NULL DEFAULT 'umum',
    pass_score  INT NOT NULL DEFAULT 60,
    draw_count  INT NOT NULL DEFAULT 5,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level_id      UUID NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    prompt        TEXT NOT NULL,
    prompt_aksara TEXT NOT NULL DEFAULT '',
    options       JSONB NOT NULL,
    correct_index INT NOT NULL,
    explanation   TEXT NOT NULL DEFAULT '',
    points        INT NOT NULL DEFAULT 10,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_questions_level ON questions(level_id);

CREATE TABLE IF NOT EXISTS quiz_sessions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level_id     UUID NOT NULL,
    question_ids JSONB NOT NULL,
    submitted    BOOLEAN NOT NULL DEFAULT false,
    expires_at   TIMESTAMPTZ NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level_id   UUID NOT NULL,
    score      INT NOT NULL,
    passed     BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Player identity for the leaderboard (null for anonymous attempts, which are
-- not recorded; columns added idempotently for existing deployments).
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS username TEXT;
-- Timed scoring: server-measured duration, speed bonus, and combined points.
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS duration_seconds INT NOT NULL DEFAULT 0;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS time_bonus INT NOT NULL DEFAULT 0;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS final_points INT NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_attempts_user ON quiz_attempts(user_id);
