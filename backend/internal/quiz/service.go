package quiz

import (
	"context"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"
)

// sessionTTL bounds how long a drawn quiz remains submittable.
const sessionTTL = 30 * time.Minute

// Timed-scoring tuning. Players earn a speed bonus on the points they actually
// scored: answering correctly AND quickly is rewarded, but only correct answers
// can earn a bonus (so rushing wrong answers gains nothing).
const (
	parSecondsPerQuestion = 20  // "par" pace; finishing at/after this earns no bonus
	maxTimeBonusRate      = 0.5 // an instant perfect run earns up to +50% points
)

// computeTimeBonus returns the speed bonus for a run.
func computeTimeBonus(pointsEarned, questionCount, durationSeconds int) int {
	if pointsEarned <= 0 || questionCount <= 0 {
		return 0
	}
	par := parSecondsPerQuestion * questionCount
	speed := float64(par-durationSeconds) / float64(par) // 1=instant, 0 at par
	if speed <= 0 {
		return 0
	}
	if speed > 1 {
		speed = 1
	}
	return int(float64(pointsEarned)*maxTimeBonusRate*speed + 0.5)
}

// Service implements the quiz use cases.
type Service struct {
	repo Repository
}

// NewService constructs the quiz service.
func NewService(repo Repository) *Service { return &Service{repo: repo} }

// ----- Levels (read) -----

// ListLevels returns all levels (ascending number) with an Unlocked flag
// computed for the given user: the first level is always open; each later level
// unlocks once the player has passed the one before it. An empty userID (guest)
// only unlocks the first level.
func (s *Service) ListLevels(ctx context.Context, userID string) ([]Level, error) {
	levels, err := s.repo.ListLevels(ctx)
	if err != nil {
		return nil, err
	}
	passed, err := s.repo.PassedLevelNumbers(ctx, userID)
	if err != nil {
		return nil, err
	}
	for i := range levels {
		levels[i].Unlocked = i == 0 || passed[levels[i-1].Number]
	}
	return levels, nil
}

// GetLevel returns a single level by id.
func (s *Service) GetLevel(ctx context.Context, id string) (*Level, error) {
	return s.repo.GetLevel(ctx, id)
}

// isLevelUnlocked reports whether the user may play the level with the given id,
// based on having passed the immediately-preceding level.
func (s *Service) isLevelUnlocked(ctx context.Context, levelID, userID string) (bool, error) {
	levels, err := s.repo.ListLevels(ctx)
	if err != nil {
		return false, err
	}
	passed, err := s.repo.PassedLevelNumbers(ctx, userID)
	if err != nil {
		return false, err
	}
	for i := range levels {
		if levels[i].ID == levelID {
			return i == 0 || passed[levels[i-1].Number], nil
		}
	}
	return false, ErrNotFound
}

// ----- Play & grade -----

// Play draws a randomized subset of a level's questions and stores a session so
// the submission can be graded server-side. Both the question selection and the
// option order are shuffled with a CSPRNG on every call.
func (s *Service) Play(ctx context.Context, levelID, userID string) (*PlaySession, error) {
	level, err := s.repo.GetLevel(ctx, levelID)
	if err != nil {
		return nil, err
	}
	// Enforce progression server-side: a level cannot be played until the
	// previous one is passed (UI locking alone is not trustworthy).
	unlocked, err := s.isLevelUnlocked(ctx, levelID, userID)
	if err != nil {
		return nil, err
	}
	if !unlocked {
		return nil, ErrLevelLocked
	}
	all, err := s.repo.ListQuestions(ctx, levelID)
	if err != nil {
		return nil, err
	}
	if len(all) == 0 {
		return nil, ErrNoQuestions
	}

	draw := level.DrawCount
	if draw <= 0 || draw > len(all) {
		draw = len(all)
	}
	picked := pickN(all, draw)

	playQs := make([]PlayQuestion, 0, len(picked))
	ids := make([]string, 0, len(picked))
	for _, q := range picked {
		pq := PlayQuestion{
			ID:        q.ID,
			Type:      q.Type,
			Prompt:    q.Prompt,
			Points:    q.Points,
			ShowGuide: q.ShowGuide,
			Options:   []string{},
		}
		switch q.Type {
		case QuestionWrite:
			// Reveal the target glyph only when tracing; hide it when the
			// player must write from memory (the answer key stays server-side).
			if q.ShowGuide {
				pq.PromptAksara = q.PromptAksara
			}
		case QuestionText:
			// Options are the accepted answers (the key) — never sent to the
			// player; they type their answer freely.
			pq.PromptAksara = q.PromptAksara
		default: // choice
			pq.PromptAksara = q.PromptAksara
			opts := make([]string, len(q.Options))
			copy(opts, q.Options)
			shuffle(opts) // hide the correct option's position
			pq.Options = opts
		}
		playQs = append(playQs, pq)
		ids = append(ids, q.ID)
	}

	expiresAt := time.Now().Add(sessionTTL)
	sessionID, err := s.repo.CreateSession(ctx, levelID, ids, expiresAt)
	if err != nil {
		return nil, err
	}

	return &PlaySession{
		SessionID: sessionID,
		Level:     *level,
		Questions: playQs,
		ExpiresAt: expiresAt,
	}, nil
}

