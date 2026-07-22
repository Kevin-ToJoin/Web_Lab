import express, { type NextFunction, type Request, type Response } from 'express';
import { waitForDb } from './db.js';
import { initDb } from './initDb.js';
import { authRouter } from './routes/auth.js';
import { meRouter, sessionsRouter } from './routes/me.js';
import { adminRouter } from './routes/admin.js';
import { healthRouter } from './routes/health.js';
import { labRouter } from './routes/lab.js';

const app = express();
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    service: 'VaultAuth Security API — TestLab 101 (Auth module)',
    docs: 'GET /_lab/requirements',
    answers: 'GET /_lab/bugs?key=REVEAL',
    hint: 'This backend is deliberately buggy. Test it with curl / Postman / psql.',
  });
});

app.use('/me', meRouter);
app.use('/sessions', sessionsRouter);
app.use('/admin', adminRouter);
app.use('/health', healthRouter);
app.use('/_lab', labRouter);
// Auth flows live at the root: /signup, /login, /login/verify-2fa, /logout, /reset/*.
app.use('/', authRouter);

// Deliberately poor error handler — AUTH-10: a malformed JSON body (rejected by
// express.json()) and any other unhandled failure come back as a text/html 500
// with a raw stack trace instead of a clean JSON envelope. Express 5
// auto-forwards rejected async handlers here.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).type('html').send(`<pre>Internal Server Error\n${err.stack ?? err.message}</pre>`);
});

const PORT = Number(process.env.PORT) || 4010;

waitForDb()
  .then(initDb)
  .then(() => app.listen(PORT, () => console.log(`VaultAuth Security API listening on :${PORT}`)))
  .catch(err => {
    console.error('Failed to reach database:', err);
    process.exit(1);
  });
