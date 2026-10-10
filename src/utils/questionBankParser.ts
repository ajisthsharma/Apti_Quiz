import { Question, Topic, Difficulty } from '../types/quiz.js';
import * as mammoth from 'mammoth';

export interface ParsedQuestionRow {
  rowNumber: number;
  isValid: boolean;
  errors: string[];
  question?: Question;
  raw?: Record<string, string>;
}

export interface ParseResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  questions: Question[];
  rowDetails: ParsedQuestionRow[];
  metadataNotice?: string;
  detectedHeaders?: string[];
}

/**
 * Remove UTF-8 BOM if present
 */
export function stripBOM(text: string): string {
  if (text.charCodeAt(0) === 0xFEFF) {
    return text.slice(1);
  }
  return text;
}

/**
 * Detect delimiter between comma, semicolon, tab
 */
export function detectDelimiter(text: string): string {
  const sampleLines = text.split(/\r\n|\r|\n/).slice(0, 5).filter(l => l.trim().length > 0);
  if (sampleLines.length === 0) return ',';

  let commaCount = 0;
  let semiCount = 0;
  let tabCount = 0;

  for (const line of sampleLines) {
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (!inQuotes) {
        if (char === ',') commaCount++;
        else if (char === ';') semiCount++;
        else if (char === '\t') tabCount++;
      }
    }
  }

  if (semiCount > commaCount && semiCount > tabCount) return ';';
  if (tabCount > commaCount && tabCount > semiCount) return '\t';
  return ',';
}

/**
 * Robust RFC-4180 compliant CSV line parser supporting quoted cells, escaped quotes, and newlines
 */
export function parseCSV(text: string, delimiter = ','): { rows: string[][]; originalLineNumbers: number[] } {
  const clean = stripBOM(text);
  const rows: string[][] = [];
  const originalLineNumbers: number[] = [];

  let row: string[] = [];
  let cell = '';
  let insideQuotes = false;
  let currentLine = 1;
  let rowStartLine = 1;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        cell += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentLine++;
      row.push(cell.trim());
      cell = '';

      // Only push non-empty rows
      if (row.some(c => c.length > 0)) {
        rows.push(row);
        originalLineNumbers.push(rowStartLine);
      }
      row = [];
      rowStartLine = currentLine;
    } else {
      if ((char === '\r' || char === '\n') && insideQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        currentLine++;
        cell += '\n';
      } else {
        cell += char;
      }
    }
  }

  // Handle last cell/row
  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some(c => c.length > 0)) {
      rows.push(row);
      originalLineNumbers.push(rowStartLine);
    }
  }

  return { rows, originalLineNumbers };
}

export function normalizeTopic(raw: string): Topic {
  const lower = (raw || '').toLowerCase().trim();
  if (lower.includes('quant') || lower.includes('math') || lower.includes('arithmetic') || lower.includes('num')) return 'quantitative';
  if (lower.includes('logic') || lower.includes('reason') || lower.includes('puzzle') || lower.includes('analyt')) return 'logical';
  if (lower.includes('verb') || lower.includes('eng') || lower.includes('gramm') || lower.includes('vocab')) return 'verbal';
  if (lower.includes('data') || lower.includes('di') || lower.includes('chart') || lower.includes('table') || lower.includes('graph')) return 'data_interpretation';
  return 'quantitative';
}

export function normalizeDifficulty(raw: string): Difficulty {
  const lower = (raw || '').toLowerCase().trim();
  if (lower.includes('hard') || lower.includes('diff') || lower.includes('adv')) return 'hard';
  if (lower.includes('easy') || lower.includes('basic') || lower.includes('begin')) return 'easy';
  return 'medium';
}

function cleanHeaderKey(h: string): string {
  return (h || '').toLowerCase().replace(/[\r\n]/g, ' ').trim().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
}

/**
 * Check if a row looks like a Question Bank header row
 */
function isQuestionBankHeaderRow(cells: string[]): boolean {
  const keys = cells.map(cleanHeaderKey);
  const hasQuestion = keys.some(k => k.includes('question') || k === 'prompt' || k === 'item' || k === 'q');
  const hasOpt = keys.some(k => k.includes('opt') || k.includes('choice') || k === 'a');
  const hasAns = keys.some(k => k.includes('correct') || k.includes('answer') || k === 'key');

  return hasQuestion && (hasOpt || hasAns);
}

