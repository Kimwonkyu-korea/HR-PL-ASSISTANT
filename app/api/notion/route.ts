import { NextRequest, NextResponse } from 'next/server'

const NOTION_VERSION = '2022-06-28'

interface NotionRichText {
  plain_text: string
}

interface NotionBlock {
  id: string
  type: string
  has_children: boolean
  paragraph?: { rich_text: NotionRichText[] }
  heading_1?: { rich_text: NotionRichText[] }
  heading_2?: { rich_text: NotionRichText[] }
  heading_3?: { rich_text: NotionRichText[] }
  bulleted_list_item?: { rich_text: NotionRichText[] }
  numbered_list_item?: { rich_text: NotionRichText[] }
  to_do?: { rich_text: NotionRichText[]; checked: boolean }
  toggle?: { rich_text: NotionRichText[] }
  quote?: { rich_text: NotionRichText[] }
  callout?: { rich_text: NotionRichText[] }
  code?: { rich_text: NotionRichText[]; language: string }
  divider?: object
  table?: { has_column_header: boolean }
  table_row?: { cells: NotionRichText[][] }
  child_page?: { title: string }
  [key: string]: unknown
}

function richText(arr: NotionRichText[] = []): string {
  return arr.map((r) => r.plain_text).join('')
}

function blockToText(block: NotionBlock, depth = 0): string {
  const indent = '  '.repeat(depth)
  const type = block.type

  if (type === 'paragraph') return indent + richText(block.paragraph?.rich_text)
  if (type === 'heading_1') return `\n# ${richText(block.heading_1?.rich_text)}`
  if (type === 'heading_2') return `\n## ${richText(block.heading_2?.rich_text)}`
  if (type === 'heading_3') return `\n### ${richText(block.heading_3?.rich_text)}`
  if (type === 'bulleted_list_item') return `${indent}- ${richText(block.bulleted_list_item?.rich_text)}`
  if (type === 'numbered_list_item') return `${indent}1. ${richText(block.numbered_list_item?.rich_text)}`
  if (type === 'to_do') {
    const checked = block.to_do?.checked ? 'x' : ' '
    return `${indent}- [${checked}] ${richText(block.to_do?.rich_text)}`
  }
  if (type === 'toggle') return `${indent}▶ ${richText(block.toggle?.rich_text)}`
  if (type === 'quote') return `${indent}> ${richText(block.quote?.rich_text)}`
  if (type === 'callout') return `${indent}💡 ${richText(block.callout?.rich_text)}`
  if (type === 'code') return `\`\`\`\n${richText(block.code?.rich_text)}\n\`\`\``
  if (type === 'divider') return '---'
  if (type === 'child_page') return `📄 ${block.child_page?.title}`

  return ''
}

async function fetchAllBlocks(pageId: string, token: string): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = []
  let cursor: string | undefined

  do {
    const url = new URL(`https://api.notion.com/v1/blocks/${pageId}/children`)
    url.searchParams.set('page_size', '100')
    if (cursor) url.searchParams.set('start_cursor', cursor)

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
      },
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err?.message || `Notion API 오류 (${res.status})`)
    }

    const data = await res.json()
    blocks.push(...(data.results as NotionBlock[]))
    cursor = data.has_more ? data.next_cursor : undefined
  } while (cursor)

  return blocks
}

async function blocksToText(blocks: NotionBlock[], token: string, depth = 0): Promise<string> {
  const lines: string[] = []
  let tableRows: string[][] = []
  let inTable = false

  for (const block of blocks) {
    // 테이블 처리
    if (block.type === 'table') {
      inTable = true
      tableRows = []
      if (block.has_children) {
        const children = await fetchAllBlocks(block.id, token)
        for (const child of children) {
          if (child.type === 'table_row' && child.table_row) {
            tableRows.push(child.table_row.cells.map((cell) => richText(cell)))
          }
        }
        // 마크다운 테이블
        if (tableRows.length > 0) {
          lines.push(tableRows[0].join(' | '))
          lines.push(tableRows[0].map(() => '---').join(' | '))
          tableRows.slice(1).forEach((row) => lines.push(row.join(' | ')))
        }
      }
      inTable = false
      continue
    }

    const line = blockToText(block, depth)
    if (line) lines.push(line)

    // 하위 블록 재귀
    if (block.has_children && block.type !== 'table') {
      const children = await fetchAllBlocks(block.id, token)
      const childText = await blocksToText(children, token, depth + 1)
      if (childText) lines.push(childText)
    }
  }

  return lines.join('\n')
}

function extractPageId(url: string): string {
  // 형식: https://www.notion.so/xxxxx-{32자리id} 또는 /p/{id}
  const clean = url.split('?')[0]
  const match = clean.match(/([a-f0-9]{32})$|([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/)
  if (match) {
    const id = match[1] || match[2]
    // 하이픈 없으면 추가
    if (id.length === 32) {
      return `${id.slice(0,8)}-${id.slice(8,12)}-${id.slice(12,16)}-${id.slice(16,20)}-${id.slice(20)}`
    }
    return id
  }
  throw new Error('노션 페이지 ID를 URL에서 찾을 수 없습니다.')
}

export async function POST(req: NextRequest) {
  try {
    const { url, token } = await req.json()

    if (!token) {
      return NextResponse.json({ error: '노션 Integration Token이 필요합니다. 설정에서 입력해주세요.' }, { status: 400 })
    }
    if (!url) {
      return NextResponse.json({ error: '노션 페이지 URL을 입력해주세요.' }, { status: 400 })
    }

    const pageId = extractPageId(url)

    // 페이지 제목 가져오기
    const pageRes = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
      },
    })

    if (!pageRes.ok) {
      const err = await pageRes.json()
      const msg = err?.message || `페이지 접근 실패 (${pageRes.status})`
      if (pageRes.status === 401) throw new Error('토큰이 유효하지 않습니다.')
      if (pageRes.status === 404) throw new Error('페이지를 찾을 수 없습니다. Integration이 해당 페이지에 공유되어 있는지 확인하세요.')
      throw new Error(msg)
    }

    const pageData = await pageRes.json()
    const titleProp = pageData.properties?.title || pageData.properties?.Name
    const title = titleProp?.title?.[0]?.plain_text || '(제목 없음)'

    // 블록 내용 가져오기
    const blocks = await fetchAllBlocks(pageId, token)
    const content = await blocksToText(blocks, token)

    return NextResponse.json({ title, content })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '노션 페이지 가져오기 실패'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
