import { Worker, type Job } from 'bullmq';
import { connection, FULFILLMENT_QUEUE, type FulfillmentJob } from './queue.js';
import { waitForDb } from './db.js';

// The fulfillment consumer. It "charges the card" and "sends an email" for each
// order. Two injected bugs live here:
//
//   BUG-Q-01 (non-idempotent): the side effects run BEFORE the flaky failure,
//     and the processed_jobs table is never consulted — so a retried job
//     charges/emails again. The one-line fix (dedupe on job id) is left out.
//
//   BUG-Q-02 (poison message, no DLQ): a job flagged `poison` throws on every
//     attempt. With attempts=5 and no dead-letter queue, it churns through all
//     retries and then sits in the failed set forever with no alert or routing.

async function processFulfillment(job: Job<FulfillmentJob>) {
  const { orderId, email, total, flakeOnce, poison } = job.data;

  // BUG-Q-01: an idempotent worker would guard here first —
  //   INSERT INTO processed_jobs (job_id) VALUES ($1) ON CONFLICT DO NOTHING
  //   if (rowCount === 0) return;   // already handled, skip the side effects
  // Instead we run the side effects unconditionally, so every retry repeats them.
  console.log(`[fulfill] order ${orderId}: charging $${total} and emailing ${email}`);

  if (poison) {
    // BUG-Q-02: always throws; there is no dead-letter queue to catch it.
    throw new Error(`poison message for order ${orderId} — cannot be processed`);
  }

  if (flakeOnce && job.attemptsMade === 0) {
    // Fail on the first attempt so BullMQ retries — the retry re-runs the
    // "charge + email" above, demonstrating the non-idempotency (BUG-Q-01).
    throw new Error(`transient failure fulfilling order ${orderId} (will retry)`);
  }

  console.log(`[fulfill] order ${orderId}: done`);
}

async function main() {
  await waitForDb();
  new Worker<FulfillmentJob>(FULFILLMENT_QUEUE, processFulfillment, { connection });
  console.log('Fulfillment worker started');
}

main().catch(err => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});
