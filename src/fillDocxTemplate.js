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

  for (const [sample, replacement] of replacements) {
    if (!sample) continue
    let cursor = 0
    while (true) {
      const idx = concat.indexOf(sample, cursor)
      if (idx === -1) break
      const endIdx = idx + sample.length
      const affected = nodes.filter(
        (n) => n.concatEnd > idx && n.concatStart < endIdx,
      )
      if (!affected.length) {
        cursor = endIdx
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
    }
  }

  // Reassemble XML: rewrite each <w:t> node in reverse order so offsets stay valid.
  let result = xml
  const sorted = [...nodes].sort((a, b) => b.matchStart - a.matchStart)
  for (const n of sorted) {
    const needsPreserve = /^\s|\s$/.test(n.text) && !/xml:space=/.test(n.attrs)
    const attrs = needsPreserve ? `${n.attrs} xml:space="preserve"` : n.attrs
    const replacementXml = `<w:t${attrs}>${escapeXml(n.text)}</w:t>`
    result = result.slice(0, n.matchStart) + replacementXml + result.slice(n.matchEnd)
  }
  return result
}

export async function fillDocxTemplate(templateBytes, replacements) {
  const zip = await JSZip.loadAsync(templateBytes)
  const docFile = zip.file('word/document.xml')
  if (!docFile) throw new Error('Template is missing word/document.xml')
  const originalXml = await docFile.async('string')
  const modifiedXml = substituteTextNodes(originalXml, replacements)
  zip.file('word/document.xml', modifiedXml)
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
}
