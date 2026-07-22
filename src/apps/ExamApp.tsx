import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Flag, ChevronLeft, ChevronRight, Award, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QALayout } from '../qa/QALayout';
import { useQAPanel, type APIEndpoint } from '../qa/QAContext';

interface Question {
  id: string;
  text: string;
  options: string[];
  correct: number;
  // A "partial credit" question: this alternate answer is meant to earn HALF marks.
  partial?: boolean;
  partialAnswer?: number;
}

const EXAM_SECONDS = 120;
const PASS_MARK = 70;        // percent needed to pass
const NEGATIVE_MARK = 0.25;  // deducted per WRONG answer only

const BASE_QUESTIONS: Question[] = [
  {
    id: 'Q1',
    text: 'Which HTTP status code means "Not Found"?',
    options: ['200', '301', '404', '500'],
    correct: 2,
  },
  {
    id: 'Q2',
    text: 'In testing, a "boundary value" analysis focuses on…',
    options: ['random inputs', 'edges of input ranges', 'the middle of ranges', 'invalid encodings'],
    correct: 1,
  },
  {
    id: 'Q3',
    text: 'Which of these is a partial answer? Select the BEST framework layer to assert on.',
    options: ['unit', 'integration', 'end-to-end', 'manual'],
    correct: 2,
    partial: true,
    partialAnswer: 1, // "integration" is only partially right → should earn half marks
  },
  {
    id: 'Q4',
    text: 'A regression test primarily protects against…',
    options: ['new features', 're-introduced defects', 'slow networks', 'typos'],
    correct: 1,
  },
  {
    id: 'Q5',
    text: 'Idempotent HTTP method (safe to retry)?',
    options: ['POST', 'PUT', 'PATCH', 'CONNECT'],
    correct: 1,
  },
];

// BUG EXM-13 (L6 Logic): Q2 is accidentally duplicated into the exam, so the
// same question is counted twice in the total number of questions.
const QUESTIONS: Question[] = [...BASE_QUESTIONS, BASE_QUESTIONS[1]];

interface Result {
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  flaggedCount: number;
}

