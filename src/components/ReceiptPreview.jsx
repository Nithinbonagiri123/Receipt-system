import { Receipt } from 'lucide-react'

import { formatMoney } from '../utils'

function ReceiptPreview({
  customerName,
  contactInfo,
  invoiceNumber,
  invoiceDate,
  totals,
}) {
  return (
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
  )
}

export default ReceiptPreview
