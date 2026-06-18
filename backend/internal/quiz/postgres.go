package quiz

import (
	"context"
	_ "embed"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed schema.sql
var schemaSQL string

// PostgresRepository persists the quiz domain in PostgreSQL.
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

// ----- Levels -----

const levelCols = `l.id, l.number, l.title, l.description, l.difficulty, l.pass_score, l.draw_count, l.created_at`

// listLevelsQuery joins a question count so the UI can show progress at a glance.
const listLevelsQuery = `SELECT ` + levelCols + `, COALESCE(c.cnt,0)
	FROM levels l
	LEFT JOIN (SELECT level_id, count(*) cnt FROM questions GROUP BY level_id) c ON c.level_id = l.id
	ORDER BY l.number ASC`

func scanLevel(row pgx.Row) (*Level, error) {
	var l Level
	err := row.Scan(&l.ID, &l.Number, &l.Title, &l.Description, &l.Difficulty,
		&l.PassScore, &l.DrawCount, &l.CreatedAt, &l.QuestionTotal)
	if err != nil {
		return nil, err
	}
	return &l, nil
}

func (r *PostgresRepository) ListLevels(ctx context.Context) ([]Level, error) {
	rows, err := r.pool.Query(ctx, listLevelsQuery)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Level{}
	for rows.Next() {
		l, err := scanLevel(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *l)
	}
	return out, rows.Err()
}

func (r *PostgresRepository) GetLevel(ctx context.Context, id string) (*Level, error) {
	const q = `SELECT ` + levelCols + `, COALESCE((SELECT count(*) FROM questions WHERE level_id=l.id),0)
	           FROM levels l WHERE l.id = $1`
	l, err := scanLevel(r.pool.QueryRow(ctx, q, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return l, err
}

func (r *PostgresRepository) GetLevelByNumber(ctx context.Context, n int) (*Level, error) {
	const q = `SELECT ` + levelCols + `, COALESCE((SELECT count(*) FROM questions WHERE level_id=l.id),0)
	           FROM levels l WHERE l.number = $1`
	l, err := scanLevel(r.pool.QueryRow(ctx, q, n))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return l, err
}

func (r *PostgresRepository) CreateLevel(ctx context.Context, in LevelInput) (*Level, error) {
	const q = `INSERT INTO levels (number, title, description, difficulty, pass_score, draw_count)
	           VALUES ($1,$2,$3,$4,$5,$6)
	           RETURNING id, number, title, description, difficulty, pass_score, draw_count, created_at, 0`
	l, err := scanLevel(r.pool.QueryRow(ctx, q, in.Number, in.Title, in.Description,
		in.Difficulty, in.PassScore, in.DrawCount))
	if isUniqueViolation(err) {
		return nil, ErrValidation{"a level with that number already exists"}
	}
	return l, err
}

func (r *PostgresRepository) UpdateLevel(ctx context.Context, id string, in LevelInput) (*Level, error) {
	const q = `UPDATE levels SET number=$1, title=$2, description=$3, difficulty=$4,
	           pass_score=$5, draw_count=$6 WHERE id=$7
	           RETURNING id, number, title, description, difficulty, pass_score, draw_count, created_at,
	           COALESCE((SELECT count(*) FROM questions WHERE level_id=$7),0)`
	l, err := scanLevel(r.pool.QueryRow(ctx, q, in.Number, in.Title, in.Description,
		in.Difficulty, in.PassScore, in.DrawCount, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if isUniqueViolation(err) {
		return nil, ErrValidation{"a level with that number already exists"}
	}
	return l, err
}

func (r *PostgresRepository) DeleteLevel(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM levels WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *PostgresRepository) CountLevels(ctx context.Context) (int, error) {
	var n int
	err := r.pool.QueryRow(ctx, `SELECT count(*) FROM levels`).Scan(&n)
	return n, err
}

// PassedLevelNumbers returns the level numbers a user has ever passed.
func (r *PostgresRepository) PassedLevelNumbers(ctx context.Context, userID string) (map[int]bool, error) {
	out := map[int]bool{}
	if userID == "" {
		return out, nil
	}
	rows, err := r.pool.Query(ctx, `
		SELECT DISTINCT l.number
		FROM quiz_attempts a
		JOIN levels l ON l.id = a.level_id
		WHERE a.user_id = $1 AND a.passed = true`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var n int
		if err := rows.Scan(&n); err != nil {
			return nil, err
		}
		out[n] = true
	}
	return out, rows.Err()
}

// ----- Questions -----

const questionCols = `id, level_id, prompt, prompt_aksara, options, correct_index, explanation, points, created_at`

func scanQuestion(row pgx.Row) (*Question, error) {
	var q Question
	var rawOptions []byte
	if err := row.Scan(&q.ID, &q.LevelID, &q.Prompt, &q.PromptAksara, &rawOptions,
		&q.CorrectIndex, &q.Explanation, &q.Points, &q.CreatedAt); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(rawOptions, &q.Options); err != nil {
		return nil, err
	}
	return &q, nil
}

func (r *PostgresRepository) ListQuestions(ctx context.Context, levelID string) ([]Question, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+questionCols+` FROM questions WHERE level_id = $1 ORDER BY created_at ASC`, levelID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return collectQuestions(rows)
}

func (r *PostgresRepository) GetQuestionsByIDs(ctx context.Context, ids []string) ([]Question, error) {
	if len(ids) == 0 {
		return []Question{}, nil
	}
	rows, err := r.pool.Query(ctx,
		`SELECT `+questionCols+` FROM questions WHERE id = ANY($1::uuid[])`, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return collectQuestions(rows)
}

func collectQuestions(rows pgx.Rows) ([]Question, error) {
	out := []Question{}
	for rows.Next() {
		q, err := scanQuestion(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *q)
	}
	return out, rows.Err()
}

func (r *PostgresRepository) CreateQuestion(ctx context.Context, levelID string, in QuestionInput) (*Question, error) {
	opts, err := json.Marshal(in.Options)
	if err != nil {
		return nil, err
	}
	const q = `INSERT INTO questions (level_id, prompt, prompt_aksara, options, correct_index, explanation, points)
	           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ` + questionCols
	res, err := scanQuestion(r.pool.QueryRow(ctx, q, levelID, in.Prompt, in.PromptAksara,
		opts, in.CorrectIndex, in.Explanation, in.Points))
	if isForeignKeyViolation(err) {
		return nil, ErrNotFound
	}
	return res, err
}

func (r *PostgresRepository) UpdateQuestion(ctx context.Context, id string, in QuestionInput) (*Question, error) {
	opts, err := json.Marshal(in.Options)
	if err != nil {
		return nil, err
	}
	const q = `UPDATE questions SET prompt=$1, prompt_aksara=$2, options=$3, correct_index=$4,
	           explanation=$5, points=$6 WHERE id=$7 RETURNING ` + questionCols
	res, err := scanQuestion(r.pool.QueryRow(ctx, q, in.Prompt, in.PromptAksara, opts,
		in.CorrectIndex, in.Explanation, in.Points, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return res, err
}

func (r *PostgresRepository) DeleteQuestion(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM questions WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ----- Sessions & attempts -----

func (r *PostgresRepository) CreateSession(ctx context.Context, levelID string, questionIDs []string, expiresAt time.Time) (string, error) {
	ids, err := json.Marshal(questionIDs)
	if err != nil {
		return "", err
	}
	var id string
	err = r.pool.QueryRow(ctx,
		`INSERT INTO quiz_sessions (level_id, question_ids, expires_at) VALUES ($1,$2,$3) RETURNING id`,
		levelID, ids, expiresAt).Scan(&id)
	return id, err
}

func (r *PostgresRepository) GetSession(ctx context.Context, id string) (*Session, error) {
	var s Session
	var rawIDs []byte
	err := r.pool.QueryRow(ctx,
		`SELECT id, level_id, question_ids, submitted, created_at, expires_at FROM quiz_sessions WHERE id = $1`, id).
		Scan(&s.ID, &s.LevelID, &rawIDs, &s.Submitted, &s.CreatedAt, &s.ExpiresAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(rawIDs, &s.QuestionIDs); err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *PostgresRepository) MarkSessionSubmitted(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `UPDATE quiz_sessions SET submitted = true WHERE id = $1`, id)
	return err
}

func (r *PostgresRepository) SaveAttempt(ctx context.Context, a AttemptRecord) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO quiz_attempts
		   (level_id, user_id, username, score, passed, duration_seconds, time_bonus, final_points)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		a.LevelID, a.UserID, a.Username, a.Score, a.Passed,
		a.DurationSeconds, a.TimeBonus, a.FinalPoints)
	return err
}

// Leaderboard ranks players by the sum of their best final-points per level
// (accuracy + speed bonus). For the per-level best run we also keep its
// duration, and total time across levels breaks ties (faster ranks higher).
// COALESCE keeps pre-timing attempts working by falling back to the accuracy
// score as points.
func (r *PostgresRepository) Leaderboard(ctx context.Context, limit int) ([]LeaderboardEntry, error) {
	const q = `
		SELECT MAX(username) AS name,
		       SUM(best_points)::int AS total_points,
		       SUM(best_time)::int AS total_seconds,
		       SUM(CASE WHEN passed_any THEN 1 ELSE 0 END)::int AS levels_cleared,
		       SUM(plays)::int AS plays
		FROM (
		    SELECT user_id, MAX(username) AS username, level_id,
		           MAX(COALESCE(NULLIF(final_points,0), score)) AS best_points,
		           MIN(COALESCE(duration_seconds,0)) AS best_time,
		           bool_or(passed) AS passed_any,
		           COUNT(*) AS plays
		    FROM quiz_attempts
		    WHERE user_id IS NOT NULL
		    GROUP BY user_id, level_id
		) t
		GROUP BY user_id
		ORDER BY total_points DESC, total_seconds ASC
		LIMIT $1`
	rows, err := r.pool.Query(ctx, q, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []LeaderboardEntry{}
	rank := 0
	for rows.Next() {
		rank++
		var e LeaderboardEntry
		if err := rows.Scan(&e.Name, &e.TotalScore, &e.TotalSeconds, &e.LevelsCleared, &e.Plays); err != nil {
			return nil, err
		}
		e.Rank = rank
		out = append(out, e)
	}
	return out, rows.Err()
}

// ----- error classification -----

func isUniqueViolation(err error) bool     { return pgErrCode(err) == "23505" }
func isForeignKeyViolation(err error) bool { return pgErrCode(err) == "23503" }

func pgErrCode(err error) string {
	type coder interface{ SQLState() string }
	var c coder
	if errors.As(err, &c) {
		return c.SQLState()
	}
	return ""
}
