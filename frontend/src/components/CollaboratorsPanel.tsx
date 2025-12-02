/**
 * Collaborators Panel
 * 
 * Manage repository collaborators (add, remove, update roles)
 */

import { useState, useEffect } from 'react'
import { Button, GlassCard } from './ui'
import { getCollaborators, addCollaborator, removeCollaborator, updateCollaboratorRole } from '../lib/api'

type RepoRole = 'OWNER' | 'ADMIN' | 'WRITE' | 'VIEWER'

interface Collaborator {
  id: string
  name: string | null
  email: string
  avatar: string | null
  role: RepoRole
  addedAt?: string
}

interface CollaboratorsPanelProps {
  repoId: string
  userRole: RepoRole
  isOpen: boolean
  onClose: () => void
}

const roleColors: Record<RepoRole, { bg: string; text: string; border: string }> = {
  OWNER: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  ADMIN: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  WRITE: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  VIEWER: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
}

const roleDescriptions: Record<RepoRole, string> = {
  OWNER: 'Full control including delete',
  ADMIN: 'Manage collaborators & settings',
  WRITE: 'Edit files, run jobs, sessions',
  VIEWER: 'Read-only access',
}

export function RoleBadge({ role, size = 'md' }: { role: RepoRole; size?: 'sm' | 'md' }) {
  const colors = roleColors[role]
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]'
  
  return (
    <span className={`inline-flex items-center rounded-full border font-bold uppercase tracking-wider ${colors.bg} ${colors.text} ${colors.border} ${sizeClasses}`}>
      {role}
    </span>
  )
}

export default function CollaboratorsPanel({ repoId, userRole, isOpen, onClose }: CollaboratorsPanelProps) {
  const [owner, setOwner] = useState<Collaborator | null>(null)
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Add collaborator form
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState<RepoRole>('VIEWER')
  const [addingUser, setAddingUser] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const canManage = userRole === 'OWNER' || userRole === 'ADMIN'

  useEffect(() => {
    if (!isOpen) return
    loadCollaborators()
  }, [repoId, isOpen])

  const loadCollaborators = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getCollaborators(repoId)
      setOwner(data.owner ? { ...data.owner, role: 'OWNER' as RepoRole } : null)
      setCollaborators(data.collaborators || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load collaborators')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail || !newRole) return
    
    setAddingUser(true)
    setAddError(null)
    try {
      await addCollaborator(repoId, newEmail, newRole)
      setNewEmail('')
      setNewRole('VIEWER')
      setShowAddForm(false)
      loadCollaborators()
    } catch (err: any) {
      setAddError(err.message || 'Failed to add collaborator')
    } finally {
      setAddingUser(false)
    }
  }

  const handleUpdateRole = async (userId: string, newRole: RepoRole) => {
    try {
      await updateCollaboratorRole(repoId, userId, newRole)
      loadCollaborators()
    } catch (err: any) {
      alert('Failed to update role: ' + err.message)
    }
  }

  const handleRemove = async (userId: string, userName: string) => {
    if (!confirm(`Remove ${userName} from this repository?`)) return
    
    try {
      await removeCollaborator(repoId, userId)
      loadCollaborators()
    } catch (err: any) {
      alert('Failed to remove: ' + err.message)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-lg max-h-[80vh] flex flex-col" padding="none">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-bold text-white uppercase tracking-widest">Collaborators</h2>
            <p className="text-[10px] text-white/40 mt-1">Manage who has access to this repository</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl">✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-white/20 border-t-green-400 rounded-full" />
            </div>
          ) : error ? (
            <div className="text-red-400 text-sm text-center py-8">{error}</div>
          ) : (
            <div className="space-y-4">
              {/* Owner */}
              {owner && (
                <div className="mb-6">
                  <div className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Owner</div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                      {owner.avatar ? (
                        <img src={owner.avatar} alt="" className="w-full h-full rounded-full" />
                      ) : (
                        <span className="text-purple-400 font-bold">{(owner.name || owner.email)[0].toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">{owner.name || 'Unknown'}</div>
                      <div className="text-[10px] text-white/40 truncate">{owner.email}</div>
                    </div>
                    <RoleBadge role="OWNER" />
                  </div>
                </div>
              )}

              {/* Collaborators */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] text-white/40 uppercase tracking-widest">
                    Collaborators ({collaborators.length})
                  </div>
                  {canManage && !showAddForm && (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="text-[10px] text-green-400 hover:text-green-300 uppercase tracking-wider font-medium"
                    >
                      + Add
                    </button>
                  )}
                </div>

                {/* Add Form */}
                {showAddForm && (
                  <form onSubmit={handleAddCollaborator} className="mb-4 p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] uppercase text-white/40 mb-1">Email</label>
                        <input
                          type="email"
                          value={newEmail}
                          onChange={e => setNewEmail(e.target.value)}
                          placeholder="user@example.com"
                          className="w-full bg-black/50 border border-white/20 rounded px-3 py-2 text-sm text-white focus:border-green-500/50 outline-none"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase text-white/40 mb-1">Role</label>
                        <select
                          value={newRole}
                          onChange={e => setNewRole(e.target.value as RepoRole)}
                          className="w-full bg-black/50 border border-white/20 rounded px-3 py-2 text-sm text-white focus:border-green-500/50 outline-none"
                        >
                          <option value="VIEWER">Viewer - {roleDescriptions.VIEWER}</option>
                          <option value="WRITE">Write - {roleDescriptions.WRITE}</option>
                          <option value="ADMIN">Admin - {roleDescriptions.ADMIN}</option>
                        </select>
                      </div>
                      {addError && <div className="text-red-400 text-xs">{addError}</div>}
                      <div className="flex gap-2">
                        <Button type="submit" variant="primary" size="sm" loading={addingUser} disabled={!newEmail}>
                          Add
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Collaborator List */}
                {collaborators.length === 0 ? (
                  <div className="text-center py-6 text-white/30 text-sm">
                    No collaborators yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {collaborators.map(collab => (
                      <div key={collab.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors group">
                        <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                          {collab.avatar ? (
                            <img src={collab.avatar} alt="" className="w-full h-full rounded-full" />
                          ) : (
                            <span className="text-white/60 text-sm font-bold">{(collab.name || collab.email)[0].toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white text-sm truncate">{collab.name || 'Unknown'}</div>
                          <div className="text-[10px] text-white/40 truncate">{collab.email}</div>
                        </div>
                        
                        {canManage ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={collab.role}
                              onChange={e => handleUpdateRole(collab.id, e.target.value as RepoRole)}
                              className="bg-black/50 border border-white/20 rounded px-2 py-1 text-[10px] text-white focus:border-green-500/50 outline-none"
                            >
                              <option value="VIEWER">Viewer</option>
                              <option value="WRITE">Write</option>
                              <option value="ADMIN">Admin</option>
                            </select>
                            <button
                              onClick={() => handleRemove(collab.id, collab.name || collab.email)}
                              className="text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <RoleBadge role={collab.role} size="sm" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer with role legend */}
        <div className="border-t border-white/10 p-4 bg-black/20">
          <div className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Role Permissions</div>
          <div className="grid grid-cols-2 gap-2">
            {(['OWNER', 'ADMIN', 'WRITE', 'VIEWER'] as RepoRole[]).map(role => (
              <div key={role} className="flex items-center gap-2 text-[10px] text-white/50">
                <RoleBadge role={role} size="sm" />
                <span className="truncate">{roleDescriptions[role]}</span>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