/**
 * Parse CSV question bank with auto-delimiter, BOM removal, header alias normalization,
 * title/metadata row skipping, and full row validation.
 */
export function parseCSVQuestionBank(csvText: string): ParseResult {
  const delimiter = detectDelimiter(csvText);
  const { rows, originalLineNumbers } = parseCSV(csvText, delimiter);

  if (rows.length === 0) {
    return {
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      questions: [],
      rowDetails: [{ rowNumber: 1, isValid: false, errors: ['File is empty or contains no readable lines.'] }],
    };
  }

  // Find the actual header row (look within first 10 rows to skip introductory/title rows)
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    if (isQuestionBankHeaderRow(rows[i])) {
      headerRowIdx = i;
      break;
    }
  }

  // If not explicitly detected, check if row 0 could be the header
  if (headerRowIdx === -1) {
    // Check if row 0 has at least 'question' or 'q'
    const r0Keys = rows[0].map(cleanHeaderKey);
    if (r0Keys.some(k => k.includes('question') || k === 'q')) {
      headerRowIdx = 0;
    }
  }

  if (headerRowIdx === -1) {
    const detectedFirstRow = rows[0].join(', ');
    return {
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      questions: [],
      detectedHeaders: rows[0],
      rowDetails: [{
        rowNumber: 1,
        isValid: false,
        errors: [
          `Missing required header column: 'question'. Detected row 1: [${detectedFirstRow}]. Expected columns: question, option_a, option_b, option_c, option_d, correct_answer, topic, difficulty.`,
        ],
      }],
    };
  }

  const rawHeader = rows[headerRowIdx];
  const headerKeys = rawHeader.map(cleanHeaderKey);

  // Column matching with comprehensive aliases
  const qIdx = headerKeys.findIndex(k =>
    k === 'question' || k === 'question_text' || k === 'questiontext' || k === 'prompt' || k === 'item' || k === 'q' || k.includes('question')
  );

  let optAIdx = headerKeys.findIndex(k =>
    k === 'option_a' || k === 'opt_a' || k === 'opta' || k === 'optiona' || k === 'option_1' || k === 'opt_1' || k === 'opt1' || k === 'option1' || k === 'a' || k === 'choice_a' || k === 'choice_1'
  );
  let optBIdx = headerKeys.findIndex(k =>
    k === 'option_b' || k === 'opt_b' || k === 'optb' || k === 'optionb' || k === 'option_2' || k === 'opt_2' || k === 'opt2' || k === 'option2' || k === 'b' || k === 'choice_b' || k === 'choice_2'
  );
  let optCIdx = headerKeys.findIndex(k =>
    k === 'option_c' || k === 'opt_c' || k === 'optc' || k === 'optionc' || k === 'option_3' || k === 'opt_3' || k === 'opt3' || k === 'option3' || k === 'c' || k === 'choice_c' || k === 'choice_3'
  );
  let optDIdx = headerKeys.findIndex(k =>
    k === 'option_d' || k === 'opt_d' || k === 'optd' || k === 'optiond' || k === 'option_4' || k === 'opt_4' || k === 'opt4' || k === 'option4' || k === 'd' || k === 'choice_d' || k === 'choice_4'
  );

  // Fallback to sequential columns if standard 4 options follow question
  if (optAIdx === -1 && rawHeader.length >= 5) {
    optAIdx = 1; optBIdx = 2; optCIdx = 3; optDIdx = 4;
  }

  const ansIdx = headerKeys.findIndex(k =>
    k === 'correct_answer' || k === 'correctanswer' || k === 'correct_ans' || k === 'answer' || k === 'ans' || k === 'correct' || k === 'key' || k === 'solution' || k === 'correct_option' || k.includes('correct') || k.includes('answer')
  );
  const topicIdx = headerKeys.findIndex(k =>
    k === 'topic' || k === 'subject' || k === 'category' || k === 'section' || k === 'domain' || k.includes('topic') || k.includes('category')
  );
  const diffIdx = headerKeys.findIndex(k =>
    k === 'difficulty' || k === 'level' || k === 'difficulty_level' || k === 'diff' || k.includes('diff') || k.includes('level')
  );
  const expIdx = headerKeys.findIndex(k =>
    k === 'explanation' || k === 'solution' || k === 'rationale' || k === 'notes' || k.includes('expl') || k.includes('solution')
  );

  let metadataNotice: string | undefined;
  if (headerRowIdx > 0) {
    metadataNotice = `Detected header at row ${originalLineNumbers[headerRowIdx]} (skipped ${headerRowIdx} introductory/title row${headerRowIdx > 1 ? 's' : ''}).`;
  }

  const rowDetails: ParsedQuestionRow[] = [];
  const validQuestions: Question[] = [];

  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    const fileLine = originalLineNumbers[r] || (r + 1);
    const errors: string[] = [];

    // Skip empty lines
    if (!row || row.every(cell => !cell.trim())) continue;

    const qText = row[qIdx]?.trim() || '';
    if (!qText) {
      errors.push('Question text is empty.');
    }

    const optAText = row[optAIdx]?.trim() || '';
    const optBText = row[optBIdx]?.trim() || '';
    const optCText = row[optCIdx]?.trim() || '';
    const optDText = row[optDIdx]?.trim() || '';

    if (!optAText) errors.push('Option A is missing.');
    if (!optBText) errors.push('Option B is missing.');
    if (!optCText) errors.push('Option C is missing.');
    if (!optDText) errors.push('Option D is missing.');

    const rawAns = (ansIdx !== -1 ? row[ansIdx] : '')?.trim() || '';
    let correctOptId = '';

    const cleanAns = rawAns.toUpperCase().trim();
    const optLabelMatch = cleanAns.match(/^(?:OPTION|OPT|CHOICE)[\s_]*([1-4A-D])$/i);

    if (cleanAns === 'A' || cleanAns === '1' || cleanAns === 'OPT_1' || (optLabelMatch && (optLabelMatch[1].toUpperCase() === 'A' || optLabelMatch[1] === '1'))) {
      correctOptId = 'opt_1';
    } else if (cleanAns === 'B' || cleanAns === '2' || cleanAns === 'OPT_2' || (optLabelMatch && (optLabelMatch[1].toUpperCase() === 'B' || optLabelMatch[1] === '2'))) {
      correctOptId = 'opt_2';
    } else if (cleanAns === 'C' || cleanAns === '3' || cleanAns === 'OPT_3' || (optLabelMatch && (optLabelMatch[1].toUpperCase() === 'C' || optLabelMatch[1] === '3'))) {
      correctOptId = 'opt_3';
    } else if (cleanAns === 'D' || cleanAns === '4' || cleanAns === 'OPT_4' || (optLabelMatch && (optLabelMatch[1].toUpperCase() === 'D' || optLabelMatch[1] === '4'))) {
      correctOptId = 'opt_4';
    } else if (optAText && rawAns.toLowerCase() === optAText.toLowerCase()) {
      correctOptId = 'opt_1';
    } else if (optBText && rawAns.toLowerCase() === optBText.toLowerCase()) {
      correctOptId = 'opt_2';
    } else if (optCText && rawAns.toLowerCase() === optCText.toLowerCase()) {
      correctOptId = 'opt_3';
    } else if (optDText && rawAns.toLowerCase() === optDText.toLowerCase()) {
      correctOptId = 'opt_4';
    } else {
      errors.push(`Correct answer "${rawAns || '(empty)'}" must match A, B, C, D (or 1, 2, 3, 4, Option 1-4) or match option text.`);
    }

    const topic = normalizeTopic(topicIdx !== -1 ? row[topicIdx] : 'quantitative');
    const difficulty = normalizeDifficulty(diffIdx !== -1 ? row[diffIdx] : 'medium');
    const explanation = (expIdx !== -1 ? row[expIdx] : '')?.trim() || `Correct answer is Option ${correctOptId.replace('opt_', '').toUpperCase()}.`;

    if (errors.length === 0) {
      const q: Question = {
        id: `q_csv_${Date.now()}_${fileLine}`,
        questionText: qText,
        options: [
          { id: 'opt_1', text: optAText },
          { id: 'opt_2', text: optBText },
          { id: 'opt_3', text: optCText },
          { id: 'opt_4', text: optDText },
        ],
        correctOptionId: correctOptId,
        topic,
        difficulty,
        explanation,
        timeLimitSec: 20,
      };
      validQuestions.push(q);
      rowDetails.push({ rowNumber: fileLine, isValid: true, errors: [], question: q });
    } else {
      rowDetails.push({
        rowNumber: fileLine,
        isValid: false,
        errors,
        raw: { question: qText, optA: optAText, optB: optBText, optC: optCText, optD: optDText, ans: rawAns },
      });
    }
  }

  return {
    totalRows: rowDetails.length,
    validRows: validQuestions.length,
    invalidRows: rowDetails.filter(d => !d.isValid).length,
    questions: validQuestions,
    rowDetails,
    metadataNotice,
    detectedHeaders: rawHeader,
  };
}

