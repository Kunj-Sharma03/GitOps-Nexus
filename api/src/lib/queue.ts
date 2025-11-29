import { Queue } from 'bullmq'
import IORedis from 'ioredis'

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379'
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null })

// Separate queues for repo-jobs (metadata) and ci-jobs (CI/sandbox runs)
export const repoQueue = new Queue('repo-jobs', { connection })
export const ciQueue = new Queue('ci-jobs', { connection })

export default { repoQueue, ciQueue }
