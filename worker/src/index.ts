import 'dotenv/config';
import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import path from 'path';
import populateRepoMetadata from './jobs/populateRepoMetadata';
import processCiJob from './ciWorker';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

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

// CI worker for processing ci-jobs
const ciWorker = new Worker(
  'ci-jobs',
  async job => {
    if (job.name === 'ci-run') {
      console.log('Processing CI job', job.data)
      try {
        await processCiJob(job.data, (line: string) => console.log(`[ci:${job.id}]`, line.trim()))
        return { ok: true }
      } catch (err: any) {
        console.error('CI job failed', err?.message || err)
        throw err
      }
    }
    throw new Error(`Unknown ci job ${job.name}`)
  },
  { connection }
)

ciWorker.on('completed', job => console.log(`ci job ${job.id} (${job.name}) completed`))
ciWorker.on('failed', (job, err) => console.error(`ci job ${job?.id} failed:`, err?.message || err))

console.log('CI Worker started, listening for ci-jobs')