/**
 * Parse JSON question bank
 */
export function parseJSONQuestionBank(jsonText: string): ParseResult {
  let data: any;
  try {
    data = JSON.parse(stripBOM(jsonText));
  } catch (err: any) {
    return {
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      questions: [],
      rowDetails: [{ rowNumber: 1, isValid: false, errors: [`Invalid JSON format: ${err.message}`] }],
    };
  }

  const items = Array.isArray(data)
    ? data
    : Array.isArray(data.questions)
    ? data.questions
    : Array.isArray(data.data)
    ? data.data
    : [data];

  const rowDetails: ParsedQuestionRow[] = [];
  const validQuestions: Question[] = [];

  items.forEach((item: any, idx: number) => {
    const rowNum = idx + 1;
    const errors: string[] = [];

    const qText = (item.question || item.questionText || item.prompt || '').trim();
    if (!qText) errors.push('Question text is missing.');

    let options: { id: string; text: string }[] = [];
    if (Array.isArray(item.options)) {
      if (item.options.length !== 4) {
        errors.push(`Must have exactly 4 options (found ${item.options.length}).`);
      } else {
        options = item.options.map((opt: any, oIdx: number) => {
          if (typeof opt === 'string') {
            return { id: `opt_${oIdx + 1}`, text: opt.trim() };
          }
          return { id: opt.id || `opt_${oIdx + 1}`, text: (opt.text || '').trim() };
        });
      }
    } else if (item.option_a && item.option_b && item.option_c && item.option_d) {
      options = [
        { id: 'opt_1', text: String(item.option_a).trim() },
        { id: 'opt_2', text: String(item.option_b).trim() },
        { id: 'opt_3', text: String(item.option_c).trim() },
        { id: 'opt_4', text: String(item.option_d).trim() },
      ];
    } else {
      errors.push('Options must be an array of 4 items or contain option_a through option_d fields.');
    }

    if (options.some(o => !o.text)) {
      errors.push('All 4 options must contain non-empty text.');
    }

    const rawAns = String(item.correctAnswer || item.correct_answer || item.correctOptionId || item.answer || '').trim();
    let correctOptId = '';
    const upper = rawAns.toUpperCase();

    if (upper === 'A' || upper === 'OPT_1' || upper === '1' || upper === 'OPTION_A') correctOptId = options[0]?.id || 'opt_1';
    else if (upper === 'B' || upper === 'OPT_2' || upper === '2' || upper === 'OPTION_B') correctOptId = options[1]?.id || 'opt_2';
    else if (upper === 'C' || upper === 'OPT_3' || upper === '3' || upper === 'OPTION_C') correctOptId = options[2]?.id || 'opt_3';
    else if (upper === 'D' || upper === 'OPT_4' || upper === '4' || upper === 'OPTION_D') correctOptId = options[3]?.id || 'opt_4';
    else {
      const matched = options.find(o => o.id === rawAns || o.text.toLowerCase() === rawAns.toLowerCase());
      if (matched) {
        correctOptId = matched.id;
      } else {
        errors.push(`Correct answer "${rawAns || '(empty)'}" does not match any of the 4 options.`);
      }
    }

    const topic = normalizeTopic(item.topic || item.category || 'quantitative');
    const difficulty = normalizeDifficulty(item.difficulty || item.level || 'medium');
    const explanation = (item.explanation || item.solution || '').trim() || 'Correct answer identified based on analytical logic.';

    if (errors.length === 0) {
      const q: Question = {
        id: item.id || `q_json_${Date.now()}_${rowNum}`,
        questionText: qText,
        options,
        correctOptionId: correctOptId,
        topic,
        difficulty,
        explanation,
        timeLimitSec: Number(item.timeLimitSec) || 20,
      };
      validQuestions.push(q);
      rowDetails.push({ rowNumber: rowNum, isValid: true, errors: [], question: q });
    } else {
      rowDetails.push({
        rowNumber: rowNum,
        isValid: false,
        errors,
        raw: { question: qText, rawAns },
      });
    }
  });

  return {
    totalRows: items.length,
    validRows: validQuestions.length,
    invalidRows: rowDetails.filter(d => !d.isValid).length,
    questions: validQuestions,
    rowDetails,
  };
}

