import fs from 'fs-extra'
import path from 'path'
import { spawn } from 'child_process'
import simpleGit from 'simple-git'
import IORedis from 'ioredis'
import archiver from 'archiver'
import { withPrisma } from './prisma'
import { sendJobNotification } from './services/notifications'

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379'
const redisPub = new IORedis(redisUrl, { maxRetriesPerRequest: null })

export default async function processCiJob(data: any, onLog?: (line: string) => void) {
  const { jobId, repoId, command, branch } = data
  const logsDir = path.join(__dirname, '..', 'logs')
  const workDir = path.join(__dirname, '..', 'workspaces', jobId)
  
  await fs.ensureDir(logsDir)
  const logPath = path.join(logsDir, `${jobId}.log`)
  const out = fs.createWriteStream(logPath, { flags: 'a' })

  const log = (msg: string) => {
    const line = `${msg}\n`
    out.write(line)
    if (onLog) onLog(line.trim())
    redisPub.publish('job-logs', JSON.stringify({ jobId, line: line.trim() }))
  }

  try {
    // Get repo details and mark job as running
    const { repo, gitUrl } = await withPrisma(async (prisma) => {
      await prisma.job.update({ where: { id: jobId }, data: { status: 'RUNNING', startedAt: new Date() } })
      
      const repo = await prisma.repo.findUnique({ where: { id: repoId } })
      if (!repo) throw new Error(`Repo ${repoId} not found`)
      
      const user = await prisma.user.findUnique({ where: { id: repo.userId } })
      let gitUrl = repo.gitUrl
      if (user?.githubAccessToken && gitUrl.startsWith('https://github.com/')) {
        gitUrl = gitUrl.replace('https://', `https://${user.githubAccessToken}@`)
      }
      
      return { repo, gitUrl }
    })

    if (process.env.DOCKER_ENABLED === 'true') {
      log(`Starting Docker job for ${repo.name} on branch ${branch}`)
      
      log(`Cloning ${repo.gitUrl}...`)
      await fs.ensureDir(workDir)
      await simpleGit().clone(gitUrl, workDir)
      await simpleGit(workDir).checkout(branch || 'main')
      log('Clone complete.')

      const dockerImage = 'node:18-alpine'
      const absWorkDir = path.resolve(workDir)
      
      log(`Running command: ${command}`)
      
      const dockerArgs = [
        'run', '--rm',
        '-v', `${absWorkDir}:/app`,
        '-w', '/app',
        dockerImage,
        'sh', '-c', command
      ]
      
      log(`Docker args: ${dockerArgs.join(' ')}`)

      const proc = spawn('docker', dockerArgs, { shell: true })

      proc.stdout.on('data', (chunk) => log(chunk.toString().trim()))
      proc.stderr.on('data', (chunk) => log(chunk.toString().trim()))

      const code = await new Promise<number>((resolve) => proc.on('close', resolve))
      
      log(`Job finished with exit code ${code}`)
      
      let artifactPath: string | null = null;
      if (code === 0) {
        const distPath = path.join(workDir, 'dist');
        if (await fs.pathExists(distPath)) {
          log('Found dist/ folder. Archiving artifacts...');
          const artifactsDir = path.join(__dirname, '..', 'artifacts');
          await fs.ensureDir(artifactsDir);
          
          const zipName = `${jobId}.zip`;
          const zipPath = path.join(artifactsDir, zipName);
          const output = fs.createWriteStream(zipPath);
          const archive = archiver('zip', { zlib: { level: 9 } });

          await new Promise<void>((resolve, reject) => {
            output.on('close', resolve);
            archive.on('error', reject);
            archive.pipe(output);
            archive.directory(distPath, false);
            archive.finalize();
          });
          
          log(`Artifacts saved to ${zipPath}`);
          artifactPath = zipPath;
        }
      }

      out.end()
      await fs.remove(workDir)

      // Update job status and send notification
      await withPrisma(async (prisma) => {
        const startedAt = await prisma.job.findUnique({ where: { id: jobId }, select: { startedAt: true } })
        const finishedAt = new Date()
        const status = code === 0 ? 'SUCCESS' : 'FAILED'
        
        await prisma.job.update({ 
          where: { id: jobId }, 
          data: { 
            finishedAt, 
            exitCode: code, 
            status, 
            logsPath: logPath,
            artifactsPath: artifactPath
          } 
        })

        // Get user email for notification
        const user = await prisma.user.findUnique({ where: { id: repo.userId }, select: { email: true } })
        if (user?.email) {
          const duration = startedAt?.startedAt 
            ? `${Math.round((finishedAt.getTime() - startedAt.startedAt.getTime()) / 1000)}s`
            : undefined
          
          await sendJobNotification({
            to: user.email,
            jobId,
            jobName: command,
            repoName: repo.name,
            status: status as 'SUCCESS' | 'FAILED',
            duration,
            artifactsUrl: artifactPath ? `http://localhost:3000/api/jobs/${jobId}/artifacts` : undefined,
            logsPath: logPath,
          })
        }
      })
      
      return { ok: code === 0 }

    } else {
      log(`Simulated run for job ${jobId}`)
      log(`Repo: ${repoId} branch: ${branch}`)
      log(`Command: ${command}`)
      
      for (let i = 1; i <= 5; i++) {
        log(`progress ${i * 20}%`)
        await new Promise(r => setTimeout(r, 400))
      }
      log('Simulated job complete')
      out.end()

      await withPrisma(async (prisma) => {
        await prisma.job.update({ where: { id: jobId }, data: { finishedAt: new Date(), exitCode: 0, status: 'SUCCESS', logsPath: logPath } })
        
        // Send notification for simulated job
        const user = await prisma.user.findUnique({ where: { id: repo.userId }, select: { email: true } })
        if (user?.email) {
          await sendJobNotification({
            to: user.email,
            jobId,
            jobName: command,
            repoName: repo.name,
            status: 'SUCCESS',
            duration: '2s',
            logsPath: logPath,
          })
        }
      })
      
      return { ok: true }
    }
  } catch (err: any) {
    console.error(`Job ${jobId} failed:`, err.message)
    out.end()
    
    try {
      if (fs.existsSync(workDir)) await fs.remove(workDir)
      
      await withPrisma(async (prisma) => {
        await prisma.job.update({ where: { id: jobId }, data: { finishedAt: new Date(), status: 'FAILED', errorMessage: err.message } })
        
        // Send failure notification
        const job = await prisma.job.findUnique({ where: { id: jobId }, include: { repo: true } })
        if (job?.repo) {
          const user = await prisma.user.findUnique({ where: { id: job.repo.userId }, select: { email: true } })
          if (user?.email) {
            await sendJobNotification({
              to: user.email,
              jobId,
              jobName: command || 'CI Job',
              repoName: job.repo.name,
              status: 'FAILED',
              logsPath: logPath,
            })
          }
        }
      })
    } catch (_) {}
    
    throw err
  }
}
