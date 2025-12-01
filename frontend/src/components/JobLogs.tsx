import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import api from '../lib/api';

interface JobLogsProps {
  jobId: string;
  initialLogs?: string[];
  onStatusChange?: (status: string) => void;
}

export function JobLogs({ jobId, initialLogs = [], onStatusChange }: JobLogsProps) {
  const [logs, setLogs] = useState<string[]>(initialLogs);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Clear logs and fetch existing logs when jobId changes
  useEffect(() => {
    // Reset logs when job changes
    setLogs([]);
    setLoading(true);
    
    // Fetch existing logs first
    const fetchExistingLogs = async () => {
      try {
        const data = await api(`/jobs/${jobId}/logs`);
        if (data.logs && data.logs.length > 0) {
          setLogs(data.logs);
        }
      } catch (err) {
        console.error('Failed to fetch existing logs:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchExistingLogs();
    
    // Connect to API for real-time logs
    const socket = io('http://localhost:3000');
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to log stream for job:', jobId);
      socket.emit('join-job', jobId);
    });

    socket.on('log', (line: string) => {
      setLogs(prev => [...prev, line]);
      
      // Check if job finished
      if (line.includes('Job finished with exit code')) {
        const exitCode = line.match(/exit code (\d+)/)?.[1];
        if (onStatusChange) {
          onStatusChange(exitCode === '0' ? 'SUCCESS' : 'FAILED');
        }
      }
    });

    return () => {
      socket.emit('leave-job', jobId);
      socket.disconnect();
    };
  }, [jobId, onStatusChange]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="bg-transparent text-dystopia-text p-4 font-mono text-xs h-full overflow-y-auto custom-scrollbar">
      {loading && logs.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-dystopia-muted/40">
          <div className="animate-pulse">Loading logs...</div>
        </div>
      )}
      {!loading && logs.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-dystopia-muted/40">
          <div>No logs available for this job</div>
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
