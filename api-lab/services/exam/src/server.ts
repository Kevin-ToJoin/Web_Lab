import express, { type NextFunction, type Request, type Response } from 'express';
import { waitForDb } from './db.js';
import { initDb } from './initDb.js';
import { examsRouter } from './routes/exams.js';
import { submitRouter, attemptsRouter } from './routes/attempts.js';
import { adminRouter } from './routes/admin.js';
import { healthRouter } from './routes/health.js';
import { labRouter } from './routes/lab.js';

const app = express();
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    service: 'CertifyHub Exam API — TestLab 101 (Exam module)',
    docs: 'GET /_lab/requirements',
    answers: 'GET /_lab/bugs?key=REVEAL',
    hint: 'This backend is deliberately buggy. Test it with curl / Postman / psql.',
  });
});

// Submissions live under the exam: POST /exams/:id/submit (submitRouter, POST
// only) is mounted before examsRouter so GET /exams/:id still resolves correctly.
app.use('/exams', submitRouter);
app.use('/exams', examsRouter);
app.use('/attempts', attemptsRouter);
app.use('/admin', adminRouter);
app.use('/health', healthRouter);
app.use('/_lab', labRouter);

// Deliberately poor error handler — EXAM-09: a malformed JSON body (rejected by
// express.json()) and any other unhandled failure come back as a text/html 500
// with a raw stack trace instead of a clean JSON envelope. Express 5
// auto-forwards rejected async handlers here.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).type('html').send(`<pre>Internal Server Error\n${err.stack ?? err.message}</pre>`);
});

const PORT = Number(process.env.PORT) || 4008;

waitForDb()
  .then(initDb)
  .then(() => app.listen(PORT, () => console.log(`CertifyHub Exam API listening on :${PORT}`)))
  .catch(err => {
    console.error('Failed to reach database:', err);
    process.exit(1);
  });
