import { fillDocxTemplate } from './fillDocxTemplate'

export const INVOICE_TEMPLATE_URL = `${import.meta.env.BASE_URL}Invoice_.docx`

// Sample values baked into public/Invoice_.docx that we swap out per row.
// Keep in sync with the template file — if the template is regenerated with
// different sample data, these strings need to match what's actually in it.
const SAMPLE = {
  invoiceNumber: 'EXT-NG-105',
  date: '20 May 2026',
  clientName: 'SADZAUCHI Patience',
  subtotal: '€ 649.59',
  vat: '€ 149.41',
  total: '€ 799',
}

const money = (n) => {
  const value = Number.isFinite(n) ? n : 0
  return `€ ${value.toFixed(2)}`
}

let cachedTemplateBytes = null

async function loadTemplate() {
  if (cachedTemplateBytes) return cachedTemplateBytes
  const res = await fetch(INVOICE_TEMPLATE_URL)
  if (!res.ok) {
    throw new Error(
      `Template not found at ${INVOICE_TEMPLATE_URL}. Add Invoice_.docx to public/.`,
    )
  }
  cachedTemplateBytes = await res.arrayBuffer()
  return cachedTemplateBytes
}

export async function generateInvoiceDocx(row) {
  const templateBytes = await loadTemplate()
  const replacements = [
    [SAMPLE.invoiceNumber, row.invoiceNumber || '—'],
    [SAMPLE.date, row.date || '—'],
    [SAMPLE.clientName, row.clientName || '—'],
    // Order matters: replace subtotal (which appears twice) before VAT/total
    // to avoid the shorter '€ 799' pattern accidentally landing inside a
    // freshly-substituted value.
    [SAMPLE.subtotal, money(row._subtotal)],
    [SAMPLE.vat, money(row.vat)],
    [SAMPLE.total, money(row.total)],
  ]
  return fillDocxTemplate(templateBytes, replacements)
}

export function resetTemplateCache() {
  cachedTemplateBytes = null
}