const ExamInner = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions } = useQAPanel();

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(EXAM_SECONDS);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  // ---- Timer ----------------------------------------------------------------
  useEffect(() => {
    if (submitted) return;
    // BUG EXM-01 (L6 Timer): the interval keeps decrementing even after the
    // clock reaches zero (it never stops at 0), so the countdown runs negative.
    const id = setInterval(() => {
      setTimeLeft(t => t - 1);
    }, 1000);
    return () => clearInterval(id);
  }, [submitted]);

  useEffect(() => {
    // BUG EXM-10 (L7 Timer): the timer resets to full every time the current
    // question changes, so navigation gives the candidate unlimited time.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional bug EXM-10
    setTimeLeft(EXAM_SECONDS);
  }, [current]);

  // ---- Answering ------------------------------------------------------------
  const selectAnswer = (optionIndex: number) => {
    // BUG EXM-12 (L5 Boundary): a new answer is accepted even at 0:00 (or below)
    // because there is no guard on timeLeft here. (Intended: reject when time <= 0.)
    setAnswers(prev => ({ ...prev, [current]: optionIndex }));
  };

  const goNext = () => {
    if (current < QUESTIONS.length - 1) setCurrent(current + 1);
  };

  const goPrev = () => {
    if (current > 0) {
      const target = current - 1;
      // BUG EXM-06 (L7 State): navigating back wipes the answer that was
      // previously selected for that earlier question.
      setAnswers(prev => {
        const copy = { ...prev };
        delete copy[target];
        return copy;
      });
      setCurrent(target);
    }
  };

  const toggleFlag = () => {
    // Toggling OFF sets the value to `false` rather than removing the key.
    setFlagged(prev => ({ ...prev, [current]: !prev[current] }));
  };

  // ---- Grading --------------------------------------------------------------
  const grade = () => {
    // BUG EXM-09 (L5 Missing Validation): the exam can be submitted with zero
    // answers — there is no check that at least one question was answered.

    let score = 0;
    let maxScore = 0;

    // BUG EXM-08 (L6 Edge Case): the loop stops at length - 1, so the LAST
    // question is never graded (off-by-one in the loop bound).
    for (let i = 0; i < QUESTIONS.length - 1; i++) {
      const q = QUESTIONS[i];
      const points = 1;
      maxScore += points;
      const ans = answers[i];

      if (ans === undefined) {
        // BUG EXM-03 (L5 Logic): an unanswered question is counted as correct.
        score += points;
        // BUG EXM-04 (L6 Logic): negative marking is (wrongly) applied to the
        // blank answer too; it should only apply to WRONG answers.
        score -= NEGATIVE_MARK;
        continue;
      }

      if (ans === q.correct) {
        score += points;
      } else if (q.partial && ans === q.partialAnswer) {
        // BUG EXM-11 (L6 Logic): a partial answer awards FULL credit instead of
        // half credit (should be points / 2).
        score += points;
      } else {
        score -= NEGATIVE_MARK; // wrong answer
      }
    }

    // BUG EXM-05 (L5 Boundary): rounding uses Math.round, so 69.5% rounds up to
    // 70 and (combined with the cutoff) can flip a fail into a pass.
    const percentage = Math.round((score / maxScore) * 100);

    // BUG EXM-02 (L5 Boundary): the pass cutoff uses `>` instead of `>=`, so a
    // score of exactly 70% fails.
    const passed = percentage > PASS_MARK;

    // BUG EXM-07 (L5 Logic): the flagged count includes questions that were
    // flagged and then UN-flagged (value === false), so the count is too high.
    const flaggedCount = Object.keys(flagged).length;

    setResult({ score, maxScore, percentage, passed, flaggedCount });
    setSubmitted(true);
  };

  useEffect(() => {
    // BUG EXM-01 (L6 Timer): auto-submit fires one tick LATE — it waits for
    // timeLeft < 0 instead of <= 0, so submission happens after 0:00 has passed.
    if (timeLeft < 0 && !submitted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional bug EXM-01 (timer auto-submit)
      grade();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, submitted]);

  const retake = () => {
    // BUG EXM-14 (L5 Logic): retaking resets the answers and clock but does NOT
    // clear the previous `result`, so the old score sticks around.
    setAnswers({});
    setFlagged({});
    setCurrent(0);
    setTimeLeft(EXAM_SECONDS);
    setSubmitted(false);
    // (Intended: setResult(null) here.)
  };

  const mmss = (secs: number) => {
    const clamped = secs;
    const sign = clamped < 0 ? '-' : '';
    const abs = Math.abs(clamped);
    const m = Math.floor(abs / 60);
    const s = abs % 60;
    return `${sign}${m}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    setRequirements(`## CertifyHub — Online Certification Exam

A timed, multiple-choice certification exam (LMS-style). Candidates answer
questions, flag items for review, and submit for an automatically-graded score.

### Functional Requirements
- The **countdown timer** stops at **0:00** and **auto-submits exactly once**.
- The timer is **global** — it must **not reset** when the candidate changes questions.
- **Pass mark** is **${PASS_MARK}%**: a score of exactly ${PASS_MARK}% **passes** (>=).
- **Unanswered** questions are **wrong** (0 points), never counted correct.
- **Negative marking** (−${NEGATIVE_MARK}) applies to **wrong answers only**, never to blanks.
- **Percentage** is computed without a rounding trick that can flip a fail to a pass.
- Navigating **back** to a previous question **preserves** the earlier answer.
- The **flagged-for-review** count reflects **currently-flagged** questions only.
- **Every** question is graded, including the **last** one.
- The exam may **not** be submitted with **zero** answers.
- **Partial-credit** questions award **half** marks for a partial answer, not full.
- At **0:00** the exam **rejects** any new answer.
- A **duplicated** question must not inflate the total question count.
- **Retaking** the exam **resets** the previous score.

### Levels
14 bugs, difficulty levels 5-7 (timer, boundary value, logic, state, edge case, missing validation).`);

    setDbTables({
      Questions: QUESTIONS.map((q, i) => ({ id: i + 1, code: q.id, correct: q.correct, partial: !!q.partial })),
      Attempts: [
        { id: 9001, candidate: 'a.tester', score: 68, percentage: 68, passed: false },
        { id: 9002, candidate: 'b.tester', score: 70, percentage: 70, passed: false },
      ],
      GradingRules: [
        { id: 1, rule: 'Pass mark', value: `${PASS_MARK}% (>=)` },
        { id: 2, rule: 'Negative marking', value: `-${NEGATIVE_MARK} per wrong answer` },
        { id: 3, rule: 'Partial credit', value: 'half marks' },
      ],
    });

    const endpoints: APIEndpoint[] = [
      {
        method: 'POST',
        path: '/api/grade',
        description: 'Grades an attempt. (Reflects EXM-02: > cutoff, and EXM-03: blanks counted correct.)',
        payloadTemplate: '{\n  "answers": [2, 1, null, 1, 1],\n  "correct": [2, 1, 2, 1, 1]\n}',
        handler: (requestBody: string) => {
          try {
            const { answers: a, correct } = JSON.parse(requestBody || '{}');
            let score = 0;
            for (let i = 0; i < correct.length; i++) {
              if (a[i] === null || a[i] === undefined) {
                // BUG EXM-03: an unanswered question is counted as correct.
                score += 1;
              } else if (a[i] === correct[i]) {
                score += 1;
              }
            }
            const percentage = Math.round((score / correct.length) * 100);
            // BUG EXM-02: `>` instead of `>=`, so exactly 70% fails.
            const passed = percentage > PASS_MARK;
            return { status: 200, body: { score, percentage, passed } };
          } catch {
            return { status: 400, body: { error: 'Invalid JSON body' } };
          }
        },
      },
      {
        method: 'POST',
        path: '/api/submit',
        description: 'Submits an attempt. (Reflects EXM-09: accepts zero answers.)',
        payloadTemplate: '{\n  "answers": []\n}',
        handler: (requestBody: string) => {
          try {
            const { answers: a } = JSON.parse(requestBody || '{}');
            // BUG EXM-09: no validation that at least one answer is present.
            return { status: 200, body: { accepted: true, answered: (a || []).length } };
          } catch {
            return { status: 400, body: { error: 'Invalid JSON body' } };
          }
        },
      },
    ];
    setApiEndpoints(endpoints);

    setRemoteSolutions({ app: 'exam', bugIds: ['EXM-01', 'EXM-02', 'EXM-03', 'EXM-04', 'EXM-05', 'EXM-06', 'EXM-07', 'EXM-08', 'EXM-09', 'EXM-10', 'EXM-11', 'EXM-12', 'EXM-13', 'EXM-14'] });
  }, [setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions]);

  const q = QUESTIONS[current];
  const isFlagged = !!flagged[current];

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={18} /> Back to Hub
      </button>

      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>CertifyHub</h1>
          <p>Online certification exam: answer, flag, and submit for auto-grading. (Difficulty: Hard)</p>
        </div>
        <div className="glass-panel" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={18} />
          <span data-testid="exam-timer" style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{mmss(timeLeft)}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

        {/* Question / answering */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Question {current + 1} / {QUESTIONS.length}
            </h2>
            <button
              className="btn btn-secondary"
              onClick={toggleFlag}
              data-testid="flag-toggle"
              style={{ color: isFlagged ? 'var(--warning, #e0a800)' : undefined }}
            >
              <Flag size={16} /> {isFlagged ? 'Flagged' : 'Flag for review'}
            </button>
          </div>

          <p style={{ marginBottom: '1.25rem', fontSize: '1.05rem' }} data-testid="question-text">{q.text}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
            {q.options.map((opt, i) => {
              const chosen = answers[current] === i;
              return (
                <button
                  key={i}
                  className="glass-panel"
                  data-testid={`opt-${current}-${i}`}
                  onClick={() => selectAnswer(i)}
                  style={{
                    padding: '0.85rem 1rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    border: chosen ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
                    background: chosen ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={goPrev} disabled={current === 0} data-testid="prev-btn">
              <ChevronLeft size={16} /> Prev
            </button>
            <button className="btn btn-secondary" onClick={goNext} disabled={current === QUESTIONS.length - 1} data-testid="next-btn">
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Submit / results */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Award size={20} /> Exam Summary
          </h2>

          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            Answered {Object.keys(answers).length} / {QUESTIONS.length} · Pass mark {PASS_MARK}%
          </p>

          {!submitted ? (
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={grade} data-testid="submit-exam">
              Submit Exam
            </button>
          ) : (
            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={retake} data-testid="retake-exam">
              Retake Exam
            </button>
          )}

          {result && (
            <div className="glass-panel" style={{ padding: '1.25rem', marginTop: '1.5rem', background: 'rgba(255,255,255,0.03)' }} data-testid="exam-result">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span>Score</span><span data-testid="exam-score">{result.score} / {result.maxScore}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span>Percentage</span><span data-testid="exam-percentage">{result.percentage}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span>Flagged for review</span><span data-testid="exam-flagged">{result.flaggedCount}</span>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '0.6rem 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.2rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CheckCircle size={18} /> Verdict</span>
                <span data-testid="exam-verdict" style={{ color: result.passed ? 'var(--success)' : 'var(--danger, #e05555)' }}>
                  {result.passed ? 'PASS' : 'FAIL'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ExamApp = () => (
  <QALayout
    showDataTabs={false}
    dockerLab={{
      name: 'CertifyHub Exam API',
      port: 4008,
      bugCount: 12,
      composeUrl: `${import.meta.env.BASE_URL}labs/exam-docker-compose.yml`,
    }}
  >
    <ExamInner />
  </QALayout>
);
