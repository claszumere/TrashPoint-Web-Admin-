// src/components/map/MapView.jsx

import React, { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getMarkerColor } from '../../utils/helpers'

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ============================================================
// ✅ NEW: Helper functions for multi-select support
// ============================================================

// Parse trash_type which can be JSON array or single string
const parseTrashTypes = (trashType) => {
  if (!trashType) return [];
  
  try {
    const parsed = JSON.parse(trashType);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [String(parsed)];
  } catch {
    return [trashType];
  }
};

// All individual types constant
const ALL_INDIVIDUAL_TYPES = ['Biodegradable', 'Non-Biodegradable', 'Recyclable', 'Hazardous'];

// Check if all types are selected
const isAllTypesSelected = (types) => {
  if (!types || types.length === 0) return false;
  return ALL_INDIVIDUAL_TYPES.every(t => 
    types.some(type => type.toLowerCase() === t.toLowerCase())
  );
};

// ✅ Map Controller Component for auto-focus functionality
const MapController = ({ reports, filterTrashType, filterTypeSelection, getCoordinates, defaultCenter, defaultZoom }) => {
  const map = useMap()
  const previousFilterRef = useRef({ trashType: filterTrashType, typeSelection: filterTypeSelection })

  useEffect(() => {
    const filterChanged = 
      previousFilterRef.current.trashType !== filterTrashType ||
      previousFilterRef.current.typeSelection !== filterTypeSelection

    if (filterChanged) {
      previousFilterRef.current = { trashType: filterTrashType, typeSelection: filterTypeSelection }

      // If all filters are cleared, reset to default view
      if (filterTrashType === 'all' && filterTypeSelection === 'all') {
        map.flyTo(defaultCenter, defaultZoom, {
          duration: 1.5,
          easeLinearity: 0.25
        })
        return
      }

      // Get coordinates of all filtered reports
      const validCoordinates = reports
        .map((report, index) => {
          const coords = getCoordinates(report, index)
          if (coords && coords[0] && coords[1]) {
            return coords
          }
          return null
        })
        .filter(coords => coords !== null)

      if (validCoordinates.length > 0) {
        if (validCoordinates.length === 1) {
          map.flyTo(validCoordinates[0], 16, {
            duration: 1.5,
            easeLinearity: 0.25
          })
        } else {
          const bounds = L.latLngBounds(validCoordinates)
          map.flyToBounds(bounds, {
            padding: [50, 50],
            duration: 1.5,
            easeLinearity: 0.25,
            maxZoom: 16
          })
        }
      }
    }
  }, [filterTrashType, filterTypeSelection, reports, map, getCoordinates, defaultCenter, defaultZoom])

  return null
}

