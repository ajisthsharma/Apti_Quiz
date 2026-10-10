import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Trophy,
  Play,
  Users,
  Shield,
  Zap,
  Sparkles,
  School,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
  Flame,
  LayoutDashboard,
  Check,
} from 'lucide-react';
import { Navbar } from './components/Navbar.js';
import { RulesModal } from './components/RulesModal.js';
import { LobbyView } from './components/LobbyView.js';
import { GameArena, AnswerEvaluationState } from './components/GameArena.js';
import { RoundReview } from './components/RoundReview.js';
import { GameOverView } from './components/GameOverView.js';
import { CollegeLeagueView } from './components/CollegeLeagueView.js';
import { HostDashboard } from './components/HostDashboard.js';
import { HostLiveMonitor } from './components/HostLiveMonitor.js';
import { AptiQuizLogo } from './components/AptiQuizLogo.js';
import { FloatingBubblesBackground } from './components/FloatingBubblesBackground.js';
import { ParticipantAvatar } from './components/ParticipantAvatar.js';
import { PRESET_COLLEGES } from './data/colleges.js';
import {
  RoomStatus,
  ClientQuestionPayload,
  RoundResultPayload,
  FinalResultsPayload,
  Player,
  QuestionSet,
} from './types/quiz.js';
import { sound } from './utils/sound.js';