/**
 * Parse global answer key from the end of a document if present
 * E.g. "Answer Key:\n 1. D\n 2. B" or "Answers: 1-D, 2-B"
 */
function parseGlobalAnswerKey(text: string): { keyMap: Record<number, string>; cleanText: string } {
  const keyHeaderRegex = /(?:^|\n)\s*(?:Answer\s*Key|Answers|Answer\s*Sheet|Solutions)\s*[:\-\n]([\s\S]*)$/i;
  const match = text.match(keyHeaderRegex);
  const keyMap: Record<number, string> = {};

  if (!match || match.index === undefined) {
    return { keyMap, cleanText: text };
  }

  const keySection = match[1];
  const pairRegex = /(?:(?:Question|Q\.?)\s*|\b)(\d+)[\.:\-\)\s]+[\(\[]?([A-D])[\)\]]?/gi;
  let m: RegExpExecArray | null;

  while ((m = pairRegex.exec(keySection)) !== null) {
    const qNum = parseInt(m[1], 10);
    const ans = m[2].toUpperCase();
    keyMap[qNum] = ans;
  }

  // Strip the answer key section from the question text
  const cleanText = text.substring(0, match.index).trim();
  return { keyMap, cleanText };
}

/**
 * Extract question statement and 4 options (A, B, C, D) from a block
 * Stage 1: Line-by-line inspection (supports multi-line options and questions)
 * Stage 2: Inline sequential regex (supports options formatted on the same line)
 */
