'use client'
import { useState } from 'react'

const DEFAULT_ORDER = [
  'Loan Application (1003)',
  'Credit Report',
  'Income — Pay Stubs',
  'Income — W-2s',
  'Income — Tax Returns',
  'Bank Statements',
  'Asset Statements',
  'Employment Verification',
  'Property — Purchase Agreement',
  'Property — Appraisal',
  'Title Commitment',
  'Homeowners Insurance',
  'Government ID',
  'Letter of Explanation (if any)',
  'Other Supporting Documents',
]

type Doc = {
  id: string
  label: string
  status: string
  doc_type?: string
}

export default function StackingOrder({ docs }: { docs: Doc[] }) {
  const [open, setOpen] = useState(false)

  const approvedDocs = docs.filter(d => d.status === 'approved')

  const sorted = [...approvedDocs].sort((a, b) => {
    const ai = DEFAULT_ORDER.findIndex(o =>
      a.label.toLowerCase().includes(o.toLowerCase().split(' ')[0]) ||
      a.doc_type?.toLowerCase().includes(o.toLowerCase().split(' ')[0])
    )
    const bi = DEFAULT_ORDER.findIndex(o =>
      b.label.toLowerCase().includes(o.toLowerCase().split(' ')[0]) ||
      b.doc_type?.toLowerCase().includes(o.toLowerCase().split(' ')[0])
    )
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition"
      >
        📋 Stacking Order ({approvedDocs.length} approved)
      </button>
    )
  }

  return (
    <div className="bg-white border border-purple-100 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Submission Stacking Order</h3>
          <p className="text-xs text-gray-400 mt-0.5">Approved docs sorted in standard UW submission order.</p>
        </div>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
      </div>

      {approvedDocs.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No approved documents yet.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((doc, i) => (
            <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{doc.label}</p>
                {doc.doc_type && <p className="text-xs text-gray-400">{doc.doc_type}</p>}
              </div>
              <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full flex-shrink-0">✓ Approved</span>
            </div>
          ))}
        </div>
      )}

      <div className="pt-2 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          {approvedDocs.length} approved · {docs.filter(d => d.status === 'uploaded').length} under review · {docs.filter(d => d.status === 'missing').length} missing
        </p>
        <button
          onClick={() => {
            const text = sorted.map((d, i) => `${i + 1}. ${d.label}`).join('\n')
            navigator.clipboard?.writeText(text)
          }}
          className="mt-2 text-xs text-purple-600 hover:text-purple-800 font-medium"
        >
          📋 Copy list to clipboard
        </button>
      </div>
    </div>
  )
}
