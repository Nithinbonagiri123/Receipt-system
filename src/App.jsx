import { useMemo, useRef, useState } from 'react'
import { CalendarDays, Download, FileText, Globe, Receipt } from 'lucide-react'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const CASE_TYPES = [
  'Critical Skills Employment Permit (CSEP)',
  'General Employment Permit (GEP)',
  'Change of Employer on Same Employment Permit (switching employer)',
  'Renewal of Employment Permit (same employer)',
  'Stamp 1G Extension',
  'Stamp 1G Extension (Surveying)',
  'Stamp 1G Extension (Reactivation of Employment Permit)',
  'IRP Card Renewal (Stamp 1, 2, 3, 4, 0, EUFAM, Dependent etc)',
  'Stamp Regularisation (Stamp 2, Stamp 3, Stamp 2/3, Stamp 1G Dependent)',
  'Short Stay C - Tourist Visa',
  'Short Stay C - Business Visa',
  'Long Stay D - Entry Reunification Visa',
  'Long Stay D - De facto Visa (Permanent Irish partner (Irish citizen, Stamp 4 holder, work permit holder) for residence and/or permission card 90 days)',
  'EUFAM - Qualifying Family Member (spouse, civil partner child of an EU citizen)',
  'EUFAM - Permitted Family Member (de facto partner and dependent relative)',
  'Permission to Apply: Elder divorce, civil break up - Non EU family member keeps their permission in circumstances',
  'Permanent Residence Card (after holding Stamp 4 EUFAM for 5 continuous years)',
  'De facto Residence Permission',
  'De Facto Renewal (Stamp 4 extension)',
  'Adult Naturalisation (6 years of residence for nationals)',
  'Citizenship by Marriage (3 year rule - for spouse and civil partner of Irish citizen)',
  'Minor Child Citizenship (General applications) (cases children not automatically Irish - 5 years of residence)',
  'Irish - with annualised parents (had dependent/children on EUFAM)',
  'Citizenship for Children born in Ireland (3 year rule - for non-Irish)',
  'Refugee/International Protection Citizenship (5 year rule)',
  'Foreign Birth Registration (Adult)',
  'Foreign Birth Registration (Minor, under 18)',
]
const VAT_RATE = 0.23
const GOV_RATE = 0.1
const TEMPLATE_PANEL_WIDTH = 255
const TEMPLATE_PANEL_HEIGHT = 268

const createInvoiceNumber = () => {
  const randomId = Math.floor(1000 + Math.random() * 9000)
  return `#INV-${randomId}`
}

const CURRENCY = import.meta.env.VITE_DEFAULT_CURRENCY || 'EUR'
const COMPANY_NAME = import.meta.env.VITE_COMPANY_NAME || 'ABL Services'
const APP_TITLE = import.meta.env.VITE_APP_TITLE || 'Invoice & Receipt Generator'

const formatMoney = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: 2,
  }).format(value)

const todayLabel = () =>
  new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

