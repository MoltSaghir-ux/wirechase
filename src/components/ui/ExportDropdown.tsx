'use client'

import { useState, useRef, useEffect } from 'react'

export default function ExportDropdown({ loanId, fileNumber }: { loanId: string; fileNumber?: string | null }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-3 py-1 rounded-lg hover:bg-gray-100 transition flex items-center gap-1.5"
      >
        ⬇ Export
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-8 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden w-52">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-4 pt-3 pb-1">Download Format</p>
          <a
            href={`/api/loans/export-mismo?loanId=${loanId}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition"
          >
            <span className="text-base">📄</span>
            <div>
              <p className="text-xs font-semibold text-gray-700">MISMO 3.4 XML</p>
              <p className="text-[10px] text-gray-400">Rocket, UWM, most LOS</p>
            </div>
          </a>
          <a
            href={`/api/loans/export-fnm?loanId=${loanId}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition border-t border-gray-50"
          >
            <span className="text-base">📋</span>
            <div>
              <p className="text-xs font-semibold text-gray-700">Fannie Mae 3.2</p>
              <p className="text-[10px] text-gray-400">DU / legacy LOS</p>
            </div>
          </a>
        </div>
      )}
    </div>
  )
}
