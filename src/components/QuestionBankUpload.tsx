import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Download,
  Save,
  RefreshCw,
  X,
  HelpCircle,
  Layers,
  FileCode,
  FileType,
  Info,
  Trash2,
  CheckSquare,
  Square,
  Edit2,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  parseCSVQuestionBank,
  parseJSONQuestionBank,
  parseDocumentText,
  extractDocxText,
  extractPdfText,
  ParseResult,
  SAMPLE_CSV_CONTENT,
  SAMPLE_JSON_CONTENT,
} from '../utils/questionBankParser.js';
import { Question, Topic, Difficulty } from '../types/quiz.js';

interface QuestionBankUploadProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export const QuestionBankUpload: React.FC<QuestionBankUploadProps> = ({ onSuccess, onCancel }) => {
  const [file, setFile] = useState<File | null>(null);
  const [setTitle, setSetTitle] = useState('');
  const [setDescription, setSetDescription] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [selectedInvalidRows, setSelectedInvalidRows] = useState<Set<number>>(new Set());
  const [showBulkRemoveModal, setShowBulkRemoveModal] = useState(false);
  const [showSelectedRemoveModal, setShowSelectedRemoveModal] = useState(false);

  // Editable question correction form state
  const [editingRowNumber, setEditingRowNumber] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    questionText: string;
    optA: string;
    optB: string;
    optC: string;
    optD: string;
    correctAns: 'A' | 'B' | 'C' | 'D' | '';
    topic: Topic;
    difficulty: Difficulty;
    explanation: string;
  }>({
    questionText: '',
    optA: '',
    optB: '',
    optC: '',
    optD: '',
    correctAns: 'A',
    topic: 'quantitative',
    difficulty: 'medium',
    explanation: '',
  });
  const [editFormError, setEditFormError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processFile(selected);
    }
  };

  const processFile = async (fileToParse: File) => {
    setFile(fileToParse);
    setStatusMessage(null);
    setIsParsing(true);
    setParseResult(null);

    const nameLower = fileToParse.name.toLowerCase();
    const isCSV = nameLower.endsWith('.csv');
    const isJSON = nameLower.endsWith('.json');
    const isPDF = nameLower.endsWith('.pdf');
    const isDOCX = nameLower.endsWith('.docx');

    if (!isCSV && !isJSON && !isPDF && !isDOCX) {
      setStatusMessage({
        type: 'error',
        text: 'Unsupported file format. Please upload a .csv, .json, .pdf, or .docx file.',
      });
      setIsParsing(false);
      return;
    }

    try {
      let res: ParseResult;

      if (isCSV || isJSON) {
        const text = await fileToParse.text();
        if (isCSV) {
          res = parseCSVQuestionBank(text);
        } else {
          res = parseJSONQuestionBank(text);
        }
      } else if (isDOCX) {
        const arrayBuffer = await fileToParse.arrayBuffer();
        const extractedText = await extractDocxText(arrayBuffer);
        res = parseDocumentText(extractedText, 'Word');
      } else if (isPDF) {
        const arrayBuffer = await fileToParse.arrayBuffer();
        const extractedText = await extractPdfText(arrayBuffer);
        res = parseDocumentText(extractedText, 'PDF');
      } else {
        throw new Error('Unsupported file type');
      }

      setParseResult(res);

      if (!setTitle) {
        // Derive clean title from filename
        const cleanName = fileToParse.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        setSetTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1) + ' Question Bank');
      }

      if (res.validRows === 0) {
        const firstErr = res.rowDetails[0]?.errors[0] || 'Check format guidelines below.';
        setStatusMessage({
          type: 'error',
          text: `0 valid questions detected. ${firstErr}`,
        });
      } else if (res.invalidRows > 0) {
        setStatusMessage({
          type: 'error',
          text: `Parsed ${res.validRows} valid questions with ${res.invalidRows} row error(s). You can review valid questions below before saving.`,
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: `All ${res.validRows} questions parsed and validated successfully!`,
        });
      }
    } catch (err: any) {
      console.error('File parsing error:', err);
      setStatusMessage({
        type: 'error',
        text: `Failed to parse file "${fileToParse.name}": ${err.message || 'Unknown error'}`,
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleAssignAnswer = (rowNumber: number, optLetter: 'A' | 'B' | 'C' | 'D') => {
    if (!parseResult) return;
    const optIdMap: Record<string, string> = { A: 'opt_1', B: 'opt_2', C: 'opt_3', D: 'opt_4' };
    const correctOptId = optIdMap[optLetter] || 'opt_1';

    const updatedRowDetails = parseResult.rowDetails.map(r => {
      if (r.rowNumber !== rowNumber) return r;

      const qText = r.question?.questionText || r.raw?.question || 'Question';
      const optA = r.question?.options[0]?.text || r.raw?.optA || '';
      const optB = r.question?.options[1]?.text || r.raw?.optB || '';
      const optC = r.question?.options[2]?.text || r.raw?.optC || '';
      const optD = r.question?.options[3]?.text || r.raw?.optD || '';

      if (!optA || !optB || !optC || !optD) return r;

      const updatedQ: Question = {
        id: r.question?.id || `q_imported_${Date.now()}_${r.rowNumber}`,
        questionText: qText,
        options: [
          { id: 'opt_1', text: optA },
          { id: 'opt_2', text: optB },
          { id: 'opt_3', text: optC },
          { id: 'opt_4', text: optD },
        ],
        correctOptionId: correctOptId,
        topic: r.question?.topic || (r.raw?.topic as any) || 'quantitative',
        difficulty: r.question?.difficulty || (r.raw?.difficulty as any) || 'medium',
        explanation: r.question?.explanation || r.raw?.explanation || `Correct answer is Option ${optLetter}.`,
        timeLimitSec: 20,
      };

      return {
        ...r,
        isValid: true,
        errors: [],
        question: updatedQ,
      };
    });

    const validQuestions = updatedRowDetails
      .filter(r => r.isValid && r.question)
      .map(r => r.question!);

    const nextSelected = new Set(selectedInvalidRows);
    nextSelected.delete(rowNumber);
    setSelectedInvalidRows(nextSelected);

    setParseResult({
      ...parseResult,
      rowDetails: updatedRowDetails,
      questions: validQuestions,
      validRows: validQuestions.length,
      invalidRows: updatedRowDetails.filter(r => !r.isValid).length,
    });

    setStatusMessage({
      type: 'info',
      text: `Updated Question #${rowNumber} with Option ${optLetter} as correct answer. ${validQuestions.length} valid question(s) ready to save.`,
    });
  };

  // Remove individual invalid question
  const handleRemoveQuestion = (rowNumber: number) => {
    if (!parseResult) return;

    const updatedRowDetails = parseResult.rowDetails.filter(r => r.rowNumber !== rowNumber);
    const validQuestions = updatedRowDetails
      .filter(r => r.isValid && r.question)
      .map(r => r.question!);

    const nextSelected = new Set(selectedInvalidRows);
    nextSelected.delete(rowNumber);
    setSelectedInvalidRows(nextSelected);

    if (editingRowNumber === rowNumber) {
      setEditingRowNumber(null);
    }

    setParseResult({
      ...parseResult,
      rowDetails: updatedRowDetails,
      questions: validQuestions,
      validRows: validQuestions.length,
      invalidRows: updatedRowDetails.filter(r => !r.isValid).length,
      totalRows: updatedRowDetails.length,
    });

    setStatusMessage({
      type: 'info',
      text: `Removed Question #${rowNumber}. ${validQuestions.length} valid question(s) remaining.`,
    });
  };

  // Bulk removal of all invalid questions
  const handleRemoveAllInvalid = () => {
    if (!parseResult) return;
    const removedCount = parseResult.invalidRows;
    if (removedCount === 0) return;

    const updatedRowDetails = parseResult.rowDetails.filter(r => r.isValid);
    const validQuestions = updatedRowDetails
      .filter(r => r.question)
      .map(r => r.question!);

    setSelectedInvalidRows(new Set());
    setShowBulkRemoveModal(false);
    setEditingRowNumber(null);

    setParseResult({
      ...parseResult,
      rowDetails: updatedRowDetails,
      questions: validQuestions,
      validRows: validQuestions.length,
      invalidRows: 0,
      totalRows: updatedRowDetails.length,
    });

    setStatusMessage({
      type: 'success',
      text: `Removed all ${removedCount} invalid questions. ${validQuestions.length} valid question(s) ready to save!`,
    });
  };

  // Bulk removal of selected invalid questions
  const handleRemoveSelectedInvalid = () => {
    if (!parseResult || selectedInvalidRows.size === 0) return;
    const countToRemove = selectedInvalidRows.size;

    const updatedRowDetails = parseResult.rowDetails.filter(
      r => !selectedInvalidRows.has(r.rowNumber)
    );
    const validQuestions = updatedRowDetails
      .filter(r => r.isValid && r.question)
      .map(r => r.question!);

    setSelectedInvalidRows(new Set());
    setShowSelectedRemoveModal(false);

    setParseResult({
      ...parseResult,
      rowDetails: updatedRowDetails,
      questions: validQuestions,
      validRows: validQuestions.length,
      invalidRows: updatedRowDetails.filter(r => !r.isValid).length,
      totalRows: updatedRowDetails.length,
    });

    setStatusMessage({
      type: 'info',
      text: `Removed ${countToRemove} selected invalid question(s). ${validQuestions.length} valid question(s) remaining.`,
    });
  };

  const handleClearSelection = () => {
    setSelectedInvalidRows(new Set());
  };

  const handleToggleSelectRow = (rowNumber: number) => {
    const next = new Set(selectedInvalidRows);
    if (next.has(rowNumber)) {
      next.delete(rowNumber);
    } else {
      next.add(rowNumber);
    }
    setSelectedInvalidRows(next);
  };

  const handleSelectAllInvalid = () => {
    if (!parseResult) return;
    const invalidRowNums = parseResult.rowDetails
      .filter(r => !r.isValid)
      .map(r => r.rowNumber);

    if (selectedInvalidRows.size === invalidRowNums.length) {
      setSelectedInvalidRows(new Set());
    } else {
      setSelectedInvalidRows(new Set(invalidRowNums));
    }
  };

  // Start inline editing of an invalid question
  const handleStartEdit = (row: any) => {
    setEditingRowNumber(row.rowNumber);
    setEditFormError(null);

    const qText = row.question?.questionText || row.raw?.question || '';
    const optA = row.question?.options?.[0]?.text || row.raw?.optA || '';
    const optB = row.question?.options?.[1]?.text || row.raw?.optB || '';
    const optC = row.question?.options?.[2]?.text || row.raw?.optC || '';
    const optD = row.question?.options?.[3]?.text || row.raw?.optD || '';

    let ans: 'A' | 'B' | 'C' | 'D' = 'A';
    if (row.question?.correctOptionId) {
      const map: Record<string, 'A' | 'B' | 'C' | 'D'> = { opt_1: 'A', opt_2: 'B', opt_3: 'C', opt_4: 'D' };
      ans = map[row.question.correctOptionId] || 'A';
    } else if (row.raw?.ans && ['A', 'B', 'C', 'D'].includes(String(row.raw.ans).toUpperCase().trim())) {
      ans = String(row.raw.ans).toUpperCase().trim() as any;
    }

    setEditForm({
      questionText: qText,
      optA,
      optB,
      optC,
      optD,
      correctAns: ans,
      topic: row.question?.topic || (row.raw?.topic as any) || 'quantitative',
      difficulty: row.question?.difficulty || (row.raw?.difficulty as any) || 'medium',
      explanation: row.question?.explanation || row.raw?.explanation || '',
    });
  };

  // Save inline correction and revalidate
  const handleSaveEdit = (rowNumber: number) => {
    if (!parseResult) return;

    if (!editForm.questionText.trim()) {
      setEditFormError('Question text cannot be empty.');
      return;
    }
    if (!editForm.optA.trim() || !editForm.optB.trim() || !editForm.optC.trim() || !editForm.optD.trim()) {
      setEditFormError('All four options (A, B, C, and D) must have text.');
      return;
    }
    if (!['A', 'B', 'C', 'D'].includes(editForm.correctAns)) {
      setEditFormError('Please select a valid correct answer option (A, B, C, or D).');
      return;
    }

    const optIdMap: Record<string, string> = { A: 'opt_1', B: 'opt_2', C: 'opt_3', D: 'opt_4' };
    const correctOptId = optIdMap[editForm.correctAns] || 'opt_1';

    const correctedQ: Question = {
      id: `q_corrected_${Date.now()}_${rowNumber}`,
      questionText: editForm.questionText.trim(),
      options: [
        { id: 'opt_1', text: editForm.optA.trim() },
        { id: 'opt_2', text: editForm.optB.trim() },
        { id: 'opt_3', text: editForm.optC.trim() },
        { id: 'opt_4', text: editForm.optD.trim() },
      ],
      correctOptionId: correctOptId,
      topic: editForm.topic,
      difficulty: editForm.difficulty,
      explanation: editForm.explanation.trim() || `Correct answer is Option ${editForm.correctAns}.`,
      timeLimitSec: 20,
    };

    const updatedRowDetails = parseResult.rowDetails.map(r => {
      if (r.rowNumber !== rowNumber) return r;
      return {
        ...r,
        isValid: true,
        errors: [],
        question: correctedQ,
      };
    });

    const validQuestions = updatedRowDetails
      .filter(r => r.isValid && r.question)
      .map(r => r.question!);

    const nextSelected = new Set(selectedInvalidRows);
    nextSelected.delete(rowNumber);
    setSelectedInvalidRows(nextSelected);

    setEditingRowNumber(null);
    setEditFormError(null);

    setParseResult({
      ...parseResult,
      rowDetails: updatedRowDetails,
      questions: validQuestions,
      validRows: validQuestions.length,
      invalidRows: updatedRowDetails.filter(r => !r.isValid).length,
    });

    setStatusMessage({
      type: 'success',
      text: `Question #${rowNumber} corrected and validated successfully! ${validQuestions.length} valid questions ready.`,
    });
  };

  const handleCancelEdit = () => {
    setEditingRowNumber(null);
    setEditFormError(null);
  };

  const handleSaveToLibrary = async () => {
    if (!parseResult) return;

    // Strict revalidation before saving to ensure only 100% valid questions pass
    const strictlyValidQuestions = parseResult.questions.filter(q => {
      if (!q || !q.questionText || !q.questionText.trim()) return false;
      if (!Array.isArray(q.options) || q.options.length !== 4) return false;
      if (q.options.some(o => !o.text || !o.text.trim())) return false;
      if (!q.options.some(o => o.id === q.correctOptionId)) return false;
      return true;
    });

    if (strictlyValidQuestions.length === 0) {
      setStatusMessage({ type: 'error', text: 'Cannot save: At least one valid question is required.' });
      return;
    }

    const finalTitle = setTitle.trim() || 'Uploaded Placement Question Bank';
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const topicTags = Array.from(new Set(strictlyValidQuestions.map(q => q.topic)));
      const res = await fetch('/api/question-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: finalTitle,
          description:
            setDescription.trim() ||
            `Imported ${strictlyValidQuestions.length} questions from ${file?.name || 'file'}.`,
          topicTags,
          questions: strictlyValidQuestions,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save question bank to server.');
      }

      setStatusMessage({ type: 'success', text: `Question bank "${finalTitle}" saved successfully!` });
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error saving question bank.' });
    } finally {
      setIsSaving(false);
    }
  };

  const downloadSampleCSV = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample_aptitude_questions.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadSampleJSON = () => {
    const blob = new Blob([SAMPLE_JSON_CONTENT], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample_aptitude_questions.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold mb-2">
            <Upload className="w-3.5 h-3.5" /> BULK QUESTION IMPORT
          </div>
          <h3 className="text-xl font-bold text-white">Upload Question Bank</h3>
          <p className="text-xs text-slate-400 mt-1">
            Import question sets directly from <strong className="text-slate-200">CSV</strong>, <strong className="text-slate-200">JSON</strong>, <strong className="text-slate-200">PDF</strong>, or <strong className="text-slate-200">Word (.docx)</strong>.
          </p>
        </div>

        {/* Download Sample Templates */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={downloadSampleCSV}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download CSV sample format"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sample CSV</span>
          </button>

          <button
            type="button"
            onClick={downloadSampleJSON}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download JSON sample format"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Sample JSON</span>
          </button>
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) processFile(dropped);
        }}
        className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-3xl p-8 sm:p-10 text-center bg-slate-950/60 hover:bg-slate-950/90 transition-all cursor-pointer group space-y-3"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv,.json,.pdf,.docx,text/csv,application/json,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
        />

        <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
          {isParsing ? (
            <RefreshCw className="w-7 h-7 animate-spin text-cyan-400" />
          ) : (
            <FileText className="w-7 h-7" />
          )}
        </div>

        <div>
          <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
            {isParsing
              ? 'Extracting and validating questions...'
              : file
              ? file.name
              : 'Click to select or drag & drop CSV, JSON, PDF, or Word (.docx)'}
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-lg mx-auto">
            Canonical columns: <code className="text-cyan-300 font-mono text-[11px]">question, option_a, option_b, option_c, option_d, correct_answer, topic, difficulty</code>
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <span className="px-2.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono">.CSV</span>
          <span className="px-2.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono">.JSON</span>
          <span className="px-2.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono">.PDF</span>
          <span className="px-2.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono">.DOCX</span>
        </div>
      </div>

      {/* Metadata notice if header was found after introductory lines */}
      {parseResult?.metadataNotice && (
        <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0 text-indigo-400" />
          <span>{parseResult.metadataNotice}</span>
        </div>
      )}

      {/* Status banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center gap-2.5 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
              : statusMessage.type === 'info'
              ? 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300'
              : 'bg-rose-950/70 border-rose-500/50 text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : statusMessage.type === 'info' ? (
            <Info className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Parsed Preview Section */}
      {parseResult && (
        <div className="space-y-4 pt-2">
          {/* Metadata Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Question Set Title *
              </label>
              <input
                type="text"
                required
                value={setTitle}
                onChange={(e) => setSetTitle(e.target.value)}
                placeholder="e.g. Wipro Quantitative Aptitude Mock 2"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                value={setDescription}
                onChange={(e) => setSetDescription(e.target.value)}
                placeholder="e.g. 20 speed arithmetic and series questions"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Counts badge bar & Invalid Questions Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold font-mono">
                Total Rows: {parseResult.totalRows}
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold font-mono">
                ✓ {parseResult.validRows} Valid
              </span>
              {parseResult.invalidRows > 0 ? (
                <span className="px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold font-mono">
                  ✕ {parseResult.invalidRows} Invalid
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-bold font-mono">
                  ✓ 100% Valid
                </span>
              )}
            </div>

            {/* Quick Actions for Invalid Questions */}
            {parseResult.invalidRows > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {selectedInvalidRows.size > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowSelectedRemoveModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Remove Selected ({selectedInvalidRows.size})</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-all"
                    >
                      Clear Selection
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setShowBulkRemoveModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900/80 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                  title="Remove all malformed questions in one click"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Remove All Invalid ({parseResult.invalidRows})</span>
                </button>
              </div>
            )}
          </div>

          {/* Questions preview table */}
          <div className="max-h-96 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/80">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="bg-slate-900 text-slate-400 sticky top-0 border-b border-slate-800 font-mono z-10">
                <tr>
                  <th className="px-3 py-2.5 w-10 text-center">
                    {parseResult.invalidRows > 0 && (
                      <button
                        type="button"
                        onClick={handleSelectAllInvalid}
                        className="text-slate-400 hover:text-cyan-400 cursor-pointer"
                        title={
                          selectedInvalidRows.size === parseResult.invalidRows
                            ? 'Deselect all invalid questions'
                            : 'Select all invalid questions'
                        }
                      >
                        {selectedInvalidRows.size > 0 && selectedInvalidRows.size === parseResult.invalidRows ? (
                          <CheckSquare className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500" />
                        )}
                      </button>
                    )}
                  </th>
                  <th className="px-3 py-2.5">Row</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Question Prompt</th>
                  <th className="px-3 py-2.5">Available Options</th>
                  <th className="px-3 py-2.5">Correct Answer</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {parseResult.rowDetails.map((row) => {
                  const isExpanded = expandedRow === row.rowNumber;
                  const isEditing = editingRowNumber === row.rowNumber;
                  const isSelected = selectedInvalidRows.has(row.rowNumber);

                  return (
                    <React.Fragment key={row.rowNumber}>
                      <tr
                        className={`transition-colors ${
                          !row.isValid
                            ? isSelected
                              ? 'bg-rose-950/40'
                              : 'bg-rose-950/20 hover:bg-rose-950/30'
                            : 'hover:bg-slate-900/40'
                        }`}
                      >
                        {/* Checkbox for invalid rows */}
                        <td className="px-3 py-2.5 text-center">
                          {!row.isValid ? (
                            <button
                              type="button"
                              onClick={() => handleToggleSelectRow(row.rowNumber)}
                              className="cursor-pointer text-slate-400 hover:text-cyan-400"
                              title="Select invalid question"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-cyan-400" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-500" />
                              )}
                            </button>
                          ) : (
                            <span className="text-slate-700 font-mono text-[10px]">—</span>
                          )}
                        </td>

                        <td className="px-3 py-2.5 font-mono text-slate-500">#{row.rowNumber}</td>

                        {/* Validation Status & Error Reason */}
                        <td className="px-3 py-2.5">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Valid
                            </span>
                          ) : (
                            <div className="space-y-0.5 max-w-[200px]">
                              <span className="inline-flex items-center gap-1 text-rose-400 font-bold text-[11px]">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Invalid
                              </span>
                              <span
                                className="text-rose-300 text-[10px] block truncate font-mono"
                                title={row.errors.join('; ')}
                              >
                                {row.errors[0]}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Question Text */}
                        <td className="px-4 py-2.5 font-medium text-slate-200 truncate max-w-xs">
                          {row.question?.questionText || row.raw?.question || '(Missing Question Text)'}
                        </td>

                        {/* Available Options */}
                        <td className="px-3 py-2.5 text-slate-300 font-mono text-[11px]">
                          {row.question ? (
                            <span className="text-slate-300">4 Options</span>
                          ) : row.raw?.optA || row.raw?.optB || row.raw?.optC || row.raw?.optD ? (
                            <span className="text-amber-400">
                              {[row.raw.optA, row.raw.optB, row.raw.optC, row.raw.optD].filter(Boolean).length}/4 Present
                            </span>
                          ) : (
                            <span className="text-rose-400">0 Options</span>
                          )}
                        </td>

                        {/* Correct Answer Status */}
                        <td className="px-3 py-2.5 font-mono text-cyan-400 font-bold">
                          {row.isValid && row.question ? (
                            <span
                              className="truncate max-w-[130px] block"
                              title={row.question.options.find((o) => o.id === row.question?.correctOptionId)?.text}
                            >
                              {row.question.options.find((o) => o.id === row.question?.correctOptionId)?.text}
                            </span>
                          ) : row.raw?.optA && row.raw?.optB && row.raw?.optC && row.raw?.optD ? (
                            <div className="flex items-center gap-1">
                              {(['A', 'B', 'C', 'D'] as const).map(letter => (
                                <button
                                  key={letter}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAssignAnswer(row.rowNumber, letter);
                                  }}
                                  className="px-1.5 py-0.5 rounded bg-indigo-950/80 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-mono text-[10px] font-bold cursor-pointer transition-colors"
                                  title={`Select Option ${letter} as correct answer`}
                                >
                                  {letter}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="text-rose-400 text-[11px] font-mono">{row.raw?.ans || '(Missing)'}</span>
                          )}
                        </td>

                        {/* Actions: Remove This Question, Edit/Correct, View */}
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!row.isValid && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(row)}
                                  className="p-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 cursor-pointer transition-colors"
                                  title="Correct this invalid question"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveQuestion(row.rowNumber)}
                                  className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 cursor-pointer transition-colors"
                                  title="Remove this invalid question"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            <button
                              type="button"
                              onClick={() => setExpandedRow(isExpanded ? null : row.rowNumber)}
                              className="text-[10px] text-slate-400 hover:text-cyan-300 font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 cursor-pointer"
                            >
                              {isExpanded ? 'Hide' : 'View'}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Inline Question Correction Editor */}
                      {isEditing && (
                        <tr className="bg-slate-900/95 border-y-2 border-cyan-500/50">
                          <td colSpan={7} className="p-4 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <span className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Correct Question #{row.rowNumber}</span>
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Provide missing question text, options, and designated answer.
                              </span>
                            </div>

                            {editFormError && (
                              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                                <span>{editFormError}</span>
                              </div>
                            )}

                            <div>
                              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                                Question Text *
                              </label>
                              <textarea
                                value={editForm.questionText}
                                onChange={(e) => setEditForm({ ...editForm, questionText: e.target.value })}
                                rows={2}
                                placeholder="Enter full question statement..."
                                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                                const key = `opt${letter}` as 'optA' | 'optB' | 'optC' | 'optD';
                                const isCorrect = editForm.correctAns === letter;
                                return (
                                  <div key={letter} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[11px] font-semibold text-slate-300">
                                        Option {letter} *
                                      </label>
                                      <label className="inline-flex items-center gap-1 text-[10px] text-cyan-300 cursor-pointer">
                                        <input
                                          type="radio"
                                          name={`correct_${row.rowNumber}`}
                                          checked={isCorrect}
                                          onChange={() => setEditForm({ ...editForm, correctAns: letter })}
                                          className="text-cyan-500 focus:ring-0"
                                        />
                                        <span className={isCorrect ? 'font-bold text-emerald-400' : 'text-slate-400'}>
                                          {isCorrect ? '✓ Designated Correct' : 'Mark Correct'}
                                        </span>
                                      </label>
                                    </div>
                                    <input
                                      type="text"
                                      value={editForm[key]}
                                      onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                                      placeholder={`Option ${letter} text...`}
                                      className={`w-full px-3 py-1.5 rounded-xl bg-slate-950 border text-xs text-white focus:outline-none ${
                                        isCorrect ? 'border-emerald-500/70 bg-emerald-950/20' : 'border-slate-800'
                                      }`}
                                    />
                                  </div>
                                );
                              })}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              <div>
                                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                                  Topic
                                </label>
                                <select
                                  value={editForm.topic}
                                  onChange={(e) => setEditForm({ ...editForm, topic: e.target.value as Topic })}
                                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                                >
                                  <option value="quantitative">Quantitative Aptitude</option>
                                  <option value="logical">Logical Reasoning</option>
                                  <option value="verbal">Verbal Ability</option>
                                  <option value="data_interpretation">Data Interpretation</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                                  Difficulty
                                </label>
                                <select
                                  value={editForm.difficulty}
                                  onChange={(e) => setEditForm({ ...editForm, difficulty: e.target.value as Difficulty })}
                                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                                >
                                  <option value="easy">Easy</option>
                                  <option value="medium">Medium</option>
                                  <option value="hard">Hard</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                                  Explanation (Optional)
                                </label>
                                <input
                                  type="text"
                                  value={editForm.explanation}
                                  onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })}
                                  placeholder="Solution steps..."
                                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(row.rowNumber)}
                                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Save & Validate Question</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Expanded row with full question options or error details */}
                      {isExpanded && !isEditing && (
                        <tr className="bg-slate-900/60">
                          <td colSpan={7} className="p-3 text-xs">
                            {row.isValid && row.question ? (
                              <div className="space-y-2">
                                <div className="font-semibold text-white">{row.question.questionText}</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                  {row.question.options.map((opt, i) => {
                                    const isCorrect = opt.id === row.question?.correctOptionId;
                                    return (
                                      <div
                                        key={opt.id}
                                        className={`p-2 rounded-lg border ${
                                          isCorrect
                                            ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 font-semibold'
                                            : 'bg-slate-950/60 border-slate-800 text-slate-300'
                                        }`}
                                      >
                                        <span className="font-mono text-slate-400 mr-1.5">
                                          {String.fromCharCode(65 + i)}:
                                        </span>
                                        <span>{opt.text}</span>
                                        {isCorrect && (
                                          <span className="ml-1 text-[10px] text-emerald-400 font-mono font-bold">
                                            (CORRECT)
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                                {row.question.explanation && (
                                  <p className="text-[11px] text-slate-400 italic">
                                    Explanation: {row.question.explanation}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="text-rose-300 text-[11px] font-bold flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                    <span>Validation Errors: {row.errors.join('; ')}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEdit(row)}
                                      className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                      <span>Edit & Fix</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveQuestion(row.rowNumber)}
                                      className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Remove This Question</span>
                                    </button>
                                  </div>
                                </div>

                                {row.raw?.optA && row.raw?.optB && row.raw?.optC && row.raw?.optD && (
                                  <div className="space-y-1.5 pt-1">
                                    <span className="text-[11px] font-semibold text-slate-300">
                                      Or quick-assign a correct option below:
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                      {[
                                        { letter: 'A' as const, text: row.raw.optA },
                                        { letter: 'B' as const, text: row.raw.optB },
                                        { letter: 'C' as const, text: row.raw.optC },
                                        { letter: 'D' as const, text: row.raw.optD },
                                      ].map((opt) => (
                                        <button
                                          key={opt.letter}
                                          type="button"
                                          onClick={() => handleAssignAnswer(row.rowNumber, opt.letter)}
                                          className="p-2 rounded-lg border bg-slate-950/70 hover:bg-cyan-500/20 border-slate-800 hover:border-cyan-400 text-left text-slate-200 transition-all flex items-center justify-between cursor-pointer group"
                                        >
                                          <div>
                                            <span className="font-mono text-cyan-400 font-bold mr-1.5">
                                              [{opt.letter}]
                                            </span>
                                            <span>{opt.text}</span>
                                          </div>
                                          <span className="text-[10px] text-cyan-400 opacity-0 group-hover:opacity-100 font-mono">
                                            Select
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              disabled={isSaving || parseResult.validRows === 0}
              onClick={handleSaveToLibrary}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSaving
                  ? 'Saving to Database...'
                  : `Save ${parseResult.validRows} Question${parseResult.validRows === 1 ? '' : 's'} to Library`}
              </span>
            </button>
          </div>

          {/* Modal: Confirm Remove All Invalid Questions */}
          {showBulkRemoveModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                  <Trash2 className="w-6 h-6" />
                </div>

                <div>
                  <h4 className="text-base font-bold text-white">Remove All Invalid Questions?</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    This will remove all <strong className="text-rose-400">{parseResult.invalidRows}</strong> invalid questions from this import preview.
                    All <strong className="text-emerald-400">{parseResult.validRows}</strong> valid questions will be preserved and ready to save.
                  </p>
                  <p className="text-[11px] text-slate-500 mt-2 italic">
                    Note: The original file on your computer will not be modified or deleted.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowBulkRemoveModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveAllInvalid}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-900/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm & Remove {parseResult.invalidRows} Questions</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Confirm Remove Selected Invalid Questions */}
          {showSelectedRemoveModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                  <Trash2 className="w-6 h-6" />
                </div>

                <div>
                  <h4 className="text-base font-bold text-white">Remove Selected Invalid Questions?</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Remove <strong className="text-rose-400">{selectedInvalidRows.size}</strong> selected invalid questions from this import?
                    Valid questions will not be touched.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowSelectedRemoveModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveSelectedInvalid}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-900/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove {selectedInvalidRows.size} Questions</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
