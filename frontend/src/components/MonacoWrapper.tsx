import { useRef } from 'react'
import Editor from '@monaco-editor/react'
import type { OnMount } from '@monaco-editor/react'

export default function MonacoWrapper({
  value,
  language = 'markdown',
  onChange,
  readOnly = false,
  height = '60vh',
  onEditorMount
}: {
  value: string
  language?: string
  onChange?: (v: string) => void
  readOnly?: boolean
  height?: string
  onEditorMount?: (editor: any) => void
}) {
  const editorRef = useRef<any>(null)

  const handleBeforeMount = (monaco: any) => {
    monaco.editor.defineTheme('dystopia', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '666666', fontStyle: 'italic' },
        { token: 'keyword', foreground: '00ff41', fontStyle: 'bold' }, // Matrix Green
        { token: 'string', foreground: '00f3ff' }, // Cyan
        { token: 'number', foreground: 'ff003c' }, // Red
        { token: 'type', foreground: '00ff41' },
        { token: 'delimiter', foreground: '888888' },
      ],
      colors: {
        'editor.background': '#00000000', // Transparent background
        'editor.foreground': '#e0e0e0', // dystopia-text
        'editor.lineHighlightBackground': '#ffffff08',
        'editorCursor.foreground': '#00ff41',
        'editor.selectionBackground': '#00ff4133',
        'editorLineNumber.foreground': '#333333',
        'editorLineNumber.activeForeground': '#00ff41',
        'editorIndentGuide.background': '#1a1a1a',
        'editorIndentGuide.activeBackground': '#333333',
      }
    })
  }

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor
    if (onEditorMount) onEditorMount(editor)
  }

  return (
    <div className="w-full h-full">
      <Editor
        height={height}
        defaultLanguage={language}
        value={value}
        theme="dystopia"
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        onChange={(v) => onChange && onChange(v || '')}
        options={{ 
          readOnly, 
          minimap: { enabled: false }, 
          fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", "Roboto Mono", "Courier New", monospace',
          fontSize: 13,
          fontLigatures: true,
          lineHeight: 22,
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          padding: { top: 16, bottom: 16 },
          renderLineHighlight: 'line',
          roundedSelection: false,
        }}
      />
    </div>
  )
}
