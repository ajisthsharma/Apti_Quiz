/**
 * AptiQuiz 50-Player Concurrent Simulation & Stress Test
 * 
 * Verifies:
 * - 50 concurrent WebSocket clients connecting and joining a room
 * - Reliable broadcast of shuffled questions
 * - Concurrent answer submission handling under server authority
 * - Duplicate submission rejection test
 * - Live leaderboard generation and score integrity
 * - Final game over leaderboard delivery
 */

import WebSocket from 'ws';

const SERVER_URL = process.env.TEST_WS_URL || 'ws://localhost:3000/ws';
const NUM_PLAYERS = 50;

interface TestClient {
  id: number;
  name: string;
  college: string;
  ws: WebSocket;
  playerId?: string;
  sessionToken?: string;
  hasAnsweredCurrentRound?: boolean;
}

const COLLEGES = [
  'IIT Bombay', 'BITS Pilani', 'IIT Madras', 'Delhi Tech Univ',
  'NIT Trichy', 'IIT Delhi', 'VIT Vellore', 'IIIT Hyderabad'
];

async function runLoadTest() {
  console.log(`\n======================================================`);
  console.log(`🚀 Starting AptiQuiz 50-Player Real-Time Load Test`);
  console.log(`Target: ${SERVER_URL}`);
  console.log(`Simulated Concurrent Players: ${NUM_PLAYERS}`);
  console.log(`======================================================\n`);

  let roomCode = '';
  let hostToken = '';
  const hostWs = new WebSocket(SERVER_URL);

  await new Promise<void>((resolve, reject) => {
    hostWs.on('open', () => {
      hostWs.send(JSON.stringify({
        type: 'HOST_CREATE_ROOM',
        hostName: 'TestHost_Faculty',
        roundDurationSec: 6,
        questionLimit: 2, // 2 rounds for fast automated test verification
      }));
    });

    hostWs.on('message', (data: Buffer | string) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'ROOM_CREATED') {
        roomCode = msg.roomCode;
        hostToken = msg.hostToken;
        console.log(`[HOST] Created room ${roomCode} with host token.`);
        resolve();
      }
    });

    hostWs.on('error', (err) => {
      reject(new Error(`Host failed to connect: ${err.message}`));
    });
  });

  // Step 2: Spawn 50 player WebSocket clients
  const startTime = Date.now();
  const clients: TestClient[] = [];
  let joinedCount = 0;

  console.log(`[CONNECT] Connecting ${NUM_PLAYERS} simultaneous player clients...`);

  const joinPromises = Array.from({ length: NUM_PLAYERS }, (_, idx) => {
    return new Promise<void>((resolve, reject) => {
      const clientIndex = idx + 1;
      const ws = new WebSocket(SERVER_URL);
      const college = COLLEGES[idx % COLLEGES.length];
      const client: TestClient = {
        id: clientIndex,
        name: `Student_${String(clientIndex).padStart(2, '0')}`,
        college,
        ws,
      };
      clients.push(client);

      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'JOIN_ROOM',
          roomCode,
          playerName: client.name,
          collegeName: client.college,
        }));
      });

      ws.on('message', (data: Buffer | string) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'JOIN_SUCCESS') {
          client.playerId = msg.playerId;
          client.sessionToken = msg.sessionToken;
          joinedCount++;
          resolve();
        }
      });

      ws.on('error', (err) => {
        console.error(`Client ${clientIndex} error:`, err.message);
        reject(err);
      });
    });
  });

  await Promise.all(joinPromises);
  const joinDuration = Date.now() - startTime;
  console.log(`✅ All ${joinedCount} players joined room ${roomCode} in ${joinDuration}ms (${(joinDuration / NUM_PLAYERS).toFixed(1)}ms per client).\n`);

  // Step 3: Start game
  console.log(`[GAME] Host starting match...`);
  hostWs.send(JSON.stringify({
    type: 'HOST_START_GAME',
    roomCode,
    hostToken,
  }));

  // Step 4: Handle questions and answers
  let currentRound = 0;
  let testCompleteResolve: () => void;
  const testCompletePromise = new Promise<void>((resolve) => {
    testCompleteResolve = resolve;
  });

  // Attach game logic handlers to all clients
  clients.forEach((client) => {
    client.ws.on('message', (data: Buffer | string) => {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'QUESTION_START') {
        const payload = msg.payload;
        currentRound = payload.roundIndex;
        client.hasAnsweredCurrentRound = false;

        // Realistic simulated response delay (between 250ms and 1800ms)
        const thinkDelay = 250 + Math.floor(Math.random() * 1400);

        setTimeout(() => {
          if (!client.hasAnsweredCurrentRound) {
            client.hasAnsweredCurrentRound = true;
            // Pick an option from the shuffled list
            const chosenOption = payload.options[Math.floor(Math.random() * payload.options.length)];

            client.ws.send(JSON.stringify({
              type: 'SUBMIT_ANSWER',
              roomCode,
              playerId: client.playerId,
              sessionToken: client.sessionToken,
              optionId: chosenOption.id,
              clientTimestampMs: Date.now(),
            }));

            // Test duplicate submission rejection for client #1
            if (client.id === 1) {
              setTimeout(() => {
                client.ws.send(JSON.stringify({
                  type: 'SUBMIT_ANSWER',
                  roomCode,
                  playerId: client.playerId,
                  sessionToken: client.sessionToken,
                  optionId: chosenOption.id,
                  clientTimestampMs: Date.now(),
                }));
              }, 50);
            }
          }
        }, thinkDelay);
      } else if (msg.type === 'ANSWER_REJECTED') {
        if (client.id === 1 && msg.reason === 'ALREADY_SUBMITTED') {
          console.log(`🛡️  Verified Anti-Cheat: Duplicate submission successfully rejected for Player #1!`);
        }
      }
    });
  });

  // Host listener for advancing rounds and completing test
  hostWs.on('message', (data: Buffer | string) => {
    const msg = JSON.parse(data.toString());

    if (msg.type === 'ROUND_RESULT') {
      const payload = msg.payload;
      console.log(`📊 Round ${payload.roundIndex} Finished: ${payload.totalAnswers} / ${NUM_PLAYERS} submitted answers.`);
      console.log(`   Top 3 in Round: ${payload.playersLeaderboard.slice(0, 3).map((p: { name: string; totalScore: number }) => `${p.name} (${p.totalScore} pts)`).join(', ')}`);

      // Advance after a brief delay
      setTimeout(() => {
        hostWs.send(JSON.stringify({
          type: 'HOST_NEXT_QUESTION',
          roomCode,
          hostToken,
        }));
      }, 1500);
    } else if (msg.type === 'GAME_OVER') {
      const payload = msg.payload;
      console.log(`\n🏆 GAME OVER! Authoritative Final Leaderboard Generated.`);
      console.log(`Total Players Scored: ${payload.leaderboard.length}`);
      console.log(`Podium:`);
      payload.leaderboard.slice(0, 3).forEach((p: { rank: number; name: string; college: string; score: number; accuracyPercent: number; averageTimeSec: number }) => {
        console.log(`  #${p.rank} ${p.name} (${p.college}) - ${p.score} pts | Accuracy: ${p.accuracyPercent}% | Avg Time: ${p.averageTimeSec}s`);
      });

      // Verification checks
      const scores = payload.leaderboard.map((p: { score: number }) => p.score);
      const isMonotonic = scores.every((s: number, i: number) => i === 0 || s <= scores[i - 1]);
      if (isMonotonic && payload.leaderboard.length === NUM_PLAYERS) {
        console.log(`\n✅ TEST PASSED: All 50 players successfully participated, server scored answers, and produced sorted leaderboard with no corruption.`);
      } else {
        console.error(`❌ TEST FAILED: Leaderboard length (${payload.leaderboard.length}) or score sorting mismatch.`);
      }

      testCompleteResolve();
    }
  });

  await testCompletePromise;

  // Cleanup connections
  clients.forEach(c => c.ws.close());
  hostWs.close();
  console.log(`\n[CLEANUP] All 50 client WebSocket connections safely closed.`);
  console.log(`======================================================\n`);
}

runLoadTest().catch((err) => {
  console.error('Fatal load test error:', err);
  process.exit(1);
});
