import React from 'react'
import hammerLogoImg from '@/assets/file000000009990820e9ed02e6aa20479a7-a4996.png'

interface BrandLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'full' | 'icon' | 'badge'
  showSlogan?: boolean
}

/**
 * Logo oficial Inteligência e Serviços
 * Cores: Azul (#004B87 / #005691 / #0284c7), Preto/Grafite (#0f172a), Branco (#ffffff)
 * Slogan: "Inteligência em gestão, excelência em serviços."
 */
export function InteligenciaLogo({
  className = '',
  size = 'md',
  variant = 'full',
  showSlogan = false,
}: BrandLogoProps) {
  const iconSizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-xl',
    xl: 'text-3xl',
  }

  const subSizeClasses = {
    sm: 'text-[7px] tracking-[0.2em]',
    md: 'text-[9px] tracking-[0.25em]',
    lg: 'text-xs tracking-[0.3em]',
    xl: 'text-sm tracking-[0.35em]',
  }

  const IconSymbol = () => (
    <svg
      viewBox="0 0 100 100"
      className={`${iconSizeClasses[size]} shrink-0 drop-shadow-sm`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Círculo base dividido em 4 quadrantes estilizados */}
      <circle cx="50" cy="50" r="48" fill="#004B87" />
      {/* Linhas divisórias */}
      <line x1="50" y1="2" x2="50" y2="98" stroke="#ffffff" strokeWidth="2.5" />
      <line x1="2" y1="50" x2="98" y2="50" stroke="#ffffff" strokeWidth="2.5" />

      {/* Quadrante 1 (Top Left): Documento/Prancheta/Checklist */}
      <g
        transform="translate(18, 14) scale(0.65)"
        stroke="#ffffff"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <rect x="4" y="6" width="24" height="30" rx="3" />
        <line x1="10" y1="14" x2="22" y2="14" />
        <line x1="10" y1="20" x2="22" y2="20" />
        <line x1="10" y1="26" x2="18" y2="26" />
      </g>

      {/* Quadrante 2 (Top Right): Usuário / Gestão / Pessoas */}
      <g transform="translate(56, 14) scale(0.65)" fill="#ffffff">
        <circle cx="16" cy="11" r="7" />
        <path d="M4 32 C4 23 10 20 16 20 C22 20 28 23 28 32 Z" />
      </g>

      {/* Quadrante 3 (Bottom Left): Alvo / Foco / Precisão */}
      <g
        transform="translate(17, 54) scale(0.65)"
        stroke="#ffffff"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <circle cx="16" cy="16" r="12" />
        <circle cx="16" cy="16" r="6" />
        <circle cx="16" cy="16" r="1.5" fill="#ffffff" />
        <path d="M26 6 L32 0" />
        <path d="M28 3 L32 0 L29 4" />
      </g>

      {/* Quadrante 4 (Bottom Right): Engrenagem / Mente Pensante / Inteligência */}
      <g
        transform="translate(55, 54) scale(0.65)"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <circle cx="16" cy="16" r="9" strokeDasharray="3 2" />
        <circle cx="16" cy="16" r="4" fill="#ffffff" />
        <path d="M16 3 V7 M16 25 V29 M3 16 H7 M25 16 H29" />
      </g>
    </svg>
  )

  if (variant === 'icon') {
    return <IconSymbol />
  }

  return (
    <div className={`flex flex-col items-start ${className}`}>
      <div className="flex items-center gap-3">
        <IconSymbol />
        <div className="flex flex-col leading-none">
          <span
            className={`font-black tracking-tight text-slate-900 uppercase font-sans ${textSizeClasses[size]}`}
          >
            INTELIGÊNCIA
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="h-[1.5px] w-3 bg-[#004B87]" />
            <span className={`font-bold text-[#004B87] uppercase ${subSizeClasses[size]}`}>
              SERVIÇOS
            </span>
            <span className="h-[1.5px] w-3 bg-[#004B87]" />
          </div>
        </div>
      </div>
      {showSlogan && (
        <p className="mt-3 text-xs sm:text-sm font-bold text-slate-800 tracking-wide uppercase">
          Inteligência em gestão, excelência em serviços
        </p>
      )}
    </div>
  )
}

/**
 * Logo oficial Hammer Segurança Privada
 * Cores: Preto (#000000 / #0f172a), Branco (#ffffff), Acentos sutis
 * Slogan: "Protegemos pessoas, patrimônio e o que realmente importa."
 */
export function HammerLogo({
  className = '',
  size = 'md',
  variant = 'full',
  showSlogan = false,
}: BrandLogoProps) {
  // Tamanhos da imagem oficial preservando proporções
  const imgSizeClasses = {
    sm: 'h-8 max-w-[140px]',
    md: 'h-10 max-w-[180px]',
    lg: 'h-16 max-w-[240px]',
    xl: 'h-24 sm:h-28 max-w-[320px]',
  }

  const iconSizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-14 w-14',
    xl: 'h-20 w-20',
  }

  if (variant === 'icon') {
    return (
      <img
        src={hammerLogoImg}
        alt="Hammer Segurança Privada"
        className={`${iconSizeClasses[size]} object-contain shrink-0 ${className}`}
      />
    )
  }

  return (
    <div className={`flex flex-col items-start ${className}`}>
      <img
        src={hammerLogoImg}
        alt="Hammer Segurança Privada"
        className={`${imgSizeClasses[size]} w-auto object-contain shrink-0 drop-shadow-xs`}
      />
      {showSlogan && (
        <p className="mt-3 text-xs sm:text-sm font-bold text-slate-800 tracking-wide uppercase">
          Protegemos pessoas, patrimônio e o que realmente importa
        </p>
      )}
    </div>
  )
}

/**
 * Componente unificado para exibir a logo da empresa correta baseada no slug, tipo ou seleção
 */
export function CompanyBrand({
  tipo,
  slug,
  size = 'md',
  variant = 'full',
  showSlogan = false,
  className = '',
}: {
  tipo?: 'seguranca' | 'servicos' | string
  slug?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'full' | 'icon' | 'badge'
  showSlogan?: boolean
  className?: string
}) {
  const isHammer =
    tipo === 'seguranca' ||
    slug === 'hammer-seguranca' ||
    (slug && slug.toLowerCase().includes('hammer'))

  if (isHammer) {
    return (
      <HammerLogo size={size} variant={variant} showSlogan={showSlogan} className={className} />
    )
  }

  return (
    <InteligenciaLogo size={size} variant={variant} showSlogan={showSlogan} className={className} />
  )
}
