import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface JobLogsProps {
  jobId: string;
  initialLogs?: string[];
}

export function JobLogs({ jobId, initialLogs = [] }: JobLogsProps) {
  const [logs, setLogs] = useState<string[]>(initialLogs);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Connect to API
    const socket = io('http://localhost:3000');
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to log stream');
      socket.emit('join-job', jobId);
    });

    socket.on('log', (line: string) => {
      setLogs(prev => [...prev, line]);
    });

    return () => {
      socket.emit('leave-job', jobId);
      socket.disconnect();
    };
  }, [jobId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="bg-transparent text-dystopia-text p-4 font-mono text-xs h-full overflow-y-auto custom-scrollbar">
      {logs.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-dystopia-muted/40">
          <div className="animate-pulse">Waiting for logs...</div>
        </div>
      )}
      <div className="space-y-0.5">
        {logs.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap break-all hover:bg-white/5 px-1 rounded transition-colors flex gap-3">
            <span className="text-dystopia-muted/30 select-none w-6 text-right shrink-0">{i + 1}</span>
            <span className={line.includes('Error') || line.includes('FAIL') ? 'text-red-400' : line.includes('SUCCESS') ? 'text-green-400' : 'text-dystopia-text/90'}>
              {line}
            </span>
          </div>
        ))}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
