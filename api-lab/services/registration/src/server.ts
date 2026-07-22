import express, { type NextFunction, type Request, type Response } from 'express';
import { waitForDb } from './db.js';
import { initDb } from './initDb.js';
import { signupRouter } from './routes/signup.js';
import { verifyRouter } from './routes/verify.js';
import { loginRouter } from './routes/login.js';
import { healthRouter } from './routes/health.js';
import { labRouter } from './routes/lab.js';

const app = express();
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    service: 'DevPortal Registration API — TestLab 101 (Registration module)',
    docs: 'GET /_lab/requirements',
    answers: 'GET /_lab/bugs?key=REVEAL',
    hint: 'This backend is deliberately buggy. Test it with curl / Postman / psql.',
  });
});

app.use('/signup', signupRouter);
app.use('/verify', verifyRouter);
app.use('/login', loginRouter);
app.use('/health', healthRouter);
app.use('/_lab', labRouter);

// Deliberately poor error handler — an unhandled failure comes back as a
// text/html 500 with a raw stack trace. Express 5 auto-forwards rejected handlers.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).type('html').send(`<pre>Internal Server Error\n${err.stack ?? err.message}</pre>`);
});

const PORT = Number(process.env.PORT) || 4003;

waitForDb()
  .then(initDb)
  .then(() => app.listen(PORT, () => console.log(`DevPortal Registration API listening on :${PORT}`)))
  .catch(err => {
    console.error('Failed to reach database:', err);
    process.exit(1);
  });
