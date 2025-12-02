/**
 * Shared UI Components
 * 
 * Consistent styling across the app for status badges, buttons, cards, etc.
 */

import type { ReactNode } from 'react';

// ============ STATUS BADGE ============

type StatusType = 'success' | 'error' | 'warning' | 'info' | 'pending' | 'running' | 'stopped';

const statusStyles: Record<StatusType, { bg: string; text: string; dot: string; glow?: string }> = {
  success: {
    bg: 'bg-green-500/10 border-green-500/30',
    text: 'text-green-400',
    dot: 'bg-green-400',
    glow: 'shadow-green-400/50',
  },
  error: {
    bg: 'bg-red-500/10 border-red-500/30',
    text: 'text-red-400',
    dot: 'bg-red-400',
    glow: 'shadow-red-400/50',
  },
  warning: {
    bg: 'bg-yellow-500/10 border-yellow-500/30',
    text: 'text-yellow-400',
    dot: 'bg-yellow-400',
    glow: 'shadow-yellow-400/50',
  },
  info: {
    bg: 'bg-blue-500/10 border-blue-500/30',
    text: 'text-blue-400',
    dot: 'bg-blue-400',
    glow: 'shadow-blue-400/50',
  },
  pending: {
    bg: 'bg-orange-500/10 border-orange-500/30',
    text: 'text-orange-400',
    dot: 'bg-orange-400 animate-pulse',
    glow: 'shadow-orange-400/50',
  },
  running: {
    bg: 'bg-cyan-500/10 border-cyan-500/30',
    text: 'text-cyan-400',
    dot: 'bg-cyan-400 animate-pulse',
    glow: 'shadow-cyan-400/50',
  },
  stopped: {
    bg: 'bg-gray-500/10 border-gray-500/30',
    text: 'text-gray-400',
    dot: 'bg-gray-400',
  },
};

// Map common status strings to our types
export function getStatusType(status: string): StatusType {
  const s = status?.toUpperCase() || '';
  if (['SUCCESS', 'COMPLETED', 'ACTIVE', 'HEALTHY'].includes(s)) return 'success';
  if (['FAILED', 'ERROR', 'CRASHED'].includes(s)) return 'error';
  if (['WARNING', 'DEGRADED'].includes(s)) return 'warning';
  if (['PENDING', 'QUEUED', 'STARTING'].includes(s)) return 'pending';
  if (['RUNNING', 'IN_PROGRESS', 'PROCESSING'].includes(s)) return 'running';
  if (['STOPPED', 'TERMINATED', 'CANCELLED'].includes(s)) return 'stopped';
  return 'info';
}

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({ status, size = 'md', showDot = true, className = '' }: StatusBadgeProps) {
  const type = getStatusType(status);
  const styles = statusStyles[type];
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs',
    lg: 'px-4 py-1.5 text-sm',
  };

  const dotSizes = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium uppercase tracking-wider ${styles.bg} ${styles.text} ${sizeClasses[size]} ${className}`}>
      {showDot && (
        <span className={`rounded-full ${styles.dot} ${dotSizes[size]} ${styles.glow ? `shadow-lg ${styles.glow}` : ''}`} />
      )}
      {status}
    </span>
  );
}

// ============ GLASS CARD ============

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function GlassCard({ children, className = '', hover = false, padding = 'md' }: GlassCardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-8',
  };

  return (
    <div className={`
      bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl
      ${hover ? 'hover:bg-black/50 hover:border-white/20 transition-all duration-200 cursor-pointer' : ''}
      ${paddingClasses[padding]}
      ${className}
    `}>
      {children}
    </div>
  );
}

// ============ BUTTON ============

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit';
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  loading = false,
  onClick,
  className = '',
  type = 'button'
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium uppercase tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30 hover:border-green-500/70',
    secondary: 'bg-white/5 border border-white/20 text-white/80 hover:bg-white/10 hover:border-white/30',
    danger: 'bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 hover:border-red-500/70',
    ghost: 'bg-transparent border-none text-white/60 hover:text-white hover:bg-white/5',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-[10px] rounded-md gap-1.5',
    md: 'px-4 py-2 text-xs rounded-lg gap-2',
    lg: 'px-6 py-3 text-sm rounded-lg gap-2',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
}

// ============ SKELETON ============

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export function Skeleton({ className = '', variant = 'rectangular' }: SkeletonProps) {
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div className={`animate-pulse bg-white/10 ${variantClasses[variant]} ${className}`} />
  );
}

// ============ PAGE HEADER ============

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  accent?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, accent, actions }: PageHeaderProps) {
  return (
    <header className="shrink-0 border-b border-white/10 bg-black/40 backdrop-blur-xl px-6 py-5 md:px-8 md:py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-white">
            {title} {accent && <span className="text-green-400">{accent}</span>}
          </h1>
          {subtitle && (
            <p className="text-white/40 text-xs md:text-sm uppercase tracking-[0.2em] mt-1">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

// ============ NAV LINK ============

interface NavLinkProps {
  href: string;
  children: ReactNode;
  active?: boolean;
}

export function NavLink({ href, children, active = false }: NavLinkProps) {
  return (
    <a
      href={href}
      className={`
        px-4 py-2 text-xs uppercase tracking-wider font-medium transition-all duration-200 rounded-lg
        ${active 
          ? 'bg-white/10 text-white border border-white/20' 
          : 'text-white/50 hover:text-white hover:bg-white/5'
        }
      `}
    >
      {children}
    </a>
  );
}

// ============ EMPTY STATE ============

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-white/30">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-bold text-white/60 uppercase tracking-widest mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-white/40 max-w-md mb-6">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

// ============ TOAST / NOTIFICATION ============

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  type: ToastType;
  message: string;
  onClose?: () => void;
}

const toastStyles: Record<ToastType, { bg: string; icon: string }> = {
  success: { bg: 'bg-green-500/20 border-green-500/30', icon: '✓' },
  error: { bg: 'bg-red-500/20 border-red-500/30', icon: '✕' },
  warning: { bg: 'bg-yellow-500/20 border-yellow-500/30', icon: '⚠' },
  info: { bg: 'bg-blue-500/20 border-blue-500/30', icon: 'ℹ' },
};

export function Toast({ type, message, onClose }: ToastProps) {
  const styles = toastStyles[type];
  
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-md ${styles.bg} animate-in slide-in-from-top-2 duration-200`}>
      <span className="text-lg">{styles.icon}</span>
      <span className="text-sm text-white/90 flex-1">{message}</span>
      {onClose && (
        <button onClick={onClose} className="text-white/50 hover:text-white">
          ✕
        </button>
      )}
    </div>
  );
}