function extractBlockContent(blockText: string, linesInBlock: string[]): {
  questionText: string;
  options: { A: string; B: string; C: string; D: string };
  detectedAnswer?: string;
  topic?: string;
  difficulty?: string;
  explanation?: string;
} {
  // Supports "A.", "A)", "(A)", "[A]", "A:", "A -", "- A.", "* A.", and "A <text>"
  const optLineRegex = /^[\s\t\u00A0\-\*\•]*[\(\[]?([A-D])[\)\]\.\:\-]?\s+(.*)$/i;
  const ansRegex = /^(?:(?:Correct\s*)?Answer|Ans|Key|Solution)\s*[:=\.\-]?\s*[\(\[]?([A-D]|opt_[1-4]|[1-4])[\)\]]?/i;
  const topicRegex = /^(?:Topic|Category|Section|Subject)\s*[:=\-]\s*(.*)$/i;
  const diffRegex = /^(?:Difficulty|Level)\s*[:=\-]\s*(.*)$/i;
  const expRegex = /^(?:Explanation|Solution\s*Details?)\s*[:=\-]\s*(.*)$/i;

  let qText = '';
  const optMap: Record<string, string> = { A: '', B: '', C: '', D: '' };
  let currentOptKey: string | null = null;
  let detectedAns = '';
  let topic: string | undefined;
  let difficulty: string | undefined;
  let explanation: string | undefined;

  for (const line of linesInBlock) {
    const topMatch = line.match(topicRegex);
    if (topMatch) {
      topic = topMatch[1].trim();
      continue;
    }

    const diffMatch = line.match(diffRegex);
    if (diffMatch) {
      difficulty = diffMatch[1].trim();
      continue;
    }

    const expMatch = line.match(expRegex);
    if (expMatch) {
      explanation = expMatch[1].trim();
      continue;
    }

    const ansMatch = line.match(ansRegex);
    if (ansMatch) {
      const a = ansMatch[1].toUpperCase();
      if (a === '1' || a === 'OPT_1') detectedAns = 'A';
      else if (a === '2' || a === 'OPT_2') detectedAns = 'B';
      else if (a === '3' || a === 'OPT_3') detectedAns = 'C';
      else if (a === '4' || a === 'OPT_4') detectedAns = 'D';
      else detectedAns = a;
      continue;
    }

    const optMatch = line.match(optLineRegex);
    if (optMatch) {
      currentOptKey = optMatch[1].toUpperCase();
      optMap[currentOptKey] = optMatch[2].trim();
      continue;
    }

    if (currentOptKey) {
      // Continuation of current option text
      optMap[currentOptKey] = optMap[currentOptKey] ? optMap[currentOptKey] + ' ' + line.trim() : line.trim();
    } else {
      // Question prompt continuation
      qText = qText ? qText + ' ' + line.trim() : line.trim();
    }
  }

  // Check if line-by-line successfully retrieved all 4 options
  if (optMap.A && optMap.B && optMap.C && optMap.D) {
    return {
      questionText: qText,
      options: { A: optMap.A, B: optMap.B, C: optMap.C, D: optMap.D },
      detectedAnswer: detectedAns || undefined,
      topic,
      difficulty,
      explanation,
    };
  }

  // Stage 2: Inline sequential option detection
  // Handles cases where options are all on one line or joined without line breaks
  const normalizedBlock = blockText.replace(/[\t\u00A0]+/g, ' ').replace(/\n+/g, ' ').trim();
  const inlineOptRegex = /(?:^|\s+)[\(\[]?([A-D])[\)\]\.\:]\s+/gi;
  const matches: { key: string; index: number; length: number }[] = [];
  let m: RegExpExecArray | null;

  while ((m = inlineOptRegex.exec(normalizedBlock)) !== null) {
    matches.push({ key: m[1].toUpperCase(), index: m.index, length: m[0].length });
  }

  const aIdx = matches.findIndex(x => x.key === 'A');
  const bIdx = matches.findIndex((x, i) => i > aIdx && x.key === 'B');
  const cIdx = matches.findIndex((x, i) => i > bIdx && x.key === 'C');
  const dIdx = matches.findIndex((x, i) => i > cIdx && x.key === 'D');

  if (aIdx !== -1 && bIdx !== -1 && cIdx !== -1 && dIdx !== -1) {
    const mA = matches[aIdx];
    const mB = matches[bIdx];
    const mC = matches[cIdx];
    const mD = matches[dIdx];

    const promptText = normalizedBlock.substring(0, mA.index).trim();
    const optA = normalizedBlock.substring(mA.index + mA.length, mB.index).trim();
    const optB = normalizedBlock.substring(mB.index + mB.length, mC.index).trim();
    const optC = normalizedBlock.substring(mC.index + mC.length, mD.index).trim();
    let optD = normalizedBlock.substring(mD.index + mD.length).trim();

    // Check for inline answer at the end of option D
    const ansInlineMatch = optD.match(/(?:(?:Correct\s*)?Answer|Ans|Key|Solution)\s*[:=\.\-]?\s*[\(\[]?([A-D]|opt_[1-4]|[1-4])[\)\]]?/i);
    if (ansInlineMatch) {
      const a = ansInlineMatch[1].toUpperCase();
      if (a === '1' || a === 'OPT_1') detectedAns = 'A';
      else if (a === '2' || a === 'OPT_2') detectedAns = 'B';
      else if (a === '3' || a === 'OPT_3') detectedAns = 'C';
      else if (a === '4' || a === 'OPT_4') detectedAns = 'D';
      else detectedAns = a;
      optD = optD.substring(0, ansInlineMatch.index).trim();
    }

    return {
      questionText: promptText || qText,
      options: { A: optA, B: optB, C: optC, D: optD },
      detectedAnswer: detectedAns || undefined,
      topic,
      difficulty,
      explanation,
    };
  }

  // Return whatever was detected
  return {
    questionText: qText,
    options: { A: optMap.A, B: optMap.B, C: optMap.C, D: optMap.D },
    detectedAnswer: detectedAns || undefined,
    topic,
    difficulty,
    explanation,
  };
}