// ✅ MODIFIED: Custom CSS styles for tooltips with multi-type support
const injectTooltipStyles = () => {
  const styleId = 'trashpoint-tooltip-styles'
  
  if (document.getElementById(styleId)) return
  
  const styles = `
    /* Custom Tooltip Styles */
    .custom-tooltip {
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%) !important;
      border: none !important;
      border-radius: 12px !important;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1) !important;
      padding: 0 !important;
      min-width: 240px !important;
      max-width: 320px !important;
    }
    
    .custom-tooltip.leaflet-tooltip-top {
      margin-top: -12px !important;
    }
    
    .custom-tooltip.leaflet-tooltip-bottom {
      margin-top: 12px !important;
    }
    
    .custom-tooltip::before {
      display: none !important;
    }
    
    .custom-marker {
      cursor: pointer !important;
      pointer-events: auto !important;
    }
    
    .leaflet-marker-icon.custom-marker:hover {
      filter: brightness(1.1) drop-shadow(0 4px 8px rgba(0,0,0,0.3)) !important;
    }
    
    .leaflet-marker-pane {
      pointer-events: auto !important;
    }
    
    .tooltip-content {
      padding: 12px 14px;
    }
    
    .tooltip-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .tooltip-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: bold;
      color: white;
      flex-shrink: 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    /* ✅ NEW: Gradient avatar for multi-types */
    .tooltip-avatar-gradient {
      background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #3b82f6 100%) !important;
    }
    
    .tooltip-avatar-all-types {
      background: linear-gradient(135deg, #a855f7 0%, #8b5cf6 100%) !important;
      box-shadow: 0 0 0 2px #c4b5fd, 0 2px 4px rgba(0,0,0,0.1) !important;
    }
    
    .tooltip-name {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
      line-height: 1.3;
      word-break: break-word;
    }
    
    .tooltip-address {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
      line-height: 1.3;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .tooltip-details {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding-top: 10px;
    }
    
    /* ✅ NEW: Types section in tooltip */
    .tooltip-types-section {
      padding-top: 10px;
    }
    
    .tooltip-types-label {
      font-size: 10px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .tooltip-types-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    
    .tooltip-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
    }
    
    .tooltip-badge-green {
      background: #dcfce7;
      color: #166534;
    }
    
    .tooltip-badge-blue {
      background: #dbeafe;
      color: #1e40af;
    }
    
    .tooltip-badge-orange {
      background: #ffedd5;
      color: #c2410c;
    }
    
    .tooltip-badge-yellow {
      background: #fef9c3;
      color: #854d0e;
    }
    
    .tooltip-badge-red {
      background: #fee2e2;
      color: #991b1b;
    }
    
    .tooltip-badge-gray {
      background: #f1f5f9;
      color: #475569;
    }
    
    /* ✅ NEW: Purple badge for "All Types" */
    .tooltip-badge-purple {
      background: linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%);
      color: #7c3aed;
      border: 1px solid #c4b5fd;
      font-weight: 600;
    }
    
    /* ✅ NEW: Indigo badge for "Multiple Types" */
    .tooltip-badge-indigo {
      background: linear-gradient(135deg, #e0e7ff 0%, #eef2ff 100%);
      color: #4f46e5;
      border: 1px solid #a5b4fc;
    }
    
    .tooltip-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 8px;
      margin-top: 8px;
      border-top: 1px dashed #e2e8f0;
    }
    
    .tooltip-hint {
      font-size: 10px;
      color: #94a3b8;
      font-style: italic;
    }
    
    .tooltip-status {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      font-weight: 500;
    }
    
    .tooltip-status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    
    /* ✅ NEW: Status colors based on type count */
    .tooltip-status-all {
      color: #8b5cf6;
    }
    .tooltip-status-all .tooltip-status-dot {
      background: #8b5cf6;
    }
    
    .tooltip-status-multi {
      color: #6366f1;
    }
    .tooltip-status-multi .tooltip-status-dot {
      background: #6366f1;
    }
    
    .tooltip-status-single {
      color: #22c55e;
    }
    .tooltip-status-single .tooltip-status-dot {
      background: #22c55e;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .leaflet-popup {
      z-index: 1000 !important;
    }
    
    .leaflet-tooltip {
      z-index: 900 !important;
    }
    
    /* ✅ NEW: All Types special marker glow */
    .all-types-marker {
      animation: allTypesGlow 2s ease-in-out infinite;
    }
    
    @keyframes allTypesGlow {
      0%, 100% { filter: drop-shadow(0 0 4px rgba(139, 92, 246, 0.5)); }
      50% { filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.8)); }
    }
  `
  
  const styleElement = document.createElement('style')
  styleElement.id = styleId
  styleElement.textContent = styles
  document.head.appendChild(styleElement)
}

// ✅ MODIFIED: Get tooltip badge class based on trash type
const getTooltipBadgeClass = (trashType) => {
  const normalizedType = trashType?.toLowerCase() || ''
  
  if (normalizedType === 'biodegradable') {
    return 'tooltip-badge-green'
  } else if (normalizedType === 'non-biodegradable') {
    return 'tooltip-badge-blue'
  } else if (normalizedType === 'recyclable') {
    return 'tooltip-badge-orange'
  } else if (normalizedType === 'hazardous' || normalizedType === 'hazard') {
    return 'tooltip-badge-red'
  }
  return 'tooltip-badge-gray'
}

// ✅ MODIFIED: Get avatar background color based on trash types (multi-select aware)
const getAvatarColor = (trashTypeField) => {
  const types = parseTrashTypes(trashTypeField)
  
  // Check for all types or multiple types
  if (isAllTypesSelected(types)) {
    return 'gradient-all' // Special flag for all types
  }
  
  if (types.length > 1) {
    return 'gradient-multi' // Special flag for multiple types
  }
  
  // Single type
  const normalizedType = types[0]?.toLowerCase() || ''
  
  if (normalizedType === 'biodegradable') {
    return '#22c55e' // green
  } else if (normalizedType === 'non-biodegradable') {
    return '#3b82f6' // blue
  } else if (normalizedType === 'recyclable') {
    return '#f97316' // orange
  } else if (normalizedType === 'hazardous' || normalizedType === 'hazard') {
    return '#ef4444' // red
  }
  return '#64748b' // gray
}

