/* eslint-disable @typescript-eslint/no-explicit-any */
// Vercel serverless function: the server-gated answer key for TestLab 101.
//
// The web bundle no longer ships solution content. On unlock, the browser POSTs
// { app, key } here; this function validates the key SERVER-SIDE and returns the
// answers for that module. Answers are loaded from (in priority order):
//   1. a PRIVATE GitHub repo, via the Contents API + a read-only token, or
//   2. a local api/_answers/<app>.json file (gitignored — dev only).
// Neither source is in the public bundle, so the answers never leak to clients.
//
// Configure in Vercel (Project → Settings → Environment Variables):
//   SOLUTIONS_KEY   the unlock code the endpoint requires (defaults to "REVEAL").
//                   Set a private instructor code here for real protection.
//   ANSWERS_REPO    e.g. "Kevin-ToJoin/Web_Lab-answers"
//   ANSWERS_TOKEN   a fine-grained token with read-only Contents on that repo
//   ANSWERS_REF     branch to read (defaults to "main")
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

interface Answer {
  title: string;
  location: string;
  technique: string;
  buggyCode: string;
  fixedCode: string;
  explanation: string;
}

// Per-app cache; persists across warm invocations of the same function instance.
const cache = new Map<string, Record<string, Answer>>();

export async function loadAnswers(app: string): Promise<Record<string, Answer> | null> {
  // Guard: app becomes a filename / URL path segment.
  if (!/^[a-z0-9-]+$/.test(app)) return null;
  if (cache.has(app)) return cache.get(app)!;

  const repo = process.env.ANSWERS_REPO;
  const token = process.env.ANSWERS_TOKEN;
  const ref = process.env.ANSWERS_REF || 'main';

  // 1) Private repo via the GitHub Contents API (raw JSON).
  if (repo && token) {
    const url = `https://api.github.com/repos/${repo}/contents/answers/${app}.json?ref=${encodeURIComponent(ref)}`;
    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.raw+json',
        'User-Agent': 'testlab101-answers',
      },
    });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`answers repo fetch failed: ${r.status}`);
    const parsed = JSON.parse(await r.text()) as Record<string, Answer>;
    cache.set(app, parsed);
    return parsed;
  }

  // 2) Local fallback (dev only; api/_answers is gitignored, never deployed).
  const local = path.join(process.cwd(), 'api', '_answers', `${app}.json`);
  if (existsSync(local)) {
    const parsed = JSON.parse(readFileSync(local, 'utf8')) as Record<string, Answer>;
    cache.set(app, parsed);
    return parsed;
  }

  return null;
}

export function keyIsValid(provided: string): boolean {
  const expected = (process.env.SOLUTIONS_KEY || 'REVEAL').trim();
  return provided.length > 0 && provided.toUpperCase() === expected.toUpperCase();
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const app = String(body?.app ?? '');
  const key = String(body?.key ?? '').trim();

  if (!keyIsValid(key)) {
    res.status(401).json({ error: 'invalid key' });
    return;
  }

  try {
    const answers = await loadAnswers(app);
    if (!answers) {
      res.status(404).json({ error: 'no answers configured for this module', app });
      return;
    }
    res.setHeader('cache-control', 'no-store');
    res.status(200).json({ app, answers });
  } catch {
    res.status(500).json({ error: 'answers service error' });
  }
}
