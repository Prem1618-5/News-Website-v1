import type { CSSProperties, ReactNode } from 'react'
import type { Block, InlineLink, InlineText } from './types'

type Inline = InlineText | InlineLink

const inlineOf = (b: Block): Inline[] => (Array.isArray(b.content) ? (b.content as Inline[]) : [])

/** Plain text of a block tree (for descriptions, structured data and Markdown copies). */
export function blocksText(blocks: Block[]): string {
  return blocks
    .map((b) => {
      const own = inlineOf(b)
        .map((c) => (c.type === 'link' ? c.content.map((t) => t.text).join('') : c.text))
        .join('')
      return [own, blocksText(b.children ?? [])].filter(Boolean).join(' ')
    })
    .filter(Boolean)
    .join('\n\n')
}

const safeHref = (href: string) => (/^(https?:\/\/|\/|mailto:)/i.test(href) ? href : '#')

function renderText(t: InlineText, key: number): ReactNode {
  let node: ReactNode = t.text
  const s = t.styles ?? {}
  if (s.bold) node = <strong>{node}</strong>
  if (s.italic) node = <em>{node}</em>
  if (s.underline) node = <u>{node}</u>
  if (s.code) node = <code>{node}</code>
  return <span key={key}>{node}</span>
}

function renderInline(b: Block): ReactNode {
  return inlineOf(b).map((c, i) =>
    c.type === 'link' ? (
      <a key={i} href={safeHref(c.href)} rel="noopener noreferrer" style={{ color: 'var(--pt)', textDecoration: 'underline' }}>
        {c.content.map(renderText)}
      </a>
    ) : (
      renderText(c, i)
    ),
  )
}

export type BodyStyle = { paragraph: CSSProperties; heading: CSSProperties; listGap: string }

/** Article typography from the design: Lora 19px/1.75 on desktop, 18px/1.7 on phones. */
export const BODY_DESKTOP: BodyStyle = {
  paragraph: { font: '400 19px/1.75 Lora,Georgia,serif', margin: '0 0 22px', maxWidth: '66ch' },
  heading: { font: '600 26px/1.3 Lora,Georgia,serif', margin: '32px 0 14px', maxWidth: '66ch' },
  listGap: '10px',
}
export const BODY_MOBILE: BodyStyle = {
  paragraph: { font: '400 18px/1.7 Lora,Georgia,serif', margin: '0 0 20px' },
  heading: { font: '600 23px/1.3 Lora,Georgia,serif', margin: '28px 0 12px' },
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
      const Tag = kind === 'bulletListItem' ? 'ul' : 'ol'
      out.push(
        <Tag key={key} className="ser" style={{ ...style.paragraph, paddingLeft: '1.3em', display: 'grid', gap: style.listGap }}>
          {items.map((it, n) => (
            <li key={it.id ?? n}>{renderInline(it)}</li>
          ))}
        </Tag>,
      )
      continue
    }
    switch (b.type) {
      case 'paragraph':
        if (inlineOf(b).length) out.push(<p key={key} className="ser" lang={lang} style={style.paragraph}>{renderInline(b)}</p>)
        break
      case 'heading': {
        const level = Math.min(4, Math.max(2, Number(b.props?.level ?? 2)))
        const H = `h${level}` as 'h2' | 'h3' | 'h4'
        out.push(<H key={key} className="ser" lang={lang} style={style.heading}>{renderInline(b)}</H>)
        break
      }
      case 'quote':
      case 'pullquote':
        out.push(
          <blockquote key={key} className="ser" lang={lang} style={{ ...style.paragraph, borderLeft: '3px solid var(--pr)', paddingLeft: '18px', color: 'var(--mf)' }}>
            {renderInline(b)}
          </blockquote>,
        )
        break
      case 'divider':
        out.push(<hr key={key} style={{ border: 0, borderTop: '1px solid var(--bd)', margin: '28px 0' }} />)
        break
      case 'image': {
        const url = String(b.props?.url ?? '')
        if (/^(https:\/\/|\/images\/|\/media\/)/.test(url))
          out.push(
            <figure key={key} style={{ margin: '0 0 22px' }}>
              <img src={url} alt={String(b.props?.name ?? b.props?.caption ?? '')} loading="lazy" style={{ width: '100%', borderRadius: '10px' }} />
              {b.props?.caption ? <figcaption className="mf sm" style={{ marginTop: '8px' }}>{String(b.props.caption)}</figcaption> : null}
            </figure>,
          )
        break
      }
      default:
        break
    }
  }
  return <>{out}</>
}
