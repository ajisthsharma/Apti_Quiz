import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { SEED_QUESTION_SETS } from './src/data/seedQuestions.js';
import {
  Question,
  QuestionOption,
  QuestionSet,
  Player,
  RoomStatus,
  RoomSettings,
  ClientQuestionPayload,
  RoundResultPayload,
  FinalResultsPayload,
  CollegeLeaderboardEntry,
  PlayerLeaderboardEntry,
  Topic,
} from './src/types/quiz.js';
import { calculateRoundScore } from './src/utils/scoring.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// -------------------------------------------------------------
// PERSISTENT STORAGE LAYER
// -------------------------------------------------------------
const QUESTION_SETS_FILE = path.join(DATA_DIR, 'question_sets.json');
const COMPLETED_GAMES_FILE = path.join(DATA_DIR, 'completed_games.json');
const COLLEGE_LEAGUE_FILE = path.join(DATA_DIR, 'college_league.json');

function loadJson<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data) as T;
    }
  } catch (err) {
    console.error(`Failed to read ${filePath}:`, err);
  }
  return fallback;
}

function saveJson<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Failed to save ${filePath}:`, err);
  }
}

let questionSets: QuestionSet[] = loadJson<QuestionSet[]>(QUESTION_SETS_FILE, SEED_QUESTION_SETS);
if (!questionSets || questionSets.length === 0) {
  questionSets = [...SEED_QUESTION_SETS];
  saveJson(QUESTION_SETS_FILE, questionSets);
}

// Real completed quiz records (no fake/hardcoded leaderboards)
let completedGames: FinalResultsPayload[] = loadJson<FinalResultsPayload[]>(COMPLETED_GAMES_FILE, []);

// Filter helper: Exclude mock / simulated test data from live rankings pipeline
function isSimulatedParticipant(p: { id?: string; name?: string }): boolean {
  if (!p || !p.name) return true;
  const n = p.name.trim();
  const id = p.id || '';
  const nLower = n.toLowerCase();
  return (
    n.startsWith('Student_') ||
    n.startsWith('Student ') ||
    n.startsWith('Candidate') ||
    n === 'Automated_Student' ||
    n === 'StudentAlpha' ||
    n === 'Aakash_Gupta' ||
    n === 'Sneha_Patil' ||
    nLower.includes('sample') ||
    nLower.includes('demo') ||
    nLower.includes('mock') ||
    nLower.startsWith('candidate') ||
    id.startsWith('sim_') ||
    id.startsWith('test_') ||
    id.startsWith('bot_')
  );
}

// Dynamically compute real college rankings and player rankings strictly from genuine completed games
function computeRealLeague(games: FinalResultsPayload[]) {
  const collegeMap = new Map<string, {
    college: string;
    totalScore: number;
    matchIds: Set<string>;
    playerIds: Set<string>;
    topScore: number;
    attemptsCount: number;
  }>();

  const playerMap = new Map<string, {
    playerId: string;
    name: string;
    college: string;
    totalScore: number;
    matchIds: Set<string>;
    winCount: number;
    totalCorrect: number;
    totalAnswered: number;
    totalTimeSec: number;
    timeSamples: number;
  }>();

  for (const match of games) {
    if (!match.leaderboard || !Array.isArray(match.leaderboard) || match.leaderboard.length === 0) continue;
    const matchId = match.gameId || `${match.roomCode}_${match.completedAt}`;

    for (const p of match.leaderboard) {
      // Exclude any simulated/seeded participants completely
      if (isSimulatedParticipant(p)) continue;

      const collegeName = (p.college || 'Independent').trim();
      if (!collegeName || collegeName.toLowerCase() === 'faculty coordinator') continue;
      const collegeKey = collegeName.toLowerCase();

      // College tracking
      let colEntry = collegeMap.get(collegeKey);
      if (!colEntry) {
        colEntry = {
          college: collegeName,
          totalScore: 0,
          matchIds: new Set(),
          playerIds: new Set(),
          topScore: 0,
          attemptsCount: 0,
        };
        collegeMap.set(collegeKey, colEntry);
      }

      colEntry.totalScore += (p.score || 0);
      colEntry.matchIds.add(matchId);
      colEntry.attemptsCount += 1;
      const stablePid = (p as any).participantId || p.id || `${p.name.toLowerCase()}_${collegeKey}`;
      colEntry.playerIds.add(stablePid);
      if ((p.score || 0) > colEntry.topScore) {
        colEntry.topScore = p.score;
      }

      // Student / Player accumulation by stable participant ID and deduplicated match
      const playerKey = stablePid;
      let plyEntry = playerMap.get(playerKey);
      if (!plyEntry) {
        plyEntry = {
          playerId: stablePid,
          name: p.name,
          college: collegeName,
          totalScore: 0,
          matchIds: new Set(),
          winCount: 0,
          totalCorrect: 0,
          totalAnswered: 0,
          totalTimeSec: 0,
          timeSamples: 0,
        };
        playerMap.set(playerKey, plyEntry);
      } else {
        if (p.score > 0 && collegeName !== 'Independent') {
          plyEntry.college = collegeName;
        }
      }

      // If this match was already counted for this participant, skip to avoid double counting
      if (plyEntry.matchIds.has(matchId)) {
        continue;
      }
      plyEntry.matchIds.add(matchId);

      plyEntry.totalScore += (p.score || 0);
      // Win definition: finished rank 1 with score > 0 (or lone participant with score > 0)
      if (p.rank === 1 && (p.score > 0 || match.leaderboard.length === 1)) {
        plyEntry.winCount += 1;
      }

      const correctCount = typeof p.correctCount === 'number' ? p.correctCount : 0;
      const rounds = match.totalRounds || 1;
      plyEntry.totalCorrect += correctCount;
      plyEntry.totalAnswered += rounds;

      if (typeof p.averageTimeSec === 'number' && p.averageTimeSec > 0) {
        plyEntry.totalTimeSec += p.averageTimeSec;
        plyEntry.timeSamples += 1;
      }
    }
  }

  // Calculate true averages and formatted structures
  const colleges: CollegeLeaderboardEntry[] = Array.from(collegeMap.values()).map(c => ({
    college: c.college,
    totalScore: c.totalScore,
    matchesPlayed: c.matchIds.size,
    totalPlayers: c.playerIds.size,
    topScore: c.topScore,
    averageScore: c.attemptsCount > 0 ? Math.round(c.totalScore / c.attemptsCount) : 0,
    attemptsCount: c.attemptsCount,
  })).sort((a, b) => b.totalScore - a.totalScore);

  const topPlayers: PlayerLeaderboardEntry[] = Array.from(playerMap.values()).map(p => ({
    playerId: p.playerId,
    name: p.name,
    college: p.college,
    totalScore: p.totalScore,
    matchesPlayed: p.matchIds.size,
    winCount: p.winCount,
    accuracyPercent: p.totalAnswered > 0 ? Math.round((p.totalCorrect / p.totalAnswered) * 100) : 0,
    averageTimeSec: p.timeSamples > 0 ? Number((p.totalTimeSec / p.timeSamples).toFixed(2)) : 0,
  })).sort((a, b) => b.totalScore - a.totalScore).slice(0, 50);

  return { colleges, topPlayers };
}

let { colleges: collegeLeague, topPlayers: topPlayersLeague } = computeRealLeague(completedGames);
saveJson(COLLEGE_LEAGUE_FILE, collegeLeague);

function recordCompletedGame(finalResult: FinalResultsPayload) {
  // Check idempotency by gameId or roomCode & timestamp
  const alreadyRecorded = completedGames.some(
    g => (finalResult.gameId && g.gameId === finalResult.gameId) ||
         (g.roomCode === finalResult.roomCode && Math.abs(g.completedAt - finalResult.completedAt) < 5000)
  );

  if (!alreadyRecorded) {
    completedGames.unshift(finalResult);
    if (completedGames.length > 100) {
      completedGames = completedGames.slice(0, 100);
    }
    saveJson(COMPLETED_GAMES_FILE, completedGames);

    // Re-aggregate rankings dynamically
    const updated = computeRealLeague(completedGames);
    collegeLeague = updated.colleges;
    topPlayersLeague = updated.topPlayers;
    saveJson(COLLEGE_LEAGUE_FILE, collegeLeague);
  }
}

// -------------------------------------------------------------
// GAME ROOM ENGINE
// -------------------------------------------------------------

interface ConnectedClient {
  ws: WebSocket;
  playerId: string;
  roomCode: string;
  isHost: boolean;
}

interface RoomAnswerSubmission {
  playerId: string;
  optionId: string;
  serverReceivedMs: number;
  elapsedMs: number;
  isCorrect: boolean;
  scoreAwarded: number;
}

interface ServerRoom {
  code: string;
  hostToken: string;
  hostId: string;
  status: RoomStatus;
  hasEnded?: boolean;
  settings: RoomSettings;
  questionSet: QuestionSet;
  activeQuestions: Question[];
  currentRoundIndex: number;
  roundStartTimeMs: number;
  roundTimer: NodeJS.Timeout | null;
  reviewTimer: NodeJS.Timeout | null;
  players: Map<string, Player>;
  playerTokens: Map<string, string>; // playerId -> sessionToken
  clientSockets: Map<string, WebSocket>; // playerId -> ws
  currentRoundSubmissions: Map<string, RoomAnswerSubmission>;
  playerOptionMaps: Map<string, QuestionOption[]>; // playerId -> shuffled options
}

const activeRooms = new Map<string, ServerRoom>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function normalizeRoomCode(raw: string): string {
  return (raw || '').toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function broadcastToRoom(room: ServerRoom, payload: unknown, excludePlayerId?: string) {
  const message = JSON.stringify(payload);
  for (const [playerId, ws] of room.clientSockets.entries()) {
    if (excludePlayerId && playerId === excludePlayerId) continue;
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

function sendToPlayer(room: ServerRoom, playerId: string, payload: unknown) {
  const ws = room.clientSockets.get(playerId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function getRoomPlayersList(room: ServerRoom): Player[] {
  return Array.from(room.players.values()).sort((a, b) => b.score - a.score);
}

function broadcastLobbyState(room: ServerRoom) {
  const players = getRoomPlayersList(room);
  broadcastToRoom(room, {
    type: 'LOBBY_UPDATE',
    roomCode: room.code,
    status: room.status,
    questionSetTitle: room.questionSet.title,
    totalQuestions: room.activeQuestions.length,
    roundDurationSec: room.settings.roundDurationSec,
    players: players.map(p => ({
      id: p.id,
      name: p.name,
      college: p.college,
      isHost: p.isHost,
      connected: p.connected,
      score: p.score,
    })),
  });
}

function sendHostRoomMonitor(room: ServerRoom) {
  const nonHostPlayers = Array.from(room.players.values()).filter(p => !p.isHost);
  const submissions = room.currentRoundSubmissions;

  sendToPlayer(room, room.hostId, {
    type: 'HOST_MONITOR_UPDATE',
    roomCode: room.code,
    status: room.status,
    roundIndex: room.currentRoundIndex + 1,
    totalRounds: room.activeQuestions.length,
    totalAnswered: submissions.size,
    totalContestants: nonHostPlayers.length,
    contestants: nonHostPlayers.map(p => ({
      id: p.id,
      name: p.name,
      college: p.college,
      connected: p.connected,
      hasAnswered: submissions.has(p.id),
      score: p.score,
      roundScore: p.currentRoundScore,
    })),
  });
}

function startRoundForRoom(room: ServerRoom, roundIndex: number) {
  if (room.reviewTimer) {
    clearTimeout(room.reviewTimer);
    room.reviewTimer = null;
  }

  if (roundIndex >= room.activeQuestions.length) {
    endGameForRoom(room);
    return;
  }

  room.currentRoundIndex = roundIndex;
  room.status = 'QUESTION_ACTIVE';
  room.currentRoundSubmissions.clear();
  room.playerOptionMaps.clear();

  const currentQ = room.activeQuestions[roundIndex];
  const timeLimitSec = room.settings.roundDurationSec || currentQ.timeLimitSec || 20;
  room.roundStartTimeMs = Date.now();

  // Reset player answered flag for this round
  for (const player of room.players.values()) {
    player.answeredCurrentRound = false;
    player.currentRoundScore = 0;
    player.selectedOptionId = undefined;
    player.answerTimeMs = undefined;
  }

  // Shuffle options independently for each player (Anti-cheat)
  for (const player of room.players.values()) {
    const shuffledOptions = shuffleArray(currentQ.options);
    room.playerOptionMaps.set(player.id, shuffledOptions);

    const clientPayload: ClientQuestionPayload = {
      roundIndex: roundIndex + 1,
      totalRounds: room.activeQuestions.length,
      questionId: currentQ.id,
      questionText: currentQ.questionText,
      topic: currentQ.topic,
      difficulty: currentQ.difficulty,
      options: shuffledOptions,
      timeLimitSec,
      startTimeServerMs: room.roundStartTimeMs,
      tableData: currentQ.tableData,
    };

    sendToPlayer(room, player.id, {
      type: 'QUESTION_START',
      payload: clientPayload,
    });
  }

  // Notify host monitor
  sendHostRoomMonitor(room);

  // Set authoritative round timer on server
  if (room.roundTimer) {
    clearTimeout(room.roundTimer);
  }

  const durationMs = (timeLimitSec * 1000) + 600; // 600ms server network grace
  room.roundTimer = setTimeout(() => {
    concludeRound(room);
  }, durationMs);
}

function concludeRound(room: ServerRoom) {
  if (room.status !== 'QUESTION_ACTIVE') return;
  if (room.roundTimer) {
    clearTimeout(room.roundTimer);
    room.roundTimer = null;
  }

  room.status = 'ROUND_REVIEW';
  const currentQ = room.activeQuestions[room.currentRoundIndex];

  // Compute option distribution
  const optionCounts: Record<string, number> = {};
  for (const opt of currentQ.options) {
    optionCounts[opt.id] = 0;
  }

  for (const sub of room.currentRoundSubmissions.values()) {
    if (sub.optionId) {
      optionCounts[sub.optionId] = (optionCounts[sub.optionId] || 0) + 1;
    }
  }

  // Calculate ranks and delta for participants
  const sortedPlayers = Array.from(room.players.values())
    .filter(p => !p.isHost || room.players.size === 1)
    .sort((a, b) => b.score - a.score);

  sortedPlayers.forEach((p, idx) => {
    p.prevRank = p.rank || (idx + 1);
    p.rank = idx + 1;
  });

  const roundLeaderboard = sortedPlayers.map(p => {
    const sub = room.currentRoundSubmissions.get(p.id);
    return {
      id: p.id,
      name: p.name,
      college: p.college,
      roundScore: p.currentRoundScore,
      totalScore: p.score,
      rank: p.rank,
      rankDelta: (p.prevRank || p.rank) - p.rank,
      correct: sub ? sub.isCorrect : false,
      answerTimeMs: sub ? sub.elapsedMs : undefined,
    };
  });

  const AUTO_ADVANCE_REVIEW_SEC = 5;

  const resultPayload: RoundResultPayload = {
    roundIndex: room.currentRoundIndex + 1,
    questionId: currentQ.id,
    questionText: currentQ.questionText,
    correctOptionId: currentQ.correctOptionId,
    explanation: currentQ.explanation,
    topic: currentQ.topic,
    optionCounts,
    totalAnswers: room.currentRoundSubmissions.size,
    autoAdvanceSec: AUTO_ADVANCE_REVIEW_SEC,
    playersLeaderboard: roundLeaderboard,
  };

  broadcastToRoom(room, {
    type: 'ROUND_RESULT',
    payload: resultPayload,
  });

  sendHostRoomMonitor(room);

  // AUTOMATIC QUESTION PROGRESSION (Authoritative 5-second answer feedback review timer)
  if (room.reviewTimer) {
    clearTimeout(room.reviewTimer);
    room.reviewTimer = null;
  }

  room.reviewTimer = setTimeout(() => {
    if (room.status === 'ROUND_REVIEW' && !room.hasEnded) {
      if (room.currentRoundIndex + 1 < room.activeQuestions.length) {
        startRoundForRoom(room, room.currentRoundIndex + 1);
      } else {
        endGameForRoom(room);
      }
    }
  }, AUTO_ADVANCE_REVIEW_SEC * 1000);
}

function endGameForRoom(room: ServerRoom) {
  if (room.hasEnded) return;
  room.hasEnded = true;
  room.status = 'GAME_OVER';

  if (room.roundTimer) {
    clearTimeout(room.roundTimer);
    room.roundTimer = null;
  }

  if (room.reviewTimer) {
    clearTimeout(room.reviewTimer);
    room.reviewTimer = null;
  }

  const contestPlayers = Array.from(room.players.values())
    .filter(p => !p.isHost || room.players.size === 1)
    .sort((a, b) => b.score - a.score);

  const leaderboard = contestPlayers.map((p, idx) => {
    const accuracy = p.stats.totalAnswered > 0
      ? Math.round((p.stats.totalCorrect / p.stats.totalAnswered) * 100)
      : 0;
    const avgTimeSec = p.stats.totalAnswered > 0
      ? Number(((p.stats.totalTimeMs / p.stats.totalAnswered) / 1000).toFixed(2))
      : 0;

    return {
      id: p.id,
      participantId: p.participantId || p.id,
      name: p.name,
      college: p.college,
      score: p.score,
      rank: idx + 1,
      accuracyPercent: accuracy,
      averageTimeSec: avgTimeSec,
      correctCount: p.stats.totalCorrect,
      topicBreakdown: {
        quantitative: { correct: p.stats.topicStats.quantitative.correct, total: p.stats.topicStats.quantitative.answered },
        logical: { correct: p.stats.topicStats.logical.correct, total: p.stats.topicStats.logical.answered },
        verbal: { correct: p.stats.topicStats.verbal.correct, total: p.stats.topicStats.verbal.answered },
        data_interpretation: { correct: p.stats.topicStats.data_interpretation.correct, total: p.stats.topicStats.data_interpretation.answered },
      },
    };
  });

  const actualRoundsPlayed = room.currentRoundIndex >= 0
    ? room.currentRoundIndex + 1
    : room.activeQuestions.length;

  const finalResults: FinalResultsPayload = {
    gameId: `game_${Date.now()}_${generateToken().substring(0, 6)}`,
    roomCode: room.code,
    completedAt: Date.now(),
    questionSetTitle: room.questionSet.title,
    totalRounds: Math.max(1, actualRoundsPlayed),
    leaderboard,
  };

  // Persist completed game into database / JSON storage and re-aggregate college league
  recordCompletedGame(finalResults);

  broadcastToRoom(room, {
    type: 'GAME_OVER',
    payload: finalResults,
  });

  sendHostRoomMonitor(room);
}

// -------------------------------------------------------------
// EXPRESS APP & REST ENDPOINTS
// -------------------------------------------------------------
const app = express();
app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    activeRooms: activeRooms.size,
    totalQuestionSets: questionSets.length,
    totalCompletedGames: completedGames.length,
    timestamp: Date.now(),
  });
});

// REST Endpoint: Validate & Get Room State (for join pre-checks & QR codes)
app.get('/api/rooms/:code', (req, res) => {
  const code = normalizeRoomCode(req.params.code);
  const room = activeRooms.get(code);

  if (!room) {
    res.status(404).json({
      error: 'ROOM_NOT_FOUND',
      message: `Room code ${code} does not exist or has expired. Please verify with your host.`,
    });
    return;
  }

  const nonHostCount = Array.from(room.players.values()).filter(p => !p.isHost).length;
  const isFull = nonHostCount >= 60;
  const isOver = room.status === 'GAME_OVER';

  res.json({
    exists: true,
    roomCode: room.code,
    status: room.status,
    questionSetTitle: room.questionSet.title,
    totalQuestions: room.activeQuestions.length,
    roundDurationSec: room.settings.roundDurationSec,
    currentRoundIndex: room.currentRoundIndex + 1,
    contestantsCount: nonHostCount,
    canJoin: !isFull && !isOver,
    message: isOver
      ? 'This quiz has already ended.'
      : isFull
      ? 'Room has reached capacity (60 players).'
      : room.status === 'QUESTION_ACTIVE'
      ? 'Quiz is in progress! You will join the current round.'
      : 'Room is open. Waiting for host to start.',
  });
});

// REST Endpoint: Authorized Host Ends Quiz Room Immediately
app.post('/api/rooms/:code/end', (req, res) => {
  const code = normalizeRoomCode(req.params.code);
  const room = activeRooms.get(code);
  const { hostToken } = req.body || {};

  if (!room) {
    res.status(404).json({ error: 'ROOM_NOT_FOUND', message: `Room "${code}" does not exist or has expired.` });
    return;
  }

  if (!hostToken || room.hostToken !== hostToken) {
    res.status(403).json({ error: 'UNAUTHORIZED', message: 'Unauthorized: Valid host token is required to end the quiz.' });
    return;
  }

  endGameForRoom(room);
  res.json({ success: true, message: `Room ${code} ended authoritatively.` });
});

// REST Endpoint: Create Room (ensures room is registered in state BEFORE displaying join code)
app.post('/api/rooms', (req, res) => {
  try {
    const { hostName, questionSetId, roundDurationSec, questionLimit } = req.body;

    const selectedSet = questionSets.find(s => s.id === questionSetId) || questionSets[0];
    if (!selectedSet) {
      res.status(400).json({ error: 'INVALID_QUESTION_SET', message: 'Selected question set does not exist.' });
      return;
    }

    const availableCount = selectedSet.questions.length;
    if (questionLimit !== undefined && questionLimit !== null) {
      const qLimitNum = Number(questionLimit);
      if (isNaN(qLimitNum) || qLimitNum < 1 || qLimitNum > availableCount) {
        res.status(400).json({
          error: 'INVALID_QUESTION_LIMIT',
          message: `Requested question limit (${questionLimit}) must be between 1 and ${availableCount}.`,
        });
        return;
      }
    }

    const duration = Number(roundDurationSec);
    const validatedDuration = (!isNaN(duration) && duration >= 5 && duration <= 120) ? duration : 20;

    let questions = [...selectedSet.questions];
    if (questionLimit && Number(questionLimit) > 0 && Number(questionLimit) <= questions.length) {
      questions = questions.slice(0, Number(questionLimit));
    }

    const code = generateRoomCode();
    const hostToken = generateToken();
    const hostPlayerId = 'host_' + generateToken().substring(0, 8);
    const hostSessionToken = generateToken();

    const room: ServerRoom = {
      code,
      hostToken,
      hostId: hostPlayerId,
      status: 'LOBBY',
      settings: {
        questionSetId: selectedSet.id,
        roundDurationSec: validatedDuration,
        shuffleQuestions: false,
        allow5050Powerup: true,
        questionLimit: questionLimit ? Number(questionLimit) : undefined,
      },
      questionSet: selectedSet,
      activeQuestions: questions,
      currentRoundIndex: -1,
      roundStartTimeMs: 0,
      roundTimer: null,
      reviewTimer: null,
      players: new Map(),
      playerTokens: new Map(),
      clientSockets: new Map(),
      currentRoundSubmissions: new Map(),
      playerOptionMaps: new Map(),
    };

    const hostPlayer: Player = {
      id: hostPlayerId,
      name: (hostName || 'Host').trim().substring(0, 24),
      college: 'Faculty Coordinator',
      isHost: true,
      score: 0,
      currentRoundScore: 0,
      rank: 1,
      prevRank: 1,
      connected: true,
      answeredCurrentRound: false,
      streak: 0,
      stats: {
        totalAnswered: 0,
        totalCorrect: 0,
        totalTimeMs: 0,
        topicStats: {
          quantitative: { answered: 0, correct: 0 },
          logical: { answered: 0, correct: 0 },
          verbal: { answered: 0, correct: 0 },
          data_interpretation: { answered: 0, correct: 0 },
        },
      },
    };

    room.players.set(hostPlayerId, hostPlayer);
    room.playerTokens.set(hostPlayerId, hostSessionToken);
    activeRooms.set(code, room);

    res.status(201).json({
      roomCode: code,
      hostToken,
      hostId: hostPlayerId,
      sessionToken: hostSessionToken,
      questionSetTitle: selectedSet.title,
      totalQuestions: questions.length,
      settings: room.settings,
    });
  } catch (err) {
    console.error('Failed to create room:', err);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Question Sets REST API
app.get('/api/question-sets', (req, res) => {
  res.json(questionSets);
});

app.post('/api/question-sets', (req, res) => {
  try {
    const { title, description, topicTags, questions } = req.body;
    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      res.status(400).json({ error: 'Title and at least one question are required' });
      return;
    }

    const newSet: QuestionSet = {
      id: 'custom-' + Date.now().toString(36),
      title: String(title).trim(),
      description: String(description || '').trim(),
      topicTags: Array.isArray(topicTags) ? topicTags : ['quantitative'],
      isCustom: true,
      createdAt: Date.now(),
      questions: questions.map((q: Partial<Question>, idx: number) => ({
        id: q.id || `q_custom_${idx + 1}`,
        topic: q.topic || 'quantitative',
        difficulty: q.difficulty || 'medium',
        questionText: q.questionText || '',
        options: q.options || [],
        correctOptionId: q.correctOptionId || 'opt_1',
        explanation: q.explanation || '',
        timeLimitSec: q.timeLimitSec || 20,
        tableData: q.tableData,
      })),
    };

    questionSets.unshift(newSet);
    saveJson(QUESTION_SETS_FILE, questionSets);
    res.status(201).json(newSet);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create question set' });
  }
});

app.put('/api/question-sets/:id', (req, res) => {
  const { id } = req.params;
  const index = questionSets.findIndex(s => s.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Question set not found' });
    return;
  }
  questionSets[index] = {
    ...questionSets[index],
    ...req.body,
    id,
  };
  saveJson(QUESTION_SETS_FILE, questionSets);
  res.json(questionSets[index]);
});

app.delete('/api/question-sets/:id', (req, res) => {
  const { id } = req.params;
  const initialLen = questionSets.length;
  questionSets = questionSets.filter(s => s.id !== id);
  if (questionSets.length === initialLen) {
    res.status(404).json({ error: 'Question set not found' });
    return;
  }
  saveJson(QUESTION_SETS_FILE, questionSets);
  res.json({ success: true, message: 'Question set deleted' });
});

// College League REST API — Strictly derived from real completed quizzes
app.get('/api/league', (req, res) => {
  const realLeague = computeRealLeague(completedGames);
  res.json({
    colleges: realLeague.colleges,
    topPlayers: realLeague.topPlayers,
    recentMatches: completedGames.slice(0, 10),
    totalCompletedMatches: completedGames.length,
  });
});

// Match report for faculty export
app.get('/api/matches/:id', (req, res) => {
  const match = completedGames.find(m => m.roomCode === req.params.id || m.gameId === req.params.id);
  if (!match) {
    res.status(404).json({ error: 'Match record not found' });
    return;
  }
  res.json(match);
});

// -------------------------------------------------------------
// WEBSOCKET SERVER & PROTOCOL HANDLER
// -------------------------------------------------------------
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws: WebSocket) => {
  let clientInfo: ConnectedClient | null = null;

  ws.on('message', (rawData: string) => {
    try {
      const msg = JSON.parse(rawData.toString());

      // 1. HOST_ATTACH or HOST_CREATE_ROOM
      if (msg.type === 'HOST_ATTACH' || msg.type === 'HOST_CREATE_ROOM') {
        let roomCode = normalizeRoomCode(msg.roomCode || '');
        let room = activeRooms.get(roomCode);

        if (!room) {
          // If creating directly via WebSocket
          const { hostName, questionSetId, roundDurationSec, questionLimit } = msg;
          const code = generateRoomCode();
          const hostToken = generateToken();
          const hostPlayerId = 'host_' + generateToken().substring(0, 8);
          const hostSessionToken = generateToken();

          const selectedSet = questionSets.find(s => s.id === questionSetId) || questionSets[0];
          const availableCount = selectedSet ? selectedSet.questions.length : 0;
          let safeQuestionLimit: number | undefined = undefined;
          if (questionLimit && Number(questionLimit) > 0) {
            safeQuestionLimit = Math.min(Number(questionLimit), availableCount);
          }

          const durationNum = Number(roundDurationSec);
          const safeDuration = (!isNaN(durationNum) && durationNum >= 5 && durationNum <= 120) ? durationNum : 20;

          let questions = [...(selectedSet?.questions || [])];
          if (safeQuestionLimit && safeQuestionLimit > 0 && safeQuestionLimit <= questions.length) {
            questions = questions.slice(0, safeQuestionLimit);
          }

          room = {
            code,
            hostToken,
            hostId: hostPlayerId,
            status: 'LOBBY',
            settings: {
              questionSetId: selectedSet.id,
              roundDurationSec: safeDuration,
              shuffleQuestions: false,
              allow5050Powerup: true,
              questionLimit: safeQuestionLimit,
            },
            questionSet: selectedSet,
            activeQuestions: questions,
            currentRoundIndex: -1,
            roundStartTimeMs: 0,
            roundTimer: null,
            reviewTimer: null,
            players: new Map(),
            playerTokens: new Map(),
            clientSockets: new Map(),
            currentRoundSubmissions: new Map(),
            playerOptionMaps: new Map(),
          };

          const hostPlayer: Player = {
            id: hostPlayerId,
            name: (hostName || 'Host').trim().substring(0, 24),
            college: 'Faculty Coordinator',
            isHost: true,
            score: 0,
            currentRoundScore: 0,
            rank: 1,
            prevRank: 1,
            connected: true,
            answeredCurrentRound: false,
            streak: 0,
            stats: {
              totalAnswered: 0,
              totalCorrect: 0,
              totalTimeMs: 0,
              topicStats: {
                quantitative: { answered: 0, correct: 0 },
                logical: { answered: 0, correct: 0 },
                verbal: { answered: 0, correct: 0 },
                data_interpretation: { answered: 0, correct: 0 },
              },
            },
          };

          room.players.set(hostPlayerId, hostPlayer);
          room.playerTokens.set(hostPlayerId, hostSessionToken);
          activeRooms.set(code, room);
          roomCode = code;
        }

        // Attach host socket
        const hostId = room.hostId;
        room.clientSockets.set(hostId, ws);
        const hostPlayer = room.players.get(hostId);
        if (hostPlayer) hostPlayer.connected = true;

        clientInfo = { ws, playerId: hostId, roomCode, isHost: true };

        ws.send(JSON.stringify({
          type: 'ROOM_CREATED',
          roomCode,
          hostToken: room.hostToken,
          playerId: hostId,
          sessionToken: room.playerTokens.get(hostId),
          settings: room.settings,
          questionSetTitle: room.questionSet.title,
          totalQuestions: room.activeQuestions.length,
          status: room.status,
        }));

        broadcastLobbyState(room);
        sendHostRoomMonitor(room);
        return;
      }

      // 2. JOIN_ROOM (Supports Lobby joining and safe in-progress round joining)
      if (msg.type === 'JOIN_ROOM') {
        const { roomCode, playerName, collegeName } = msg;
        const normalizedCode = normalizeRoomCode(roomCode);
        const room = activeRooms.get(normalizedCode);

        if (!room) {
          ws.send(JSON.stringify({
            type: 'ERROR',
            code: 'ROOM_NOT_FOUND',
            message: `Room "${normalizedCode || roomCode}" not found. Please double-check the code or ask your host.`,
          }));
          return;
        }

        if (room.status === 'GAME_OVER') {
          ws.send(JSON.stringify({
            type: 'ERROR',
            code: 'GAME_OVER',
            message: 'This quiz has already concluded.',
          }));
          return;
        }

        const currentNonHosts = Array.from(room.players.values()).filter(p => !p.isHost).length;
        if (currentNonHosts >= 60) {
          ws.send(JSON.stringify({
            type: 'ERROR',
            code: 'ROOM_FULL',
            message: 'Room capacity reached (max 60 players).',
          }));
          return;
        }

        // Validate player display name
        const cleanName = (playerName || '').trim().substring(0, 24);
        if (!cleanName) {
          ws.send(JSON.stringify({
            type: 'ERROR',
            code: 'INVALID_NAME',
            message: 'Please enter a valid display name to join.',
          }));
          return;
        }

        // Validate college affiliation
        const cleanCollege = (collegeName || 'Independent').trim().substring(0, 50);

        const playerId = 'p_' + generateToken().substring(0, 8);
        const sessionToken = generateToken();
        const participantId = (msg.participantId && typeof msg.participantId === 'string' && msg.participantId.trim())
          ? msg.participantId.trim()
          : ('usr_' + cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_'));

        const player: Player = {
          id: playerId,
          participantId,
          name: cleanName,
          college: cleanCollege,
          isHost: false,
          score: 0,
          currentRoundScore: 0,
          rank: room.players.size + 1,
          prevRank: room.players.size + 1,
          connected: true,
          answeredCurrentRound: false,
          streak: 0,
          stats: {
            totalAnswered: 0,
            totalCorrect: 0,
            totalTimeMs: 0,
            topicStats: {
              quantitative: { answered: 0, correct: 0 },
              logical: { answered: 0, correct: 0 },
              verbal: { answered: 0, correct: 0 },
              data_interpretation: { answered: 0, correct: 0 },
            },
          },
        };

        room.players.set(playerId, player);
        room.playerTokens.set(playerId, sessionToken);
        room.clientSockets.set(playerId, ws);

        clientInfo = { ws, playerId, roomCode: normalizedCode, isHost: false };

        // Send confirmation
        ws.send(JSON.stringify({
          type: 'JOIN_SUCCESS',
          roomCode: normalizedCode,
          playerId,
          sessionToken,
          player,
          status: room.status,
          questionSetTitle: room.questionSet.title,
          totalQuestions: room.activeQuestions.length,
          roundDurationSec: room.settings.roundDurationSec,
        }));

        // Safe in-progress round recovery: If joining mid-question, immediately send current question!
        if (room.status === 'QUESTION_ACTIVE' && room.currentRoundIndex >= 0) {
          const currentQ = room.activeQuestions[room.currentRoundIndex];
          const timeLimitSec = room.settings.roundDurationSec || currentQ.timeLimitSec || 20;
          const elapsedSec = (Date.now() - room.roundStartTimeMs) / 1000;
          const timeRemainingSec = Math.max(0, Number((timeLimitSec - elapsedSec).toFixed(1)));

          const shuffledOptions = shuffleArray(currentQ.options);
          room.playerOptionMaps.set(playerId, shuffledOptions);

          const clientPayload: ClientQuestionPayload = {
            roundIndex: room.currentRoundIndex + 1,
            totalRounds: room.activeQuestions.length,
            questionId: currentQ.id,
            questionText: currentQ.questionText,
            topic: currentQ.topic,
            difficulty: currentQ.difficulty,
            options: shuffledOptions,
            timeLimitSec,
            startTimeServerMs: room.roundStartTimeMs,
            tableData: currentQ.tableData,
          };

          ws.send(JSON.stringify({
            type: 'QUESTION_START',
            payload: clientPayload,
            joinedMidRound: true,
            timeRemainingSec,
          }));
        } else if (room.status === 'ROUND_REVIEW') {
          // If joining during review, send current review
          const currentQ = room.activeQuestions[room.currentRoundIndex];
          ws.send(JSON.stringify({
            type: 'ROUND_RESULT',
            payload: {
              roundIndex: room.currentRoundIndex + 1,
              questionId: currentQ.id,
              questionText: currentQ.questionText,
              correctOptionId: currentQ.correctOptionId,
              explanation: currentQ.explanation,
              topic: currentQ.topic,
              optionCounts: {},
              totalAnswers: room.currentRoundSubmissions.size,
              playersLeaderboard: [],
            },
          }));
        }

        broadcastLobbyState(room);
        sendHostRoomMonitor(room);
        return;
      }

      // 3. RECONNECT (State recovery on refresh/disconnect without score loss)
      if (msg.type === 'RECONNECT') {
        const { roomCode, playerId, sessionToken } = msg;
        const normalizedCode = normalizeRoomCode(roomCode);
        const room = activeRooms.get(normalizedCode);

        if (!room) {
          ws.send(JSON.stringify({
            type: 'ERROR',
            code: 'ROOM_NOT_FOUND',
            message: 'Session expired or room no longer exists.',
          }));
          return;
        }

        const expectedToken = room.playerTokens.get(playerId);
        if (!expectedToken || expectedToken !== sessionToken) {
          ws.send(JSON.stringify({
            type: 'ERROR',
            code: 'INVALID_TOKEN',
            message: 'Invalid player session token.',
          }));
          return;
        }

        const player = room.players.get(playerId);
        if (!player) {
          ws.send(JSON.stringify({
            type: 'ERROR',
            code: 'PLAYER_NOT_FOUND',
            message: 'Player record not found.',
          }));
          return;
        }

        // Attach new websocket connection
        player.connected = true;
        room.clientSockets.set(playerId, ws);
        clientInfo = { ws, playerId, roomCode: normalizedCode, isHost: player.isHost };

        // Send full authoritative state recovery snapshot
        const recoveryPayload: {
          type: string;
          status: RoomStatus;
          player: Player;
          roomCode: string;
          questionSetTitle: string;
          totalQuestions: number;
          currentRoundIndex: number;
          currentQuestion?: ClientQuestionPayload;
          timeRemainingSec?: number;
          answeredCurrentRound: boolean;
          selectedOptionId?: string;
          isHost: boolean;
          hostToken?: string;
        } = {
          type: 'RECONNECT_SUCCESS',
          status: room.status,
          player,
          roomCode: normalizedCode,
          questionSetTitle: room.questionSet.title,
          totalQuestions: room.activeQuestions.length,
          currentRoundIndex: room.currentRoundIndex + 1,
          answeredCurrentRound: player.answeredCurrentRound,
          selectedOptionId: player.selectedOptionId,
          isHost: player.isHost,
          hostToken: player.isHost ? room.hostToken : undefined,
        };

        if (room.status === 'QUESTION_ACTIVE' && room.currentRoundIndex >= 0) {
          const currentQ = room.activeQuestions[room.currentRoundIndex];
          const timeLimitSec = room.settings.roundDurationSec || currentQ.timeLimitSec || 20;
          const elapsedSec = (Date.now() - room.roundStartTimeMs) / 1000;
          const timeRemainingSec = Math.max(0, Number((timeLimitSec - elapsedSec).toFixed(1)));
          const userOptions = room.playerOptionMaps.get(playerId) || currentQ.options;

          recoveryPayload.currentQuestion = {
            roundIndex: room.currentRoundIndex + 1,
            totalRounds: room.activeQuestions.length,
            questionId: currentQ.id,
            questionText: currentQ.questionText,
            topic: currentQ.topic,
            difficulty: currentQ.difficulty,
            options: userOptions,
            timeLimitSec,
            startTimeServerMs: room.roundStartTimeMs,
            tableData: currentQ.tableData,
          };
          recoveryPayload.timeRemainingSec = timeRemainingSec;
        }

        ws.send(JSON.stringify(recoveryPayload));
        broadcastLobbyState(room);
        sendHostRoomMonitor(room);
        return;
      }

      // 4. HOST_START_GAME
      if (msg.type === 'HOST_START_GAME') {
        const { roomCode, hostToken } = msg;
        const normalizedCode = normalizeRoomCode(roomCode);
        const room = activeRooms.get(normalizedCode);
        if (!room) return;

        if (room.hostToken !== hostToken) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Unauthorized host action.' }));
          return;
        }

        if (room.status !== 'LOBBY') return;
        room.status = 'STARTING';

        broadcastToRoom(room, {
          type: 'GAME_STARTING',
          countdownSec: 3,
        });

        setTimeout(() => {
          startRoundForRoom(room, 0);
        }, 3000);
        return;
      }

      // 5. HOST_NEXT_QUESTION
      if (msg.type === 'HOST_NEXT_QUESTION') {
        const { roomCode, hostToken } = msg;
        const normalizedCode = normalizeRoomCode(roomCode);
        const room = activeRooms.get(normalizedCode);
        if (!room || room.hostToken !== hostToken) return;

        if (room.status === 'ROUND_REVIEW') {
          if (room.reviewTimer) {
            clearTimeout(room.reviewTimer);
            room.reviewTimer = null;
          }
          startRoundForRoom(room, room.currentRoundIndex + 1);
        }
        return;
      }

      // 6. HOST_END_GAME
      if (msg.type === 'HOST_END_GAME') {
        const { roomCode, hostToken } = msg;
        const normalizedCode = normalizeRoomCode(roomCode);
        const room = activeRooms.get(normalizedCode);
        if (!room) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Quiz room not found.' }));
          return;
        }
        if (room.hostToken !== hostToken) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Unauthorized: Only the verified room host can end the quiz.' }));
          return;
        }
        endGameForRoom(room);
        return;
      }

      // 7. SUBMIT_ANSWER (Server authoritative verification & anti-cheat)
      if (msg.type === 'SUBMIT_ANSWER') {
        const { roomCode, playerId, sessionToken, optionId } = msg;
        const normalizedCode = normalizeRoomCode(roomCode);
        const room = activeRooms.get(normalizedCode);
        if (!room) return;

        // Security check: validate token
        if (room.playerTokens.get(playerId) !== sessionToken) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid session token' }));
          return;
        }

        // State check: active question round
        if (room.status !== 'QUESTION_ACTIVE') {
          ws.send(JSON.stringify({ type: 'ANSWER_REJECTED', reason: 'ROUND_NOT_ACTIVE' }));
          return;
        }

        const player = room.players.get(playerId);
        if (!player) return;

        // Duplicate submission prevention
        if (player.answeredCurrentRound || room.currentRoundSubmissions.has(playerId)) {
          ws.send(JSON.stringify({ type: 'ANSWER_REJECTED', reason: 'ALREADY_SUBMITTED' }));
          return;
        }

        const currentQ = room.activeQuestions[room.currentRoundIndex];
        const timeLimitSec = room.settings.roundDurationSec || currentQ.timeLimitSec || 20;
        const serverNowMs = Date.now();
        const elapsedMs = serverNowMs - room.roundStartTimeMs;

        // Late answer check (with 600ms network tolerance buffer)
        const maxAllowedMs = (timeLimitSec * 1000) + 600;
        if (elapsedMs > maxAllowedMs) {
          ws.send(JSON.stringify({ type: 'ANSWER_REJECTED', reason: 'LATE_SUBMISSION' }));
          return;
        }

        // Authoritative correctness calculation
        const isCorrect = optionId === currentQ.correctOptionId;
        const scoreDetails = calculateRoundScore(isCorrect, elapsedMs, timeLimitSec);

        // Record player state
        player.answeredCurrentRound = true;
        player.selectedOptionId = optionId;
        player.answerTimeMs = elapsedMs;
        player.currentRoundScore = scoreDetails.totalPoints;
        player.score += scoreDetails.totalPoints;

        if (isCorrect) {
          player.streak += 1;
        } else {
          player.streak = 0;
        }

        // Update statistics
        player.stats.totalAnswered += 1;
        if (isCorrect) player.stats.totalCorrect += 1;
        player.stats.totalTimeMs += elapsedMs;

        const topicStat = player.stats.topicStats[currentQ.topic] || { answered: 0, correct: 0 };
        topicStat.answered += 1;
        if (isCorrect) topicStat.correct += 1;
        player.stats.topicStats[currentQ.topic] = topicStat;

        // Store submission
        room.currentRoundSubmissions.set(playerId, {
          playerId,
          optionId,
          serverReceivedMs: serverNowMs,
          elapsedMs,
          isCorrect,
          scoreAwarded: scoreDetails.totalPoints,
        });

        // Acknowledge receipt to player with authoritative live answer evaluation feedback
        ws.send(JSON.stringify({
          type: 'ANSWER_ACCEPTED',
          roundIndex: room.currentRoundIndex + 1,
          selectedOptionId: optionId,
          serverElapsedSec: Number((elapsedMs / 1000).toFixed(2)),
          evaluation: {
            isCorrect,
            scoreAwarded: scoreDetails.totalPoints,
            correctOptionId: currentQ.correctOptionId,
            explanation: currentQ.explanation,
            currentScore: player.score,
          },
        }));

        // Broadcast progress counter to all players in room
        const activeContestants = Array.from(room.players.values()).filter(p => !p.isHost);
        const activeContestantCount = activeContestants.length || 1;
        const answersCount = room.currentRoundSubmissions.size;

        broadcastToRoom(room, {
          type: 'ROUND_PROGRESS',
          totalAnswered: answersCount,
          totalPlayers: activeContestantCount,
        });

        sendHostRoomMonitor(room);

        // If all active contestants have answered, conclude round early!
        if (answersCount >= activeContestantCount && activeContestantCount > 0) {
          setTimeout(() => {
            concludeRound(room);
          }, 350);
        }
        return;
      }

      // 8. USE_5050 POWER-UP
      if (msg.type === 'USE_5050') {
        const { roomCode, playerId, sessionToken } = msg;
        const normalizedCode = normalizeRoomCode(roomCode);
        const room = activeRooms.get(normalizedCode);
        if (!room || room.status !== 'QUESTION_ACTIVE') return;

        if (room.playerTokens.get(playerId) !== sessionToken) return;
        const player = room.players.get(playerId);
        if (!player || player.powerUpUsed5050 || player.answeredCurrentRound) return;

        player.powerUpUsed5050 = true;
        const currentQ = room.activeQuestions[room.currentRoundIndex];
        const incorrectOptions = currentQ.options.filter(o => o.id !== currentQ.correctOptionId);
        const shuffledIncorrect = shuffleArray(incorrectOptions);
        const eliminated = shuffledIncorrect.slice(0, 2).map(o => o.id);

        ws.send(JSON.stringify({
          type: 'POWERUP_5050_RESULT',
          eliminatedOptionIds: eliminated,
        }));
        return;
      }
    } catch (err) {
      console.error('WebSocket message parsing error:', err);
    }
  });

  ws.on('close', () => {
    if (clientInfo) {
      const { roomCode, playerId } = clientInfo;
      const room = activeRooms.get(roomCode);
      if (room) {
        const player = room.players.get(playerId);
        if (player) {
          player.connected = false;
        }
        room.clientSockets.delete(playerId);
        broadcastLobbyState(room);
        sendHostRoomMonitor(room);
      }
    }
  });
});

// -------------------------------------------------------------
// VITE DEV MIDDLEWARE / STATIC ASSETS
// -------------------------------------------------------------
async function setupViteOrStatic() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[AptiQuiz Engine] Server listening on http://0.0.0.0:${PORT}`);
    console.log(`[AptiQuiz Engine] WebSocket ready at ws://0.0.0.0:${PORT}/ws`);
  });
}

setupViteOrStatic().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
