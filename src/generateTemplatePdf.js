import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

import { TEMPLATE_PANEL_WIDTH } from './constants'
import { formatMoney } from './utils'

export async function generateTemplatePdf({
  documentType,
  customerName,
  contactInfo,
  caseType,
  region,
  invoiceNumber,
  invoiceDate,
  totals,
}) {
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
}
