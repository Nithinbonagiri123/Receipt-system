import { useMemo, useRef, useState } from 'react'

import { CASE_TYPES } from '../constants'

function CaseTypeCombobox({ value, onChange }) {
  const [query, setQuery] = useState(value)
  const [isOpen, setIsOpen] = useState(false)
  const wrapRef = useRef(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return CASE_TYPES
    return CASE_TYPES.filter((t) => t.toLowerCase().includes(q))
  }, [query])

  return (
    <div
      ref={wrapRef}
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setIsOpen(false)
          setQuery(value)
        }
      }}
    >
      <input
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-black outline-none focus:border-blue-500"
        value={query}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value)
          setIsOpen(true)
        }}
        placeholder="Select option"
        aria-label="Case Type"
      />

      {isOpen && (
        <div
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          role="listbox"
          tabIndex={-1}
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-black">No results</div>
          ) : (
            filtered.map((type) => (
              <button
                key={type}
                type="button"
                className="block w-full cursor-pointer px-3 py-2 text-left text-sm text-black hover:bg-slate-100"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(type)
                  setQuery(type)
                  setIsOpen(false)
                }}
              >
                {type}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default CaseTypeCombobox
