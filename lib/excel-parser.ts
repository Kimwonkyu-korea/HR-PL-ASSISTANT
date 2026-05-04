import * as XLSX from 'xlsx'

export interface ParsedSheet {
  name: string
  text: string
}

export function parseExcelToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })

        const parts: string[] = []

        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName]
          const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            defval: '',
            raw: false,
          }) as string[][]

          // 빈 행 제거
          const nonEmpty = rows.filter((row) =>
            row.some((cell) => String(cell).trim() !== '')
          )

          if (nonEmpty.length === 0) continue

          parts.push(`## 시트: ${sheetName}`)

          for (const row of nonEmpty) {
            const line = row
              .map((cell) => String(cell).trim())
              .filter((_, i, arr) => {
                // 뒤쪽 빈 셀 제거
                const lastNonEmpty = arr.reduceRight(
                  (acc, v, idx) => (acc === -1 && v !== '' ? idx : acc),
                  -1
                )
                return i <= lastNonEmpty
              })
              .join('\t')
            if (line.trim()) parts.push(line)
          }

          parts.push('')
        }

        resolve(parts.join('\n'))
      } catch (err) {
        reject(new Error('Excel 파일 파싱 실패: ' + (err instanceof Error ? err.message : String(err))))
      }
    }

    reader.onerror = () => reject(new Error('파일 읽기 실패'))
    reader.readAsArrayBuffer(file)
  })
}
