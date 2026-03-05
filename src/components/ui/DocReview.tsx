'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DocReviewProps {
  docRequestId: string
  currentStatus: string
  docType?: string | null
  dateRangeStart?: string | null
  dateRangeEnd?: string | null
  borrowerType?: string | null
}

const DOC_TYPES = ['Pay Stub', 'Bank Statement', 'W-2', 'Tax Return (1040)', 'Profit & Loss', 'VOE', 'Photo ID', 'Purchase Agreement', 'Homeowners Insurance', 'HOA Docs', 'Title Commitment', 'Gift Letter', 'Other']

export default function DocReview(props: DocReviewProps) {
  const { docRequestId, currentStatus } = props
  const [mode, setMode] = useState<'idle' | 'rejecting'>('idle')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(currentStatus === 'approved' || currentStatus === 'rejected' ? currentStatus : '')
  const router = useRouter()

  const [showMeta, setShowMeta] = useState(false)
  const [docType, setDocType] = useState(props.docType ?? '')
  const [dateStart, setDateStart] = useState(props.dateRangeStart ?? '')
  const [dateEnd, setDateEnd] = useState(props.dateRangeEnd ?? '')
  const [borrowerType, setBorrowerType] = useState(props.borrowerType ?? 'primary')
  const [savingMeta, setSavingMeta] = useState(false)
  const [metaSaved, setMetaSaved] = useState(false)

  async function submit(action: 'approved' | 'rejected') {
    setLoading(true)
    const res = await fetch('/api/broker/review-doc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docRequestId, action, note: note.trim() }),
    })
    setLoading(false)
    if (res.ok) {
      setDone(action)
      setMode('idle')
      router.refresh()
    }
  }

  async function saveMeta() {
    setSavingMeta(true)
    await fetch(`/api/doc-metadata/${docRequestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_type: docType || null, date_range_start: dateStart || null, date_range_end: dateEnd || null, borrower_type: borrowerType }),
    })
    setSavingMeta(false)
    setMetaSaved(true)
    setTimeout(() => setMetaSaved(false), 2000)
  }

  if (done === 'approved') return (
    <div className="mt-3 ml-5">
      <span className="text-xs font-medium text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-lg">✓ Approved</span>
      <div className="mt-2 pt-2 border-t border-gray-100">
        <button onClick={() => setShowMeta(!showMeta)} className="text-xs text-gray-400 hover:text-gray-600 transition flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 inline mr-1"><path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" /></svg> {showMeta ? 'Hide metadata' : 'Set metadata'}
          {(props.docType || props.dateRangeStart) && !showMeta && (
            <span className="ml-1 text-blue-500 font-medium">✓ set</span>
          )}
        </button>
        {showMeta && (
          <div className="mt-2 space-y-2 bg-gray-50 rounded-xl p-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Doc Type</label>
                <select value={docType} onChange={e => setDocType(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                  <option value="">— Select —</option>
                  {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Borrower</label>
                <select value={borrowerType} onChange={e => setBorrowerType(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                  <option value="primary">Primary</option>
                  <option value="co_borrower">Co-Borrower</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Period Start</label>
                <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Period End</label>
                <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
              </div>
            </div>
            <button onClick={saveMeta} disabled={savingMeta}
              className="text-xs bg-gray-800 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 transition">
              {metaSaved ? '✓ Saved' : savingMeta ? 'Saving...' : 'Save Metadata'}
            </button>
          </div>
        )}
      </div>
    </div>
  )

  if (done === 'rejected') return (
    <div className="mt-3 ml-5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-red-500 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">✕ Rejected</span>
        <button onClick={() => { setDone(''); setMode('idle') }} className="text-xs text-gray-400 hover:text-gray-600">Undo</button>
      </div>
      <div className="mt-2 pt-2 border-t border-gray-100">
        <button onClick={() => setShowMeta(!showMeta)} className="text-xs text-gray-400 hover:text-gray-600 transition flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 inline mr-1"><path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" /></svg> {showMeta ? 'Hide metadata' : 'Set metadata'}
          {(props.docType || props.dateRangeStart) && !showMeta && (
            <span className="ml-1 text-blue-500 font-medium">✓ set</span>
          )}
        </button>
        {showMeta && (
          <div className="mt-2 space-y-2 bg-gray-50 rounded-xl p-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Doc Type</label>
                <select value={docType} onChange={e => setDocType(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                  <option value="">— Select —</option>
                  {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Borrower</label>
                <select value={borrowerType} onChange={e => setBorrowerType(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                  <option value="primary">Primary</option>
                  <option value="co_borrower">Co-Borrower</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Period Start</label>
                <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Period End</label>
                <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
              </div>
            </div>
            <button onClick={saveMeta} disabled={savingMeta}
              className="text-xs bg-gray-800 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 transition">
              {metaSaved ? '✓ Saved' : savingMeta ? 'Saving...' : 'Save Metadata'}
            </button>
          </div>
        )}
      </div>
    </div>
  )

  if (currentStatus !== 'uploaded') return null

  return (
    <div className="mt-3 ml-5">
      {mode === 'idle' && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => submit('approved')}
            disabled={loading}
            className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition disabled:opacity-50"
          >
            ✓ Approve
          </button>
          <button
            onClick={() => setMode('rejecting')}
            className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition"
          >
            ✕ Reject
          </button>
        </div>
      )}

      {mode === 'rejecting' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2">
          <p className="text-xs font-medium text-red-700">Add a note for the client (optional)</p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="e.g. Please upload a clearer copy — we need all pages visible."
            className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 bg-white resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => submit('rejected')}
              disabled={loading}
              className="text-xs font-semibold text-white bg-red-600 px-3 py-1.5 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Reject & Notify Client'}
            </button>
            <button onClick={() => { setMode('idle'); setNote('') }} className="text-xs text-gray-400 hover:text-gray-600">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-2 pt-2 border-t border-gray-100">
        <button onClick={() => setShowMeta(!showMeta)} className="text-xs text-gray-400 hover:text-gray-600 transition flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 inline mr-1"><path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" /></svg> {showMeta ? 'Hide metadata' : 'Set metadata'}
          {(props.docType || props.dateRangeStart) && !showMeta && (
            <span className="ml-1 text-blue-500 font-medium">✓ set</span>
          )}
        </button>
        {showMeta && (
          <div className="mt-2 space-y-2 bg-gray-50 rounded-xl p-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Doc Type</label>
                <select value={docType} onChange={e => setDocType(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                  <option value="">— Select —</option>
                  {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Borrower</label>
                <select value={borrowerType} onChange={e => setBorrowerType(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                  <option value="primary">Primary</option>
                  <option value="co_borrower">Co-Borrower</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Period Start</label>
                <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Period End</label>
                <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
              </div>
            </div>
            <button onClick={saveMeta} disabled={savingMeta}
              className="text-xs bg-gray-800 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 transition">
              {metaSaved ? '✓ Saved' : savingMeta ? 'Saving...' : 'Save Metadata'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
