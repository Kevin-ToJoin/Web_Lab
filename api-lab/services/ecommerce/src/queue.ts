import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const url = process.env.REDIS_URL ?? 'redis://localhost:6379';

// BullMQ needs maxRetriesPerRequest: null on the shared connection.
export const connection = new IORedis(url, { maxRetriesPerRequest: null });

export const FULFILLMENT_QUEUE = 'fulfillment';

// The queue that /orders enqueues onto. Note there is NO dead-letter queue and
// jobs are added with default retry settings — see BUG-Q-01 / BUG-Q-02.
export const fulfillmentQueue = new Queue(FULFILLMENT_QUEUE, { connection });

export interface FulfillmentJob {
  orderId: number;
  email: string;
  total: number;
  flakeOnce?: boolean;  // fails once then succeeds on retry (drives BUG-Q-01)
  poison?: boolean;     // always fails (drives BUG-Q-02)
}