/**
 * Deterministic text parser for documents (PDF and DOCX extraction)
 * Supports numbered questions: "1.", "1)", "Q1.", "Q1:", "Question 1:", etc.
 * Supports choices: A. / A) / (A) / [A], etc.
 * Multi-line wrapping and inline choices supported.
 * Answer key detection inline and at the end of the document.
 */
export function parseDocumentText(rawText: string, formatName: 'PDF' | 'Word'): ParseResult {
  // Normalize whitespace, quotes, dashes, non-breaking spaces
  const normalizedText = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-');

  if (!normalizedText.trim()) {
    return {
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      questions: [],
      rowDetails: [{ rowNumber: 1, isValid: false, errors: [`No readable text could be extracted from this ${formatName} document.`] }],
    };
  }

  // Parse global answer key if present at the end of document
  const { keyMap: globalAnswers, cleanText } = parseGlobalAnswerKey(normalizedText);

  // Segment text into question blocks based on question numbering
  // Examples: "1.", "1)", "Q1.", "Q1:", "Question 1:", "Question 1."
  const qStartRegex = /(?:^|\n)\s*(?:(?:Question|Q\.?)\s*(\d+)[\.:\)]|\b(\d+)[\.:\)])\s*/gi;
  const splits: { num: number; index: number; contentStart: number }[] = [];
  let m: RegExpExecArray | null;

  while ((m = qStartRegex.exec(cleanText)) !== null) {
    const qNum = parseInt(m[1] || m[2], 10);
    splits.push({ num: qNum, index: m.index, contentStart: m.index + m[0].length });
  }

  // If newline-based split found fewer than 1 question, try inline whitespace split
  if (splits.length === 0) {
    const inlineQRegex = /(?:^|\s)(?:(?:Question|Q\.?)\s*(\d+)[\.:\)]|\b(\d+)[\.:\)])\s*/gi;
    while ((m = inlineQRegex.exec(cleanText)) !== null) {
      const qNum = parseInt(m[1] || m[2], 10);
      splits.push({ num: qNum, index: m.index, contentStart: m.index + m[0].length });
    }
  }

  if (splits.length === 0) {
    return {
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      questions: [],
      rowDetails: [{
        rowNumber: 1,
        isValid: false,
        errors: [`Could not detect numbered questions in ${formatName}. Expected format: "1. Question text", followed by options "A. ... B. ... C. ... D. ...".`],
      }],
    };
  }

  const rowDetails: ParsedQuestionRow[] = [];
  const validQuestions: Question[] = [];

  splits.forEach((split, idx) => {
    const nextSplit = splits[idx + 1];
    const blockRaw = nextSplit
      ? cleanText.substring(split.contentStart, nextSplit.index)
      : cleanText.substring(split.contentStart);

    const blockLines = blockRaw
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const extracted = extractBlockContent(blockRaw, blockLines);
    const rowNum = idx + 1;
    const errors: string[] = [];

    const qPrompt = extracted.questionText.trim();
    if (!qPrompt) {
      errors.push('Question statement is empty.');
    }

    const { A: optA, B: optB, C: optC, D: optD } = extracted.options;
    let foundCount = 0;
    if (optA) foundCount++;
    if (optB) foundCount++;
    if (optC) foundCount++;
    if (optD) foundCount++;

    if (foundCount !== 4) {
      errors.push(`Found ${foundCount} options (A, B, C, D required).`);
      if (!optA) errors.push('Option A is missing.');
      if (!optB) errors.push('Option B is missing.');
      if (!optC) errors.push('Option C is missing.');
      if (!optD) errors.push('Option D is missing.');
    }

    // Determine correct answer: inline block answer or global answer key
    const ansKey = (extracted.detectedAnswer || globalAnswers[split.num] || globalAnswers[rowNum] || '').toUpperCase();
    let correctOptId = '';

    if (ansKey === 'A' || ansKey === '1' || ansKey === 'OPT_1') correctOptId = 'opt_1';
    else if (ansKey === 'B' || ansKey === '2' || ansKey === 'OPT_2') correctOptId = 'opt_2';
    else if (ansKey === 'C' || ansKey === '3' || ansKey === 'OPT_3') correctOptId = 'opt_3';
    else if (ansKey === 'D' || ansKey === '4' || ansKey === 'OPT_4') correctOptId = 'opt_4';
    else {
      errors.push('Correct answer not specified in document. Please select the correct option (A, B, C, or D) below to validate.');
    }

    const topic = normalizeTopic(extracted.topic || 'quantitative');
    const difficulty = normalizeDifficulty(extracted.difficulty || 'medium');

    if (errors.length === 0) {
      const q: Question = {
        id: `q_doc_${Date.now()}_${rowNum}`,
        questionText: qPrompt,
        options: [
          { id: 'opt_1', text: optA },
          { id: 'opt_2', text: optB },
          { id: 'opt_3', text: optC },
          { id: 'opt_4', text: optD },
        ],
        correctOptionId: correctOptId,
        topic,
        difficulty,
        explanation: extracted.explanation || `Correct answer is Option ${correctOptId.replace('opt_', '').toUpperCase()}.`,
        timeLimitSec: 20,
      };
      validQuestions.push(q);
      rowDetails.push({ rowNumber: rowNum, isValid: true, errors: [], question: q });
    } else {
      rowDetails.push({
        rowNumber: rowNum,
        isValid: false,
        errors,
        raw: {
          question: qPrompt,
          optA,
          optB,
          optC,
          optD,
          ans: ansKey,
          topic: extracted.topic || '',
          difficulty: extracted.difficulty || '',
          explanation: extracted.explanation || '',
        },
      });
    }
  });

  return {
    totalRows: splits.length,
    validRows: validQuestions.length,
    invalidRows: rowDetails.filter(d => !d.isValid).length,
    questions: validQuestions,
    rowDetails,
  };
}