// Leaderboard returns the top-ranked players.
func (s *Service) Leaderboard(ctx context.Context, limit int) ([]LeaderboardEntry, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	return s.repo.Leaderboard(ctx, limit)
}

// Submit grades a player's answers against the stored session. Grading is fully
// server-side: the client never sees correct answers until after submission.
// When userID is non-empty (an authenticated player), the attempt is recorded
// for the leaderboard; anonymous attempts are graded but not recorded.
func (s *Service) Submit(ctx context.Context, sessionID, userID, username string, answers []Answer) (*Result, error) {
	sess, err := s.repo.GetSession(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	if sess.Submitted {
		return nil, ErrSessionUsed
	}
	if time.Now().After(sess.ExpiresAt) {
		return nil, ErrSessionExpired
	}

	questions, err := s.repo.GetQuestionsByIDs(ctx, sess.QuestionIDs)
	if err != nil {
		return nil, err
	}

	// Index answers by question for O(1) lookup.
	given := make(map[string]Answer, len(answers))
	for _, a := range answers {
		a.Answer = strings.TrimSpace(a.Answer)
		given[a.QuestionID] = a
	}

	level, err := s.repo.GetLevel(ctx, sess.LevelID)
	if err != nil {
		return nil, err
	}

	res := &Result{LevelID: sess.LevelID, Total: len(questions)}
	for _, q := range questions {
		ans := given[q.ID]
		res.PointsTotal += q.Points

		if q.Type == QuestionWrite {
			// Server-side similarity grading against the trusted reference mask;
			// points are proportional to how closely the drawing matches.
			score := gradeWrite(q.RefMask, ans.Drawing)
			ok := score >= writeFloor
			if ok {
				res.CorrectCount++
				res.PointsEarned += q.Points * score / 100
			}
			res.Details = append(res.Details, AnswerDetail{
				QuestionID:    q.ID,
				Prompt:        q.Prompt,
				YourAnswer:    fmt.Sprintf("kemiripan %d%%", score),
				CorrectAnswer: q.PromptAksara,
				Correct:       ok,
				Explanation:   q.Explanation,
			})
			continue
		}

		if q.Type == QuestionText {
			// Free text: accept a case-insensitive match against any of the
			// stored accepted answers (q.Options).
			norm := normalizeText(ans.Answer)
			ok := norm != "" && matchesAcceptedAnswer(norm, q.Options)
			if ok {
				res.CorrectCount++
				res.PointsEarned += q.Points
			}
			correct := ""
			if len(q.Options) > 0 {
				correct = q.Options[0]
			}
			res.Details = append(res.Details, AnswerDetail{
				QuestionID:    q.ID,
				Prompt:        q.Prompt,
				YourAnswer:    ans.Answer,
				CorrectAnswer: correct,
				Correct:       ok,
				Explanation:   q.Explanation,
			})
			continue
		}

		correctText := ""
		if q.CorrectIndex >= 0 && q.CorrectIndex < len(q.Options) {
			correctText = q.Options[q.CorrectIndex]
		}
		your := ans.Answer
		ok := your != "" && your == correctText
		if ok {
			res.CorrectCount++
			res.PointsEarned += q.Points
		}
		res.Details = append(res.Details, AnswerDetail{
			QuestionID:    q.ID,
			Prompt:        q.Prompt,
			YourAnswer:    your,
			CorrectAnswer: correctText,
			Correct:       ok,
			Explanation:   q.Explanation,
		})
	}

	if res.PointsTotal > 0 {
		res.Score = res.PointsEarned * 100 / res.PointsTotal
	}
	res.Passed = res.Score >= level.PassScore

	// Time is measured on the server (draw → submit) so it cannot be faked by
	// the client. Faster correct runs earn a speed bonus on top of accuracy.
	res.DurationSeconds = int(time.Since(sess.CreatedAt).Seconds())
	if res.DurationSeconds < 0 {
		res.DurationSeconds = 0
	}
	res.TimeBonus = computeTimeBonus(res.PointsEarned, len(questions), res.DurationSeconds)
	res.FinalPoints = res.PointsEarned + res.TimeBonus

	// Best-effort: record the attempt and burn the session. Failures here must
	// not deny the player their result, so errors are swallowed deliberately.
	_ = s.repo.MarkSessionSubmitted(ctx, sessionID)
	if userID != "" {
		_ = s.repo.SaveAttempt(ctx, AttemptRecord{
			LevelID:         sess.LevelID,
			UserID:          userID,
			Username:        username,
			Score:           res.Score,
			Passed:          res.Passed,
			DurationSeconds: res.DurationSeconds,
			TimeBonus:       res.TimeBonus,
			FinalPoints:     res.FinalPoints,
		})
	}

	return res, nil
}

// ----- Admin: levels -----

// CreateLevel validates and stores a new level.
func (s *Service) CreateLevel(ctx context.Context, in LevelInput) (*Level, error) {
	if err := validateLevel(&in); err != nil {
		return nil, err
	}
	return s.repo.CreateLevel(ctx, in)
}

// UpdateLevel validates and updates an existing level.
func (s *Service) UpdateLevel(ctx context.Context, id string, in LevelInput) (*Level, error) {
	if err := validateLevel(&in); err != nil {
		return nil, err
	}
	return s.repo.UpdateLevel(ctx, id, in)
}

// DeleteLevel removes a level and its questions.
func (s *Service) DeleteLevel(ctx context.Context, id string) error {
	return s.repo.DeleteLevel(ctx, id)
}

// ----- Admin: questions -----

// ListQuestions returns the full (answer-bearing) questions for a level.
func (s *Service) ListQuestions(ctx context.Context, levelID string) ([]Question, error) {
	return s.repo.ListQuestions(ctx, levelID)
}

// CreateQuestion validates and stores a new question under a level.
func (s *Service) CreateQuestion(ctx context.Context, levelID string, in QuestionInput) (*Question, error) {
	if err := validateQuestion(&in); err != nil {
		return nil, err
	}
	return s.repo.CreateQuestion(ctx, levelID, in)
}

// UpdateQuestion validates and updates an existing question.
func (s *Service) UpdateQuestion(ctx context.Context, id string, in QuestionInput) (*Question, error) {
	if err := validateQuestion(&in); err != nil {
		return nil, err
	}
	return s.repo.UpdateQuestion(ctx, id, in)
}

// DeleteQuestion removes a question.
func (s *Service) DeleteQuestion(ctx context.Context, id string) error {
	return s.repo.DeleteQuestion(ctx, id)
}

func validateLevel(in *LevelInput) error {
	in.Title = strings.TrimSpace(in.Title)
	in.Difficulty = strings.TrimSpace(in.Difficulty)
	if in.Number < 1 {
		return ErrValidation{"level number must be >= 1"}
	}
	if utf8.RuneCountInString(in.Title) < 3 {
		return ErrValidation{"title must be at least 3 characters"}
	}
	if in.PassScore < 0 || in.PassScore > 100 {
		return ErrValidation{"pass_score must be between 0 and 100"}
	}
	if in.DrawCount < 0 {
		return ErrValidation{"draw_count cannot be negative"}
	}
	if in.Difficulty == "" {
		in.Difficulty = "umum"
	}
	return nil
}

// normalizeText folds a free-text answer for tolerant comparison.
func normalizeText(s string) string { return strings.ToLower(strings.TrimSpace(s)) }

// matchesAcceptedAnswer reports whether a normalized answer equals any of the
// accepted answers (also normalized).
func matchesAcceptedAnswer(norm string, accepted []string) bool {
	for _, a := range accepted {
		if normalizeText(a) == norm {
			return true
		}
	}
	return false
}

func validateQuestion(in *QuestionInput) error {
	in.Type = strings.TrimSpace(in.Type)
	if in.Type == "" {
		in.Type = QuestionChoice
	}
	in.Prompt = strings.TrimSpace(in.Prompt)
	if utf8.RuneCountInString(in.Prompt) < 1 {
		return ErrValidation{"prompt is required"}
	}
	if in.Points <= 0 {
		in.Points = 10
	}

	switch in.Type {
	case QuestionText:
		cleaned := make([]string, 0, len(in.Options))
		for _, o := range in.Options {
			if t := strings.TrimSpace(o); t != "" {
				cleaned = append(cleaned, t)
			}
		}
		if len(cleaned) < 1 {
			return ErrValidation{"minimal 1 jawaban yang diterima"}
		}
		if len(cleaned) > 6 {
			return ErrValidation{"maksimal 6 jawaban yang diterima"}
		}
		in.Options = cleaned
		in.CorrectIndex = 0
		// Write-only fields are irrelevant here.
		in.RefMask = ""
		in.ShowGuide = false
		return nil
	case QuestionWrite:
		in.PromptAksara = strings.TrimSpace(in.PromptAksara)
		if in.PromptAksara == "" {
			return ErrValidation{"aksara target wajib diisi untuk soal menulis"}
		}
		if strings.TrimSpace(in.RefMask) == "" {
			return ErrValidation{"pola acuan tulisan belum siap; muat ulang editor lalu simpan lagi"}
		}
		// Choice-only fields are irrelevant for write questions.
		in.Options = []string{}
		in.CorrectIndex = 0
		return nil
	case QuestionChoice:
		cleaned := make([]string, 0, len(in.Options))
		for _, o := range in.Options {
			if t := strings.TrimSpace(o); t != "" {
				cleaned = append(cleaned, t)
			}
		}
		if len(cleaned) < 2 {
			return ErrValidation{"at least 2 options are required"}
		}
		if len(cleaned) > 6 {
			return ErrValidation{"at most 6 options are allowed"}
		}
		if in.CorrectIndex < 0 || in.CorrectIndex >= len(cleaned) {
			return ErrValidation{"correct_index is out of range"}
		}
		in.Options = cleaned
		// Write-only fields are irrelevant for choice questions.
		in.RefMask = ""
		in.ShowGuide = false
		return nil
	default:
		return ErrValidation{"unknown question type"}
	}
}
