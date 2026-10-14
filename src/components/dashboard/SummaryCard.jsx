// src/components/dashboard/SummaryCard.jsx

import React from 'react'
import { useNavigate } from 'react-router-dom'

// ============================================================
// ✅ NEW: Mini Type Badge Component
// ============================================================
const MiniTypeBadge = ({ type, count }) => {
  const getTypeStyles = (trashType) => {
    const t = trashType?.toLowerCase() || ''
    switch (t) {
      case 'biodegradable':
        return { bg: 'bg-green-100', text: 'text-green-700', icon: '🌿' }
      case 'non-biodegradable':
        return { bg: 'bg-blue-100', text: 'text-blue-700', icon: '📦' }
      case 'recyclable':
        return { bg: 'bg-orange-100', text: 'text-orange-700', icon: '♻️' }
      case 'hazardous':
      case 'hazard':
        return { bg: 'bg-red-100', text: 'text-red-700', icon: '☢️' }
      case 'all types':
      case 'all-types':
        return { bg: 'bg-purple-100', text: 'text-purple-700', icon: '⭐' }
      case 'multiple':
        return { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: '🔢' }
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', icon: '📋' }
    }
  }

  const styles = getTypeStyles(type)

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${styles.bg} ${styles.text}`}>
      <span>{styles.icon}</span>
      {count !== undefined ? (
        <span>{count}</span>
      ) : (
        <span className="max-w-[60px] truncate">{type}</span>
      )}
    </span>
  )
}

// ============================================================
// ✅ NEW: Types Breakdown Component
// ============================================================
const TypesBreakdown = ({ breakdown, compact = false }) => {
  if (!breakdown || Object.keys(breakdown).length === 0) return null

  const entries = Object.entries(breakdown)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])

  if (compact) {
    // Show only icons with counts
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {entries.slice(0, 4).map(([type, count]) => (
          <MiniTypeBadge key={type} type={type} count={count} />
        ))}
        {entries.length > 4 && (
          <span className="text-[10px] text-gray-500 font-medium px-1">
            +{entries.length - 4}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1.5 mt-3 pt-3 border-t border-gray-100">
      <p className="text-[10px] font-semibold text-gray-500 uppercase">Type Breakdown</p>
      <div className="grid grid-cols-2 gap-1">
        {entries.map(([type, count]) => (
          <div 
            key={type} 
            className="flex items-center justify-between text-[10px] bg-gray-50 rounded-md px-2 py-1"
          >
            <MiniTypeBadge type={type} />
            <span className="font-bold text-gray-700">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// ✅ NEW: Multi-Type Indicator Component
// ============================================================
const MultiTypeIndicator = ({ allTypesCount, multipleTypesCount, singleTypeCount }) => {
  const total = (allTypesCount || 0) + (multipleTypesCount || 0) + (singleTypeCount || 0)
  
  if (total === 0) return null

  const allPercent = total > 0 ? ((allTypesCount || 0) / total) * 100 : 0
  const multiPercent = total > 0 ? ((multipleTypesCount || 0) / total) * 100 : 0
  const singlePercent = total > 0 ? ((singleTypeCount || 0) / total) * 100 : 0

  return (
    <div className="mt-3 space-y-2">
      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
        {allPercent > 0 && (
          <div 
            className="bg-purple-500 transition-all duration-500" 
            style={{ width: `${allPercent}%` }}
            title={`All Types: ${allTypesCount}`}
          />
        )}
        {multiPercent > 0 && (
          <div 
            className="bg-indigo-500 transition-all duration-500" 
            style={{ width: `${multiPercent}%` }}
            title={`Multiple Types: ${multipleTypesCount}`}
          />
        )}
        {singlePercent > 0 && (
          <div 
            className="bg-gray-400 transition-all duration-500" 
            style={{ width: `${singlePercent}%` }}
            title={`Single Type: ${singleTypeCount}`}
          />
        )}
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-[10px]">
        {allTypesCount > 0 && (
          <span className="flex items-center gap-1 text-purple-600">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            All: {allTypesCount}
          </span>
        )}
        {multipleTypesCount > 0 && (
          <span className="flex items-center gap-1 text-indigo-600">
            <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
            Multi: {multipleTypesCount}
          </span>
        )}
        {singleTypeCount > 0 && (
          <span className="flex items-center gap-1 text-gray-600">
            <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
            Single: {singleTypeCount}
          </span>
        )}
      </div>
    </div>
  )
}

// ============================================================
// ✅ MAIN: SummaryCard Component
// ============================================================
const SummaryCard = ({ 
  title, 
  value, 
  icon, 
  color = 'blue', 
  trend, 
  trendUp, 
  subtitle,
  linkTo,
  onViewDetails,
  // ✅ NEW: Multi-type support props
  variant = 'standard',      // 'standard' | 'all-types' | 'multi-types' | 'compact'
  typesBreakdown = null,     // { Biodegradable: 5, 'Non-Biodegradable': 3, ... }
  allTypesCount = null,      // Count of "all types" records
  multipleTypesCount = null, // Count of multiple types records
  singleTypeCount = null,    // Count of single type records
  showTypeIndicator = false, // Show the type distribution bar
  badges = [],               // Array of mini badges to display
  highlighted = false,       // Add special highlight effect
  pulseAnimation = false,    // Add pulse animation to value
}) => {
  const navigate = useNavigate()

  // ✅ MODIFIED: Added indigo color for multi-types
  const colorClasses = {
    blue: {
      bg: 'from-blue-500 to-blue-600',
      lightBg: 'from-blue-50 to-blue-100',
      text: 'text-blue-600',
      iconBg: 'bg-blue-100',
      border: 'border-blue-200',
      hoverBg: 'hover:bg-blue-50',
      ring: 'ring-blue-300'
    },
    green: {
      bg: 'from-green-500 to-green-600',
      lightBg: 'from-green-50 to-green-100',
      text: 'text-green-600',
      iconBg: 'bg-green-100',
      border: 'border-green-200',
      hoverBg: 'hover:bg-green-50',
      ring: 'ring-green-300'
    },
    red: {
      bg: 'from-red-500 to-red-600',
      lightBg: 'from-red-50 to-red-100',
      text: 'text-red-600',
      iconBg: 'bg-red-100',
      border: 'border-red-200',
      hoverBg: 'hover:bg-red-50',
      ring: 'ring-red-300'
    },
    yellow: {
      bg: 'from-yellow-500 to-yellow-600',
      lightBg: 'from-yellow-50 to-yellow-100',
      text: 'text-yellow-600',
      iconBg: 'bg-yellow-100',
      border: 'border-yellow-200',
      hoverBg: 'hover:bg-yellow-50',
      ring: 'ring-yellow-300'
    },
    orange: {
      bg: 'from-orange-500 to-orange-600',
      lightBg: 'from-orange-50 to-orange-100',
      text: 'text-orange-600',
      iconBg: 'bg-orange-100',
      border: 'border-orange-200',
      hoverBg: 'hover:bg-orange-50',
      ring: 'ring-orange-300'
    },
    cyan: {
      bg: 'from-cyan-500 to-cyan-600',
      lightBg: 'from-cyan-50 to-cyan-100',
      text: 'text-cyan-600',
      iconBg: 'bg-cyan-100',
      border: 'border-cyan-200',
      hoverBg: 'hover:bg-cyan-50',
      ring: 'ring-cyan-300'
    },
    emerald: {
      bg: 'from-emerald-500 to-emerald-600',
      lightBg: 'from-emerald-50 to-emerald-100',
      text: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
      border: 'border-emerald-200',
      hoverBg: 'hover:bg-emerald-50',
      ring: 'ring-emerald-300'
    },
    purple: {
      bg: 'from-purple-500 to-purple-600',
      lightBg: 'from-purple-50 to-purple-100',
      text: 'text-purple-600',
      iconBg: 'bg-purple-100',
      border: 'border-purple-200',
      hoverBg: 'hover:bg-purple-50',
      ring: 'ring-purple-300'
    },
    // ✅ NEW: Indigo for multiple types
    indigo: {
      bg: 'from-indigo-500 to-indigo-600',
      lightBg: 'from-indigo-50 to-indigo-100',
      text: 'text-indigo-600',
      iconBg: 'bg-indigo-100',
      border: 'border-indigo-200',
      hoverBg: 'hover:bg-indigo-50',
      ring: 'ring-indigo-300'
    },
    // ✅ NEW: Gray for single type
    gray: {
      bg: 'from-gray-500 to-gray-600',
      lightBg: 'from-gray-50 to-gray-100',
      text: 'text-gray-600',
      iconBg: 'bg-gray-100',
      border: 'border-gray-200',
      hoverBg: 'hover:bg-gray-50',
      ring: 'ring-gray-300'
    }
  }

  const selectedColor = colorClasses[color] || colorClasses.blue

  // ✅ Determine variant-specific styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'all-types':
        return {
          cardClass: 'ring-2 ring-purple-200 bg-gradient-to-br from-white to-purple-50',
          iconBg: 'bg-gradient-to-br from-purple-400 to-indigo-500',
          iconText: 'text-white',
          valueClass: 'bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent',
          badge: { text: '⭐ ALL', bg: 'bg-purple-100', color: 'text-purple-700' }
        }
      case 'multi-types':
        return {
          cardClass: 'ring-2 ring-indigo-200 bg-gradient-to-br from-white to-indigo-50',
          iconBg: 'bg-gradient-to-br from-indigo-400 to-blue-500',
          iconText: 'text-white',
          valueClass: 'bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent',
          badge: { text: '🔢 MULTI', bg: 'bg-indigo-100', color: 'text-indigo-700' }
        }
      case 'compact':
        return {
          cardClass: '',
          iconBg: `bg-gradient-to-br ${selectedColor.lightBg}`,
          iconText: '',
          valueClass: selectedColor.text,
          badge: null
        }
      default:
        return {
          cardClass: '',
          iconBg: `bg-gradient-to-br ${selectedColor.lightBg}`,
          iconText: '',
          valueClass: selectedColor.text,
          badge: null
        }
    }
  }

  const variantStyles = getVariantStyles()

  // Handle navigation
  const handleNavigation = (path) => {
    console.log('🔗 Navigating to:', path)
    
    navigate(path)
  }

  const handleViewDetailsClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (onViewDetails) {
      onViewDetails()
    } else if (linkTo) {
      handleNavigation(linkTo)
    }
  }

  const handleCardClick = () => {
    if (linkTo) {
      handleNavigation(linkTo)
    }
  }

  return (
    <div 
      className={`
        group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl 
        transition-all duration-300 overflow-hidden border border-gray-100 
        transform hover:-translate-y-1 cursor-pointer
        ${variantStyles.cardClass}
        ${highlighted ? `ring-2 ${selectedColor.ring} shadow-xl` : ''}
      `}
      onClick={handleCardClick}
    >
      {/* Decorative gradient background */}
      <div className={`
        absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${selectedColor.lightBg} 
        rounded-full opacity-50 -mr-16 -mt-16 group-hover:scale-150 
        transition-transform duration-500 pointer-events-none
      `}></div>

      {/* ✅ NEW: Variant badge (top-right corner) */}
      {variantStyles.badge && (
        <div className={`
          absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold
          ${variantStyles.badge.bg} ${variantStyles.badge.color}
          shadow-sm z-10
        `}>
          {variantStyles.badge.text}
        </div>
      )}
      
      <div className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <p className={`
                text-4xl font-bold 
                ${variantStyles.valueClass} 
                group-hover:scale-110 transition-transform
                ${pulseAnimation ? 'animate-pulse' : ''}
              `}>
                {value}
              </p>
              {trend && (
                <span className={`flex items-center text-sm font-semibold ${
                  trendUp ? 'text-green-600' : 'text-red-600'
                }`}>
                  {trendUp ? (
                    <svg className="w-4 h-4 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                  )}
                  {trend}
                </span>
              )}
            </div>
            
            {subtitle && (
              <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                {subtitle}
              </p>
            )}

            {/* ✅ NEW: Display badges */}
            {badges && badges.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {badges.map((badge, index) => (
                  <MiniTypeBadge key={index} type={badge.type} count={badge.count} />
                ))}
              </div>
            )}
          </div>
          
          <div className={`
            ${variantStyles.iconBg} 
            rounded-2xl p-4 shadow-md 
            group-hover:scale-110 group-hover:rotate-3 
            transition-all duration-300
          `}>
            <span className={`text-4xl ${variantStyles.iconText}`}>{icon}</span>
          </div>
        </div>

        {/* ✅ NEW: Multi-Type Indicator */}
        {showTypeIndicator && (allTypesCount !== null || multipleTypesCount !== null || singleTypeCount !== null) && (
          <MultiTypeIndicator 
            allTypesCount={allTypesCount}
            multipleTypesCount={multipleTypesCount}
            singleTypeCount={singleTypeCount}
          />
        )}

        {/* ✅ NEW: Types Breakdown */}
        {typesBreakdown && (
          <TypesBreakdown 
            breakdown={typesBreakdown} 
            compact={variant === 'compact'}
          />
        )}
        
        {/* View Details Section */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium flex items-center gap-1">
              <span className={`
                w-2 h-2 rounded-full animate-pulse
                ${variant === 'all-types' ? 'bg-purple-400' : 
                  variant === 'multi-types' ? 'bg-indigo-400' : 
                  selectedColor.iconBg}
              `}></span>
              {variant === 'all-types' ? 'All Types' : 
               variant === 'multi-types' ? 'Multiple Types' : 
               'Active'}
            </span>
            
            {linkTo ? (
              <button
                type="button"
                onClick={handleViewDetailsClick}
                className={`
                  ${variant === 'all-types' ? 'text-purple-600' : 
                    variant === 'multi-types' ? 'text-indigo-600' : 
                    selectedColor.text} 
                  font-semibold flex items-center cursor-pointer 
                  hover:underline transition-all z-10 relative
                `}
              >
                <span>View Details</span>
                <svg 
                  className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 5l7 7-7 7" 
                  />
                </svg>
              </button>
            ) : (
              <span className={`${selectedColor.text} font-semibold flex items-center opacity-50`}>
                <span>View Details</span>
                <svg 
                  className="w-4 h-4 ml-1" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 5l7 7-7 7" 
                  />
                </svg>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hover glow effect */}
      <div className={`
        absolute inset-0 bg-gradient-to-r ${selectedColor.bg} 
        opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none
      `}></div>

      {/* ✅ NEW: Special glow for all-types variant */}
      {variant === 'all-types' && (
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-indigo-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"></div>
      )}
      
      {variant === 'multi-types' && (
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-blue-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"></div>
      )}
    </div>
  )
}

// ============================================================
// ✅ NEW: Export sub-components for external use
// ============================================================
export { MiniTypeBadge, TypesBreakdown, MultiTypeIndicator }
export default SummaryCard