/**
 * Extract raw text from Word .docx file using Mammoth
 */
export async function extractDocxText(arrayBuffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

/**
 * Extract raw text from PDF file using pdfjs-dist with vertical baseline reconstruction
 */
export async function extractPdfText(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
  }

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  let fullText = '';
  let totalChars = 0;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = textContent.items as Array<{
      str?: string;
      hasEOL?: boolean;
      transform?: number[];
      width?: number;
      height?: number;
    }>;

    if (!items || items.length === 0) continue;

    const textItems = items.filter(it => typeof it.str === 'string');
    totalChars += textItems.reduce((acc, it) => acc + (it.str?.length || 0), 0);

    const pageLines: string[] = [];
    let currentLine = '';
    let lastY: number | null = null;

    for (let i = 0; i < textItems.length; i++) {
      const it = textItems[i];
      const str = it.str || '';
      const y = it.transform && it.transform.length >= 6 ? it.transform[5] : null;

      // Line change detection: vertical baseline difference > 3.5 points or preceding item hasEOL
      const isNewLine =
        (lastY !== null && y !== null && Math.abs(y - lastY) > 3.5) ||
        (i > 0 && !!textItems[i - 1].hasEOL);

      if (isNewLine) {
        if (currentLine.trim()) {
          pageLines.push(currentLine.trim());
        }
        currentLine = str;
      } else {
        if (currentLine.length > 0 && !currentLine.endsWith(' ') && !str.startsWith(' ') && str.trim().length > 0) {
          currentLine += ' ' + str;
        } else {
          currentLine += str;
        }
      }

      lastY = y;
    }

    if (currentLine.trim()) {
      pageLines.push(currentLine.trim());
    }

    fullText += pageLines.join('\n') + '\n\n';
  }

  if (totalChars < 10) {
    throw new Error('This PDF appears to be a scanned image or contains no extractable text layer. Optical Character Recognition (OCR) or a text-based document is required.');
  }

  return fullText;
}

