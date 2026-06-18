// Package quiz owns the leveled quiz game: levels of increasing difficulty,
// their questions, randomized play sessions and secure server-side scoring.
package quiz

import (
	"context"
	"errors"
	"time"
)

var (
	// ErrNotFound is returned when a level, question or session is missing.
	ErrNotFound = errors.New("not found")
	// ErrLevelLocked is returned when a player tries a level before passing the
	// previous one.
	ErrLevelLocked = errors.New("level masih terkunci")
	// ErrSessionExpired is returned when a play session is too old to submit.
	ErrSessionExpired = errors.New("quiz session expired")
	// ErrSessionUsed is returned when a session was already submitted.
	ErrSessionUsed = errors.New("quiz session already submitted")
	// ErrNoQuestions is returned when a level has no questions to play.
	ErrNoQuestions = errors.New("level has no questions yet")
)

// ErrValidation carries a user-facing validation message.
type ErrValidation struct{ Msg string }

func (e ErrValidation) Error() string { return e.Msg }

// Level is a difficulty tier. Higher Number means harder.
type Level struct {
	ID            string    `json:"id"`
	Number        int       `json:"number"`
	Title         string    `json:"title"`
	Description   string    `json:"description"`
	Difficulty    string    `json:"difficulty"`
	PassScore     int       `json:"pass_score"` // percentage required to pass
	DrawCount     int       `json:"draw_count"` // questions drawn per play
	QuestionTotal int       `json:"question_total"`
	Unlocked      bool      `json:"unlocked"` // playable by the current viewer (progression)
	CreatedAt     time.Time `json:"created_at"`
}

// LevelInput is the admin-editable payload for a level.
type LevelInput struct {
	Number      int    `json:"number"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Difficulty  string `json:"difficulty"`
	PassScore   int    `json:"pass_score"`
	DrawCount   int    `json:"draw_count"`
}

// Question is a multiple-choice item. CorrectIndex/Explanation are admin-only
// and never leak to players during a session.
type Question struct {
	ID           string    `json:"id"`
	LevelID      string    `json:"level_id"`
	Prompt       string    `json:"prompt"`
	PromptAksara string    `json:"prompt_aksara"`
	Options      []string  `json:"options"`
	CorrectIndex int       `json:"correct_index"`
	Explanation  string    `json:"explanation"`
	Points       int       `json:"points"`
	CreatedAt    time.Time `json:"created_at"`
}

// QuestionInput is the admin-editable payload for a question.
type QuestionInput struct {
	Prompt       string   `json:"prompt"`
	PromptAksara string   `json:"prompt_aksara"`
	Options      []string `json:"options"`
	CorrectIndex int      `json:"correct_index"`
	Explanation  string   `json:"explanation"`
	Points       int      `json:"points"`
}

// PlayQuestion is the redacted question shown to a player (no correct answer).
type PlayQuestion struct {
	ID           string   `json:"id"`
	Prompt       string   `json:"prompt"`
	PromptAksara string   `json:"prompt_aksara"`
	Options      []string `json:"options"` // already shuffled
	Points       int      `json:"points"`
}

// PlaySession is what the player receives when starting a quiz.
type PlaySession struct {
	SessionID string         `json:"session_id"`
	Level     Level          `json:"level"`
	Questions []PlayQuestion `json:"questions"`
	ExpiresAt time.Time      `json:"expires_at"`
}

// Answer is one submitted response.
type Answer struct {
	QuestionID string `json:"question_id"`
	Answer     string `json:"answer"` // the option text the player chose
}

// Result is the graded outcome of a submission.
type Result struct {
	LevelID         string         `json:"level_id"`
	Score           int            `json:"score"` // 0..100 accuracy
	PointsEarned    int            `json:"points_earned"`
	PointsTotal     int            `json:"points_total"`
	CorrectCount    int            `json:"correct_count"`
	Total           int            `json:"total"`
	Passed          bool           `json:"passed"`
	DurationSeconds int            `json:"duration_seconds"` // server-measured
	TimeBonus       int            `json:"time_bonus"`       // speed reward points
	FinalPoints     int            `json:"final_points"`     // accuracy + speed, ranks leaderboard
	Details         []AnswerDetail `json:"details"`
}

// AnswerDetail explains the grading of a single question post-submission.
type AnswerDetail struct {
	QuestionID    string `json:"question_id"`
	Prompt        string `json:"prompt"`
	YourAnswer    string `json:"your_answer"`
	CorrectAnswer string `json:"correct_answer"`
	Correct       bool   `json:"correct"`
	Explanation   string `json:"explanation"`
}

// Session is the persisted record of a drawn quiz, used to grade submissions.
type Session struct {
	ID          string
	LevelID     string
	QuestionIDs []string
	Submitted   bool
	CreatedAt   time.Time // when the quiz was drawn; basis for the timed score
	ExpiresAt   time.Time
}

// Repository is the persistence port for the quiz domain.
type Repository interface {
	ListLevels(ctx context.Context) ([]Level, error)
	GetLevel(ctx context.Context, id string) (*Level, error)
	GetLevelByNumber(ctx context.Context, n int) (*Level, error)
	CreateLevel(ctx context.Context, l LevelInput) (*Level, error)
	UpdateLevel(ctx context.Context, id string, l LevelInput) (*Level, error)
	DeleteLevel(ctx context.Context, id string) error

	ListQuestions(ctx context.Context, levelID string) ([]Question, error)
	GetQuestionsByIDs(ctx context.Context, ids []string) ([]Question, error)
	CreateQuestion(ctx context.Context, levelID string, q QuestionInput) (*Question, error)
	UpdateQuestion(ctx context.Context, id string, q QuestionInput) (*Question, error)
	DeleteQuestion(ctx context.Context, id string) error

	CreateSession(ctx context.Context, levelID string, questionIDs []string, expiresAt time.Time) (string, error)
	GetSession(ctx context.Context, id string) (*Session, error)
	MarkSessionSubmitted(ctx context.Context, id string) error
	SaveAttempt(ctx context.Context, a AttemptRecord) error
	Leaderboard(ctx context.Context, limit int) ([]LeaderboardEntry, error)
	// PassedLevelNumbers returns the set of level numbers a user has passed,
	// used to compute level-progression unlocks.
	PassedLevelNumbers(ctx context.Context, userID string) (map[int]bool, error)

	CountLevels(ctx context.Context) (int, error)
}

// AttemptRecord is one stored, fully-scored quiz attempt.
type AttemptRecord struct {
	LevelID         string
	UserID          string
	Username        string
	Score           int // accuracy 0..100
	Passed          bool
	DurationSeconds int
	TimeBonus       int
	FinalPoints     int
}

// LeaderboardEntry is one ranked player. Players are ranked by the sum of their
// best final-points per level (accuracy + speed), with total time as the
// tie-breaker so faster players edge ahead at equal points.
type LeaderboardEntry struct {
	Rank          int    `json:"rank"`
	Name          string `json:"name"`
	TotalScore    int    `json:"total_score"` // sum of best final-points per level
	TotalSeconds  int    `json:"total_seconds"`
	LevelsCleared int    `json:"levels_cleared"`
	Plays         int    `json:"plays"`
}
