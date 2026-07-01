import { useMemo, useState } from 'react'

import BatchGenerator from './components/BatchGenerator'
import InputPanel from './components/InputPanel'
import InvoicePreview from './components/InvoicePreview'
import ReceiptPreview from './components/ReceiptPreview'
import { APP_TITLE } from './constants'
import { generateTemplatePdf } from './generateTemplatePdf'
import { computeTotals, createInvoiceNumber, todayLabel } from './utils'

function App() {
  const [customerName, setCustomerName] = useState('')
  const [contactInfo, setContactInfo] = useState('')
  const [caseType, setCaseType] = useState('')
  const [region, setRegion] = useState('EU')
  const [ablPrice, setAblPrice] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState(createInvoiceNumber())
  const [invoiceDate, setInvoiceDate] = useState(todayLabel())
  const [hasGenerated, setHasGenerated] = useState(false)
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false)
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false)

  const totals = useMemo(() => computeTotals(ablPrice, region), [ablPrice, region])

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
      await generateTemplatePdf({
        documentType,
        customerName,
        contactInfo,
        caseType,
        region,
        invoiceNumber,
        invoiceDate,
        totals,
      })
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
          Single-case flow below, or upload an Excel sheet to batch-generate Word invoices.
        </p>
      </section>

      <div className="mb-6">
        <BatchGenerator />
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
        <InputPanel
          customerName={customerName}
          onCustomerNameChange={setCustomerName}
          contactInfo={contactInfo}
          onContactInfoChange={setContactInfo}
          caseType={caseType}
          onCaseTypeChange={setCaseType}
          region={region}
          onRegionChange={setRegion}
          ablPrice={ablPrice}
          onAblPriceChange={setAblPrice}
          totals={totals}
          onGenerate={handleGenerate}
          onDownloadInvoice={() => downloadTemplateDocument('INVOICE')}
          onDownloadReceipt={() => downloadTemplateDocument('RECEIPT')}
          isDownloadingInvoice={isDownloadingInvoice}
          isDownloadingReceipt={isDownloadingReceipt}
        />

        <section className="grid gap-6 xl:grid-cols-2">
          <InvoicePreview
            customerName={customerName}
            contactInfo={contactInfo}
            caseType={caseType}
            region={region}
            invoiceNumber={invoiceNumber}
            invoiceDate={invoiceDate}
            statusText={statusText}
            totals={totals}
          />
          <ReceiptPreview
            customerName={customerName}
            contactInfo={contactInfo}
            invoiceNumber={invoiceNumber}
            invoiceDate={invoiceDate}
            totals={totals}
          />
        </section>
      </div>
    </main>
  )
}

export default App
