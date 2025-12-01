import 'dotenv/config';
import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import path from 'path';
import populateRepoMetadata from './jobs/populateRepoMetadata';
import processCiJob from './ciWorker';
import sessionStart from './jobs/sessionStart';
import sessionStop from './jobs/sessionStop';
import sessionCleanup from './jobs/sessionCleanup';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const connection = new IORedis(redisUrl, { 
  maxRetriesPerRequest: null,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

connection.on('error', (err: any) => {
  if (err.code === 'ECONNREFUSED') {
    console.error('❌ Redis connection failed. Is Redis running?');
    console.error('   Run: docker-compose up -d');
  } else {
    console.error('Redis error:', err);
  }
});

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
    } else if (job.name === 'session-start') {
      console.log('Processing session start job', job.data);
      await sessionStart(job.data);
      return { ok: true };
    } else if (job.name === 'session-stop') {
      console.log('Processing session stop job', job.data);
      await sessionStop(job.data);
      return { ok: true };
    }
    throw new Error(`Unknown ci job ${job.name}`)
  },
  { connection }
)

ciWorker.on('completed', job => console.log(`ci job ${job.id} (${job.name}) completed`))
ciWorker.on('failed', (job, err) => console.error(`ci job ${job?.id} failed:`, err?.message || err))

console.log('CI Worker started, listening for ci-jobs')

// Track consecutive DB failures to reduce log spam
let consecutiveDbFailures = 0;
const MAX_CONSECUTIVE_FAILURES_TO_LOG = 3;

// Cleanup function with failure tracking
async function runCleanup() {
  try {
    await sessionCleanup();
    if (consecutiveDbFailures > 0) {
      console.log('✅ Database connection restored');
    }
    consecutiveDbFailures = 0;
  } catch (err: any) {
    consecutiveDbFailures++;
    // Only log first few failures, then go quiet to avoid spam
    if (consecutiveDbFailures <= MAX_CONSECUTIVE_FAILURES_TO_LOG) {
      console.error(`Cleanup failed (${consecutiveDbFailures}):`, err?.message || err);
    } else if (consecutiveDbFailures === MAX_CONSECUTIVE_FAILURES_TO_LOG + 1) {
      console.error('🔇 Suppressing further cleanup errors until connection is restored...');
    }
  }
}

// Start cleanup interval (every 5 minutes to reduce load)
// Run once immediately on startup to clear any stale sessions
runCleanup();

setInterval(runCleanup, 300000); // 5 minutes instead of 60 seconds
console.log('Session cleanup scheduler started (5 min interval)');
