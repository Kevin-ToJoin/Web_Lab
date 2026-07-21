import express, { type NextFunction, type Request, type Response } from 'express';
import { waitForDb } from './db.js';
import { authRouter } from './routes/auth.js';
import { productsRouter } from './routes/products.js';
import { ordersRouter } from './routes/orders.js';
import { adminRouter } from './routes/admin.js';
import { healthRouter } from './routes/health.js';
import { labRouter } from './routes/lab.js';

const app = express();
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    service: 'OrderFlow API — TestLab 101 (API & Data track)',
    docs: 'GET /_lab/requirements',
    answers: 'GET /_lab/bugs?key=REVEAL',
    hint: 'This backend is deliberately buggy. Test it with curl / Postman / psql / k6.',
  });
});

// Auth lives at the root: POST /signup, POST /login.
app.use('/', authRouter);
app.use('/products', productsRouter);
app.use('/orders', ordersRouter);
app.use('/admin', adminRouter);
app.use('/health', healthRouter);
app.use('/_lab', labRouter);

// BUG-API-05: the error handler is deliberately poor — 500s come back as
// text/html with a raw stack trace (leaking internals) instead of the
// consistent JSON `{ error }` envelope the other endpoints use. Express 5
// auto-forwards rejected async handlers here, so an unhandled failure (e.g.
// BUG-API-02's malformed payload) lands as an ugly 500.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).type('html').send(`<pre>Internal Server Error\n${err.stack ?? err.message}</pre>`);
});

const PORT = Number(process.env.PORT) || 4000;

waitForDb()
  .then(() => {
    app.listen(PORT, () => console.log(`OrderFlow API listening on :${PORT}`));
  })
  .catch(err => {
    console.error('Failed to reach database:', err);
    process.exit(1);
  });
