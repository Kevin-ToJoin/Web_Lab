import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://lab:lab@localhost:5432/insurance',
  max: 10,
});

export const query = <T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
) => pool.query<T>(text, params);

export async function waitForDb(retries = 20): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error('Database not reachable');
}
