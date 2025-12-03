/**
 * Collaborator Management Routes
 * 
 * Endpoints for managing repository collaborators (RBAC)
 */

import { Router } from 'express'
import { Prisma } from '@prisma/client'
import prisma from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { requireAdmin, requireOwner } from '../middleware/rbac'
import { 
  addCollaborator, 
  removeCollaborator, 
  updateCollaboratorRole, 
  getRepoCollaborators,
  getUserRepoRole,
  type RepoRole 
} from '../lib/rbac'

const router = Router()

/**
 * GET /api/repos/:id/collaborators
 * List all collaborators for a repository
 * Requires: VIEWER access (anyone with access can see collaborators)
 */
router.get('/:id/collaborators', authMiddleware, async (req, res) => {
  const { id: repoId } = req.params
  const userId = (req as any).userId
  
  try {
    // First verify user has access to this repo
    const role = await getUserRepoRole(userId, repoId)
    
    if (!role) {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    const result = await getRepoCollaborators(repoId)
    res.json(result)
  } catch (error) {
    console.error('Failed to get collaborators:', error)
    res.status(500).json({ error: 'Failed to get collaborators' })
  }
})

/**
 * POST /api/repos/:id/collaborators
 * Add a collaborator to a repository
 * Requires: ADMIN role
 * Body: { email: string, role: 'ADMIN' | 'WRITE' | 'VIEWER' }
 */
router.post('/:id/collaborators', authMiddleware, requireAdmin, async (req, res) => {
  const { id: repoId } = req.params
  const { email, role } = req.body
  const invitedBy = (req as any).userId
  
  if (!email || !role) {
    return res.status(400).json({ error: 'Email and role are required' })
  }
  
  // Validate role
  const validRoles: RepoRole[] = ['ADMIN', 'WRITE', 'VIEWER']
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be ADMIN, WRITE, or VIEWER' })
  }
  
  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true }
    })
    
    if (!user) {
      return res.status(404).json({ error: 'User not found with that email' })
    }
    
    const result = await addCollaborator(repoId, user.id, role, invitedBy)
    
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }
    
    res.status(201).json({ 
      message: 'Collaborator added successfully',
      collaborator: { ...user, role }
    })
  } catch (error) {
    console.error('Failed to add collaborator:', error)
    res.status(500).json({ error: 'Failed to add collaborator' })
  }
})

/**
 * PATCH /api/repos/:id/collaborators/:userId
 * Update a collaborator's role
 * Requires: ADMIN role
 * Body: { role: 'ADMIN' | 'WRITE' | 'VIEWER' }
 */
router.patch('/:id/collaborators/:userId', authMiddleware, requireAdmin, async (req, res) => {
  const { id: repoId, userId } = req.params
  const { role } = req.body
  const currentUserId = (req as any).userId
  
  if (!role) {
    return res.status(400).json({ error: 'Role is required' })
  }
  
  // Validate role
  const validRoles: RepoRole[] = ['ADMIN', 'WRITE', 'VIEWER']
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be ADMIN, WRITE, or VIEWER' })
  }
  
  // Cannot modify yourself (unless owner)
  if (userId === currentUserId && req.repoRole !== 'OWNER') {
    return res.status(400).json({ error: 'Cannot modify your own role' })
  }
  
  try {
    const result = await updateCollaboratorRole(repoId, userId, role)
    
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }
    
    res.json({ message: 'Role updated successfully' })
  } catch (error) {
    console.error('Failed to update role:', error)
    res.status(500).json({ error: 'Failed to update role' })
  }
})

/**
 * DELETE /api/repos/:id/collaborators/:userId
 * Remove a collaborator from a repository
 * Requires: ADMIN role (or self-removal)
 */
router.delete('/:id/collaborators/:userId', authMiddleware, async (req, res) => {
  const { id: repoId, userId: targetUserId } = req.params
  const currentUserId = (req as any).userId
  
  try {
    // Get current user's role
    const currentRole = await getUserRepoRole(currentUserId, repoId)
    
    if (!currentRole) {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    // Allow self-removal OR require ADMIN+
    const isSelfRemoval = targetUserId === currentUserId
    const isAdmin = currentRole === 'ADMIN' || currentRole === 'OWNER'
    
    if (!isSelfRemoval && !isAdmin) {
      return res.status(403).json({ error: 'Only admins can remove other collaborators' })
    }
    
    // Cannot remove the owner
    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
      select: { userId: true }
    })
    
    if (repo?.userId === targetUserId) {
      return res.status(400).json({ error: 'Cannot remove the repository owner' })
    }
    
    const result = await removeCollaborator(repoId, targetUserId)
    
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }
    
    res.json({ message: 'Collaborator removed successfully' })
  } catch (error) {
    console.error('Failed to remove collaborator:', error)
    res.status(500).json({ error: 'Failed to remove collaborator' })
  }
})

/**
 * POST /api/repos/:id/transfer
 * Transfer repo ownership to another user
 * Requires: OWNER role
 * Body: { newOwnerId: string }
 */
router.post('/:id/transfer', authMiddleware, requireOwner, async (req, res) => {
  const { id: repoId } = req.params
  const { newOwnerId } = req.body
  const currentOwnerId = (req as any).userId
  
  if (!newOwnerId) {
    return res.status(400).json({ error: 'New owner ID is required' })
  }
  
  if (newOwnerId === currentOwnerId) {
    return res.status(400).json({ error: 'You are already the owner' })
  }
  
  try {
    // Verify new owner exists
    const newOwner = await prisma.user.findUnique({
      where: { id: newOwnerId }
    })
    
    if (!newOwner) {
      return res.status(404).json({ error: 'New owner not found' })
    }
    
    // Transaction: transfer ownership
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Update repo owner
      await tx.repo.update({
        where: { id: repoId },
        data: { userId: newOwnerId }
      })
      
      // Remove new owner from collaborators if they were one
      await tx.repoCollaborator.deleteMany({
        where: { repoId, userId: newOwnerId }
      })
      
      // Add previous owner as ADMIN collaborator
      await tx.repoCollaborator.create({
        data: {
          repoId,
          userId: currentOwnerId,
          role: 'ADMIN',
          invitedBy: newOwnerId
        }
      })
    })
    
    res.json({ message: 'Ownership transferred successfully' })
  } catch (error) {
    console.error('Failed to transfer ownership:', error)
    res.status(500).json({ error: 'Failed to transfer ownership' })
  }
})

export default router
