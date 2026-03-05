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
      <rect width="40" height="40" rx="8" fill="#0f2240"/>
      <path d="M7 11 L12 29 L20 18 L28 29 L33 11" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <line x1="4" y1="22" x2="36" y2="22" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )

  if (variant === 'icon') return <span className={className}>{icon}</span>

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {icon}
      <span
        className={`font-semibold tracking-tight ${textSizes[size]}`}
        style={{ color: '#0f2240', fontFamily: 'Georgia, "Times New Roman", serif', letterSpacing: '-0.02em' }}
      >
        Wire<span style={{ color: '#c9a84c' }}>Chase</span>
      </span>
    </span>
  )
}
