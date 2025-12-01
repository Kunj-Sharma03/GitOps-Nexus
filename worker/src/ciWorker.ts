import fs from 'fs-extra'
import path from 'path'
import { spawn } from 'child_process'
import simpleGit from 'simple-git'
import IORedis from 'ioredis'
import archiver from 'archiver'
import prisma from './prisma'

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379'
const redisPub = new IORedis(redisUrl, { maxRetriesPerRequest: null })

export default async function processCiJob(data: any, onLog?: (line: string) => void) {
  const { jobId, repoId, command, branch } = data
  const logsDir = path.join(__dirname, '..', 'logs')
  const workDir = path.join(__dirname, '..', 'workspaces', jobId)
  
  try {
    await fs.ensureDir(logsDir)
    const logPath = path.join(logsDir, `${jobId}.log`)
    const out = fs.createWriteStream(logPath, { flags: 'a' })

    const log = (msg: string) => {
      const line = `${msg}\n`
      out.write(line)
      if (onLog) onLog(line.trim())
      // Publish to Redis
      redisPub.publish('job-logs', JSON.stringify({ jobId, line: line.trim() }))
    }

    // mark job running
    await prisma.job.update({ where: { id: jobId }, data: { status: 'RUNNING', startedAt: new Date() } })

    // Fetch repo details
    const repo = await prisma.repo.findUnique({ where: { id: repoId } })
    if (!repo) throw new Error(`Repo ${repoId} not found`)

    // Fetch user for token if needed (optional enhancement)
    const user = await prisma.user.findUnique({ where: { id: repo.userId } })
    let gitUrl = repo.gitUrl
    if (user?.githubAccessToken && gitUrl.startsWith('https://github.com/')) {
      // Inject token into URL: https://TOKEN@github.com/...
      gitUrl = gitUrl.replace('https://', `https://${user.githubAccessToken}@`)
    }

    if (process.env.DOCKER_ENABLED === 'true') {
      log(`Starting Docker job for ${repo.name} on branch ${branch}`)
      
      // 1. Clone repo
      log(`Cloning ${repo.gitUrl}...`)
      await fs.ensureDir(workDir)
      await simpleGit().clone(gitUrl, workDir)
      await simpleGit(workDir).checkout(branch || 'main')
      log('Clone complete.')

      // 2. Run Docker container
      // Mount workDir to /app
      // Use node:18-alpine for speed
      const dockerImage = 'node:18-alpine'
      // Windows path handling for Docker volume mount
      const absWorkDir = path.resolve(workDir)
      
      log(`Running command: ${command}`)
      
      // Construct docker command
      // Note: On Windows, paths like C:\... need to be handled. Docker Desktop usually handles /c/Users/... or standard paths.
      // We'll use standard spawn with shell: true
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
      
      let artifactPath = null;
      if (code === 0) {
        // Check for artifacts (e.g., dist/ folder)
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

      // Cleanup workspace
      await fs.remove(workDir)

      await prisma.job.update({ 
        where: { id: jobId }, 
        data: { 
          finishedAt: new Date(), 
          exitCode: code, 
          status: code === 0 ? 'SUCCESS' : 'FAILED', 
          logsPath: logPath,
          artifactsPath: artifactPath
        } 
      })
      return { ok: code === 0 }

    } else {
      // Simulate a job run for dev
      log(`Simulated run for job ${jobId}`)
      log(`Repo: ${repoId} branch: ${branch}`)
      log(`Command: ${command}`)
      
      // simulate progress
      for (let i = 1; i <= 5; i++) {
        log(`progress ${i * 20}%`)
        await new Promise(r => setTimeout(r, 400))
      }
      log('Simulated job complete')
      out.end()

      await prisma.job.update({ where: { id: jobId }, data: { finishedAt: new Date(), exitCode: 0, status: 'SUCCESS', logsPath: logPath } })
      return { ok: true }
    }
  } catch (err: any) {
    console.error(`Job ${jobId} failed:`, err)
    try {
      // Cleanup workspace on error
      if (fs.existsSync(workDir)) await fs.remove(workDir)
      
      await prisma.job.update({ where: { id: jobId }, data: { finishedAt: new Date(), status: 'FAILED', errorMessage: err.message } })
    } catch (_) {}
    throw err
  }
}
