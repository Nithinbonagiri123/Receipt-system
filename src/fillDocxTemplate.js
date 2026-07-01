import JSZip from 'jszip'

const TEXT_NODE_RE = /<w:t(\s[^>]*)?>([^<]*)<\/w:t>/g

const escapeXml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

// Replace substrings in the concatenated visible text of a docx XML string,
// even when Word has split the target across multiple <w:t> runs.
// Preserves the surrounding run styling by keeping each affected run in place;
// the first affected run receives the replacement text, later ones are emptied.
function substituteTextNodes(xml, replacements) {
  const nodes = []
  let match
  TEXT_NODE_RE.lastIndex = 0
  while ((match = TEXT_NODE_RE.exec(xml)) !== null) {
    nodes.push({
      matchStart: match.index,
      matchEnd: match.index + match[0].length,
      attrs: match[1] || '',
      text: match[2],
    })
  }
  if (!nodes.length) return xml

  const recomputeSpans = () => {
    let cursor = 0
    for (const n of nodes) {
      n.concatStart = cursor
      n.concatEnd = cursor + n.text.length
      cursor += n.text.length
    }
    return cursor
  }
  recomputeSpans()
  let concat = nodes.map((n) => n.text).join('')

  for (const item of replacements) {
    const [sample, replacement, options = {}] = item
    if (!sample) continue
    const targetOccurrence = options.occurrence ?? 'all'
    let cursor = 0
    let occurrenceIdx = 0
    while (true) {
      const idx = concat.indexOf(sample, cursor)
      if (idx === -1) break
      const shouldReplace =
        targetOccurrence === 'all' || targetOccurrence === occurrenceIdx
      if (!shouldReplace) {
        cursor = idx + sample.length
        occurrenceIdx += 1
        continue
      }
      const endIdx = idx + sample.length
      const affected = nodes.filter(
        (n) => n.concatEnd > idx && n.concatStart < endIdx,
      )
      if (!affected.length) {
        cursor = endIdx
        occurrenceIdx += 1
        continue
      }
      const first = affected[0]
      const last = affected[affected.length - 1]
      const prefix = first.text.slice(0, idx - first.concatStart)
      const suffix = last.text.slice(endIdx - last.concatStart)

      if (affected.length === 1) {
        first.text = prefix + replacement + suffix
      } else {
        first.text = prefix + replacement
        for (let i = 1; i < affected.length - 1; i += 1) {
          affected[i].text = ''
        }
        last.text = suffix
      }
      recomputeSpans()
      concat = nodes.map((n) => n.text).join('')
      cursor = idx + replacement.length
      occurrenceIdx += 1
      if (targetOccurrence !== 'all') break
    }
  }

  // Reassemble XML: rewrite each <w:t> node in reverse order so offsets stay valid.
  // If a replacement text contains "\n", split it into multiple <w:t> elements
  // separated by <w:br/> so Word renders them as real soft line breaks.
  let result = xml
  const sorted = [...nodes].sort((a, b) => b.matchStart - a.matchStart)
  for (const n of sorted) {
    const parts = n.text.split('\n')
    const rendered = parts
      .map((part) => {
        const needsPreserve = /^\s|\s$/.test(part) && !/xml:space=/.test(n.attrs)
        const attrs = needsPreserve ? `${n.attrs} xml:space="preserve"` : n.attrs
        return `<w:t${attrs}>${escapeXml(part)}</w:t>`
      })
      .join('<w:br/>')
    result = result.slice(0, n.matchStart) + rendered + result.slice(n.matchEnd)
  }
  return result
}

const PARAGRAPH_RE = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g

