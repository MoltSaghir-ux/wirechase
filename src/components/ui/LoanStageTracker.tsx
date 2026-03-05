'use client'

import { useState } from 'react'

export type LoanStage =
  | 'application'
  | 'processing'
  | 'submitted_uw'
  | 'conditional_approval'
  | 'clear_to_close'
  | 'closing'
  | 'funded'
  | 'denied'

const STAGES: { key: LoanStage; label: string; short: string; color: string }[] = [
  { key: 'application',          label: 'Application',          short: 'App',      color: 'bg-gray-400' },
  { key: 'processing',           label: 'Processing',           short: 'Proc',     color: 'bg-blue-500' },
  { key: 'submitted_uw',         label: 'Submitted to UW',      short: 'In UW',    color: 'bg-purple-500' },
  { key: 'conditional_approval', label: 'Conditional Approval', short: 'Cond. App',color: 'bg-yellow-500' },
  { key: 'clear_to_close',       label: 'Clear to Close',       short: 'CTC',      color: 'bg-emerald-500' },
  { key: 'closing',              label: 'Closing',              short: 'Closing',  color: 'bg-teal-500' },
  { key: 'funded',               label: 'Funded',               short: 'Funded',   color: 'bg-green-600' },
]

export default function LoanStageTracker({
  loanId,
  currentStage,
  isDenied,
}: {
  loanId: string
  currentStage: LoanStage
  isDenied: boolean
}) {
  const [stage, setStage] = useState<LoanStage>(currentStage)
  const [denied, setDenied] = useState(isDenied)
  const [saving, setSaving] = useState(false)

  const activeStages = STAGES.filter(s => s.key !== 'denied')
  const currentIdx = activeStages.findIndex(s => s.key === stage)

  async function updateStage(newStage: LoanStage) {
    setSaving(true)
    const res = await fetch('/api/loans/update-stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loanId, stage: newStage }),
    })
    if (res.ok) {
      setStage(newStage)
      setDenied(newStage === 'denied')
    }
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800 text-sm">Loan Stage</h3>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-gray-400 animate-pulse">Saving…</span>}
          <button
            onClick={() => updateStage('denied')}
            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition border ${
              denied
                ? 'bg-red-100 text-red-700 border-red-200'
                : 'text-gray-400 border-gray-200 hover:border-red-300 hover:text-red-500'
            }`}
          >
            {denied ? '✕ Denied' : 'Mark Denied'}
          </button>
        </div>
      </div>

      {denied ? (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
          This loan has been denied.{' '}
          <button onClick={() => updateStage('processing')} className="underline text-red-500 hover:text-red-700">
            Reopen
          </button>
        </div>
      ) : (
        <div className="relative">
          {/* Progress bar */}
          <div className="flex items-center gap-0 mb-3">
            {activeStages.map((s, i) => {
              const isComplete = i < currentIdx
              const isCurrent = i === currentIdx
              const isLast = i === activeStages.length - 1
              return (
                <div key={s.key} className="flex items-center flex-1 min-w-0">
                  <button
                    onClick={() => !saving && updateStage(s.key)}
                    title={s.label}
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition border-2 ${
                      isCurrent
                        ? `${s.color} text-white border-transparent shadow-md scale-110`
                        : isComplete
                        ? 'bg-blue-600 text-white border-transparent'
                        : 'bg-white border-gray-200 text-gray-300 hover:border-blue-300'
                    }`}
                  >
                    {isComplete ? '✓' : i + 1}
                  </button>
                  {!isLast && (
                    <div className={`flex-1 h-0.5 mx-0.5 ${i < currentIdx ? 'bg-blue-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Stage labels */}
          <div className="flex items-start gap-0">
            {activeStages.map((s, i) => {
              const isCurrent = i === currentIdx
              return (
                <div key={s.key} className="flex-1 min-w-0 text-center">
                  <p className={`text-[10px] font-medium leading-tight truncate px-0.5 ${
                    isCurrent ? 'text-blue-600' : i < currentIdx ? 'text-gray-500' : 'text-gray-300'
                  }`}>
                    {s.short}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Current stage callout */}
          <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${activeStages[currentIdx]?.color ?? 'bg-gray-400'} text-white`}>
            <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
            {activeStages[currentIdx]?.label ?? 'Unknown'}
          </div>
        </div>
      )}
    </div>
  )
}
