import { fillDocxTemplate } from './fillDocxTemplate'

export const INVOICE_TEMPLATE_URL = `${import.meta.env.BASE_URL}Invoice_.docx`

// Sample values baked into public/Invoice_.docx that we swap out per row.
// Keep in sync with the template file — if the template is regenerated with
// different sample data, these strings need to match what's actually in it.
const SAMPLE = {
  invoiceNumber: 'EXT-NG-105',
  date: '20 May 2026',
  clientName: 'SADZAUCHI Patience',
  // Paragraph 36 (plain, 15pt bold) — anchor + style donor for the Gov Fee
  // description row. Inserting after this paragraph places Gov Fee directly
  // below "(Reactivation of Employment Permit)" in the Description column,
  // and cloning its rPr keeps the font metrics identical to the amount cell.
  descriptionStyleDonor: '(Reactivation of Employment Permit)',
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
  const hasGovFee = Number.isFinite(row.govFee) && row.govFee > 0
  // Split the item row when a Gov Fee is present: the STAMP line now covers
  // ABL + Other Fees, and a second line under it shows the Gov Fee value.
  // Sub-total below stays at ABL + Gov + Other so amounts still reconcile.
  const stampAmount = hasGovFee ? row._subtotal - row.govFee : row._subtotal

  const replacements = [
    [SAMPLE.invoiceNumber, row.invoiceNumber || '—'],
    [SAMPLE.date, row.date || '—'],
    [SAMPLE.clientName, row.clientName || '—'],
    // Money substitutions run longest-sample first so a freshly-written
    // amount like "€ 799.00" can't later be matched by the shorter "€ 799"
    // sample when the row totals happen to collide with sample values.
    [SAMPLE.vat, money(row.vat)],
    [SAMPLE.total, money(row.total)],
    // Amount column (paragraph 61) — first occurrence of "€ 649.59".
    [SAMPLE.subtotal, money(stampAmount), { occurrence: 0 }],
    // Sub-total row — after the first was consumed, this is now the first
    // remaining occurrence of the original "€ 649.59" sample.
    [SAMPLE.subtotal, money(row._subtotal), { occurrence: 0 }],
  ]

  // When Gov Fee > 0, insert one extra row in each of the description and
  // amount columns.
  //
  // Description column: "Gov Fee" goes right under "(Reactivation of
  // Employment Permit)" (cloned from the same paragraph so it inherits the
  // plain 15pt styling).
  //
  // Amount column: "€ (Gov Fee)" needs to line up visually with "Gov Fee",
  // which sits below TWO wrapped lines of "(Reactivation of Employment
  // Permit)". Two BodyText spacer paragraphs before "€ (Gov Fee)" push it
  // down by about the same distance so the two rows line up.
  const paragraphInsertions = hasGovFee
    ? [
        {
          afterAnchorText: SAMPLE.descriptionStyleDonor,
          cloneFromText: SAMPLE.descriptionStyleDonor,
          newText: 'Gov Fee',
        },
        {
          afterAnchorText: SAMPLE.subtotal,
          cloneFromText: SAMPLE.subtotal,
          newText: money(row.govFee),
          spacersBefore: 2,
          // 2 spacers + 1 Gov Fee row = 3 new paragraphs in the amount column.
          // Reclaim that height by deleting 3 of the template's own blank
          // spacers that sit between the item amount and the sub-total value,
          // so the sub-total / VAT / total values keep lining up with their
          // labels in the adjacent column.
          deleteBlanksAfter: 3,
        },
      ]
    : []

  return fillDocxTemplate(templateBytes, replacements, {
    insertParagraphsAfter: paragraphInsertions,
  })
}

export function resetTemplateCache() {
  cachedTemplateBytes = null
}