// Grab the whole <w:p>...</w:p> whose concatenated w:t text contains `text`.
export function findParagraphContaining(xml, text) {
  let m
  PARAGRAPH_RE.lastIndex = 0
  while ((m = PARAGRAPH_RE.exec(xml)) !== null) {
    const paraXml = m[0]
    const nodes = [...paraXml.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)]
    const concat = nodes.map((n) => n[1]).join('')
    if (concat.includes(text)) {
      return { start: m.index, end: m.index + m[0].length, xml: paraXml }
    }
  }
  return null
}

// Rewrite the paragraph so the first <w:t> holds `newText` and the rest are
// blanked. Preserves the paragraph's styling (pPr) and the first run's rPr.
export function rewriteParagraphText(paragraphXml, newText) {
  let firstDone = false
  return paragraphXml.replace(
    /<w:t(\s[^>]*)?>([^<]*)<\/w:t>/g,
    (_m, attrs = '') => {
      if (!firstDone) {
        firstDone = true
        const needsPreserve =
          /^\s|\s$/.test(newText) && !/xml:space=/.test(attrs)
        const outAttrs = needsPreserve ? `${attrs} xml:space="preserve"` : attrs
        return `<w:t${outAttrs}>${escapeXml(newText)}</w:t>`
      }
      return `<w:t${attrs}></w:t>`
    },
  )
}

export function insertAfterParagraphContaining(xml, anchorText, paragraphXml) {
  const found = findParagraphContaining(xml, anchorText)
  if (!found) return xml
  return xml.slice(0, found.end) + paragraphXml + xml.slice(found.end)
}

export async function fillDocxTemplate(templateBytes, replacements, options = {}) {
  const zip = await JSZip.loadAsync(templateBytes)
  const docFile = zip.file('word/document.xml')
  if (!docFile) throw new Error('Template is missing word/document.xml')
  let xml = await docFile.async('string')

  // Paragraph insertions run BEFORE substitution so we can reuse an existing
  // paragraph as a style donor and let the same substitution pass fill the
  // clone's text (or, if the clone was seeded with a literal value, leave it
  // as-is). Each entry: { afterAnchorText, cloneFromText, newText }.
  const insertions = options.insertParagraphsAfter || []
  // BodyText spacer at 15pt — matches the spacers already in the template's
  // amount column so a swap keeps the column's total height constant.
  const BLANK_SPACER =
    '<w:p><w:pPr><w:pStyle w:val="BodyText"/><w:rPr><w:sz w:val="30"/></w:rPr></w:pPr></w:p>'
  for (const step of insertions) {
    const donor = findParagraphContaining(xml, step.cloneFromText)
    if (!donor) continue
    const clone = rewriteParagraphText(donor.xml, step.newText)
    const spacers = BLANK_SPACER.repeat(step.spacersBefore || 0)
    const content = spacers + clone

    const anchor = findParagraphContaining(xml, step.afterAnchorText)
    if (!anchor) continue

    // Insert the new content right after the anchor paragraph.
    xml = xml.slice(0, anchor.end) + content + xml.slice(anchor.end)

    // Optionally delete N blank paragraphs immediately after our insertion.
    // In multi-column sections the alignment between two columns depends on
    // both having the same paragraph count, so adding rows in one column
    // must be balanced by removing empty rows further down that same column.
    let deleteRemaining = step.deleteBlanksAfter || 0
    let cursor = anchor.end + content.length
    while (deleteRemaining > 0 && xml.startsWith('<w:p', cursor)) {
      const closeIdx = xml.indexOf('</w:p>', cursor)
      if (closeIdx === -1) break
      const paraEnd = closeIdx + '</w:p>'.length
      const paraXml = xml.slice(cursor, paraEnd)
      const textNodes = [
        ...paraXml.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g),
      ]
      const concat = textNodes.map((n) => n[1]).join('').trim()
      if (concat) break // Stop at the first paragraph that has real content.
      xml = xml.slice(0, cursor) + xml.slice(paraEnd)
      deleteRemaining -= 1
    }
  }

  xml = substituteTextNodes(xml, replacements)
  zip.file('word/document.xml', xml)
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
}
