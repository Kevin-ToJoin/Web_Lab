import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pool } from './db.js';

// Makes the image self-contained: the API applies its own schema (idempotent)
// and seeds the tables only when they are empty. No mounted SQL, no psql — so a
// pre-built image + a plain Postgres is enough to run the lab.
export async function initDb(): Promise<void> {
  const root = process.cwd(); // /app in the container
  const ddl = readFileSync(path.join(root, 'schema.sql'), 'utf8');
  await pool.query(ddl);

  const { rows } = await pool.query<{ n: string }>('SELECT count(*)::text AS n FROM users');
  if (rows[0].n === '0') {
    const seed = readFileSync(path.join(root, 'seed.sql'), 'utf8');
    await pool.query(seed);
    console.log('Registration DB seeded.');
  }
}
