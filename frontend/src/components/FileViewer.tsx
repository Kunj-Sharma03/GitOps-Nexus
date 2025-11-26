export default function FileViewer({ content, path, readOnly }: { content?: string, path?: string, readOnly?: boolean }) {
  if (!path) return <div className="p-8 text-dystopia-muted text-center flex flex-col items-center justify-center h-full border border-dashed border-dystopia-border opacity-50">
    <span className="text-4xl mb-2">⚠</span>
    <span>AWAITING INPUT DATA</span>
  </div>
  
  if (content === undefined) return <div className="p-8 text-dystopia-primary animate-pulse text-center">DECRYPTING CONTENT...</div>

  return (
    <div className="h-full flex flex-col bg-dystopia-bg/30">
      <div className="flex-1 overflow-auto p-6 custom-scrollbar">
        <pre className="font-mono text-sm text-dystopia-text/90 whitespace-pre-wrap leading-relaxed selection:bg-dystopia-primary/20">
          {content}
        </pre>
      </div>
      <div className="p-3 border-t border-dystopia-border/50 bg-dystopia-card/30 text-[10px] text-dystopia-muted flex justify-between items-center backdrop-blur-sm">
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-dystopia-primary/50"></span>
          {readOnly ? 'READ-ONLY' : 'EOF'}
        </span>
        <span className="font-mono opacity-70">{content ? content.length : 0} bytes</span>
      </div>
    </div>
  )
}
