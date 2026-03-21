/**
 * OGMA EditorFrame
 * Segue o padrão do StudyFlow: dynamic import do Editor.js direto no renderer,
 * montado em uma div via ref. Sem iframe, sem bundle separado, sem build step.
 */
import React, { useRef, useEffect, useCallback, useState } from 'react'
import { createLogger } from '../../utils/logger'
import './EditorFrame.css'

const log = createLogger('EditorFrame')

interface Props {
  content:   string | null
  dark:      boolean
  readOnly?: boolean
  onSave:    (content: string) => void
  onReady?:  () => void
}

export const EditorFrame: React.FC<Props> = ({
  content, dark, readOnly = false, onSave, onReady,
}) => {
  const holderRef     = useRef<HTMLDivElement>(null)
  const editorRef     = useRef<any>(null)
  const saveTimerRef  = useRef<any>(null)
  const [loading, setLoading] = useState(true)
  const onSaveRef  = useRef(onSave)
  const onReadyRef = useRef(onReady)

  // Manter refs atualizados sem recriar o editor
  useEffect(() => { onSaveRef.current  = onSave  }, [onSave])
  useEffect(() => { onReadyRef.current = onReady }, [onReady])

  // Aplicar tema dark/light ao holder
  useEffect(() => {
    if (holderRef.current) {
      holderRef.current.classList.toggle('editor-dark', dark)
    }
  }, [dark])

  // Inicializar editor
  useEffect(() => {
    if (!holderRef.current) return

    let destroyed = false

    const init = async () => {
      // Destruir instância anterior se existir
      if (editorRef.current?.destroy) {
        await editorRef.current.destroy()
        editorRef.current = null
      }

      // Dynamic imports — exatamente como o StudyFlow faz
      const [
        { default: EditorJS },
        { default: Header },
        { default: List },
        { default: Checklist },
        { default: Quote },
        { default: Code },
        { default: Table },
        { default: InlineCode },
        { default: Delimiter },
        { default: Marker },
      ] = await Promise.all([
        import('@editorjs/editorjs'),
        import('@editorjs/header'),
        import('@editorjs/list'),
        import('@editorjs/checklist'),
        import('@editorjs/quote'),
        import('@editorjs/code'),
        import('@editorjs/table'),
        import('@editorjs/inline-code'),
        import('@editorjs/delimiter'),
        import('@editorjs/marker'),
      ])

      // Toggle — opcional, não quebra se não existir
      let ToggleBlock: any = null
      try {
        const mod = await import('editorjs-toggle-block')
        ToggleBlock = mod.default
      } catch {}

      if (destroyed) return

      // Parsear conteúdo
      let data: any = {}
      if (content) {
        try { data = JSON.parse(content) } catch {}
      }

      const tools: any = {
        header:     { class: Header,     config: { levels: [1, 2, 3], defaultLevel: 2 } },
        list:       { class: List,       inlineToolbar: true },
        checklist:  { class: Checklist,  inlineToolbar: true },
        quote:      { class: Quote,      inlineToolbar: true, config: { quotePlaceholder: 'Escreva uma citação...', captionPlaceholder: 'Autor' } },
        code:       { class: Code },
        table:      { class: Table,      inlineToolbar: true, config: { rows: 2, cols: 3, withHeadings: true } },
        inlineCode: { class: InlineCode },
        delimiter:  { class: Delimiter },
        marker:     { class: Marker },
      }

      if (ToggleBlock) {
        tools.toggle = { class: ToggleBlock }
      }

      editorRef.current = new EditorJS({
        holder:        holderRef.current!,
        data,
        placeholder:   'Escreva algo ou pressione "/" para inserir um bloco...',
        readOnly,
        tools,
        inlineToolbar: ['bold', 'italic', 'marker', 'inlineCode', 'link'],

        onChange: async () => {
          clearTimeout(saveTimerRef.current)
          saveTimerRef.current = setTimeout(async () => {
            if (!editorRef.current) return
            try {
              const output = await editorRef.current.save()
              onSaveRef.current(JSON.stringify(output))
            } catch (e: any) {
              log.error('save failed', { error: e.message })
            }
          }, 1500)
        },

        onReady: () => {
          setLoading(false)
          onReadyRef.current?.()
          log.debug('editor pronto')
        },
      })
    }

    init().catch(e => {
      log.error('init failed', { error: e.message })
      setLoading(false)
    })

    return () => {
      destroyed = true
      clearTimeout(saveTimerRef.current)
      if (editorRef.current?.destroy) {
        editorRef.current.destroy()
        editorRef.current = null
      }
    }
  // Só reinicia quando muda a página (content muda de forma estrutural)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // Monta uma vez — troca de conteúdo é feita abaixo via render()

  // Carregar novo conteúdo ao trocar de página sem recriar o editor
  const prevContentRef = useRef(content)
  useEffect(() => {
    if (prevContentRef.current === content) return
    prevContentRef.current = content

    if (!editorRef.current) return
    setLoading(true)
    let data: any = {}
    if (content) { try { data = JSON.parse(content) } catch {} }
    editorRef.current.render(data).then(() => setLoading(false)).catch(() => setLoading(false))
  }, [content])

  return (
    <div className="editor-frame-wrapper">
      {loading && (
        <div className="editor-loading">
          <span className="editor-loading-text">Carregando editor...</span>
        </div>
      )}
      <div
        ref={holderRef}
        className={`editor-holder${dark ? ' editor-dark' : ''}${loading ? ' editor-holder--hidden' : ''}`}
      />
    </div>
  )
}
