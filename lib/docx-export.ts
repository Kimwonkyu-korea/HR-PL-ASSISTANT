import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  Packer,
} from 'docx'
import { saveAs } from 'file-saver'

// 마크다운 → docx 변환 (기본 지원: #, ##, ###, **, 테이블, 목록)
export async function exportToDocx(markdown: string, filename: string) {
  const lines = markdown.split('\n')
  const children: (Paragraph | Table)[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // 빈 줄
    if (!line.trim()) {
      children.push(new Paragraph({}))
      i++
      continue
    }

    // H1
    if (line.startsWith('# ')) {
      children.push(
        new Paragraph({
          text: line.slice(2),
          heading: HeadingLevel.HEADING_1,
        })
      )
      i++
      continue
    }

    // H2
    if (line.startsWith('## ')) {
      children.push(
        new Paragraph({
          text: line.slice(3),
          heading: HeadingLevel.HEADING_2,
        })
      )
      i++
      continue
    }

    // H3
    if (line.startsWith('### ')) {
      children.push(
        new Paragraph({
          text: line.slice(4),
          heading: HeadingLevel.HEADING_3,
        })
      )
      i++
      continue
    }

    // 테이블 (| 로 시작하는 줄 묶음)
    if (line.startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].startsWith('|')) {
        if (!lines[i].match(/^\|[-| :]+\|$/)) {
          tableLines.push(lines[i])
        }
        i++
      }

      if (tableLines.length > 0) {
        const rows = tableLines.map((tl, rowIdx) => {
          const cells = tl
            .split('|')
            .slice(1, -1)
            .map((cell) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: cell.trim(),
                        bold: rowIdx === 0,
                      }),
                    ],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
              })
            )
          return new TableRow({ children: cells })
        })

        children.push(
          new Table({
            rows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          })
        )
      }
      continue
    }

    // 목록 (- 또는 숫자.)
    if (line.match(/^[-*] /) || line.match(/^\d+\. /)) {
      const text = line.replace(/^[-*] /, '').replace(/^\d+\. /, '')
      children.push(
        new Paragraph({
          children: [new TextRun({ text: parseInline(text) })],
          bullet: { level: 0 },
        })
      )
      i++
      continue
    }

    // 일반 텍스트 (볼드 처리 포함)
    children.push(
      new Paragraph({
        children: parseInlineRuns(line),
      })
    )
    i++
  }

  const doc = new Document({
    sections: [{ children }],
    styles: {
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          run: { size: 32, bold: true, color: '4338ca' },
          paragraph: { spacing: { before: 240, after: 120 } },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          run: { size: 26, bold: true, color: '4f46e5' },
          paragraph: { spacing: { before: 200, after: 100 } },
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          run: { size: 22, bold: true },
          paragraph: { spacing: { before: 160, after: 80 } },
        },
      ],
    },
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `${filename}.docx`)
}

function parseInline(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')
}

function parseInlineRuns(text: string): TextRun[] {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/)
  return parts.map((part) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return new TextRun({ text: part.slice(2, -2), bold: true })
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return new TextRun({ text: part.slice(1, -1), italics: true })
    }
    return new TextRun({ text: part })
  })
}