// ✅ Get initials from name
const getInitials = (name) => {
  if (!name || name === 'Unknown') return '?'
  
  const words = name.trim().split(' ')
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase()
  }
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
}

// ✅ MODIFIED: Get emoji for trash type
const getTrashTypeEmoji = (trashType) => {
  const normalizedType = trashType?.toLowerCase() || ''
  
  if (normalizedType === 'biodegradable') return '🌿'
  if (normalizedType === 'non-biodegradable') return '📦'
  if (normalizedType === 'recyclable') return '♻️'
  if (normalizedType === 'hazardous' || normalizedType === 'hazard') return '☢️'
  return '🗑️'
}

// ✅ Truncate text helper
const truncateText = (text, maxLength = 30) => {
  if (!text) return 'N/A'
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// ============================================================
// ✅ NEW: TypeBadge component for tooltip
// ============================================================
const TypeBadge = ({ type }) => {
  const badgeClass = getTooltipBadgeClass(type)
  const emoji = getTrashTypeEmoji(type)
  
  return (
    <span className={`tooltip-badge ${badgeClass}`}>
      {emoji} {type}
    </span>
  )
}

// ============================================================
// ✅ MODIFIED: Tooltip Content Component with multi-type support
// ============================================================
const TooltipContent = ({ report }) => {
  const residentName = report.residents?.name || 'Unknown Resident'
  const residentAddress = report.residents?.address || report.location || 'No address'
  const binId = report.bin_id || 'N/A'
  const source = report.source || 'unknown'
  
  // ✅ Parse types
  const types = parseTrashTypes(report.trash_type)
  const allSelected = isAllTypesSelected(types)
  const hasMultiple = types.length > 1
  
  const initials = getInitials(residentName)
  const avatarColor = getAvatarColor(report.trash_type)
  
  // Determine avatar class
  let avatarClass = 'tooltip-avatar'
  let avatarStyle = {}
  
  if (avatarColor === 'gradient-all') {
    avatarClass += ' tooltip-avatar-all-types'
  } else if (avatarColor === 'gradient-multi') {
    avatarClass += ' tooltip-avatar-gradient'
  } else {
    avatarStyle = { backgroundColor: avatarColor }
  }
  
  // Determine status class
  let statusClass = 'tooltip-status tooltip-status-single'
  let statusText = 'Single Type'
  
  if (allSelected) {
    statusClass = 'tooltip-status tooltip-status-all'
    statusText = 'All Types'
  } else if (hasMultiple) {
    statusClass = 'tooltip-status tooltip-status-multi'
    statusText = `${types.length} Types`
  }
  
  return (
    <div className="tooltip-content">
      {/* Header with Avatar and Name */}
      <div className="tooltip-header">
        <div className={avatarClass} style={avatarStyle}>
          {allSelected ? '⭐' : initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="tooltip-name">{residentName}</div>
          <div className="tooltip-address">
            <span>📍</span>
            <span>{truncateText(residentAddress, 35)}</span>
          </div>
        </div>
      </div>
      
      {/* ✅ NEW: Types Section */}
      <div className="tooltip-types-section">
        <div className="tooltip-types-label">
          <span>🏷️</span>
          <span>Trash Type{types.length > 1 ? 's' : ''}</span>
          {types.length > 1 && (
            <span style={{ 
              marginLeft: 'auto', 
              background: allSelected ? '#f3e8ff' : '#e0e7ff',
              color: allSelected ? '#7c3aed' : '#4f46e5',
              padding: '1px 6px',
              borderRadius: '4px',
              fontSize: '9px',
              fontWeight: '700'
            }}>
              {allSelected ? '⭐ ALL' : types.length}
            </span>
          )}
        </div>
        
        <div className="tooltip-types-grid">
          {/* If all types selected, show special badge */}
          {allSelected ? (
            <span className="tooltip-badge tooltip-badge-purple">
              ⭐ All Types Selected
            </span>
          ) : (
            // Show individual type badges
            types.slice(0, 3).map((type, index) => (
              <TypeBadge key={index} type={type} />
            ))
          )}
          
          {/* Show "+N more" if too many types */}
          {!allSelected && types.length > 3 && (
            <span className="tooltip-badge tooltip-badge-gray">
              +{types.length - 3} more
            </span>
          )}
        </div>
      </div>
      
      {/* Details Badges */}
      <div className="tooltip-details">
        <span className={`tooltip-badge ${source === 'violation' ? 'tooltip-badge-red' : 'tooltip-badge-blue'}`}>
          {source === 'violation' ? '⚠️ Violation' : '📦 Collection'}
        </span>
        <span className="tooltip-badge tooltip-badge-gray">
          🏷️ {truncateText(binId, 15)}
        </span>
      </div>
      
      {/* Footer */}
      <div className="tooltip-footer">
        <span className="tooltip-hint">Click for more details</span>
        <span className={statusClass}>
          <span className="tooltip-status-dot"></span>
          {statusText}
        </span>
      </div>
    </div>
  )
}

// ============================================================
// ✅ NEW: Multi-Type Badges component for Popup
// ============================================================
const PopupTypeBadges = ({ trashTypeField }) => {
  const types = parseTrashTypes(trashTypeField)
  const allSelected = isAllTypesSelected(types)
  
  if (types.length === 0) {
    return (
      <span className="text-xs font-bold px-2 py-1 rounded bg-gray-100 text-gray-800">
        Unknown
      </span>
    )
  }
  
  if (allSelected) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
          <span className="text-lg">⭐</span>
          <div>
            <span className="text-xs font-bold text-purple-700">All Types Selected</span>
            <p className="text-[10px] text-purple-600">All 4 waste categories</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {types.map((type, index) => (
            <span 
              key={index}
              className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                type.toLowerCase() === 'biodegradable' ? 'bg-green-100 text-green-700' :
                type.toLowerCase() === 'non-biodegradable' ? 'bg-blue-100 text-blue-700' :
                type.toLowerCase() === 'recyclable' ? 'bg-orange-100 text-orange-700' :
                'bg-red-100 text-red-700'
              }`}
            >
              {getTrashTypeEmoji(type)} {type}
            </span>
          ))}
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex flex-wrap gap-1">
      {types.map((type, index) => (
        <span 
          key={index}
          className={`text-xs font-bold px-2 py-1 rounded ${
            type.toLowerCase() === 'biodegradable' ? 'bg-green-100 text-green-800' :
            type.toLowerCase() === 'non-biodegradable' ? 'bg-blue-100 text-blue-800' :
            type.toLowerCase() === 'recyclable' ? 'bg-orange-100 text-orange-800' :
            type.toLowerCase() === 'hazardous' || type.toLowerCase() === 'hazard' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}
        >
          {getTrashTypeEmoji(type)} {type}
        </span>
      ))}
    </div>
  )
}