function App() {
  const [customerName, setCustomerName] = useState('')
  const [contactInfo, setContactInfo] = useState('')
  const [caseType, setCaseType] = useState('')
  const [caseTypeQuery, setCaseTypeQuery] = useState('')
  const [isCaseTypeOpen, setIsCaseTypeOpen] = useState(false)
  const [region, setRegion] = useState('EU')
  const [ablPrice, setAblPrice] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState(createInvoiceNumber())
  const [invoiceDate, setInvoiceDate] = useState(todayLabel())
  const [hasGenerated, setHasGenerated] = useState(false)
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false)
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false)
  const caseTypeWrapRef = useRef(null)

  const totals = useMemo(() => {
    const subtotal = Number.parseFloat(ablPrice) || 0
    const vatAmount = region === 'EU' ? subtotal * VAT_RATE : 0
    const govCharge = subtotal * GOV_RATE
    const grandTotal = subtotal + vatAmount + govCharge
    return { subtotal, vatAmount, govCharge, grandTotal }
  }, [ablPrice, region])

  const filteredCaseTypes = useMemo(() => {
    const q = caseTypeQuery.trim().toLowerCase()
    if (!q) return CASE_TYPES
    return CASE_TYPES.filter((t) => t.toLowerCase().includes(q))
  }, [caseTypeQuery])

  const handleGenerate = () => {
    setInvoiceNumber(createInvoiceNumber())
    setInvoiceDate(todayLabel())
    setHasGenerated(true)
  }

  const downloadTemplateDocument = async (documentType) => {
    if (documentType === 'INVOICE') {
      setIsDownloadingInvoice(true)
    } else {
      setIsDownloadingReceipt(true)
    }

    try {
      const templateUrl = `${import.meta.env.BASE_URL}payment-receipt-ning.pdf`
      const res = await fetch(templateUrl)
      if (!res.ok) {
        alert(
          `Template PDF not found at ${templateUrl}. Make sure payment-receipt-ning.pdf is in public/.`,
        )
        return
      }
      const templateBytes = await res.arrayBuffer()
      const pdfDoc = await PDFDocument.load(templateBytes)
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      const page = pdfDoc.getPages()[0]
      const { width, height } = page.getSize()

      const panelX = width - TEMPLATE_PANEL_WIDTH - 36
      // Move the printed block further down the page (50 + 70 + 100 = 220 units)
      const panelTop = height - 44 - 220
      const panelY = panelTop - TEMPLATE_PANEL_HEIGHT
      // Increase vertical spacing so there is a clear gap between each printed line
      const rowHeight = 27
      const labelX = panelX + 12
      const valueX = panelX + TEMPLATE_PANEL_WIDTH - 12
      const oneLine = (value, maxLength = 24) => {
        const compact = String(value).replace(/\s+/g, ' ').trim()
        if (compact.length <= maxLength) return compact
        return `${compact.slice(0, maxLength - 1)}...`
      }

      page.drawText(documentType === 'INVOICE' ? 'INVOICE DETAILS' : 'RECEIPT DETAILS', {
        x: labelX,
        y: panelTop - 20,
        size: 14,
        font: helveticaBold,
        color: rgb(0, 0, 0),
      })

      let y = panelTop - 44
      const drawRow = (label, value, strong = false) => {
        page.drawText(label, {
          x: labelX,
          y,
          size: 12,
          font: strong ? helveticaBold : helvetica,
          color: rgb(0, 0, 0),
        })
        const text = oneLine(value)
        page.drawText(text, {
          x: valueX - helvetica.widthOfTextAtSize(text, 12),
          y,
          size: 12,
          font: strong ? helveticaBold : helvetica,
          color: rgb(0, 0, 0),
        })
        y -= rowHeight
      }

      if (documentType === 'INVOICE') {
        drawRow('Type', 'Invoice', true)
        drawRow('Invoice Number', invoiceNumber)
        drawRow('Date of Receipt', invoiceDate)
        drawRow('To', customerName || 'N/A')
        drawRow('Address', contactInfo || 'N/A')
        drawRow('Case Type', caseType || 'N/A')
        drawRow('Payment Method', region === 'EU' ? 'Bank Transfer' : 'Revolut')
        drawRow('Amount', formatMoney(totals.grandTotal), true)
      } else {
        drawRow('Type', 'Receipt', true)
        drawRow('Amount Received', formatMoney(totals.grandTotal), true)
        drawRow('Date of Receipt', invoiceDate)
        drawRow('To', customerName || 'N/A')
        drawRow('Address', contactInfo || 'N/A')
        drawRow('Re: Invoice Number', invoiceNumber)
        drawRow('Payment Method', region === 'EU' ? 'Bank Transfer' : 'Revolut')
        drawRow('Remaining Balance (if any)', formatMoney(0))
        drawRow('Notes (Optional)', caseType || 'N/A')
      }

      const rendered = await pdfDoc.save()
      const blob = new Blob([rendered], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download =
        documentType === 'INVOICE'
          ? `${invoiceNumber.replace('#', '')}-invoice.pdf`
          : `${invoiceNumber.replace('#', '')}-receipt.pdf`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Template PDF generation failed', error)
      alert(`Could not generate PDF: ${error?.message || String(error)}`)
    } finally {
      if (documentType === 'INVOICE') {
        setIsDownloadingInvoice(false)
      } else {
        setIsDownloadingReceipt(false)
      }
    }
  }

  const statusText = hasGenerated ? 'Final' : 'Draft'

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-6 lg:px-8">
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{APP_TITLE}</h1>
        <p className="mt-1 text-sm text-slate-600">
          EU/Non-EU tax, same template for invoice & receipt. Add Template.pdf to public/ to enable PDF download.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Input Details</h2>
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Customer Name</span>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Contact Info</span>
              <textarea
                className="min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="Email, phone, or address"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Case Type</span>
              <div
                ref={caseTypeWrapRef}
                className="relative"
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    setIsCaseTypeOpen(false)
                    setCaseTypeQuery(caseType)
                  }
                }}
              >
                <input
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-black outline-none focus:border-blue-500"
                  value={caseTypeQuery}
                  onFocus={() => setIsCaseTypeOpen(true)}
                  onChange={(e) => {
                    setCaseTypeQuery(e.target.value)
                    setIsCaseTypeOpen(true)
                  }}
                  placeholder="Select option"
                  aria-label="Case Type"
                />

                {isCaseTypeOpen && (
                  <div
                    className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                    role="listbox"
                    tabIndex={-1}
                  >
                    {filteredCaseTypes.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-black">No results</div>
                    ) : (
                      filteredCaseTypes.map((type) => (
                        <button
                          key={type}
                          type="button"
                          className="block w-full cursor-pointer px-3 py-2 text-left text-sm text-black hover:bg-slate-100"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setCaseType(type)
                            setCaseTypeQuery(type)
                            setIsCaseTypeOpen(false)
                          }}
                        >
                          {type}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Region</span>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                <option value="EU">EU Case (VAT 23%)</option>
                <option value="NON_EU">Non-EU Case (VAT 0%)</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">ABL Price</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                value={ablPrice}
                onChange={(e) => setAblPrice(e.target.value)}
                placeholder="0.00"
              />
            </label>
          </div>
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
            <p className="mb-1 flex justify-between">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-medium">{formatMoney(totals.subtotal)}</span>
            </p>
            <p className="mb-1 flex justify-between">
              <span className="text-slate-600">VAT ({region === 'EU' ? '23%' : '0%'})</span>
              <span className="font-medium">{formatMoney(totals.vatAmount)}</span>
            </p>
            <p className="mb-1 flex justify-between">
              <span className="text-slate-600">Gov Charge (10%)</span>
              <span className="font-medium">{formatMoney(totals.govCharge)}</span>
            </p>
            <p className="mt-2 flex justify-between border-t border-slate-200 pt-2">
              <span className="font-semibold text-slate-900">Grand Total</span>
              <span className="font-bold text-blue-700">{formatMoney(totals.grandTotal)}</span>
            </p>
          </div>
          <button
            type="button"
            className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            onClick={handleGenerate}
          >
            Generate Invoice & Receipt
          </button>
          <button
            type="button"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            onClick={() => downloadTemplateDocument('INVOICE')}
            disabled={isDownloadingInvoice}
          >
            <Download size={16} />
            {isDownloadingInvoice ? 'Preparing...' : 'Download Invoice PDF'}
          </button>
          <button
            type="button"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            onClick={() => downloadTemplateDocument('RECEIPT')}
            disabled={isDownloadingReceipt}
          >
            <Download size={16} />
            {isDownloadingReceipt ? 'Preparing...' : 'Download Receipt PDF'}
          </button>
        </aside>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="min-h-[400px] rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <header className="mb-8 flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <p className="text-sm uppercase tracking-widest text-slate-500">Invoice</p>
                <h3 className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900">
                  <FileText size={22} />
                  {COMPANY_NAME}
                </h3>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold text-slate-900">{invoiceNumber}</p>
                <p className="mt-1 flex items-center justify-end gap-1 text-slate-600">
                  <CalendarDays size={14} /> {invoiceDate}
                </p>
                <p className="mt-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {statusText}
                </p>
              </div>
            </header>
            <div className="mb-8 grid gap-4 text-sm md:grid-cols-2">
              <div>
                <p className="mb-1 font-semibold uppercase tracking-wide text-slate-500">Bill To</p>
                <p className="font-semibold text-slate-900">{customerName || 'Customer Name'}</p>
                <p className="whitespace-pre-line text-slate-600">{contactInfo || '—'}</p>
              </div>
              <div className="md:text-right">
                <p className="mb-1 font-semibold uppercase tracking-wide text-slate-500">Case</p>
                <p className="text-slate-900">{caseType}</p>
                <p className="mt-1 flex items-center gap-1 text-slate-600 md:justify-end">
                  <Globe size={14} />
                  {region === 'EU' ? 'EU' : 'Non-EU'}
                </p>
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Charge</th>
                    <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-200">
                    <td className="px-4 py-3">Subtotal</td>
                    <td className="px-4 py-3 text-right">{formatMoney(totals.subtotal)}</td>
                  </tr>
                  <tr className="border-t border-slate-200">
                    <td className="px-4 py-3">VAT</td>
                    <td className="px-4 py-3 text-right">{formatMoney(totals.vatAmount)}</td>
                  </tr>
                  <tr className="border-t border-slate-200">
                    <td className="px-4 py-3">Gov Charge</td>
                    <td className="px-4 py-3 text-right">{formatMoney(totals.govCharge)}</td>
                  </tr>
                  <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                    <td className="px-4 py-3">Grand Total</td>
                    <td className="px-4 py-3 text-right">{formatMoney(totals.grandTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>

          <article className="min-h-[400px] rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <header className="mb-8 flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <p className="text-sm uppercase tracking-widest text-slate-500">Receipt</p>
                <h3 className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900">
                  <Receipt size={22} />
                  Payment Received
                </h3>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                Payment Received
              </span>
            </header>
            <div className="mb-8 grid gap-4 text-sm md:grid-cols-2">
              <div>
                <p className="mb-1 font-semibold uppercase tracking-wide text-slate-500">From</p>
                <p className="font-semibold text-slate-900">{customerName || 'Customer Name'}</p>
                <p className="whitespace-pre-line text-slate-600">{contactInfo || '—'}</p>
              </div>
              <div className="md:text-right">
                <p className="mb-1 font-semibold uppercase tracking-wide text-slate-500">Ref</p>
                <p className="font-semibold text-slate-900">{invoiceNumber}</p>
                <p className="text-slate-600">{invoiceDate}</p>
              </div>
            </div>
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium">{formatMoney(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">VAT</span>
                <span className="font-medium">{formatMoney(totals.vatAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Gov Charge</span>
                <span className="font-medium">{formatMoney(totals.govCharge)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-300 pt-3">
                <span className="font-semibold">Grand Total Paid</span>
                <span className="font-bold text-emerald-700">{formatMoney(totals.grandTotal)}</span>
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>
  )
}

export default App
