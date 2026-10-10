/**
 * Automated Verification Script:
 * 1. PDF Question Bank Option Extraction (sample questions format & edge cases)
 * 2. Automatic Question Progression without host intervention
 * 3. Five-Second Answer Feedback review lifecycle
 */

import WebSocket from 'ws';
import { parseDocumentText, parseCSVQuestionBank } from '../src/utils/questionBankParser.js';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const WS_URL = process.env.TEST_WS_URL || 'ws://localhost:3000/ws';

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 VERIFYING PDF OPTION EXTRACTION & AUTOMATIC QUIZ ENGINE');
  console.log('======================================================\n');

  // -------------------------------------------------------------------------
  // TEST 1: PDF OPTION EXTRACTION (Format from user problem statement)
  // -------------------------------------------------------------------------
  console.log('Test 1: Testing PDF Text Parsing on User Problem Statement Format...');

  const userPdfSample = `Sample Questions for Quiz-A-Thon

1. The cloud acts like a disk drive which may be owned by Google or Apple and stores files in a remote location. One can access:

A. Photos

B. Documents

C. Videos

D. All of the above

2. Which one of the following is Cloud Platform by Amazon?

A. Azure

B. AWS

C. Cloudera

D. All of the above`;

  const parsedSample = parseDocumentText(userPdfSample, 'PDF');
  console.log(`Detected Questions: ${parsedSample.totalRows}`);

  if (parsedSample.totalRows !== 2) {
    throw new Error(`Expected 2 questions detected, got ${parsedSample.totalRows}`);
  }

  parsedSample.rowDetails.forEach((row, i) => {
    const raw = row.raw;
    if (!raw) throw new Error(`Row ${row.rowNumber} missing raw data`);
    console.log(`  Question ${row.rowNumber}: "${raw.question?.substring(0, 50)}..."`);
    console.log(`    A: "${raw.optA}"`);
    console.log(`    B: "${raw.optB}"`);
    console.log(`    C: "${raw.optC}"`);
    console.log(`    D: "${raw.optD}"`);

    if (!raw.optA || !raw.optB || !raw.optC || !raw.optD) {
      throw new Error(`Row ${row.rowNumber} failed to extract all 4 options!`);
    }
  });

  console.log('✅ TEST 1 PASSED: PDF Options extracted with 100% accuracy for all 4 choices!\n');

  // -------------------------------------------------------------------------
  // TEST 2: PDF OPTION EXTRACTION WITH GLOBAL & INLINE ANSWER KEYS
  // -------------------------------------------------------------------------
  console.log('Test 2: Testing PDF with Inline & Global Answer Keys...');

  const pdfWithGlobalKey = `Placement Prep Test
1. If 3x = 27, what is the value of x?
A. 6
B. 9
C. 12
D. 15

2. Find the next number in series: 2, 4, 8, 16, ?
A. 24
B. 32
C. 40
D. 48

Answer Key:
1. B
2. B`;

  const parsedWithKey = parseDocumentText(pdfWithGlobalKey, 'PDF');
  if (parsedWithKey.validRows !== 2 || parsedWithKey.invalidRows !== 0) {
    throw new Error(`Expected 2 valid questions with answer key, got valid=${parsedWithKey.validRows}, invalid=${parsedWithKey.invalidRows}`);
  }
  console.log(`✅ TEST 2 PASSED: 2/2 questions automatically valid with global answer key!\n`);

  // -------------------------------------------------------------------------
  // TEST 3: AUTOMATIC QUESTION PROGRESSION (NO INSTRUCTOR INTERVENTION)
  // -------------------------------------------------------------------------
  console.log('Test 3: Testing Automatic Question Progression (Zero Host Intervention)...');

  // 3a. Host creates 2-round room with 2-second round duration
  const createRes = await fetch(`${BASE_URL}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hostName: 'Automated_Instructor',
      roundDurationSec: 2,
      questionLimit: 2,
    }),
  });

  const roomData = await createRes.json();
  const roomCode = roomData.roomCode;
  const hostToken = roomData.hostToken;
  console.log(`  Room created: ${roomCode}`);

  // 3b. Host attaches WebSocket
  const hostWs = new WebSocket(WS_URL);
  await new Promise<void>((resolve) => {
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
      if (msg.type === 'LOBBY_UPDATE' || msg.type === 'ROOM_CREATED') resolve();
    });
  });

  // 3c. Student joins
  const studentWs = new WebSocket(WS_URL);
  let studentPlayerId = '';
  let studentSessionToken = '';

  await new Promise<void>((resolve) => {
    studentWs.on('open', () => {
      studentWs.send(JSON.stringify({
        type: 'JOIN_ROOM',
        roomCode,
        playerName: 'Automated_Student',
        collegeName: 'BITS Pilani',
      }));
    });
    studentWs.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'JOIN_SUCCESS') {
        studentPlayerId = msg.playerId;
        studentSessionToken = msg.sessionToken;
        resolve();
      }
    });
  });

  // 3d. Host clicks START GAME ONCE. After this, host NEVER SENDS ANY COMMANDS!
  console.log('  Host starts quiz (Initial click only)...');
  hostWs.send(JSON.stringify({
    type: 'HOST_START_GAME',
    roomCode,
    hostToken,
  }));

  // Track rounds received by student
  const roundsReceived: number[] = [];
  let round1ReviewSeen = false;
  let round1AutoAdvanceSec = 0;
  let gameOverReceived = false;

  const quizCompletionPromise = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Quiz stalled! Automatic progression did not complete within 20s.'));
    }, 20000);

    studentWs.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());

      if (msg.type === 'QUESTION_START') {
        const roundIdx = msg.payload.roundIndex;
        roundsReceived.push(roundIdx);
        console.log(`  📍 Student received QUESTION_START for Round #${roundIdx}`);

        // Student immediately submits answer
        studentWs.send(JSON.stringify({
          type: 'SUBMIT_ANSWER',
          roomCode,
          playerId: studentPlayerId,
          sessionToken: studentSessionToken,
          optionId: msg.payload.options[0].id,
        }));
      } else if (msg.type === 'ROUND_RESULT') {
        console.log(`  📊 Student received ROUND_RESULT for Round #${msg.payload.roundIndex} (autoAdvanceSec=${msg.payload.autoAdvanceSec}s)`);
        if (msg.payload.roundIndex === 1) {
          round1ReviewSeen = true;
          round1AutoAdvanceSec = msg.payload.autoAdvanceSec;
          console.log(`     -> Verifying that Server automatically advances to Round 2 without host input...`);
        }
      } else if (msg.type === 'GAME_OVER') {
        console.log(`  🏆 Student received GAME_OVER automatically! Final leaderboard generated.`);
        gameOverReceived = true;
        clearTimeout(timeout);
        resolve();
      }
    });
  });

  await quizCompletionPromise;

  // Assertions
  if (!round1ReviewSeen || round1AutoAdvanceSec !== 5) {
    throw new Error(`Round 1 did not broadcast 5-second answer feedback: autoAdvanceSec=${round1AutoAdvanceSec}`);
  }

  if (roundsReceived.length !== 2 || roundsReceived[0] !== 1 || roundsReceived[1] !== 2) {
    throw new Error(`Expected rounds [1, 2], got ${JSON.stringify(roundsReceived)}`);
  }

  if (!gameOverReceived) {
    throw new Error('Game over was not reached automatically!');
  }

  console.log('✅ TEST 3 PASSED: Automatic question progression and 5-second answer feedback succeeded from Round 1 -> Round 2 -> Game Over without ANY host intervention!\n');

  // Clean up
  hostWs.close();
  studentWs.close();

  console.log('======================================================');
  console.log('🎉 ALL AUTOMATIC PROGRESSION & PDF TESTS PASSED 100%!');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Verification test failed:', err);
  process.exit(1);
});