export default function App() {
  // Navigation & route tab: 'student' | 'host' | 'league'
  const [currentTab, setCurrentTab] = useState<'student' | 'host' | 'league'>(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/host')) {
      return 'host';
    }
    return 'student';
  });

  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Student credentials
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('apti_player_name') || '');
  const [persistentParticipantId] = useState<string>(() => {
    let pid = localStorage.getItem('apti_participant_id');
    if (!pid) {
      pid = 'usr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      localStorage.setItem('apti_participant_id', pid);
    }
    return pid;
  });
  const [selectedCollege, setSelectedCollege] = useState(() => localStorage.getItem('apti_college_preset') || '');
  const [customCollege, setCustomCollege] = useState(() => localStorage.getItem('apti_college_custom') || '');
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [roomValidationStatus, setRoomValidationStatus] = useState<{
    valid?: boolean;
    checking?: boolean;
    message?: string;
  }>({});

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Question banks
  const [questionSetsList, setQuestionSetsList] = useState<QuestionSet[]>([]);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  // Active Session & Multiplayer state
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [hostToken, setHostToken] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [sessionToken, setSessionToken] = useState<string>('');
  const [roomStatus, setRoomStatus] = useState<RoomStatus | null>(null);
  const [questionSetTitle, setQuestionSetTitle] = useState('Campus Placement Arena');
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [roundDurationSec, setRoundDurationSec] = useState(20);
  const [lobbyPlayers, setLobbyPlayers] = useState<Partial<Player>[]>([]);

  // Active Game round state
  const [currentQuestion, setCurrentQuestion] = useState<ClientQuestionPayload | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResultPayload | null>(null);
  const [finalResults, setFinalResults] = useState<FinalResultsPayload | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | undefined>(undefined);
  const [serverElapsedSec, setServerElapsedSec] = useState<number | undefined>(undefined);
  const [answerEvaluation, setAnswerEvaluation] = useState<AnswerEvaluationState | null>(null);
  const [playerScore, setPlayerScore] = useState<number>(0);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [totalAnsweredCount, setTotalAnsweredCount] = useState(0);
  const [powerUp5050Used, setPowerUp5050Used] = useState(false);
  const [eliminatedOptionIds, setEliminatedOptionIds] = useState<string[]>([]);
  const [startingCountdown, setStartingCountdown] = useState<number | null>(null);
  const [liveOptionCounts, setLiveOptionCounts] = useState<Record<string, number>>({});
  const [hostMonitorContestants, setHostMonitorContestants] = useState<any[]>([]);

  // WebSocket Ref
  const wsRef = useRef<WebSocket | null>(null);

  // Handle browser back/forward history navigation cleanly
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.tab) {
        setCurrentTab(e.state.tab);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToTab = useCallback((tab: 'student' | 'host' | 'league') => {
    setCurrentTab(tab);
    if (typeof window !== 'undefined' && window.history) {
      const url = tab === 'host' ? '/host' : tab === 'league' ? '/league' : '/';
      window.history.pushState({ tab }, '', url);
    }
  }, []);

  // Auto-detect room code from URL parameters (?room=CODE or /join?room=CODE)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const roomParam = searchParams.get('room');
      if (roomParam) {
        const cleanCode = roomParam.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
        setJoinRoomCode(cleanCode);
        validateRoomCode(cleanCode);
      }
    }
  }, []);

  // Fetch question sets
  const fetchQuestionSets = useCallback(async () => {
    try {
      const res = await fetch('/api/question-sets');
      if (res.ok) {
        const data = await res.json();
        setQuestionSetsList(data);
      }
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    fetchQuestionSets();
  }, [fetchQuestionSets]);

  // Live room validation helper
  const validateRoomCode = async (code: string) => {
    if (!code || code.length < 4) {
      setRoomValidationStatus({});
      return;
    }
    setRoomValidationStatus({ checking: true });
    try {
      const res = await fetch(`/api/rooms/${code}`);
      if (res.ok) {
        const data = await res.json();
        setRoomValidationStatus({
          valid: data.canJoin,
          checking: false,
          message: data.canJoin
            ? `✓ Room Ready: ${data.questionSetTitle} (${data.totalQuestions} rounds)`
            : data.message,
        });
      } else {
        setRoomValidationStatus({
          valid: false,
          checking: false,
          message: `Room "${code}" not found or expired.`,
        });
      }
    } catch {
      setRoomValidationStatus({ checking: false });
    }
  };

  // Connect or return WebSocket instance
  const getWebSocket = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return wsRef.current;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      // Attempt clean reconnection if active session exists in sessionStorage
      const savedCode = sessionStorage.getItem('apti_room_code');
      const savedPlayerId = sessionStorage.getItem('apti_player_id');
      const savedToken = sessionStorage.getItem('apti_session_token');

      if (savedCode && savedPlayerId && savedToken) {
        socket.send(JSON.stringify({
          type: 'RECONNECT',
          roomCode: savedCode,
          playerId: savedPlayerId,
          sessionToken: savedToken,
        }));
      }
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'ERROR') {
          setErrorMessage(msg.message || 'An unexpected error occurred.');
          setIsJoiningRoom(false);
        } else if (msg.type === 'ROOM_CREATED') {
          setRoomCode(msg.roomCode);
          setIsHost(true);
          setHostToken(msg.hostToken);
          setPlayerId(msg.playerId);
          setSessionToken(msg.sessionToken);
          setRoomStatus('LOBBY');
          setQuestionSetTitle(msg.questionSetTitle);
          setTotalQuestions(msg.totalQuestions);
          setErrorMessage(null);

          sessionStorage.setItem('apti_room_code', msg.roomCode);
          sessionStorage.setItem('apti_player_id', msg.playerId);
          sessionStorage.setItem('apti_session_token', msg.sessionToken);
          sessionStorage.setItem('apti_is_host', 'true');
        } else if (msg.type === 'JOIN_SUCCESS') {
          setIsJoiningRoom(false);
          setRoomCode(msg.roomCode);
          setIsHost(false);
          setPlayerId(msg.playerId);
          setSessionToken(msg.sessionToken);
          setRoomStatus(msg.status || 'LOBBY');
          setQuestionSetTitle(msg.questionSetTitle);
          setTotalQuestions(msg.totalQuestions);
          setRoundDurationSec(msg.roundDurationSec);
          setErrorMessage(null);

          sessionStorage.setItem('apti_room_code', msg.roomCode);
          sessionStorage.setItem('apti_player_id', msg.playerId);
          sessionStorage.setItem('apti_session_token', msg.sessionToken);
          sessionStorage.setItem('apti_is_host', 'false');
        } else if (msg.type === 'RECONNECT_SUCCESS') {
          setRoomCode(msg.roomCode);
          setPlayerId(msg.player.id);
          setIsHost(msg.isHost);
          if (msg.hostToken) setHostToken(msg.hostToken);
          setRoomStatus(msg.status);
          setQuestionSetTitle(msg.questionSetTitle);
          setTotalQuestions(msg.totalQuestions);
          setHasAnswered(msg.answeredCurrentRound);
          setSelectedOptionId(msg.selectedOptionId);
          if (msg.player?.score !== undefined) {
            setPlayerScore(msg.player.score);
          }
          if (msg.currentQuestion) {
            setCurrentQuestion(msg.currentQuestion);
          }
          if (msg.status === 'GAME_OVER' || msg.finalResults) {
            setRoomStatus('GAME_OVER');
            if (msg.finalResults) {
              setFinalResults(msg.finalResults);
              sessionStorage.setItem('apti_last_results', JSON.stringify(msg.finalResults));
            }
          }
        } else if (msg.type === 'LOBBY_UPDATE') {
          setLobbyPlayers(msg.players || []);
          if (msg.questionSetTitle) setQuestionSetTitle(msg.questionSetTitle);
          if (msg.totalQuestions) setTotalQuestions(msg.totalQuestions);
        } else if (msg.type === 'GAME_STARTING') {
          setRoomStatus('STARTING');
          setStartingCountdown(msg.countdownSec || 3);
          const timer = setInterval(() => {
            setStartingCountdown(prev => {
              if (prev && prev > 1) return prev - 1;
              clearInterval(timer);
              return null;
            });
          }, 1000);
        } else if (msg.type === 'QUESTION_START') {
          setRoomStatus('QUESTION_ACTIVE');
          setCurrentQuestion(msg.payload);
          setRoundResult(null);
          setLiveOptionCounts({});
          setHasAnswered(false);
          setSelectedOptionId(undefined);
          setServerElapsedSec(undefined);
          setAnswerEvaluation(null);
          setTotalAnsweredCount(0);
          setEliminatedOptionIds([]);
        } else if (msg.type === 'ANSWER_ACCEPTED') {
          setHasAnswered(true);
          setSelectedOptionId(msg.selectedOptionId);
          setServerElapsedSec(msg.serverElapsedSec);
          if (msg.evaluation) {
            setAnswerEvaluation(msg.evaluation);
            if (msg.evaluation.currentScore !== undefined) {
              setPlayerScore(msg.evaluation.currentScore);
            }
          }
        } else if (msg.type === 'ROUND_PROGRESS') {
          setTotalAnsweredCount(msg.totalAnswered);
        } else if (msg.type === 'HOST_MONITOR_UPDATE') {
          setTotalAnsweredCount(msg.totalAnswered);
          if (msg.optionCounts) {
            setLiveOptionCounts(msg.optionCounts);
          }
          if (msg.contestants) {
            setHostMonitorContestants(msg.contestants);
          }
        } else if (msg.type === 'POWERUP_5050_RESULT') {
          setPowerUp5050Used(true);
          setEliminatedOptionIds(msg.eliminatedOptionIds || []);
        } else if (msg.type === 'ROUND_RESULT') {
          setRoomStatus('ROUND_REVIEW');
          setRoundResult(msg.payload);
          setAnswerEvaluation(null);
        } else if (msg.type === 'GAME_OVER') {
          setRoomStatus('GAME_OVER');
          setFinalResults(msg.payload);
          setAnswerEvaluation(null);
          sessionStorage.setItem('apti_last_results', JSON.stringify(msg.payload));
        }
      } catch (err) {
        console.error('Socket message parse error:', err);
      }
    };

    socket.onerror = (err) => {
      console.error('WebSocket connection error:', err);
    };

    wsRef.current = socket;
    return socket;
  }, []);

  useEffect(() => {
    getWebSocket();
  }, [getWebSocket]);

  // Compute final verified college name
  const effectiveCollege = selectedCollege === 'Other'
    ? (customCollege.trim() || 'Independent Institute')
    : selectedCollege;

  // Handle Student Join
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const name = playerName.trim();
    const college = effectiveCollege;
    const code = joinRoomCode.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');

    if (!name) {
      setErrorMessage('Please enter your full name or display name.');
      return;
    }
    if (!selectedCollege) {
      setErrorMessage('Please select your college or institution from the list.');
      return;
    }
    if (selectedCollege === 'Other' && !customCollege.trim()) {
      setErrorMessage('Please enter your custom college or university name.');
      return;
    }
    if (!code || code.length < 4) {
      setErrorMessage('Please enter a valid 6-character room code.');
      return;
    }

    localStorage.setItem('apti_player_name', name);
    localStorage.setItem('apti_college_preset', selectedCollege);
    if (selectedCollege === 'Other') {
      localStorage.setItem('apti_college_custom', customCollege);
    }

    setIsJoiningRoom(true);

    // Verify room via REST before connecting
    try {
      const checkRes = await fetch(`/api/rooms/${code}`);
      if (!checkRes.ok) {
        setErrorMessage(`Room "${code}" does not exist or has expired. Please check with your host.`);
        setIsJoiningRoom(false);
        return;
      }
      const roomData = await checkRes.json();
      if (!roomData.canJoin) {
        setErrorMessage(roomData.message || 'Room is not currently accepting players.');
        setIsJoiningRoom(false);
        return;
      }
    } catch {
      // Continue to WS
    }

    const socket = getWebSocket();
    const payload = {
      type: 'JOIN_ROOM',
      roomCode: code,
      playerName: name,
      collegeName: college,
      participantId: persistentParticipantId,
    };

    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    } else {
      socket.addEventListener('open', () => {
        socket.send(JSON.stringify(payload));
      }, { once: true });
    }
  };

  // Handle Host Create Room (via authoritative REST API then attaching via WebSocket)
  const handleHostCreateRoom = async (config: {
    hostName: string;
    questionSetId: string;
    roundDurationSec: number;
    questionLimit?: number;
  }) => {
    setIsCreatingRoom(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        throw new Error('Failed to create room on server');
      }

      const data = await res.json();
      const code = data.roomCode;

      setRoomCode(code);
      setIsHost(true);
      setHostToken(data.hostToken);
      setPlayerId(data.hostId);
      setSessionToken(data.sessionToken);
      setRoomStatus('LOBBY');
      setQuestionSetTitle(data.questionSetTitle);
      setTotalQuestions(data.totalQuestions);
      setRoundDurationSec(data.settings.roundDurationSec);

      sessionStorage.setItem('apti_room_code', code);
      sessionStorage.setItem('apti_player_id', data.hostId);
      sessionStorage.setItem('apti_session_token', data.sessionToken);
      sessionStorage.setItem('apti_is_host', 'true');

      // Attach host via WebSocket
      const socket = getWebSocket();
      const attachPayload = {
        type: 'HOST_ATTACH',
        roomCode: code,
        hostToken: data.hostToken,
        hostId: data.hostId,
        sessionToken: data.sessionToken,
      };

      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(attachPayload));
      } else {
        socket.addEventListener('open', () => {
          socket.send(JSON.stringify(attachPayload));
        }, { once: true });
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Could not create quiz room. Please check connection and try again.');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Host starts game
  const handleHostStartGame = () => {
    const socket = getWebSocket();
    if (socket.readyState === WebSocket.OPEN && roomCode && hostToken) {
      socket.send(JSON.stringify({
        type: 'HOST_START_GAME',
        roomCode,
        hostToken,
      }));
    }
  };

  // Host advances question
  const handleHostNextQuestion = () => {
    const socket = getWebSocket();
    if (socket.readyState === WebSocket.OPEN && roomCode && hostToken) {
      socket.send(JSON.stringify({
        type: 'HOST_NEXT_QUESTION',
        roomCode,
        hostToken,
      }));
    }
  };

  // Host ends game early
  const handleHostEndGame = async () => {
    if (!roomCode || !hostToken) return;

    const socket = getWebSocket();
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'HOST_END_GAME',
        roomCode,
        hostToken,
      }));
    }

    // Direct REST API fallback for guaranteed authoritative termination
    try {
      await fetch(`/api/rooms/${roomCode}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostToken }),
      });
    } catch (err) {
      console.warn('REST end quiz fallback failed:', err);
    }
  };

  // Player submits answer
  const handleSubmitAnswer = (optionId: string) => {
    if (hasAnswered || !roomCode || !playerId || !sessionToken) return;

    const socket = getWebSocket();
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'SUBMIT_ANSWER',
        roomCode,
        playerId,
        sessionToken,
        optionId,
      }));
    }
  };

  // Player uses 50-50 power-up
  const handleUse5050 = () => {
    if (powerUp5050Used || hasAnswered || !roomCode || !playerId || !sessionToken) return;
    const socket = getWebSocket();
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'USE_5050',
        roomCode,
        playerId,
        sessionToken,
      }));
    }
  };

  // Authoritatively clear match session & restore clean form
  const handleResetSession = useCallback((targetTab: 'student' | 'host' | 'league' = 'student') => {
    sessionStorage.removeItem('apti_room_code');
    sessionStorage.removeItem('apti_is_host');

    setRoomCode(null);
    setRoomStatus(null);
    setIsHost(false);
    setHostToken(null);
    setCurrentQuestion(null);
    setRoundResult(null);
    setFinalResults(null);
    setHasAnswered(false);
    setSelectedOptionId(undefined);
    setServerElapsedSec(undefined);
    setAnswerEvaluation(null);
    setPlayerScore(0);
    setTotalAnsweredCount(0);
    setPowerUp5050Used(false);
    setEliminatedOptionIds([]);
    setStartingCountdown(null);
    setLobbyPlayers([]);
    setErrorMessage(null);
    setJoinRoomCode('');
    setRoomValidationStatus({});
    setIsJoiningRoom(false);

    navigateToTab(targetTab);
  }, [navigateToTab]);

  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[#09090b] font-sans text-[#f5f5f7] selection:bg-[#c6ff00] selection:text-black">
      {/* Subtle Floating Bubbles Background (reduced during live questions) */}
      <FloatingBubblesBackground isCalmMode={roomStatus === 'QUESTION_ACTIVE'} />

      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          if (!roomCode || roomStatus === 'GAME_OVER') {
            if (roomStatus === 'GAME_OVER' && tab === 'student') {
              handleResetSession('student');
            } else if (roomStatus === 'GAME_OVER' && tab === 'host') {
              handleResetSession('host');
            } else {
              navigateToTab(tab);
            }
          } else {
            if (confirm('Leave current live match?')) {
              handleResetSession(tab);
            }
          }
        }}
        onOpenRules={() => setIsRulesOpen(true)}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        roomCode={roomCode || undefined}
        isHostActive={isHost && !!roomCode && roomStatus !== 'GAME_OVER'}
      />

      {/* Main Content Area */}
      <main className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="w-full max-w-xl mb-6 p-4 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center justify-between shadow-xl animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-white font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* VIEW 1: CAMPUS LEAGUE STANDINGS */}
        {currentTab === 'league' && (
          <CollegeLeagueView
            onBackToResults={finalResults ? () => navigateToTab('student') : undefined}
            onJoinQuiz={() => handleResetSession('student')}
          />
        )}

        {/* VIEW 2: DEDICATED FACULTY HOST PORTAL (When outside active match or when host tab clicked) */}
        {currentTab === 'host' && (!roomCode || roomStatus === 'GAME_OVER') && (
          <HostDashboard
            questionSetsList={questionSetsList}
            onCreateRoom={handleHostCreateRoom}
            onRefreshSets={fetchQuestionSets}
            isCreating={isCreatingRoom}
            errorMessage={errorMessage}
          />
        )}

        {/* VIEW 3: LIVE MULTIPLAYER GAMEPLAY & CONTESTANT ARENA */}
        {(currentTab === 'student' || (roomCode && roomStatus !== 'GAME_OVER')) && (
          <>
            {/* 3a. STARTING COUNTDOWN OVERLAY */}
            {roomStatus === 'STARTING' && startingCountdown !== null && (
              <div className="text-center space-y-4 py-16 animate-in zoom-in-75">
                <span className="text-sm uppercase tracking-widest font-black text-cyan-400">
                  PLACEMENT MATCH COMMENCING
                </span>
                <div className="text-7xl sm:text-8xl font-black font-mono text-white animate-pulse">
                  {startingCountdown}
                </div>
                <p className="text-xs text-slate-400">Synchronizing authoritative server clock...</p>
              </div>
            )}

            {/* 3b. WAITING LOBBY (Host or Student) */}
            {roomStatus === 'LOBBY' && roomCode && (
              <LobbyView
                roomCode={roomCode}
                isHost={isHost}
                questionSetTitle={questionSetTitle}
                totalQuestions={totalQuestions}
                roundDurationSec={roundDurationSec}
                players={lobbyPlayers}
                onStartGame={handleHostStartGame}
                currentPlayerId={playerId}
              />
            )}

            {/* 3c. ACTIVE QUESTION: Host Presenter Monitor vs Student Question Arena */}
            {roomStatus === 'QUESTION_ACTIVE' && currentQuestion && (
              isHost ? (
                <HostLiveMonitor
                  question={currentQuestion}
                  roomCode={roomCode || ''}
                  totalAnsweredCount={totalAnsweredCount}
                  totalContestantsCount={lobbyPlayers.filter(p => !p.isHost).length}
                  players={lobbyPlayers}
                  roundResult={roundResult}
                  onEndGame={handleHostEndGame}
                  isLastRound={currentQuestion.roundIndex >= totalQuestions}
                />
              ) : (
                <GameArena
                  question={currentQuestion}
                  onSubmitAnswer={handleSubmitAnswer}
                  onUse5050={handleUse5050}
                  hasAnswered={hasAnswered}
                  selectedOptionId={selectedOptionId}
                  serverElapsedSec={serverElapsedSec}
                  totalAnsweredCount={totalAnsweredCount}
                  totalPlayersCount={lobbyPlayers.filter(p => !p.isHost).length}
                  powerUp5050Used={powerUp5050Used}
                  eliminatedOptionIds={eliminatedOptionIds}
                  answerEvaluation={answerEvaluation}
                  playerScore={playerScore}
                />
              )
            )}

            {/* 3d. ROUND REVIEW & LIVE STANDINGS */}
            {roomStatus === 'ROUND_REVIEW' && roundResult && (
              <RoundReview
                roundResult={roundResult}
                currentPlayerId={playerId}
                isHost={isHost}
                onNextQuestion={handleHostNextQuestion}
                onEndGame={handleHostEndGame}
                isLastRound={roundResult.roundIndex >= totalQuestions}
              />
            )}

            {/* 3e. GAME OVER & FINAL LEADERBOARD */}
            {roomStatus === 'GAME_OVER' && finalResults && (
              <GameOverView
                results={finalResults}
                currentPlayerId={playerId}
                isHost={isHost}
                onJoinQuiz={() => handleResetSession('student')}
                onPlayAgain={() => handleResetSession('student')}
                onViewLeague={() => navigateToTab('league')}
                onHostPortal={() => handleResetSession('host')}
              />
            )}

            {/* 3f. DEDICATED STUDENT JOIN PORTAL (When not in an active room) */}
            {(!roomCode || roomStatus === null) && (
              <div className="grid w-full max-w-6xl items-center gap-8 py-3 md:grid-cols-[1.05fr_.95fr] md:gap-12 lg:gap-16">
                {/* Focused Student Hero */}
                <div className="space-y-5 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#c6ff00]/20 bg-[#c6ff00]/[0.06] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#d5ff65]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#c6ff00] shadow-[0_0_10px_rgba(198,255,0,0.7)]" />
                    Competitive aptitude · Live arena
                  </div>
                  <h2 className="text-4xl font-black leading-[1.04] tracking-[-.045em] text-white sm:text-5xl lg:text-6xl">
                    Think fast.<br />
                    <span className="text-[#c6ff00]">Play as one.</span>
                  </h2>
                  <p className="mx-auto max-w-md text-sm leading-6 text-[#a1a1aa] md:mx-0 sm:text-base">
                    Join your campus match and put speed, accuracy, and nerve to the test. Enter the room code from your host to get in the game.
                  </p>
                  <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 pt-1 text-[11px] font-semibold text-[#92929f] md:justify-start">
                    <span className="inline-flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-[#52e5ff]" /> Server-verified rounds</span>
                    <span className="inline-flex items-center gap-2"><Users className="h-3.5 w-3.5 text-[#c6ff00]" /> Play with your campus</span>
                  </div>
                </div>

                {/* Focused Student Join Card */}
                <div className="arena-panel relative mx-auto w-full max-w-xl overflow-hidden rounded-[28px] p-5 backdrop-blur-sm sm:p-7">
                  <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#c6ff00]/[0.055] blur-3xl" />
                  <div className="relative mb-5 flex items-center justify-between border-b border-white/[0.08] pb-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-[#c6ff00]">
                      <Play className="h-4 w-4 fill-[#c6ff00]" /> Enter the arena
                    </div>
                    <span className="rounded-md border border-white/[0.08] bg-white/[0.035] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-[#92929f]">Player entry</span>
                  </div>

                  <form onSubmit={handleJoinRoom} className="relative space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-semibold text-slate-300">
                          Your Name *
                        </label>
                        {playerName.trim() && (
                          <div className="flex items-center gap-1.5 text-[11px] text-cyan-400 font-mono">
                            <ParticipantAvatar name={playerName} size="xs" />
                            <span>Avatar preview</span>
                          </div>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Arjun Sharma"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        className="arena-control w-full rounded-xl px-4 py-3 text-sm text-white transition-colors focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                        Your College / Institution *
                      </label>
                      <select
                        required
                        value={selectedCollege}
                        onChange={(e) => setSelectedCollege(e.target.value)}
                        className="arena-control w-full rounded-xl px-4 py-3 text-sm text-white transition-colors focus:outline-none"
                      >
                        <option value="" disabled>-- Select Your College / University --</option>
                        {PRESET_COLLEGES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>

                      {selectedCollege === 'Other' && (
                        <input
                          type="text"
                          required
                          placeholder="Enter your college or university name"
                          value={customCollege}
                          onChange={(e) => setCustomCollege(e.target.value)}
                          className="arena-control mt-2 w-full rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                        />
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-semibold text-slate-300">
                          Room Code (6 characters) *
                        </label>
                        {roomValidationStatus.message && (
                          <span className={`text-[11px] font-medium ${roomValidationStatus.valid ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {roomValidationStatus.message}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        maxLength={8}
                        required
                        placeholder="e.g. FNBHDA"
                        value={joinRoomCode}
                        onChange={(e) => {
                          const clean = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                          setJoinRoomCode(clean);
                          validateRoomCode(clean);
                        }}
                        className="arena-control w-full rounded-xl px-4 py-3 text-center font-mono text-lg font-bold uppercase tracking-[.24em] text-[#52e5ff] transition-colors focus:outline-none sm:text-left"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isJoiningRoom}
                      className="arena-button-primary flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-4 text-sm font-black tracking-wide disabled:cursor-not-allowed"
                    >
                      {isJoiningRoom ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Joining Room...</span>
                        </>
                      ) : (
                        <>
                          <span>Enter Live Quiz Arena</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>

                  <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-[#52e5ff]" /> Server-verified answers
                    </span>
                    <button
                      onClick={() => setIsRulesOpen(true)}
                      className="font-medium text-[#52e5ff] hover:underline cursor-pointer"
                    >
                      View Scoring Formula
                    </button>
                  </div>
                </div>

                {/* Discreet Link to Host Section for faculty */}
                <div className="text-center pt-2">
                  <button
                    onClick={() => navigateToTab('host')}
                    className="text-xs text-slate-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1.5 font-medium cursor-pointer"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Are you a faculty lead or placement coordinator? Open Faculty Host Portal →</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Rules & Network Delay Fairness Modal */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
    </div>
  );
}
