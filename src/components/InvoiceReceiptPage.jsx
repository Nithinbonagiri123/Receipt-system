import { useMemo } from 'react'

const InvoiceReceiptPage = ({
  customerName,
  customerAddress,
  invoiceNumber,
  invoiceDate,
  caseType,
  subtotal,
  receiptDate,
  remainingBalance = 0,
  notes = '',
}) => {
  const vat = useMemo(() => (subtotal || 0) * 0.23, [subtotal])
  const total = useMemo(() => (subtotal || 0) + vat, [subtotal, vat])

  const formatMoney = (value) =>
    new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(value || 0)

  const formattedRemaining =
    remainingBalance === 0 ? '0 Euros' : formatMoney(remainingBalance)

  return (
    <main className="mx-auto max-w-[794px] min-h-[1123px] px-8 pt-20 pb-10 font-sans text-slate-900 bg-white">
      {/* Invoice Section */}
      <section className="space-y-6">
        <header className="space-y-1">
          <p className="text-sm font-semibold tracking-wide uppercase text-slate-500">
            Invoice
          </p>
          <h1 className="text-2xl font-semibold">
            {customerName || 'Customer Name'}
          </h1>
          <p className="whitespace-pre-line text-sm text-slate-700">
            {customerAddress || 'Customer address'}
          </p>
        </header>

        <div className="space-y-1 text-sm">
          <div className="flex gap-2">
            <span className="w-40 font-semibold">Invoice Number</span>
            <span>{invoiceNumber || '—'}</span>
          </div>
          <div className="flex gap-2">
            <span className="w-40 font-semibold">Invoice Date</span>
            <span>{invoiceDate || '—'}</span>
          </div>
          <div className="flex gap-2">
            <span className="w-40 font-semibold">Type of Case</span>
            <span>{caseType || '—'}</span>
          </div>
          <div className="mt-3 flex gap-2">
            <span className="w-40 font-semibold">Subtotal</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
          <div className="flex gap-2">
            <span className="w-40 font-semibold">VAT (23%)</span>
            <span>{formatMoney(vat)}</span>
          </div>
          <div className="flex gap-2">
            <span className="w-40 font-semibold">Total</span>
            <span>{formatMoney(total)}</span>
          </div>
        </div>
      </section>

      <div className="my-10 h-px bg-slate-200/60" />

      {/* Receipt Section */}
      <section className="space-y-6">
        <header className="space-y-1">
          <p className="text-sm font-semibold tracking-wide uppercase text-slate-500">
            Receipt
          </p>
          <h2 className="text-2xl font-semibold">
            {customerName || 'Customer Name'}
          </h2>
          <p className="whitespace-pre-line text-sm text-slate-700">
            {customerAddress || 'Customer address'}
          </p>
        </header>

        <div className="space-y-1 text-sm">
          <div className="flex gap-2">
            <span className="w-40 font-semibold">Receipt Date</span>
            <span>{receiptDate || invoiceDate || '—'}</span>
          </div>
          <div className="flex gap-2">
            <span className="w-40 font-semibold">Payment Method</span>
            <span>Bank</span>
          </div>
          <div className="flex gap-2">
            <span className="w-40 font-semibold">Remaining Balance</span>
            <span>{formattedRemaining}</span>
          </div>
        </div>

        <div className="mt-6 space-y-1 text-sm">
          <p className="font-semibold">Notes</p>
          <p className="whitespace-pre-line text-slate-700">{notes || '—'}</p>
        </div>
      </section>
    </main>
  )
}

export default InvoiceReceiptPage

