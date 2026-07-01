import { CalendarDays, FileText, Globe } from 'lucide-react'

import { COMPANY_NAME } from '../constants'
import { formatMoney } from '../utils'

function InvoicePreview({
  customerName,
  contactInfo,
  caseType,
  region,
  invoiceNumber,
  invoiceDate,
  statusText,
  totals,
}) {
  return (
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
  )
}

export default InvoicePreview
