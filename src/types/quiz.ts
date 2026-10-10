export type Topic = 'quantitative' | 'logical' | 'verbal' | 'data_interpretation';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface QuestionOption {
  id: string; // e.g., "opt_1"
  text: string;
}

export interface Question {
  id: string;
  topic: Topic;
  difficulty: Difficulty;
  questionText: string;
  options: QuestionOption[];
  correctOptionId: string;
  explanation: string;
  timeLimitSec: number; // default 20
  tableData?: {
    headers: string[];
    rows: string[][];
  };
  imageTag?: string; // e.g. "Bar Chart" or "Data Table"
}

export interface QuestionSet {
  id: string;
  title: string;
  description: string;
  topicTags: Topic[];
  isCustom?: boolean;
  createdAt: number;
  questions: Question[];
}

export interface Player {
  id: string;
  participantId?: string;
  name: string;
  college: string;
  isHost: boolean;
  score: number;
  currentRoundScore: number;
  rank: number;
  prevRank: number;
  connected: boolean;
  answeredCurrentRound: boolean;
  answerTimeMs?: number;
  selectedOptionId?: string;
  powerUpUsed5050?: boolean;
  streak: number;
  stats: {
    totalAnswered: number;
    totalCorrect: number;
    totalTimeMs: number;
    topicStats: Record<Topic, { answered: number; correct: number }>;
  };
}

export type RoomStatus = 'LOBBY' | 'STARTING' | 'QUESTION_ACTIVE' | 'ROUND_REVIEW' | 'GAME_OVER';

export interface RoomSettings {
  questionSetId: string;
  questionLimit?: number;
  roundDurationSec: number;
  shuffleQuestions: boolean;
  allow5050Powerup: boolean;
}

export interface ClientQuestionPayload {
  roundIndex: number;
  totalRounds: number;
  questionId: string;
  questionText: string;
  topic: Topic;
  difficulty: Difficulty;
  options: QuestionOption[]; // Shuffled specifically for this player
  timeLimitSec: number;
  startTimeServerMs: number;
  tableData?: {
    headers: string[];
    rows: string[][];
  };
  eliminatedOptionIds?: string[]; // for 50-50 powerup
}

export interface RoundResultPayload {
  roundIndex: number;
  questionId: string;
  questionText: string;
  correctOptionId: string;
  explanation: string;
  topic: Topic;
  optionCounts: Record<string, number>; // optionId -> count of selections
  totalAnswers: number;
  autoAdvanceSec?: number;
  playersLeaderboard: {
    id: string;
    name: string;
    college: string;
    roundScore: number;
    totalScore: number;
    rank: number;
    rankDelta: number;
    correct: boolean;
    answerTimeMs?: number;
  }[];
}

export interface FinalResultsPayload {
  gameId?: string;
  roomCode: string;
  completedAt: number;
  questionSetTitle: string;
  totalRounds: number;
  leaderboard: {
    id: string;
    participantId?: string;
    name: string;
    college: string;
    score: number;
    rank: number;
    accuracyPercent: number;
    averageTimeSec: number;
    correctCount: number;
    topicBreakdown: Record<Topic, { correct: number; total: number }>;
  }[];
}

export interface CollegeLeaderboardEntry {
  college: string;
  totalScore: number;
  matchesPlayed: number;
  totalPlayers: number;
  topScore: number;
  averageScore: number;
  attemptsCount?: number;
}

export interface PlayerLeaderboardEntry {
  playerId: string;
  name: string;
  college: string;
  totalScore: number;
  matchesPlayed: number;
  winCount: number;
  accuracyPercent: number;
  averageTimeSec?: number;
}