// ============================================================
// ✅ MODIFIED: Main MapView Component
// ============================================================
const MapView = ({ 
  reports, 
  onMarkerClick, 
  filterTrashType = 'all',
  filterTypeSelection = 'all'  // ✅ NEW: Add typeSelection filter prop
}) => {
  // Default center (Dumaguete City, Philippines - adjust as needed)
  const defaultCenter = [9.3068, 123.3054]
  const defaultZoom = 13

  // Inject tooltip styles on component mount
  useEffect(() => {
    injectTooltipStyles()
    
    return () => {
      const styleElement = document.getElementById('trashpoint-tooltip-styles')
      if (styleElement) {
        // Optionally remove styles on unmount
      }
    }
  }, [])

  // ============================================================
  // ✅ MODIFIED: Create custom colored marker icons with multi-type support
  // ============================================================
  const createCustomIcon = (trashTypeField) => {
    const types = parseTrashTypes(trashTypeField)
    const allSelected = isAllTypesSelected(types)
    const hasMultiple = types.length > 1
    
    let color, emoji, markerClass
    
    if (allSelected) {
      // ✅ Special purple gradient for "All Types"
      color = '#8b5cf6' // Purple
      emoji = '⭐'
      markerClass = 'custom-marker all-types-marker'
    } else if (hasMultiple) {
      // ✅ Indigo for multiple types
      color = '#6366f1' // Indigo
      emoji = `${types.length}`
      markerClass = 'custom-marker'
    } else {
      // Single type - use original logic
      const singleType = types[0]?.toLowerCase() || ''
      color = getMarkerColor(singleType) || '#64748b'
      markerClass = 'custom-marker'
      
      if (singleType === 'biodegradable') {
        emoji = '🌿'
      } else if (singleType === 'non-biodegradable') {
        emoji = '📦'
      } else if (singleType === 'recyclable') {
        emoji = '♻️'
      } else if (singleType === 'hazard' || singleType === 'hazardous') {
        emoji = '☢️'
      } else {
        emoji = '📌'
      }
    }

    // Create different SVG based on type count
    let svgIcon
    
    if (allSelected) {
      // ✅ Special star marker for "All Types"
      svgIcon = `
        <svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" style="overflow: visible;">
          <defs>
            <linearGradient id="allTypesGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#a855f7;stop-opacity:1" />
              <stop offset="50%" style="stop-color:#8b5cf6;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#6366f1;stop-opacity:1" />
            </linearGradient>
            <filter id="shadow-all" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
              <feOffset dx="0" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.4"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <circle cx="22" cy="22" r="18" fill="url(#allTypesGradient)" stroke="white" stroke-width="3" filter="url(#shadow-all)"/>
          <circle cx="22" cy="22" r="21" fill="none" stroke="#c4b5fd" stroke-width="2" stroke-dasharray="4 2"/>
          <text x="22" y="28" font-size="16" text-anchor="middle" fill="white">${emoji}</text>
        </svg>
      `
    } else if (hasMultiple) {
      // ✅ Special badge marker for multiple types
      svgIcon = `
        <svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" style="overflow: visible;">
          <defs>
            <linearGradient id="multiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#818cf8;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#6366f1;stop-opacity:1" />
            </linearGradient>
            <filter id="shadow-multi" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
              <feOffset dx="0" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <circle cx="22" cy="22" r="17" fill="url(#multiGradient)" stroke="white" stroke-width="3" filter="url(#shadow-multi)"/>
          <text x="22" y="28" font-size="18" font-weight="bold" text-anchor="middle" fill="white">${emoji}</text>
          <circle cx="34" cy="10" r="8" fill="#ef4444" stroke="white" stroke-width="2"/>
          <text x="34" y="14" font-size="10" font-weight="bold" text-anchor="middle" fill="white">+</text>
        </svg>
      `
    } else {
      // ✅ Standard single-type marker
      const normalizedType = types[0]?.toLowerCase() || 'unknown'
      svgIcon = `
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" style="overflow: visible;">
          <defs>
            <filter id="shadow-${normalizedType}" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
              <feOffset dx="0" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <circle cx="20" cy="20" r="16" fill="${color}" stroke="white" stroke-width="3" filter="url(#shadow-${normalizedType})"/>
          <text x="20" y="26" font-size="16" text-anchor="middle" fill="white">${emoji}</text>
        </svg>
      `
    }

    return L.divIcon({
      html: svgIcon,
      className: markerClass,
      iconSize: allSelected ? [44, 44] : hasMultiple ? [44, 44] : [40, 40],
      iconAnchor: allSelected ? [22, 22] : hasMultiple ? [22, 22] : [20, 20],
      popupAnchor: [0, -25],
      tooltipAnchor: [0, -20]
    })
  }

  // Generate coordinates
  const getCoordinates = (report) => {
    if (report.latitude && report.longitude && 
        report.latitude !== 0 && report.longitude !== 0) {
      return [parseFloat(report.latitude), parseFloat(report.longitude)]
    }
    // Generate random offset within ~5km radius for reports without coordinates
    const latOffset = (Math.random() - 0.5) * 0.05
    const lngOffset = (Math.random() - 0.5) * 0.05
    return [defaultCenter[0] + latOffset, defaultCenter[1] + lngOffset]
  }

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Map Controller for auto-focus */}
      <MapController 
        reports={reports}
        filterTrashType={filterTrashType}
        filterTypeSelection={filterTypeSelection}
        getCoordinates={getCoordinates}
        defaultCenter={defaultCenter}
        defaultZoom={defaultZoom}
      />

      {reports.map((report, index) => {
        const position = getCoordinates(report, index)
        const icon = createCustomIcon(report.trash_type)
        
        // ✅ Parse types for popup
        const types = parseTrashTypes(report.trash_type)
        const allSelected = isAllTypesSelected(types)
        const hasMultiple = types.length > 1

        return (
          <Marker
            key={report.id || index}
            position={position}
            icon={icon}
            eventHandlers={{
              click: () => {
                if (onMarkerClick) {
                  onMarkerClick(report)
                }
              },
            }}
          >
            {/* Hover Tooltip */}
            <Tooltip 
              direction="top" 
              offset={[0, -25]} 
              opacity={1}
              className="custom-tooltip"
              permanent={false}
              sticky={false}
            >
              <TooltipContent report={report} />
            </Tooltip>

            {/* ✅ MODIFIED: Click Popup with multi-type support */}
            <Popup>
              <div className="p-3 min-w-[280px]">
                {/* ✅ NEW: Header with type indicator */}
                <div className={`flex items-center gap-3 mb-3 pb-3 border-b ${
                  allSelected ? 'border-purple-200' : 
                  hasMultiple ? 'border-indigo-200' : 'border-gray-200'
                }`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                    allSelected ? 'bg-gradient-to-br from-purple-500 to-indigo-600' :
                    hasMultiple ? 'bg-gradient-to-br from-indigo-500 to-blue-600' :
                    'bg-primary-600'
                  }`}>
                    {allSelected ? '⭐' : hasMultiple ? types.length : getInitials(report.residents?.name)}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">
                      {report.residents?.name || 'Unknown'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {report.source === 'violation' ? '⚠️ Violation Report' : '📦 Collection Log'}
                    </p>
                  </div>
                </div>
                
                {/* ✅ NEW: Trash Types Section */}
                <div className={`mb-3 p-3 rounded-lg ${
                  allSelected ? 'bg-purple-50 border border-purple-100' :
                  hasMultiple ? 'bg-indigo-50 border border-indigo-100' :
                  'bg-gray-50 border border-gray-100'
                }`}>
                  <p className="text-xs text-gray-500 font-semibold uppercase mb-2 flex items-center gap-1">
                    🏷️ Trash Type{types.length > 1 ? `s (${types.length})` : ''}
                    {allSelected && <span className="ml-auto text-purple-600 font-bold">⭐ ALL</span>}
                  </p>
                  <PopupTypeBadges trashTypeField={report.trash_type} />
                </div>

                {/* Resident Details */}
                <div className="space-y-2 mb-3">
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase">Email</p>
                    <p className="text-sm text-gray-700">{report.residents?.email || 'N/A'}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase">Phone</p>
                    <p className="text-sm text-gray-700">{report.residents?.phone || 'N/A'}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase">Address</p>
                    <p className="text-sm text-gray-700">{report.residents?.address || 'N/A'}</p>
                  </div>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 font-semibold">Bin ID:</span>
                    <span className="text-sm font-bold text-gray-900">{report.bin_id || 'N/A'}</span>
                  </div>
                  
                  {/* ✅ NEW: Show type count */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 font-semibold">Types Count:</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      allSelected ? 'bg-purple-100 text-purple-700' :
                      hasMultiple ? 'bg-indigo-100 text-indigo-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {types.length} type{types.length > 1 ? 's' : ''} {allSelected && '⭐'}
                    </span>
                  </div>
                  
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs text-gray-600">📍 {report.location || 'N/A'}</p>
                  </div>
                  
                  {/* ✅ NEW: Show coordinates status */}
                  <div className="flex items-center gap-2 text-xs">
                    {report.hasCoordinates || (report.latitude && report.longitude) ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        GPS Available
                      </span>
                    ) : (
                      <span className="text-yellow-600 flex items-center gap-1">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                        Approximate Location
                      </span>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    🕐 {report.timestamp ? new Date(report.timestamp).toLocaleString() : 'N/A'}
                  </div>
                </div>

                {/* ✅ NEW: Quick Actions */}
                <div className="mt-3 pt-3 border-t flex gap-2">
                  {report.latitude && report.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                    >
                      🗺️ Open in Maps
                    </a>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}

export default MapView