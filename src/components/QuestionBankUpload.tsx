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
import { Question } from '../types/quiz.js';

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

  const handleSaveToLibrary = async () => {
    if (!parseResult || parseResult.questions.length === 0) {
      setStatusMessage({ type: 'error', text: 'Cannot save: At least one valid question is required.' });
      return;
    }

    const finalTitle = setTitle.trim() || 'Uploaded Placement Question Bank';
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const topicTags = Array.from(new Set(parseResult.questions.map(q => q.topic)));
      const res = await fetch('/api/question-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: finalTitle,
          description:
            setDescription.trim() ||
            `Imported ${parseResult.questions.length} questions from ${file?.name || 'file'}.`,
          topicTags,
          questions: parseResult.questions,
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

          {/* Counts badge bar */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold font-mono">
              Total Rows Detected: {parseResult.totalRows}
            </span>
            <span className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold font-mono">
              ✓ {parseResult.validRows} Valid Questions
            </span>
            {parseResult.invalidRows > 0 && (
              <span className="px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold font-mono">
                ✕ {parseResult.invalidRows} Rows with Errors
              </span>
            )}
          </div>

          {/* Questions preview table */}
          <div className="max-h-80 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/80">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="bg-slate-900 text-slate-400 sticky top-0 border-b border-slate-800 font-mono">
                <tr>
                  <th className="px-3 py-2.5">Row</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Question Prompt</th>
                  <th className="px-3 py-2.5">Topic / Diff</th>
                  <th className="px-3 py-2.5">Correct Answer</th>
                  <th className="px-3 py-2.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {parseResult.rowDetails.map((row) => {
                  const isExpanded = expandedRow === row.rowNumber;
                  return (
                    <React.Fragment key={row.rowNumber}>
                      <tr
                        className={`${
                          row.isValid ? 'hover:bg-slate-900/40' : 'bg-rose-950/20 hover:bg-rose-950/30'
                        }`}
                      >
                        <td className="px-3 py-2.5 font-mono text-slate-500">#{row.rowNumber}</td>
                        <td className="px-3 py-2.5">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                              <CheckCircle2 className="w-3 h-3" /> Valid
                            </span>
                          ) : (
                            <span
                              className="text-rose-400 font-bold text-[11px] block truncate max-w-xs"
                              title={row.errors.join('; ')}
                            >
                              ✕ {row.errors[0]}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-200 truncate max-w-xs">
                          {row.question?.questionText || row.raw?.question || '(Empty)'}
                        </td>
                        <td className="px-3 py-2.5 text-slate-400 uppercase font-mono text-[10px]">
                          {row.question ? `${row.question.topic} • ${row.question.difficulty}` : 'N/A'}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-cyan-400 font-bold">
                          {row.isValid && row.question ? (
                            <span className="truncate max-w-[140px] block" title={row.question.options.find((o) => o.id === row.question?.correctOptionId)?.text}>
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
                                  className="px-2 py-0.5 rounded bg-indigo-950/80 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-mono text-[10px] font-bold cursor-pointer transition-colors"
                                  title={`Select Option ${letter} as correct answer to validate`}
                                >
                                  {letter}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="text-rose-400 text-[11px]">{row.raw?.ans || '(Missing)'}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => setExpandedRow(isExpanded ? null : row.rowNumber)}
                            className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono underline cursor-pointer"
                          >
                            {isExpanded ? 'Hide' : 'View'}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded row with full question options or error details */}
                      {isExpanded && (
                        <tr className="bg-slate-900/60">
                          <td colSpan={6} className="p-3 text-xs">
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
                                <div className="text-rose-300 text-[11px] font-bold">
                                  Validation Notice: {row.errors[0]}
                                </div>

                                {row.raw?.optA && row.raw?.optB && row.raw?.optC && row.raw?.optD && (
                                  <div className="space-y-1.5 pt-1">
                                    <span className="text-[11px] font-semibold text-slate-300">
                                      Click any option below to designate the correct answer:
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

                                {row.errors.length > 1 && (
                                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-300">
                                    {row.errors.slice(1).map((err, eIdx) => (
                                      <li key={eIdx}>{err}</li>
                                    ))}
                                  </ul>
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
        </div>
      )}
    </div>
  );
};
