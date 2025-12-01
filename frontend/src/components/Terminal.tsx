import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { io, Socket } from 'socket.io-client';
import '@xterm/xterm/css/xterm.css';

// Custom styles to ensure left alignment and full width
const terminalStyles = `
  .xterm {
    text-align: left !important;
    width: 100% !important;
    height: 100% !important;
  }
  .xterm-viewport {
    width: 100% !important;
  }
  .xterm-screen {
    text-align: left !important;
    width: 100% !important;
  }
`;

interface TerminalProps {
  sessionId: string;
  onClose?: () => void;
}

export function Terminal({ sessionId, onClose }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [status, setStatus] = useState<'connecting' | 'ready' | 'error' | 'disconnected'>('connecting');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm.js
    const xterm = new XTerm({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontSize: 13,
      fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
      fontWeight: '400',
      letterSpacing: 0,
      lineHeight: 1.2,
      theme: {
        background: 'transparent',
        foreground: '#e4e4e7',
        cursor: '#22c55e',
        cursorAccent: 'transparent',
        selectionBackground: '#22c55e40',
        selectionForeground: '#ffffff',
        black: '#18181b',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#fbbf24',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#e4e4e7',
        brightBlack: '#71717a',
        brightRed: '#fca5a5',
        brightGreen: '#86efac',
        brightYellow: '#fde047',
        brightBlue: '#93c5fd',
        brightMagenta: '#d8b4fe',
        brightCyan: '#67e8f9',
        brightWhite: '#fafafa',
      },
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);
    xterm.open(terminalRef.current);
    
    // Fit after a short delay to ensure container is sized
    setTimeout(() => {
      fitAddon.fit();
    }, 100);

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    xterm.writeln('\x1b[1;32m● Connecting to sandbox terminal...\x1b[0m');

    // Connect to WebSocket
    const token = localStorage.getItem('jwt');
    const socket = io('http://localhost:3000/terminal', {
      auth: { token },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Terminal socket connected');
      const dims = fitAddon.proposeDimensions();
      socket.emit('start', { 
        sessionId, 
        cols: dims?.cols || 80, 
        rows: dims?.rows || 24 
      });
    });

    socket.on('ready', () => {
      setStatus('ready');
      xterm.clear();
      xterm.focus();
    });

    socket.on('output', (data: string) => {
      xterm.write(data);
    });

    socket.on('exit', () => {
      setStatus('disconnected');
      xterm.writeln('\r\n\x1b[1;33m● Session ended\x1b[0m');
    });

    socket.on('error', (data: { message: string }) => {
      setStatus('error');
      setErrorMsg(data.message);
      xterm.writeln(`\r\n\x1b[1;31m● Error: ${data.message}\x1b[0m`);
    });

    socket.on('disconnect', () => {
      if (status !== 'error') {
        setStatus('disconnected');
        xterm.writeln('\r\n\x1b[1;33m● Disconnected from server\x1b[0m');
      }
    });

    // Handle input
    xterm.onData((data) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('input', { sessionId, data });
      }
    });

    // Handle resize
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
        const dims = fitAddonRef.current.proposeDimensions();
        if (dims && socketRef.current?.connected) {
          socketRef.current.emit('resize', { 
            sessionId, 
            cols: dims.cols, 
            rows: dims.rows 
          });
        }
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      socket.disconnect();
      xterm.dispose();
    };
  }, [sessionId]);

  return (
    <div className="flex flex-col h-full rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 backdrop-blur-xl bg-gradient-to-br from-black/80 via-black/70 to-black/80">
      {/* Inject custom styles */}
      <style>{terminalStyles}</style>
      
      {/* Glassmorphic Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          {/* Traffic lights */}
          <div className="flex gap-2">
            <button 
              onClick={onClose}
              className="w-3 h-3 rounded-full bg-red-500/90 hover:bg-red-400 transition-colors shadow-lg shadow-red-500/20 hover:shadow-red-500/40"
            />
            <div className="w-3 h-3 rounded-full bg-yellow-500/90 shadow-lg shadow-yellow-500/20" />
            <div className="w-3 h-3 rounded-full bg-green-500/90 shadow-lg shadow-green-500/20" />
          </div>
          {/* Session info */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shadow-lg shadow-green-400/50" />
            <span className="text-[11px] text-white/60 font-mono tracking-wide">
              sandbox@{sessionId.slice(0, 12)}
            </span>
          </div>
        </div>
        
        {/* Status indicator */}
        <div className="flex items-center gap-3">
          {status === 'connecting' && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-[10px] text-yellow-400 uppercase tracking-wider font-medium">Connecting</span>
            </div>
          )}
          {status === 'ready' && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-lg shadow-green-400/50" />
              <span className="text-[10px] text-green-400 uppercase tracking-wider font-medium">Connected</span>
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span className="text-[10px] text-red-400 uppercase tracking-wider font-medium">{errorMsg || 'Error'}</span>
            </div>
          )}
          {status === 'disconnected' && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
              <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
              <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Disconnected</span>
            </div>
          )}
        </div>
      </div>

      {/* Terminal container with subtle gradient overlay */}
      <div className="flex-1 relative overflow-hidden">
        {/* Subtle scan line effect */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] opacity-30 z-10" />
        
        {/* Terminal - full width, left aligned */}
        <div 
          ref={terminalRef} 
          className="absolute inset-0 p-3 [&_.xterm]:w-full [&_.xterm-viewport]:!bg-transparent [&_.xterm-screen]:!bg-transparent"
        />
      </div>
      
      {/* Bottom bar */}
      <div className="px-4 py-2 bg-white/5 border-t border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-white/30 uppercase tracking-wider">Shell: /bin/sh</span>
          <span className="text-[10px] text-white/30">•</span>
          <span className="text-[10px] text-white/30 uppercase tracking-wider">UTF-8</span>
        </div>
        <div className="text-[10px] text-white/30 uppercase tracking-wider">
          Press Ctrl+C to interrupt
        </div>
      </div>
    </div>
  );
}
