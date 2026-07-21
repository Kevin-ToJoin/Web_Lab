import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://lab:lab@localhost:5432/orderflow',
  max: 10,
});

// Small helper so routes can run raw SQL. Kept intentionally thin — some
// callers use parameterized queries (safe) and one deliberately does not
// (BUG-DB-04, SQL injection).
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
