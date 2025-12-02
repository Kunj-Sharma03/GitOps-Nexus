/**
 * RBAC Middleware for Express Routes
 * 
 * Use these middleware functions to protect routes based on repo roles
 */

import { Request, Response, NextFunction } from 'express'
import { getUserRepoRole, hasPermission, type RepoRole, PERMISSIONS } from '../lib/rbac'

// Extend Express Request to include role
declare global {
  namespace Express {
    interface Request {
      repoRole?: RepoRole
    }
  }
}

/**
 * Middleware to check if user has access to a repo
 * Attaches the user's role to req.repoRole for downstream use
 */
export function requireRepoAccess(requiredRole: RepoRole = 'VIEWER') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id
    const repoId = req.params.id || req.params.repoId || req.body?.repoId
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    
    if (!repoId) {
      return res.status(400).json({ error: 'Repository ID required' })
    }
    
    try {
      const userRole = await getUserRepoRole(userId, repoId)
      
      if (!userRole) {
        return res.status(403).json({ error: 'Access denied: No access to this repository' })
      }
      
      if (!hasPermission(userRole, requiredRole)) {
        return res.status(403).json({ 
          error: `Access denied: Requires ${requiredRole} role or higher`,
          yourRole: userRole,
          requiredRole
        })
      }
      
      // Attach role to request for downstream use
      req.repoRole = userRole
      next()
    } catch (error) {
      console.error('RBAC check failed:', error)
      return res.status(500).json({ error: 'Authorization check failed' })
    }
  }
}

/**
 * Convenience middleware for common permission checks
 */
export const requireViewer = requireRepoAccess('VIEWER')
export const requireWriter = requireRepoAccess('WRITE')
export const requireAdmin = requireRepoAccess('ADMIN')
export const requireOwner = requireRepoAccess('OWNER')

/**
 * Check specific permission (more granular control)
 */
export function requirePermission(permission: keyof typeof PERMISSIONS) {
  return requireRepoAccess(PERMISSIONS[permission])
}
