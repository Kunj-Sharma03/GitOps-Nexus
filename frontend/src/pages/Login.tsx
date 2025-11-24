import { API_BASE } from '../lib/api'

export default function Login() {
  const handleLogin = () => {
    window.location.href = `${API_BASE}/auth/github`
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dystopia-bg text-dystopia-text font-mono relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-dystopia-primary/5 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-dystopia-secondary/5 rounded-full blur-[100px]"></div>
      </div>

      <div className="max-w-md w-full bg-dystopia-card/50 backdrop-blur-xl border border-dystopia-border p-8 rounded-2xl shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-dystopia-primary to-dystopia-accent tracking-tighter mb-2">
            GitOps_Nexus
          </h1>
          <p className="text-dystopia-muted text-sm uppercase tracking-widest">Secure Access Terminal</p>
        </div>

        <div className="space-y-6">
          <div className="p-4 bg-dystopia-bg/50 border border-dystopia-border/50 rounded-lg text-xs text-dystopia-muted font-mono">
            <p className="mb-2">SYSTEM_MESSAGE:</p>
            <p className="text-dystopia-text/80">&gt; Authentication required for access.</p>
            <p className="text-dystopia-text/80">&gt; Please verify identity via GitHub OAuth.</p>
          </div>

          <button
            onClick={handleLogin}
            className="w-full py-3 px-4 bg-dystopia-primary/10 hover:bg-dystopia-primary/20 border border-dystopia-primary/50 hover:border-dystopia-primary text-dystopia-primary font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-3 group"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <span>Authenticate with GitHub</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">_</span>
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-dystopia-muted uppercase tracking-widest opacity-50">
            Secure Connection • End-to-End Encrypted
          </p>
        </div>
      </div>
    </div>
  )
}
