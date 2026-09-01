import React from 'react'
import hammerLogoImg from '@/assets/img-20260811-wa0019-e4480.jpg'
import inteligenciaLogoImg from '@/assets/img-20260811-wa00181-1942d.jpg'

interface BrandLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'full' | 'icon' | 'badge'
  showSlogan?: boolean
}

/**
 * Logo oficial Inteligência e Serviços
 * Arquivo gráfico original: quadrantes com "INTELIGÊNCIA SERVIÇOS"
 * Slogan: "Inteligência em gestão, excelência em serviços."
 */
export function InteligenciaLogo({
  className = '',
  size = 'md',
  variant = 'full',
  showSlogan = false,
}: BrandLogoProps) {
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
        src={inteligenciaLogoImg}
        alt="Inteligência Serviços"
        className={`${iconSizeClasses[size]} object-contain shrink-0 ${className}`}
      />
    )
  }

  return (
    <div className={`flex flex-col items-start ${className}`}>
      <img
        src={inteligenciaLogoImg}
        alt="Inteligência Serviços"
        className={`${imgSizeClasses[size]} w-auto object-contain shrink-0 drop-shadow-xs`}
      />
      {showSlogan && (
        <p className="mt-3 text-xs sm:text-sm font-bold text-[#004B87] tracking-wide uppercase">
          Inteligência em gestão, excelência em serviços
        </p>
      )}
    </div>
  )
}

/**
 * Logo oficial Hammer Segurança Privada
 * Arquivo gráfico original: brasão metálico "HAMMER SEGURANÇA PRIVADA"
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
