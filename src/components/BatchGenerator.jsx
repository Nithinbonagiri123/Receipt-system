import { useRef, useState } from 'react'
import { Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

import { parseInvoiceSheet } from '../parseExcel'
import { generateInvoiceDocx } from '../generateInvoiceDocx'

const money = (n) => `€ ${(Number.isFinite(n) ? n : 0).toFixed(2)}`

const sanitiseFilename = (value, fallback) => {
  const cleaned = String(value ?? '').replace(/[^a-z0-9\-_. ]/gi, '').trim()
  return cleaned || fallback
}

function BatchGenerator() {
  const inputRef = useRef(null)
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState([])
  const [mapping, setMapping] = useState({})
  const [unmatched, setUnmatched] = useState([])
  const [sheetInfo, setSheetInfo] = useState(null)
  const [error, setError] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleFile = async (file) => {
    if (!file) return
    setError('')
    setIsParsing(true)
    try {
      const {
        rows: parsed,
        mapping: fieldToHeader,
        unmatchedHeaders,
        sheetName,
        headerIndex,
        matchedFields,
      } = await parseInvoiceSheet(file)
      setFileName(file.name)
      setRows(parsed)
      setMapping(fieldToHeader)
      setUnmatched(unmatchedHeaders)
      setSheetInfo({ sheetName, headerIndex, matchedFields })
      if (!parsed.length) {
        setError('No data rows found in the sheet.')
      } else if (matchedFields < 2) {
        setError(
          'Could not confidently identify the header row. Check that your sheet has columns like Date, Invoice/Credit, Client name, etc.',
        )
      }
    } catch (e) {
      console.error('Excel parse failed', e)
      setError(e?.message || 'Could not read that file.')
      setRows([])
      setMapping({})
      setUnmatched([])
      setSheetInfo(null)
    } finally {
      setIsParsing(false)
    }
  }

  const handleGenerate = async () => {
    if (!rows.length) return
    setError('')
    setIsGenerating(true)
    try {
      const zip = new JSZip()
      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i]
        const blob = await generateInvoiceDocx(row)
        const numberPart = sanitiseFilename(row.invoiceNumber, `row-${i + 1}`)
        const clientPart = sanitiseFilename(row.clientName, 'client')
        zip.file(`${numberPart} — ${clientPart}.docx`, blob)
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const stamp = new Date().toISOString().slice(0, 10)
      saveAs(zipBlob, `invoices-${stamp}.zip`)
    } catch (e) {
      console.error('Batch generation failed', e)
      setError(e?.message || 'Could not generate the ZIP.')
    } finally {
      setIsGenerating(false)
    }
  }

  const mappingEntries = Object.entries(mapping)

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <FileSpreadsheet size={20} />
            Batch from Excel
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Upload a sheet with columns like Date, Invoice/Credit, Client name, ABL Fee, Gov Fee,
            Other Fees, VAT, Total, Paid, Outstanding. Headers can vary in casing / spacing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-400"
            onClick={() => inputRef.current?.click()}
            disabled={isParsing || isGenerating}
          >
            {isParsing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {isParsing ? 'Reading...' : 'Choose Excel file'}
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
            onClick={handleGenerate}
            disabled={!rows.length || isGenerating}
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {isGenerating ? 'Building ZIP...' : `Generate ${rows.length || ''} Invoice${rows.length === 1 ? '' : 's'} (ZIP)`}
          </button>
        </div>
      </div>

      {fileName && (
        <p className="mb-3 text-sm text-slate-600">
          <span className="font-medium text-slate-900">File:</span> {fileName}
          {sheetInfo && (
            <span className="ml-3 text-slate-500">
              Sheet: <span className="font-mono">{sheetInfo.sheetName}</span>
              {' '}· Headers on row {sheetInfo.headerIndex + 1}
              {' '}· {sheetInfo.matchedFields} column{sheetInfo.matchedFields === 1 ? '' : 's'} mapped
            </span>
          )}
          {rows.length > 0 && (
            <span className="ml-3 text-slate-500">
              · {rows.length} row{rows.length === 1 ? '' : 's'} detected
            </span>
          )}
        </p>
      )}

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {mappingEntries.length > 0 && (
        <details className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <summary className="cursor-pointer font-medium">Column mapping</summary>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {mappingEntries.map(([field, header]) => (
              <li key={field}>
                <span className="font-mono text-xs text-slate-500">{field}</span> ← {header}
              </li>
            ))}
          </ul>
          {unmatched.length > 0 && (
            <p className="mt-2 text-xs text-amber-700">
              Unmatched headers (ignored): {unmatched.join(', ')}
            </p>
          )}
        </details>
      )}

      {rows.length > 0 && (
        <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">#</th>
                <th className="px-3 py-2 text-left font-semibold">Date</th>
                <th className="px-3 py-2 text-left font-semibold">Invoice #</th>
                <th className="px-3 py-2 text-left font-semibold">Client</th>
                <th className="px-3 py-2 text-left font-semibold">Package</th>
                <th className="px-3 py-2 text-right font-semibold">ABL</th>
                <th className="px-3 py-2 text-right font-semibold">Gov</th>
                <th className="px-3 py-2 text-right font-semibold">Other</th>
                <th className="px-3 py-2 text-right font-semibold">VAT</th>
                <th className="px-3 py-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-slate-200">
                  <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                  <td className="px-3 py-2">{row.date || '—'}</td>
                  <td className="px-3 py-2 font-mono">{row.invoiceNumber || '—'}</td>
                  <td className="px-3 py-2">{row.clientName || '—'}</td>
                  <td className="px-3 py-2 text-slate-700">{row.packageName || '—'}</td>
                  <td className="px-3 py-2 text-right">{money(row.ablFee)}</td>
                  <td className="px-3 py-2 text-right">{money(row.govFee)}</td>
                  <td className="px-3 py-2 text-right">{money(row.otherFees)}</td>
                  <td className="px-3 py-2 text-right">{money(row.vat)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{money(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default BatchGenerator
