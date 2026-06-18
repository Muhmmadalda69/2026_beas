// Shared API types mirroring the Go backend DTOs.

export interface Article {
  id: string;
  slug: string;
  title: string;
  title_aksara: string;
  category: string;
  summary: string;
  content: string;
  read_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface ArticleInput {
  title: string;
  title_aksara: string;
  category: string;
  summary: string;
  content: string;
}

export interface Level {
  id: string;
  number: number;
  title: string;
  description: string;
  difficulty: string;
  pass_score: number;
  draw_count: number;
  question_total: number;
  unlocked: boolean;
  created_at: string;
}

export interface LevelInput {
  number: number;
  title: string;
  description: string;
  difficulty: string;
  pass_score: number;
  draw_count: number;
}

export interface Question {
  id: string;
  level_id: string;
  prompt: string;
  prompt_aksara: string;
  options: string[];
  correct_index: number;
  explanation: string;
  points: number;
  created_at: string;
}

export interface QuestionInput {
  prompt: string;
  prompt_aksara: string;
  options: string[];
  correct_index: number;
  explanation: string;
  points: number;
}

export interface PlayQuestion {
  id: string;
  prompt: string;
  prompt_aksara: string;
  options: string[];
  points: number;
}

export interface PlaySession {
  session_id: string;
  level: Level;
  questions: PlayQuestion[];
  expires_at: string;
}

export interface AnswerDetail {
  question_id: string;
  prompt: string;
  your_answer: string;
  correct_answer: string;
  correct: boolean;
  explanation: string;
}

export interface QuizResult {
  level_id: string;
  score: number;
  points_earned: number;
  points_total: number;
  correct_count: number;
  total: number;
  passed: boolean;
  duration_seconds: number;
  time_bonus: number;
  final_points: number;
  details: AnswerDetail[];
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  total_score: number;
  total_seconds: number;
  levels_cleared: number;
  plays: number;
}

export interface Glyph {
  latin: string;
  aksara: string;
  name: string;
  example?: string;
}

export interface ChartGroup {
  key: string;
  title: string;
  description: string;
  glyphs: Glyph[];
}

export interface AdminUser {
  id: string;
  username: string;
  role: string;
}

export interface AdminAccount {
  id: string;
  username: string;
  role: string;
  created_at: string;
}
