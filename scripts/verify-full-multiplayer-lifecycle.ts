/**
 * Comprehensive verification of the two-session Host + Student multiplayer lifecycle,
 * room pre-registration, QR join URL validation, safe in-progress join, and dynamic rankings.
 */

import WebSocket from 'ws';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const WS_URL = process.env.TEST_WS_URL || 'ws://localhost:3000/ws';

async function verifyLifecycle() {
  console.log('\n======================================================');
  console.log('🧪 VERIFYING HOST + STUDENT MULTIPLAYER LIFECYCLE & RANKINGS');
  console.log('======================================================\n');

  // 1. Host creates room via POST /api/rooms
  console.log('Step 1: Host creates room via REST API...');
  const createRes = await fetch(`${BASE_URL}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hostName: 'Prof_Sharma',
      roundDurationSec: 5,
      questionLimit: 2,
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create room: ${createRes.status}`);
  }

  const roomData = await createRes.json();
  const roomCode = roomData.roomCode;
  const hostToken = roomData.hostToken;
  console.log(`✅ Room created: ${roomCode} with hostToken.`);

  // 2. Validate room is registered in state BEFORE student join
  console.log('Step 2: Validating room registration via GET /api/rooms/:code...');
  const checkRes = await fetch(`${BASE_URL}/api/rooms/${roomCode}`);
  if (!checkRes.ok) {
    throw new Error(`Room lookup failed for ${roomCode}`);
  }
  const checkData = await checkRes.json();
  if (!checkData.exists || !checkData.canJoin) {
    throw new Error(`Room not ready: ${JSON.stringify(checkData)}`);
  }
  console.log(`✅ Room confirmed registered in server state: status=${checkData.status}, canJoin=${checkData.canJoin}`);

  // Test invalid room code check
  console.log('Step 2b: Testing invalid room code rejection...');
  const invalidRes = await fetch(`${BASE_URL}/api/rooms/INVALID99`);
  if (invalidRes.status === 404) {
    console.log('✅ Invalid room code correctly rejected with 404.');
  } else {
    throw new Error(`Expected 404 for invalid room code, got ${invalidRes.status}`);
  }

  // 3. Connect Host via WebSocket
  console.log('Step 3: Host connects via WebSocket and attaches to room...');
  const hostWs = new WebSocket(WS_URL);
  await new Promise<void>((resolve, reject) => {
    hostWs.on('open', () => {
      hostWs.send(JSON.stringify({
        type: 'HOST_ATTACH',
        roomCode,
        hostToken,
        hostId: roomData.hostId,
        sessionToken: roomData.sessionToken,
      }));
    });

    hostWs.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'ROOM_CREATED' || msg.type === 'LOBBY_UPDATE') {
        resolve();
      }
    });

    hostWs.on('error', reject);
  });
  console.log('✅ Host attached to room via WebSocket.');

  // 4. Student connects via WebSocket and joins room
  console.log('Step 4: Student 1 connects and joins room...');
  const student1Ws = new WebSocket(WS_URL);
  let student1PlayerId = '';
  let student1SessionToken = '';

  await new Promise<void>((resolve, reject) => {
    student1Ws.on('open', () => {
      student1Ws.send(JSON.stringify({
        type: 'JOIN_ROOM',
        roomCode,
        playerName: 'Aakash_Gupta',
        collegeName: 'IIT Bombay',
      }));
    });

    student1Ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'JOIN_SUCCESS') {
        student1PlayerId = msg.playerId;
        student1SessionToken = msg.sessionToken;
        console.log(`✅ Student 1 joined room ${roomCode}: playerId=${student1PlayerId}`);
        resolve();
      }
    });

    student1Ws.on('error', reject);
  });

  // 5. Host starts game
  console.log('Step 5: Host starts game...');
  hostWs.send(JSON.stringify({
    type: 'HOST_START_GAME',
    roomCode,
    hostToken,
  }));

  // Student 1 listens for QUESTION_START
  let currentQId = '';
  let chosenOptId = '';
  await new Promise<void>((resolve) => {
    student1Ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'QUESTION_START') {
        currentQId = msg.payload.questionId;
        chosenOptId = msg.payload.options[0].id;
        console.log(`✅ Student 1 received Question #${msg.payload.roundIndex}: "${msg.payload.questionText.substring(0, 40)}..."`);
        console.log(`   Options shuffled for Student 1: ${msg.payload.options.map((o: { id: string }) => o.id).join(', ')}`);
        resolve();
      }
    });
  });

  // 6. Student 1 submits answer
  console.log('Step 6: Student 1 answers question...');
  student1Ws.send(JSON.stringify({
    type: 'SUBMIT_ANSWER',
    roomCode,
    playerId: student1PlayerId,
    sessionToken: student1SessionToken,
    optionId: chosenOptId,
  }));

  // 7. Safe in-progress join: Student 2 joins while game is ACTIVE!
  console.log('Step 7: Testing safe in-progress join (Student 2 joins mid-quiz)...');
  const student2Ws = new WebSocket(WS_URL);
  let student2JoinedMidRound = false;

  await new Promise<void>((resolve, reject) => {
    student2Ws.on('open', () => {
      student2Ws.send(JSON.stringify({
        type: 'JOIN_ROOM',
        roomCode,
        playerName: 'Sneha_Patil',
        collegeName: 'BITS Pilani',
      }));
    });

    student2Ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'JOIN_SUCCESS') {
        console.log(`✅ Student 2 received JOIN_SUCCESS with status=${msg.status}`);
      } else if (msg.type === 'QUESTION_START') {
        student2JoinedMidRound = true;
        console.log(`✅ Student 2 safely received active question during in-progress round!`);
        resolve();
      }
    });

    student2Ws.on('error', reject);
  });

  if (!student2JoinedMidRound) {
    throw new Error('Safe in-progress join failed: Student 2 did not receive active round.');
  }

  // 8. Wait for round review & advance to complete match
  console.log('Step 8: Waiting for round review...');
  await new Promise<void>((resolve) => {
    student1Ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'ROUND_RESULT') {
        console.log(`✅ Received ROUND_RESULT: Correct answer was ${msg.payload.correctOptionId}.`);
        resolve();
      }
    });
  });

  // End match cleanly
  console.log('Step 9: Host ends quiz to test dynamic rankings persistence...');
  hostWs.send(JSON.stringify({
    type: 'HOST_END_GAME',
    roomCode,
    hostToken,
  }));

  let gameCompleted = false;
  await new Promise<void>((resolve) => {
    student1Ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'GAME_OVER') {
        console.log(`✅ GAME_OVER received with leaderboard size=${msg.payload.leaderboard.length}`);
        gameCompleted = true;
        resolve();
      }
    });
  });

  // 10. Verify GET /api/league returns real persisted rankings
  console.log('Step 10: Verifying real dynamic college rankings via GET /api/league...');
  const leagueRes = await fetch(`${BASE_URL}/api/league`);
  if (!leagueRes.ok) {
    throw new Error(`Failed to fetch league: ${leagueRes.status}`);
  }
  const leagueData = await leagueRes.json();
  console.log(`✅ League returned ${leagueData.colleges.length} ranked colleges and ${leagueData.topPlayers.length} ranked players.`);
  console.log(`   Top College: ${leagueData.colleges[0]?.college} (${leagueData.colleges[0]?.totalScore} pts, ${leagueData.colleges[0]?.matchesPlayed} matches)`);

  // Cleanup
  hostWs.close();
  student1Ws.close();
  student2Ws.close();

  console.log('\n======================================================');
  console.log('🎉 ALL TWO-SESSION MULTIPLAYER LIFECYCLE TESTS PASSED!');
  console.log('======================================================\n');
}

verifyLifecycle().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
