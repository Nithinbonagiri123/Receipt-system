import { CURRENCY, GOV_RATE, VAT_RATE } from './constants'

export const formatMoney = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: 2,
  }).format(value)

export const todayLabel = () =>
  new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

export const createInvoiceNumber = () => {
  const randomId = Math.floor(1000 + Math.random() * 9000)
  return `#INV-${randomId}`
}

export const computeTotals = (ablPrice, region) => {
  const subtotal = Number.parseFloat(ablPrice) || 0
  const vatAmount = region === 'EU' ? subtotal * VAT_RATE : 0
  const govCharge = subtotal * GOV_RATE
  const grandTotal = subtotal + vatAmount + govCharge
  return { subtotal, vatAmount, govCharge, grandTotal }
}
