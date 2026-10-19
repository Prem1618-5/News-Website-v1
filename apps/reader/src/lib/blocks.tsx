import type { CSSProperties, ReactNode } from 'react'
import type { Block, InlineLink, InlineText } from './types'

type Inline = InlineText | InlineLink

const inlineOf = (b: Block): Inline[] => (Array.isArray(b.content) ? (b.content as Inline[]) : [])

type TableContent = { type: 'tableContent'; rows: { cells: Inline[][] }[] }
const tableOf = (b: Block): TableContent | null =>
  b.type === 'table' && b.content && !Array.isArray(b.content) && Array.isArray((b.content as TableContent).rows) ? (b.content as TableContent) : null

const inlineText = (items: Inline[]) => items.map((c) => (c.type === 'link' ? c.content.map((t) => t.text).join('') : c.text)).join('')

/** Plain text of a block tree (for descriptions, structured data and Markdown copies). */
export function blocksText(blocks: Block[]): string {
  return blocks
    .map((b) => {
      const table = tableOf(b)
      if (table) return table.rows.map((r) => r.cells.map(inlineText).join(' | ')).join('\n')
      const own = inlineText(inlineOf(b)) || (['image', 'video', 'audio'].includes(b.type) ? String(b.props?.caption ?? '') : '')
      return [own, blocksText(b.children ?? [])].filter(Boolean).join(' ')
    })
    .filter(Boolean)
    .join('\n\n')
}

const safeHref = (href: string) => (/^(https?:\/\/|\/|mailto:)/i.test(href) && !href.startsWith('//') ? href : '#')
const safeMedia = (url: unknown) => (typeof url === 'string' && /^\/(images|media)\/[\w./-]+$/.test(url) && !url.includes('..') ? url : '')

// Newsroom colour and highlight tokens, mapped to calm tones that work on light and dark backgrounds.
const TEXT_COLOR: Record<string, string> = { red: '#C2410C', orange: '#B45309', green: '#15803D', blue: '#2563EB', purple: '#7C3AED', gray: 'var(--mf)' }
const HIGHLIGHT: Record<string, string> = { yellow: 'rgba(250,204,21,.28)', green: 'rgba(34,197,94,.2)', blue: 'rgba(59,130,246,.2)', pink: 'rgba(236,72,153,.18)' }

function renderText(t: InlineText, key: number): ReactNode {
  const s = t.styles ?? {}
  // Line breaks inside a paragraph (Shift+Enter in the newsroom) stay line breaks.
  const parts = t.text.split('\n')
  let node: ReactNode = parts.length > 1 ? parts.flatMap((p, i) => (i ? [<br key={`br${i}`} />, p] : [p])) : t.text
  if (s.bold) node = <strong>{node}</strong>
  if (s.italic) node = <em>{node}</em>
  if (s.underline) node = <u>{node}</u>
  if (s.strike) node = <s>{node}</s>
  if (s.code) node = <code>{node}</code>
  if (s.sup) node = <sup>{node}</sup>
  if (s.sub) node = <sub>{node}</sub>
  const color = typeof s.textColor === 'string' ? TEXT_COLOR[s.textColor] : undefined
  const mark = typeof s.highlight === 'string' ? HIGHLIGHT[s.highlight] : undefined
  if (mark) node = <mark style={{ background: mark, color: 'inherit', borderRadius: '3px', padding: '0 1px' }}>{node}</mark>
  return <span key={key} style={color ? { color } : undefined}>{node}</span>
}

function renderInline(b: Block): ReactNode {
  return renderItems(inlineOf(b))
}

function renderItems(items: Inline[]): ReactNode {
  return items.map((c, i) =>
    c.type === 'link' ? (
      <a key={i} href={safeHref(c.href)} rel="noopener noreferrer" style={{ color: 'var(--pt)', textDecoration: 'underline' }}>
        {c.content.map(renderText)}
      </a>
    ) : (
      renderText(c, i)
    ),
  )
}

export type BodyStyle = { paragraph: CSSProperties; heading: CSSProperties; listGap: string; subheading?: CSSProperties }

/** Article typography from the design: Lora 19px/1.75 on desktop, 18px/1.7 on phones. */
export const BODY_DESKTOP: BodyStyle = {
  paragraph: { font: '400 19px/1.75 Lora,Georgia,serif', margin: '0 0 22px', maxWidth: '66ch' },
  heading: { font: '600 26px/1.3 Lora,Georgia,serif', margin: '32px 0 14px', maxWidth: '66ch' },
  subheading: { font: '600 21px/1.35 Lora,Georgia,serif', margin: '28px 0 12px', maxWidth: '66ch' },
  listGap: '10px',
}
export const BODY_MOBILE: BodyStyle = {
  paragraph: { font: '400 18px/1.7 Lora,Georgia,serif', margin: '0 0 20px' },
  heading: { font: '600 23px/1.3 Lora,Georgia,serif', margin: '28px 0 12px' },
  subheading: { font: '600 19px/1.35 Lora,Georgia,serif', margin: '24px 0 10px' },
  listGap: '8px',
}

