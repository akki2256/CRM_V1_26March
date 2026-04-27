export type ExcelColumn = {
  key: string
  label: string
}

type ExcelCellStyle = {
  font?: { bold?: boolean }
  fill?: {
    patternType?: 'solid'
    fgColor?: { rgb: string }
  }
}

type ExcelStyleOptions = {
  headerStyle?: ExcelCellStyle
  rowStyleByColumnValue?: {
    key: string
    styles: Record<string, ExcelCellStyle>
  }
}

function normalizeRgb(value: string): string {
  const hex = value.trim().replace(/^#/, '').toUpperCase()
  if (hex.length === 8) return hex
  if (hex.length === 6) return `FF${hex}`
  return 'FFFFFFFF'
}

function buildWorkbookWithStyles(
  ExcelJS: Awaited<typeof import('exceljs')>,
  columns: ExcelColumn[],
  rows: Array<Record<string, string | number>>,
  options?: ExcelStyleOptions,
) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Export')
  const colCount = columns.length

  sheet.addRow(columns.map((col) => col.label))
  for (const row of rows) {
    sheet.addRow(columns.map((col) => row[col.key] ?? ''))
  }

  if (options?.headerStyle) {
    for (let c = 0; c < colCount; c += 1) {
      const cell = sheet.getRow(1).getCell(c + 1)
      if (options.headerStyle.font?.bold) {
        cell.font = { ...cell.font, bold: true }
      }
      const fillRgb = options.headerStyle.fill?.fgColor?.rgb
      if (fillRgb) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: normalizeRgb(fillRgb) },
        }
      }
    }
  }

  if (options?.rowStyleByColumnValue) {
    const matchKey = options.rowStyleByColumnValue.key
    for (let r = 0; r < rows.length; r += 1) {
      const raw = rows[r]?.[matchKey]
      const style = options.rowStyleByColumnValue.styles[String(raw ?? '')]
      if (!style) continue
      for (let c = 0; c < colCount; c += 1) {
        const cell = sheet.getRow(r + 2).getCell(c + 1)
        if (style.font?.bold) {
          cell.font = { ...cell.font, bold: true }
        }
        const fillRgb = style.fill?.fgColor?.rgb
        if (fillRgb) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: normalizeRgb(fillRgb) },
          }
        }
      }
    }
  }

  return workbook
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const b of bytes) {
    binary += String.fromCharCode(b)
  }
  return btoa(binary)
}

export async function downloadExcelFile(
  fileName: string,
  columns: ExcelColumn[],
  rows: Array<Record<string, string | number>>,
  options?: ExcelStyleOptions,
) {
  const ExcelJS = await import('exceljs')
  const workbook = buildWorkbookWithStyles(ExcelJS, columns, rows, options)
  const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function buildExcelBase64(
  columns: ExcelColumn[],
  rows: Array<Record<string, string | number>>,
  options?: ExcelStyleOptions,
): Promise<{ mimeType: string; base64Content: string }> {
  const ExcelJS = await import('exceljs')
  const workbook = buildWorkbookWithStyles(ExcelJS, columns, rows, options)
  const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer
  return {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    base64Content: bufferToBase64(buffer),
  }
}
