export default function FileTree({ tree, onOpen }: { tree: any[], onOpen: (path: string) => void }) {
  if (!tree || tree.length === 0) return <div className="p-4 text-dystopia-muted italic">EMPTY_SECTOR</div>

  return (
    <ul className="text-sm space-y-1 font-mono">
      {tree.map(item => (
        <li key={item.path}>
          <button 
            className="w-full text-left px-3 py-1.5 rounded-md hover:bg-dystopia-primary/10 hover:text-dystopia-primary transition-all duration-200 flex items-center gap-2 group" 
            onClick={() => onOpen(item.path)}
          >
            <span className={`text-[10px] ${item.type === 'tree' ? 'text-dystopia-accent' : 'text-dystopia-muted'} opacity-70 group-hover:opacity-100 transition-opacity`}>
              {item.type === 'tree' ? 'DIR' : 'DOC'}
            </span>
            <span className="text-dystopia-text/80 group-hover:text-dystopia-text truncate transition-colors">{item.path}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
