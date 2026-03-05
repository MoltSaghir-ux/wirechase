import React from 'react'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'full' | 'icon'
  className?: string
}

export default function Logo({ size = 'md', variant = 'full', className = '' }: LogoProps) {
  const iconSizes = { sm: 28, md: 36, lg: 48 }
  const textSizes = { sm: 'text-lg', md: 'text-xl', lg: 'text-2xl' }
  const px = iconSizes[size]

  const icon = (
    <svg width={px} height={px} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="9" fill="#0f2240"/>
      {/* Abstract diamond outline */}
      <path d="M20 7 L33 20 L20 33 L7 20 Z" stroke="white" strokeWidth="2.5" fill="none" strokeLinejoin="round"/>
      {/* Inner diamond, smaller, gold filled */}
      <path d="M20 14 L26 20 L20 26 L14 20 Z" stroke="#c9a84c" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
      {/* Gold center dot */}
      <circle cx="20" cy="20" r="2" fill="#c9a84c"/>
    </svg>
  )

  if (variant === 'icon') return <span className={className}>{icon}</span>

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {icon}
      <span
        className={`font-semibold tracking-tight ${textSizes[size]}`}
        style={{ color: 'inherit', fontFamily: 'Georgia, "Times New Roman", serif', letterSpacing: '-0.02em' }}
      >
        Wire<span style={{ color: '#c9a84c' }}>Chase</span>
      </span>
    </span>
  )
}
