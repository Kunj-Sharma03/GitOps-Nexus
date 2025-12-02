import { useState, useEffect, useRef, type ReactNode } from 'react'
import LiquidEther from '../Background/LiquidEther'
import { API_BASE } from '../lib/api'

// --- Scroll Reveal Component ---
function Reveal({ children, className = "", delay = 0 }: { children: ReactNode, className?: string, delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
      }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      if (ref.current) observer.unobserve(ref.current)
    }
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out transform ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

export default function Landing() {
  const handleLogin = () => {
    window.location.href = `${API_BASE}/auth/github`
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden selection:bg-green-400/30">
      {/* LiquidEther Background - Made more subtle */}
      <div className="fixed inset-0 z-0 opacity-60">
        <LiquidEther
          colors={['#5227FF', '#FF9FFC', '#B19EEF']}
          mouseForce={20}
          cursorSize={100}
          isViscous={false}
          viscous={30}
          iterationsViscous={32}
          iterationsPoisson={32}
          resolution={0.5}
          isBounce={false}
          autoDemo={true}
          autoSpeed={0.5}
          autoIntensity={2.2}
          takeoverDuration={0.25}
          autoResumeDelay={3000}
          autoRampDuration={0.6}
        />
      </div>

      {/* Minimalist Overlay */}
      <div className="fixed inset-0 z-[1] bg-black/40 backdrop-blur-[1px] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10">
        {/* Navigation - Floating & Minimal */}
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pt-6 px-6 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-8 bg-black/20 backdrop-blur-md border border-white/5 rounded-full px-6 py-3 transition-all duration-300 hover:bg-black/40 hover:border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-green-400 to-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(0,255,136,0.3)]">
                <svg className="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-sm font-medium tracking-wide text-white/90">GitOps Nexus</span>
            </div>
            <div className="hidden md:flex items-center gap-6 text-xs font-medium text-white/50 uppercase tracking-wider">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
              <a href="https://github.com/Kunj-Sharma03/GitOps-Nexus" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center min-h-screen px-6 text-center pt-20">
          <Reveal>
            <div className="mb-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/5 bg-white/5 backdrop-blur-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400"></span>
              </span>
              <span className="text-xs font-medium text-white/60 tracking-wide uppercase">v1.0 Public Beta</span>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-thin tracking-tighter mb-8 text-white mix-blend-difference">
              DevOps
              <span className="block font-normal italic text-transparent bg-clip-text bg-gradient-to-r from-green-300 via-cyan-300 to-purple-300 pb-4">
                Fluidity
              </span>
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p className="text-lg md:text-xl text-white/40 max-w-xl mx-auto mb-12 font-light leading-relaxed">
              The unified interface for your entire development lifecycle.
              <br className="hidden md:block" />
              Code, test, and deploy without leaving your browser.
            </p>
          </Reveal>

          <Reveal delay={300}>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <button
                onClick={handleLogin}
                className="group relative px-8 py-3 bg-white text-black text-sm font-medium rounded-full transition-all duration-500 hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] flex items-center gap-2 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  Connect GitHub
                </span>
              </button>
              <a
                href="#features"
                className="text-sm text-white/40 hover:text-white transition-colors flex items-center gap-2 group"
              >
                Explore Features
                <svg className="w-3 h-3 transition-transform group-hover:translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </a>
            </div>
          </Reveal>
        </section>

        {/* Minimalist Features Grid */}
        <section id="features" className="py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <Reveal className="mb-24">
              <h2 className="text-3xl font-light text-white/80 mb-4">Essential Tools</h2>
              <div className="h-px w-24 bg-gradient-to-r from-green-400 to-transparent" />
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/10 border border-white/10 rounded-3xl overflow-hidden">
              <FeatureTile
                icon="📁"
                title="Repository Browser"
                description="Navigate your GitHub repositories with an intuitive file tree. Switch branches, search files, and explore code structure."
                delay={0}
              />
              <FeatureTile
                icon="✨"
                title="Monaco Editor"
                description="Edit code with VS Code's powerful Monaco editor. Full syntax highlighting, IntelliSense hints, and diff view."
                delay={100}
              />
              <FeatureTile
                icon="⚡"
                title="CI Job Runner"
                description="Run CI pipelines in isolated Docker containers. Execute tests, builds, and scripts with real-time log streaming."
                delay={200}
              />
              <FeatureTile
                icon="🖥️"
                title="Web Terminal"
                description="Full interactive terminal in your browser using xterm.js. SSH into sandboxes, run commands, and manage environment."
                delay={300}
              />
              <FeatureTile
                icon="📦"
                title="Ephemeral Sandboxes"
                description="Spin up isolated development environments on demand. Pre-configured with git, node, vim & more."
                delay={400}
              />
              <FeatureTile
                icon="👥"
                title="Team Collaboration"
                description="Invite collaborators with role-based access control. Owner, Admin, Write, and Viewer roles."
                delay={500}
              />
            </div>
          </div>
        </section>

        {/* Workflow Section - Clean Steps */}
        <section id="workflow" className="py-32 px-6 bg-white/[0.02]">
          <div className="max-w-5xl mx-auto">
            <Reveal className="mb-24 text-center">
              <h2 className="text-3xl font-light text-white/80">Seamless Workflow</h2>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
              {/* Connecting Line */}
              <div className="hidden md:block absolute top-12 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              
              <WorkflowStep
                number="01"
                title="Connect"
                description="Link your GitHub account securely via OAuth."
                delay={0}
              />
              <WorkflowStep
                number="02"
                title="Develop"
                description="Edit code and run tests in cloud sandboxes."
                delay={200}
              />
              <WorkflowStep
                number="03"
                title="Deploy"
                description="Push changes and trigger CI/CD pipelines."
                delay={400}
              />
            </div>
          </div>
        </section>

        {/* Tech Stack - Minimal Badges */}
        <section className="py-32 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <Reveal>
              <p className="text-xs font-medium text-white/20 uppercase tracking-[0.2em] mb-12">Powered By</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {['React', 'TypeScript', 'Node.js', 'Prisma', 'PostgreSQL', 'Redis', 'Docker', 'Socket.IO'].map((tech, i) => (
                  <span 
                    key={tech} 
                    className="px-4 py-2 bg-white/[0.03] border border-white/[0.05] rounded-full text-sm text-white/40 hover:text-white/80 hover:bg-white/[0.08] transition-all duration-300 cursor-default"
                    style={{ transitionDelay: `${i * 50}ms` }}
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-6 border-t border-white/5">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3 text-white/30 text-sm">
              <div className="w-4 h-4 rounded-sm bg-white/10" />
              <span className="font-medium tracking-wide">GitOps Nexus</span>
            </div>
            <div className="flex items-center gap-8 text-xs text-white/30 uppercase tracking-wider">
              <a href="https://github.com/Kunj-Sharma03/GitOps-Nexus" className="hover:text-white transition-colors">GitHub</a>
              <a href="#" className="hover:text-white transition-colors">License</a>
              <a href="#" className="hover:text-white transition-colors">Docs</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

// Minimal Feature Tile
function FeatureTile({ icon, title, description, delay }: { icon: string, title: string, description: string, delay: number }) {
  return (
    <Reveal delay={delay} className="h-full">
      <div className="group relative h-full p-8 bg-black hover:bg-white/[0.02] transition-colors duration-500">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400/0 via-green-400/0 to-green-400/0 group-hover:via-green-400/50 transition-all duration-700" />
        <div className="text-3xl mb-6 opacity-50 group-hover:opacity-100 transition-opacity duration-500 grayscale group-hover:grayscale-0">{icon}</div>
        <h3 className="text-lg font-medium text-white/90 mb-3 group-hover:text-green-400 transition-colors duration-300">{title}</h3>
        <p className="text-sm text-white/40 leading-relaxed group-hover:text-white/60 transition-colors duration-300">{description}</p>
      </div>
    </Reveal>
  )
}

// Minimal Workflow Step
function WorkflowStep({ number, title, description, delay }: { number: string, title: string, description: string, delay: number }) {
  return (
    <Reveal delay={delay} className="relative flex flex-col items-center text-center">
      <div className="w-24 h-24 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mb-6 relative z-10 group hover:border-green-400/30 transition-colors duration-500">
        <span className="text-2xl font-light text-white/30 group-hover:text-green-400 transition-colors duration-500">{number}</span>
      </div>
      <h3 className="text-lg font-medium text-white/90 mb-2">{title}</h3>
      <p className="text-sm text-white/40 max-w-xs">{description}</p>
    </Reveal>
  )
}
