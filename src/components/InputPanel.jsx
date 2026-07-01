import { Download } from 'lucide-react'

import { formatMoney } from '../utils'
import CaseTypeCombobox from './CaseTypeCombobox'

function InputPanel({
  customerName,
  onCustomerNameChange,
  contactInfo,
  onContactInfoChange,
  caseType,
  onCaseTypeChange,
  region,
  onRegionChange,
  ablPrice,
  onAblPriceChange,
  totals,
  onGenerate,
  onDownloadInvoice,
  onDownloadReceipt,
  isDownloadingInvoice,
  isDownloadingReceipt,
}) {
  return (
    <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Input Details</h2>
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Customer Name</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            value={customerName}
            onChange={(e) => onCustomerNameChange(e.target.value)}
            placeholder="Enter customer name"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Contact Info</span>
          <textarea
            className="min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            value={contactInfo}
            onChange={(e) => onContactInfoChange(e.target.value)}
            placeholder="Email, phone, or address"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Case Type</span>
          <CaseTypeCombobox value={caseType} onChange={onCaseTypeChange} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Region</span>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            value={region}
            onChange={(e) => onRegionChange(e.target.value)}
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
            onChange={(e) => onAblPriceChange(e.target.value)}
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
        onClick={onGenerate}
      >
        Generate Invoice & Receipt
      </button>
      <button
        type="button"
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        onClick={onDownloadInvoice}
        disabled={isDownloadingInvoice}
      >
        <Download size={16} />
        {isDownloadingInvoice ? 'Preparing...' : 'Download Invoice PDF'}
      </button>
      <button
        type="button"
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
        onClick={onDownloadReceipt}
        disabled={isDownloadingReceipt}
      >
        <Download size={16} />
        {isDownloadingReceipt ? 'Preparing...' : 'Download Receipt PDF'}
      </button>
    </aside>
  )
}

export default InputPanel
