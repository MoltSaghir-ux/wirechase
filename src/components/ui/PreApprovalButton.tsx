'use client'

import { useState } from 'react'
import PreApprovalModal from './PreApprovalModal'

type Props = {
  loanId: string
  clientName: string
  loanAmount: number | null
  purchasePrice: number | null
  loanType: string
  loanPurpose: string
  propertyAddress?: string | null
  brokerageName?: string | null
}

export default function PreApprovalButton({
  loanId,
  clientName,
  loanAmount,
  purchasePrice,
  loanType,
  loanPurpose,
  propertyAddress,
  brokerageName,
}: Props) {
  const [showPreApproval, setShowPreApproval] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowPreApproval(true)}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-1.5"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
        Pre-Approval Letter
      </button>

      {showPreApproval && (
        <PreApprovalModal
          loanId={loanId}
          clientName={clientName}
          loanAmount={loanAmount ?? purchasePrice ?? undefined}
          propertyAddress={propertyAddress ?? undefined}
          loanType={loanType}
          loanPurpose={loanPurpose}
          brokerageName={brokerageName ?? undefined}
          onClose={() => setShowPreApproval(false)}
        />
      )}
    </>
  )
}