export const SAMPLE_CSV_CONTENT = `question,option_a,option_b,option_c,option_d,correct_answer,topic,difficulty,explanation
"What is 15 percent of 200?","20","25","30","35","C","Quantitative","Easy","15% of 200 = 0.15 * 200 = 30."
"If 3x = 27, what is x?","6","9","12","15","B","Quantitative","Easy","Divide both sides by 3: x = 27 / 3 = 9."
"Find the next number in the series: 3, 6, 12, 24, ?","48","36","50","42","A","Logical","Easy","Each term is multiplied by 2 (geometric ratio 2). 24 * 2 = 48."
"A train 120m long passes a pole in 6 seconds. What is its speed in km/h?","60 km/h","72 km/h","80 km/h","90 km/h","B","Quantitative","Medium","Speed = 120 / 6 = 20 m/s. In km/h = 20 * (18/5) = 72 km/h."
"Choose the antonym for CANDID:","Deceptive","Frank","Blunt","Truthful","A","Verbal","Easy","Candid means honest and direct; antonym is deceptive."
"If 5 workers build a wall in 12 days, how many days will 10 workers take?","6 days","8 days","10 days","4 days","A","Quantitative","Easy","Workers and days are inversely proportional: 5 * 12 = 10 * D => D = 6 days."`;

export const SAMPLE_JSON_CONTENT = JSON.stringify([
  {
    "question": "What is 15 percent of 200?",
    "options": [
      { "id": "opt_1", "text": "20" },
      { "id": "opt_2", "text": "25" },
      { "id": "opt_3", "text": "30" },
      { "id": "opt_4", "text": "35" }
    ],
    "correctAnswer": "opt_3",
    "topic": "Quantitative",
    "difficulty": "Easy",
    "explanation": "15% of 200 = 0.15 * 200 = 30."
  },
  {
    "question": "Find the next number in the series: 3, 6, 12, 24, ?",
    "options": [
      { "id": "opt_1", "text": "48" },
      { "id": "opt_2", "text": "36" },
      { "id": "opt_3", "text": "50" },
      { "id": "opt_4", "text": "42" }
    ],
    "correctAnswer": "A",
    "topic": "Logical",
    "difficulty": "Easy",
    "explanation": "Each term is multiplied by 2. 24 * 2 = 48."
  }
], null, 2);
