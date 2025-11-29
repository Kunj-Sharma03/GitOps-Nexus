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
    <div className="bg-gray-900 text-gray-100 p-4 font-mono text-sm h-full overflow-y-auto custom-scrollbar">
      {logs.length === 0 && <div className="text-gray-500 italic">Waiting for logs...</div>}
      {logs.map((line, i) => (
        <div key={i} className="whitespace-pre-wrap break-all">{line}</div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
