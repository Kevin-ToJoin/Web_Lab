import express, { type NextFunction, type Request, type Response } from 'express';
import { waitForDb } from './db.js';
import { initDb } from './initDb.js';
import { instrumentsRouter } from './routes/instruments.js';
import { ordersRouter } from './routes/orders.js';
import { portfolioRouter } from './routes/portfolio.js';
import { adminRouter } from './routes/admin.js';
import { healthRouter } from './routes/health.js';
import { labRouter } from './routes/lab.js';

const app = express();
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    service: 'Trading Desk API — TestLab 101 (Trading module)',
    docs: 'GET /_lab/requirements',
    answers: 'GET /_lab/bugs?key=REVEAL',
    hint: 'This backend is deliberately buggy. Test it with curl / Postman / psql / k6.',
  });
});

app.use('/instruments', instrumentsRouter);
app.use('/orders', ordersRouter);
app.use('/accounts', portfolioRouter);
app.use('/admin', adminRouter);
app.use('/health', healthRouter);
app.use('/_lab', labRouter);

// Deliberately poor error handler — TRAD-11: a malformed JSON body (rejected by
// express.json()) and any other unhandled failure come back as a text/html 500
// with a raw stack trace instead of a clean JSON envelope. Express 5
// auto-forwards rejected async handlers here.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).type('html').send(`<pre>Internal Server Error\n${err.stack ?? err.message}</pre>`);
});

const PORT = Number(process.env.PORT) || 4005;

waitForDb()
  .then(initDb)
  .then(() => app.listen(PORT, () => console.log(`Trading Desk API listening on :${PORT}`)))
  .catch(err => {
    console.error('Failed to reach database:', err);
    process.exit(1);
  });
