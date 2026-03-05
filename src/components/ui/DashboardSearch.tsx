'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'

export default function DashboardSearch({ defaultValue = '' }: { defaultValue?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [value, setValue] = useState(defaultValue)

  function handleChange(val: string) {
    setValue(val)
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (val) params.set('q', val)
      else params.delete('q')
      router.replace(`/broker/dashboard?${params.toString()}`)
    })
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-2.5 text-gray-400 text-sm">🔍</span>
      <input
        type="text"
        value={value}
        onChange={e => handleChange(e.target.value)}
        placeholder="Search by borrower name..."
        className={`pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-64 transition ${isPending ? 'opacity-60' : ''}`}
      />
      {value && (
        <button onClick={() => handleChange('')} className="absolute right-3 top-2.5 text-gray-300 hover:text-gray-500 text-xs">✕</button>
      )}
    </div>
  )
}
