/**
 * RBAC (Role-Based Access Control) for Repository Access
 * 
 * Roles hierarchy (highest to lowest):
 * - OWNER: Full control (delete repo, manage all collaborators)
 * - ADMIN: Manage collaborators, all write operations
 * - WRITE: Edit files, run jobs, create sessions
 * - VIEWER: Read-only access
 */

import prisma from './prisma'
 
export type RepoRole = 'OWNER' | 'ADMIN' | 'WRITE' | 'VIEWER'

// Permission levels for each role
const ROLE_LEVELS: Record<RepoRole, number> = {
  OWNER: 100,
  ADMIN: 75,
  WRITE: 50,
  VIEWER: 25,
}

// Required permission levels for actions
export const PERMISSIONS = {
  // Repo management
  DELETE_REPO: 'OWNER' as RepoRole,
  MANAGE_COLLABORATORS: 'ADMIN' as RepoRole,
  UPDATE_REPO_SETTINGS: 'ADMIN' as RepoRole,
  
  // Write operations
  COMMIT_FILES: 'WRITE' as RepoRole,
  CREATE_JOB: 'WRITE' as RepoRole,
  CANCEL_JOB: 'WRITE' as RepoRole,
  CREATE_SESSION: 'WRITE' as RepoRole,
  
  // Read operations
  VIEW_REPO: 'VIEWER' as RepoRole,
  VIEW_FILES: 'VIEWER' as RepoRole,
  VIEW_JOBS: 'VIEWER' as RepoRole,
  VIEW_LOGS: 'VIEWER' as RepoRole,
}

/**
 * Check if a role has sufficient permission for an action
 */
export function hasPermission(userRole: RepoRole, requiredRole: RepoRole): boolean {
  return ROLE_LEVELS[userRole] >= ROLE_LEVELS[requiredRole]
}

/**
 * Get user's role for a repository
 * Returns 'OWNER' if user owns the repo, otherwise checks collaborator table
 */
export async function getUserRepoRole(userId: string, repoId: string): Promise<RepoRole | null> {
  // First check if user is the repo owner
  const repo = await prisma.repo.findUnique({
    where: { id: repoId },
    select: { userId: true }
  })
  
  if (!repo) return null
  
  // Owner of the repo has OWNER role
  if (repo.userId === userId) {
    return 'OWNER'
  }
  
  // Check collaborator table
  const collaborator = await prisma.repoCollaborator.findUnique({
    where: {
      repoId_userId: { repoId, userId }
    },
    select: { role: true }
  })
  
  return collaborator?.role as RepoRole || null
}

/**
 * Check if user can perform an action on a repository
 */
export async function canUserPerformAction(
  userId: string, 
  repoId: string, 
  requiredRole: RepoRole
): Promise<boolean> {
  const userRole = await getUserRepoRole(userId, repoId)
  if (!userRole) return false
  return hasPermission(userRole, requiredRole)
}

/**
 * Get all repositories a user has access to (owned + collaborating)
 */
export async function getUserAccessibleRepos(userId: string) {
  // Get owned repos
  const ownedRepos = await prisma.repo.findMany({
    where: { userId },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } }
    }
  })
  
  // Get repos where user is a collaborator
  const collaborations = await prisma.repoCollaborator.findMany({
    where: { userId },
    include: {
      repo: {
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } }
        }
      }
    }
  })
  
  // Combine and add role info
  const repos = [
    ...ownedRepos.map((repo: typeof ownedRepos[number]) => ({
      ...repo,
      role: 'OWNER' as RepoRole,
      isOwner: true
    })),
    ...collaborations.map((collab: typeof collaborations[number]) => ({
      ...collab.repo,
      role: collab.role as RepoRole,
      isOwner: false
    }))
  ]
  
  return repos
}

/**
 * Add a collaborator to a repository
 */
export async function addCollaborator(
  repoId: string,
  userId: string,
  role: RepoRole,
  invitedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if user is already a collaborator
    const existing = await prisma.repoCollaborator.findUnique({
      where: { repoId_userId: { repoId, userId } }
    })
    
    if (existing) {
      return { success: false, error: 'User is already a collaborator' }
    }
    
    // Check if user is the owner (can't add owner as collaborator)
    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
      select: { userId: true }
    })
    
    if (repo?.userId === userId) {
      return { success: false, error: 'Cannot add repo owner as collaborator' }
    }
    
    await prisma.repoCollaborator.create({
      data: {
        repoId,
        userId,
        role,
        invitedBy
      }
    })
    
    return { success: true }
  } catch (error) {
    console.error('Failed to add collaborator:', error)
    return { success: false, error: 'Failed to add collaborator' }
  }
}

/**
 * Update a collaborator's role
 */
export async function updateCollaboratorRole(
  repoId: string,
  userId: string,
  newRole: RepoRole
): Promise<{ success: boolean; error?: string }> {
  try {
    // Cannot set role to OWNER via this method
    if (newRole === 'OWNER') {
      return { success: false, error: 'Cannot assign OWNER role to collaborator' }
    }
    
    await prisma.repoCollaborator.update({
      where: { repoId_userId: { repoId, userId } },
      data: { role: newRole }
    })
    
    return { success: true }
  } catch (error) {
    console.error('Failed to update collaborator role:', error)
    return { success: false, error: 'Failed to update role' }
  }
}

/**
 * Remove a collaborator from a repository
 */
export async function removeCollaborator(
  repoId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.repoCollaborator.delete({
      where: { repoId_userId: { repoId, userId } }
    })
    
    return { success: true }
  } catch (error) {
    console.error('Failed to remove collaborator:', error)
    return { success: false, error: 'Failed to remove collaborator' }
  }
}

/**
 * Get all collaborators for a repository
 */
export async function getRepoCollaborators(repoId: string) {
  const collaborators = await prisma.repoCollaborator.findMany({
    where: { repoId },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatar: true }
      }
    },
    orderBy: { createdAt: 'asc' }
  })
  
  // Also get the owner
  const repo = await prisma.repo.findUnique({
    where: { id: repoId },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatar: true }
      }
    }
  })
  
  return {
    owner: repo?.user,
    collaborators: collaborators.map((c: typeof collaborators[number]) => ({
      ...c.user,
      role: c.role,
      addedAt: c.createdAt
    }))
  }
}
