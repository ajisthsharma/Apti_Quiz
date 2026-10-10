import { jsPDF } from 'jspdf';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
} from 'docx';
import { ParticipantQuestionReview, Topic } from '../types/quiz.js';

export interface LearningReportData {
  roomCode: string;
  completedAt: number;
  questionSetTitle: string;
  participantName: string;
  college?: string;
  finalScore: number;
  finalRank: number;
  totalParticipants: number;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  accuracyPercent: number;
  averageTimeSec?: number;
  questionReviews: ParticipantQuestionReview[];
}

function cleanFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function formatTopic(topic: Topic | string): string {
  switch (topic) {
    case 'quantitative':
      return 'Quantitative Aptitude';
    case 'logical':
      return 'Logical Reasoning';
    case 'verbal':
      return 'Verbal Ability';
    case 'data_interpretation':
      return 'Data Interpretation';
    default:
      return String(topic).replace('_', ' ').toUpperCase();
  }
}

/**
 * Generate and download a PDF Learning Report
 */
export async function downloadLearningReportPDF(data: LearningReportData): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      drawHeader();
    }
  };

  const drawHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('APTIQUIZ • CAMPUS PLACEMENT ARENA', margin, y);
    doc.text(`Room: ${data.roomCode}`, pageWidth - margin, y, { align: 'right' });
    y += 5;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  };

  // 1. Title Banner
  doc.setFillColor(15, 23, 42); // dark navy
  doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(248, 250, 252);
  doc.text('AptiQuiz Learning & Mistake Review', margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  const dateStr = new Date(data.completedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(
    `${data.questionSetTitle} • Completed on ${dateStr}`,
    margin + 6,
    y + 17
  );

  y += 29;

  // 2. Candidate & Performance Summary Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 32, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(data.participantName, margin + 5, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Institution: ${data.college || 'Independent'}`, margin + 5, y + 13);
  doc.text(`Rank: #${data.finalRank} of ${data.totalParticipants} participants`, margin + 5, y + 19);
  doc.text(`Final Score: ${data.finalScore.toLocaleString()} points`, margin + 5, y + 25);

  // Right-hand stats box
  const colX = margin + contentWidth - 65;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(`Accuracy: ${data.accuracyPercent}%`, colX, y + 7);
  doc.text(`Total Questions: ${data.totalQuestions}`, colX, y + 13);

  doc.setTextColor(22, 163, 74); // green
  doc.text(`Correct: ${data.correctCount}`, colX, y + 19);

  doc.setTextColor(220, 38, 38); // red
  doc.text(`Mistakes to Review: ${data.incorrectCount}`, colX, y + 25);

  y += 38;

  // 3. Section Heading
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Review Your Mistakes & Detailed Solutions', margin, y);
  y += 6;

  // Check mistakes and answered status
  const mistakes = data.questionReviews.filter(q => !q.isCorrect);
  const answeredCount = data.questionReviews.filter(q => q.hasAnswered).length;
  const noAnswersSubmitted = data.totalQuestions > 0 && answeredCount === 0;

  if (noAnswersSubmitted) {
    // No answers submitted message
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(254, 202, 202);
    doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(153, 27, 27);
    doc.text('No Answers Submitted', margin + 6, y + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(185, 28, 28);
    doc.text(
      'No questions were answered during this match. There are no submitted answers available for review.',
      margin + 6,
      y + 17
    );
    y += 30;
  } else if (mistakes.length === 0) {
    // Zero mistakes message
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(22, 101, 52);
    doc.text('★ Flawless Performance! Zero Mistakes', margin + 6, y + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(21, 128, 61);
    doc.text(
      'You answered all questions correctly with 100% precision. Outstanding analytical mastery!',
      margin + 6,
      y + 17
    );
    y += 30;
  } else {
    // Render each incorrect question
    mistakes.forEach((q, idx) => {
      checkPageBreak(50);

      // Question Container
      const startBoxY = y;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);

      // Question Header tag
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(220, 38, 38);
      const tag = `Question #${q.roundIndex} • ${formatTopic(q.topic)} [${q.difficulty.toUpperCase()}]`;
      doc.text(tag, margin + 4, y + 6);
      y += 10;

      // Question Text (wrapped)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      const questionLines = doc.splitTextToSize(q.questionText, contentWidth - 8);
      doc.text(questionLines, margin + 4, y);
      y += questionLines.length * 4.5 + 3;

      // Your Answer (Red)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(185, 28, 28);
      doc.text('Your Selected Answer: ', margin + 4, y);
      doc.setFont('helvetica', 'normal');
      doc.text(q.selectedOptionText ? q.selectedOptionText : '(Unanswered / Timed Out)', margin + 44, y);
      y += 5;

      // Correct Answer (Green)
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(21, 128, 61);
      doc.text('Authoritative Correct Answer: ', margin + 4, y);
      doc.setFont('helvetica', 'normal');
      doc.text(q.correctOptionText, margin + 50, y);
      y += 6;

      // Solution / Explanation box
      if (q.explanation && q.explanation.trim()) {
        doc.setFillColor(248, 250, 252);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);

        const explLines = doc.splitTextToSize(`Explanation: ${q.explanation.trim()}`, contentWidth - 12);
        const explHeight = explLines.length * 4 + 4;

        doc.roundedRect(margin + 4, y, contentWidth - 8, explHeight, 1.5, 1.5, 'F');
        doc.text(explLines, margin + 6, y + 4);
        y += explHeight + 4;
      } else {
        y += 2;
      }

      // Draw bounding box
      const boxHeight = y - startBoxY;
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, startBoxY, contentWidth, boxHeight, 2, 2, 'D');

      y += 6;
    });
  }

  // Footer / Page numbers
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `AptiQuiz Campus Placement Report • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  const filename = `AptiQuiz_Mistake_Review_${cleanFilename(data.participantName)}.pdf`;
  doc.save(filename);
}

/**
 * Generate and download a Word Document (.docx) Learning Report
 */
export async function downloadLearningReportDOCX(data: LearningReportData): Promise<void> {
  const mistakes = data.questionReviews.filter(q => !q.isCorrect);
  const dateStr = new Date(data.completedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const children: any[] = [];

  // Header Title
  children.push(
    new Paragraph({
      text: 'AptiQuiz — Personalized Mistake Review & Learning Report',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Match Set: ', bold: true }),
        new TextRun({ text: `${data.questionSetTitle}  |  ` }),
        new TextRun({ text: 'Room Code: ', bold: true }),
        new TextRun({ text: `${data.roomCode}  |  ` }),
        new TextRun({ text: 'Date: ', bold: true }),
        new TextRun({ text: dateStr }),
      ],
      spacing: { after: 240 },
    })
  );

  // Performance Summary Table
  const tableRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: 'Candidate Name', bold: true })] })],
        }),
        new TableCell({
          width: { size: 70, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ text: data.participantName })],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: 'College / Institution', bold: true })] })],
        }),
        new TableCell({
          children: [new Paragraph({ text: data.college || 'Independent' })],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: 'Placement Rank & Score', bold: true })] })],
        }),
        new TableCell({
          children: [
            new Paragraph({
              text: `Rank #${data.finalRank} of ${data.totalParticipants} participants  •  ${data.finalScore.toLocaleString()} points`,
            }),
          ],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: 'Accuracy & Attempts', bold: true })] })],
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: `${data.accuracyPercent}% Accuracy  •  ` }),
                new TextRun({ text: `${data.correctCount} Correct  •  `, color: '16A34A', bold: true }),
                new TextRun({ text: `${data.incorrectCount} Incorrect to Review`, color: 'DC2626', bold: true }),
              ],
            }),
          ],
        }),
      ],
    }),
  ];

  children.push(
    new Table({
      rows: tableRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
    }),
    new Paragraph({ text: '', spacing: { after: 280 } })
  );

  // Mistakes Section Heading
  children.push(
    new Paragraph({
      text: 'Detailed Question Solutions & Explanations',
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 180 },
    })
  );

  const answeredCount = data.questionReviews.filter(q => q.hasAnswered).length;
  const noAnswersSubmitted = data.totalQuestions > 0 && answeredCount === 0;

  if (noAnswersSubmitted) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'No Answers Submitted',
            bold: true,
            color: '991B1B',
            size: 24,
          }),
        ],
        spacing: { after: 120 },
      }),
      new Paragraph({
        text: 'No questions were answered during this match. There are no submitted answers available for mistake review.',
        spacing: { after: 200 },
      })
    );
  } else if (mistakes.length === 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '★ Flawless Performance! Zero Mistakes Recorded.',
            bold: true,
            color: '166534',
            size: 24,
          }),
        ],
        spacing: { after: 120 },
      }),
      new Paragraph({
        text: 'You answered 100% of the quiz questions correctly. There are no mistakes to review for this match.',
        spacing: { after: 200 },
      })
    );
  } else {
    mistakes.forEach((q, idx) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Question ${idx + 1} (Round ${q.roundIndex}) — ${formatTopic(q.topic)} [${q.difficulty.toUpperCase()}]`,
              bold: true,
              color: '1E293B',
              size: 22,
            }),
          ],
          spacing: { before: 180, after: 80 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: q.questionText, bold: true }),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Your Answer: ', bold: true, color: 'DC2626' }),
            new TextRun({
              text: q.selectedOptionText ? q.selectedOptionText : '(Unanswered / Timed Out)',
              color: 'DC2626',
            }),
          ],
          spacing: { after: 60 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Correct Answer: ', bold: true, color: '16A34A' }),
            new TextRun({ text: q.correctOptionText, color: '16A34A', bold: true }),
          ],
          spacing: { after: 80 },
        })
      );

      if (q.explanation && q.explanation.trim()) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Solution / Explanation: ', bold: true, italics: true, color: '475569' }),
              new TextRun({ text: q.explanation.trim(), italics: true, color: '475569' }),
            ],
            spacing: { after: 180 },
          })
        );
      } else {
        children.push(new Paragraph({ text: '', spacing: { after: 120 } }));
      }
    });
  }

  // Create DOCX document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `AptiQuiz_Mistake_Review_${cleanFilename(data.participantName)}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
