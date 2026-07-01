import * as XLSX from 'xlsx'

// Each field lists candidate keywords. Headers are normalised (lowercase,
// alphanumerics only) and matched by whichever keyword hits the most tokens.
const FIELD_KEYWORDS = {
  date: ['date', 'invoicedate'],
  invoiceNumber: ['invoicecredit', 'invoicenumber', 'invoiceno', 'invoice', 'credit', 'ref'],
  clientName: ['clientname', 'customername', 'client', 'customer', 'name', 'billto'],
  ablFee: ['ablfee', 'abl'],
  govFee: ['govfee', 'governmentfee', 'gov'],
  otherFees: ['otherfees', 'others', 'other', 'adverts', 'translations'],
  vat: ['vat', 'tax'],
  total: ['total', 'grandtotal', 'amount'],
  paid: ['paid', 'amountpaid'],
  outstanding: ['outstanding', 'balance', 'remaining', 'due'],
}

const normaliseHeader = (header) =>
  String(header ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

const parseNumber = (value) => {
  if (value == null || value === '') return 0
  if (typeof value === 'number') return value
  const cleaned = String(value).replace(/[^\d.-]/g, '')
  const n = Number.parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

const parseDate = (value) => {
  if (value == null || value === '') return ''
  if (value instanceof Date) return formatDate(value)
  if (typeof value === 'number') {
    // Excel serial date
    const epoch = new Date(Date.UTC(1899, 11, 30))
    const ms = value * 24 * 60 * 60 * 1000
    return formatDate(new Date(epoch.getTime() + ms))
  }
  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) return formatDate(parsed)
  return String(value)
}

const formatDate = (d) =>
  d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

// Given the sheet's header row, return { columnIndex -> fieldName } and
// { fieldName -> matched header string } for diagnostics.
const mapHeaders = (headerRow) => {
  const columnToField = {}
  const fieldToHeader = {}
  const usedFields = new Set()

  headerRow.forEach((rawHeader, columnIndex) => {
    const normalised = normaliseHeader(rawHeader)
    if (!normalised) return

    let bestField = null
    let bestScore = 0
    for (const [field, keywords] of Object.entries(FIELD_KEYWORDS)) {
      if (usedFields.has(field)) continue
      for (const kw of keywords) {
        const score =
          normalised === kw
            ? 100
            : normalised.includes(kw)
              ? kw.length
              : kw.includes(normalised) && normalised.length >= 3
                ? normalised.length
                : 0
        if (score > bestScore) {
          bestScore = score
          bestField = field
        }
      }
    }

    if (bestField && bestScore > 0) {
      columnToField[columnIndex] = bestField
      fieldToHeader[bestField] = String(rawHeader)
      usedFields.add(bestField)
    }
  })

  return { columnToField, fieldToHeader }
}

const isRowEmpty = (cells) =>
  !cells || cells.every((c) => c == null || String(c).trim() === '')

// Scan the top of the sheet for the row that matches the most known headers.
// This tolerates sheets that have a title / blank rows / filter row above the
// real header. If nothing matches (< 2 fields), fall back to row 0.
const findHeaderRow = (grid, scanLimit = 15) => {
  const limit = Math.min(scanLimit, grid.length)
  let bestIndex = 0
  let bestScore = -1
  for (let i = 0; i < limit; i += 1) {
    if (isRowEmpty(grid[i])) continue
    const { columnToField } = mapHeaders(grid[i])
    const score = Object.keys(columnToField).length
    if (score > bestScore) {
      bestScore = score
      bestIndex = i
    }
  }
  return { headerIndex: bestIndex, matchedFields: bestScore }
}

export async function parseInvoiceSheet(file) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })

  // Pick the first sheet that has data (skip sheets that are entirely empty).
  const sheetName =
    workbook.SheetNames.find((name) => {
      const s = workbook.Sheets[name]
      const g = XLSX.utils.sheet_to_json(s, { header: 1, defval: '', raw: true })
      return g.some((row) => !isRowEmpty(row))
    }) || workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true })

  if (!grid.length) {
    return { rows: [], mapping: {}, unmatchedHeaders: [], sheetName, headerIndex: 0 }
  }

  const { headerIndex, matchedFields } = findHeaderRow(grid)
  const headerRow = grid[headerIndex] || []
  const { columnToField, fieldToHeader } = mapHeaders(headerRow)

  const unmatchedHeaders = headerRow
    .map((h, i) => (columnToField[i] ? null : String(h ?? '').trim()))
    .filter((h) => h && h.length > 0)

  const rows = []
  for (let r = headerIndex + 1; r < grid.length; r += 1) {
    const cells = grid[r]
    if (isRowEmpty(cells)) continue

    const row = {
      date: '',
      invoiceNumber: '',
      clientName: '',
      ablFee: 0,
      govFee: 0,
      otherFees: 0,
      vat: 0,
      total: 0,
      paid: 0,
      outstanding: 0,
    }

    for (const [colIndexStr, field] of Object.entries(columnToField)) {
      const raw = cells[Number(colIndexStr)]
      if (field === 'date') {
        row.date = parseDate(raw)
      } else if (field === 'clientName' || field === 'invoiceNumber') {
        row.clientName = field === 'clientName' ? String(raw ?? '').trim() : row.clientName
        row.invoiceNumber = field === 'invoiceNumber' ? String(raw ?? '').trim() : row.invoiceNumber
      } else {
        row[field] = parseNumber(raw)
      }
    }

    // Fall back to computed subtotal / total when the sheet omits them.
    const subtotal = row.ablFee + row.govFee + row.otherFees
    if (!row.total) row.total = subtotal + row.vat
    row._subtotal = subtotal || (row.total - row.vat)

    rows.push(row)
  }

  return {
    rows,
    mapping: fieldToHeader,
    unmatchedHeaders,
    sheetName,
    headerIndex,
    matchedFields,
  }
}
