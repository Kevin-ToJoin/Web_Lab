import express, { type NextFunction, type Request, type Response } from 'express';
import { waitForDb } from './db.js';
import { initDb } from './initDb.js';
import { productsRouter } from './routes/products.js';
import { reviewsRouter } from './routes/reviews.js';
import { categoriesRouter } from './routes/categories.js';
import { healthRouter } from './routes/health.js';
import { labRouter } from './routes/lab.js';

const app = express();
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    service: 'TechMart Catalog API — TestLab 101 (Catalog module)',
    docs: 'GET /_lab/requirements',
    answers: 'GET /_lab/bugs?key=REVEAL',
    hint: 'This backend is deliberately buggy. Test it with curl / Postman / psql.',
  });
});

// The nested reviews route is registered before /products so its longer path
// is matched first.
app.use('/products/:id/reviews', reviewsRouter);
app.use('/products', productsRouter);
app.use('/categories', categoriesRouter);
app.use('/health', healthRouter);
app.use('/_lab', labRouter);

// Deliberately poor error handler — unhandled failures (CATA-05's negative
// offset, CATA-11's NaN id) come back as a text/html 500 with a raw stack trace
// instead of a clean JSON envelope. Express 5 auto-forwards rejected handlers.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).type('html').send(`<pre>Internal Server Error\n${err.stack ?? err.message}</pre>`);
});

const PORT = Number(process.env.PORT) || 4002;

waitForDb()
  .then(initDb)
  .then(() => app.listen(PORT, () => console.log(`TechMart Catalog API listening on :${PORT}`)))
  .catch(err => {
    console.error('Startup failed:', err);
    process.exit(1);
  });
