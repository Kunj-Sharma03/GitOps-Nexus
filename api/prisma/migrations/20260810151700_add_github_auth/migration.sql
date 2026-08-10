-- CreateEnum
CREATE TYPE "RepoRole" AS ENUM ('OWNER', 'ADMIN', 'WRITE', 'VIEWER');

-- AlterTable
ALTER TABLE "repos" DROP COLUMN "description",
DROP COLUMN "isPrivate",
DROP COLUMN "lastSyncedAt",
ALTER COLUMN "localPath" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "githubAccessToken" TEXT;

-- CreateTable
CREATE TABLE "repo_collaborators" (
    "id" TEXT NOT NULL,
    "role" "RepoRole" NOT NULL DEFAULT 'VIEWER',
    "repoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invitedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repo_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "repo_collaborators_userId_idx" ON "repo_collaborators"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "repo_collaborators_repoId_userId_key" ON "repo_collaborators"("repoId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- AddForeignKey
ALTER TABLE "repo_collaborators" ADD CONSTRAINT "repo_collaborators_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "repos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repo_collaborators" ADD CONSTRAINT "repo_collaborators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