/** Renders story blocks (BlockNote-style). Only allow-listed types render; media URLs must be https or site-relative. */
export function BlocksView({ blocks, style, lang }: { blocks: Block[]; style: BodyStyle; lang?: 'en' | 'hi' }) {
  const out: ReactNode[] = []
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    const key = b.id ?? i
    if (b.type === 'bulletListItem' || b.type === 'numberedListItem') {
      const kind = b.type
      const items: Block[] = []
      while (i < blocks.length && blocks[i].type === kind) items.push(blocks[i++])
      i--
      out.push(<ListView key={key} kind={kind} items={items} style={style} lang={lang} />)
      continue
    }
    const align = typeof b.props?.textAlignment === 'string' && ['center', 'right', 'justify'].includes(b.props.textAlignment) ? (b.props.textAlignment as CSSProperties['textAlign']) : undefined
    const caption = (props: Block['props']) =>
      props?.caption || props?.credit ? (
        <figcaption className="mf sm" style={{ marginTop: '8px' }}>
          {String(props?.caption ?? '')} {props?.credit ? <span style={{ opacity: 0.8 }}>{String(props.credit)}</span> : null}
        </figcaption>
      ) : null
    switch (b.type) {
      case 'paragraph':
        if (inlineOf(b).length) out.push(<p key={key} className="ser" lang={lang} style={{ ...style.paragraph, textAlign: align }}>{renderInline(b)}</p>)
        break
      case 'heading': {
        const level = Math.min(4, Math.max(2, Number(b.props?.level ?? 2)))
        const H = `h${level}` as 'h2' | 'h3' | 'h4'
        out.push(<H key={key} className="ser" lang={lang} style={{ ...(level > 2 && style.subheading ? style.subheading : style.heading), textAlign: align }}>{renderInline(b)}</H>)
        break
      }
      case 'quote':
        out.push(
          <blockquote key={key} className="ser" lang={lang} style={{ ...style.paragraph, borderLeft: '3px solid var(--pr)', paddingLeft: '18px', color: 'var(--mf)' }}>
            {renderInline(b)}
          </blockquote>,
        )
        break
      case 'pullquote':
        out.push(
          <figure key={key} style={{ ...style.paragraph, margin: '28px 0', textAlign: 'center' }}>
            <blockquote className="ser" lang={lang} style={{ margin: 0, fontSize: '1.3em', fontStyle: 'italic', lineHeight: 1.45 }}>
              <span aria-hidden="true" style={{ display: 'block', color: 'var(--pr)', fontSize: '2em', lineHeight: 0.6 }}>“</span>
              {renderInline(b)}
            </blockquote>
            {b.props?.cite ? <figcaption className="mf sm" style={{ marginTop: '8px' }}>{String(b.props.cite)}</figcaption> : null}
          </figure>,
        )
        break
      case 'divider':
        out.push(<hr key={key} style={{ border: 0, borderTop: '1px solid var(--bd)', margin: '28px 0' }} />)
        break
      case 'image': {
        const url = safeMedia(b.props?.url)
        if (url)
          out.push(
            <figure key={key} style={{ margin: '0 0 22px' }}>
              <img src={url} alt={String(b.props?.name ?? b.props?.caption ?? '')} loading="lazy" style={{ width: '100%', borderRadius: '10px' }} />
              {caption(b.props)}
            </figure>,
          )
        break
      }
      case 'video': {
        const url = safeMedia(b.props?.url)
        if (url)
          out.push(
            <figure key={key} style={{ margin: '0 0 22px' }}>
              <video src={url} poster={safeMedia(b.props?.posterUrl) || undefined} controls preload="metadata" playsInline style={{ width: '100%', borderRadius: '10px', background: '#000' }} />
              {caption(b.props)}
            </figure>,
          )
        break
      }
      case 'audio': {
        const url = safeMedia(b.props?.url)
        if (url)
          out.push(
            <figure key={key} style={{ margin: '0 0 22px' }}>
              <audio src={url} controls preload="metadata" style={{ width: '100%' }} />
              {caption(b.props)}
            </figure>,
          )
        break
      }
      case 'table': {
        const table = tableOf(b)
        if (!table?.rows.length) break
        const [head, ...rest] = b.props?.header ? table.rows : [null, ...table.rows]
        out.push(
          <div key={key} style={{ overflowX: 'auto', margin: '0 0 22px' }}>
            <table lang={lang} style={{ width: '100%', borderCollapse: 'collapse', font: '400 15px/1.45 Inter' }}>
              {head ? (
                <thead>
                  <tr>{head.cells.map((c, n) => <th key={n} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid var(--bd)' }}>{renderItems(c)}</th>)}</tr>
                </thead>
              ) : null}
              <tbody>
                {rest.map((r, n) => r && (
                  <tr key={n}>{r.cells.map((c, m) => <td key={m} style={{ padding: '8px 10px', borderBottom: '1px solid var(--bd)', verticalAlign: 'top' }}>{renderItems(c)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>,
        )
        break
      }
      case 'factbox':
        out.push(
          <aside key={key} style={{ margin: '0 0 22px', padding: '16px 20px', borderRadius: '12px', background: 'var(--soft)' }}>
            {b.props?.title ? <b style={{ display: 'block', font: '700 13px Inter', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: '8px' }}>{String(b.props.title)}</b> : null}
            <BlocksView blocks={b.children ?? []} style={{ ...style, paragraph: { ...style.paragraph, margin: '0 0 10px', fontSize: '0.92em' } }} lang={lang} />
          </aside>,
        )
        break
      default:
        break
    }
  }
  return <>{out}</>
}

function ListView({ kind, items, style, lang }: { kind: 'bulletListItem' | 'numberedListItem'; items: Block[]; style: BodyStyle; lang?: 'en' | 'hi' }) {
  const Tag = kind === 'bulletListItem' ? 'ul' : 'ol'
  return (
    <Tag className="ser" lang={lang} style={{ ...style.paragraph, paddingLeft: '1.3em', display: 'grid', gap: style.listGap }}>
      {items.map((it, n) => (
        <li key={it.id ?? n}>
          {renderInline(it)}
          {it.children?.length ? <BlocksView blocks={it.children} style={{ ...style, paragraph: { ...style.paragraph, margin: '6px 0 0' } }} lang={lang} /> : null}
        </li>
      ))}
    </Tag>
  )
}
