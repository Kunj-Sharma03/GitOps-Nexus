import 'dotenv/config';
import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import path from 'path';
import populateRepoMetadata from './jobs/populateRepoMetadata';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const connection = new IORedis(redisUrl);

const queueName = 'repo-jobs';
export const repoQueue = new Queue(queueName, { connection });

// worker that processes jobs
const worker = new Worker(
  queueName,
  async job => {
    if (job.name === 'populateRepoMetadata') {
      await populateRepoMetadata(job.data as any);
      return { ok: true };
    }
    throw new Error(`Unknown job ${job.name}`);
  },
  { connection }
);

worker.on('completed', job => {
  console.log(`job ${job.id} (${job.name}) completed`);
});

worker.on('failed', (job, err) => {
  console.error(`job ${job?.id} failed:`, err?.message || err);
});

console.log('Worker started, listening for repo-jobs');
