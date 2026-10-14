// src/components/reports/ReportsTable.jsx

import React, { useState } from 'react'
import { formatDate } from '../../utils/helpers'

const ReportsTable = ({ reports, onDeleteReport, onUpdateStatus }) => {
  const [sortField, setSortField] = useState('timestamp')
  const [sortOrder, setSortOrder] = useState('desc')
  const [expandedRow, setExpandedRow] = useState(null)
  const [updatingStatus, setUpdatingStatus] = useState(null)

  // ============================================================
  // ✅ NEW: Parse trash_type which can be JSON array or single string
  // ============================================================
  const parseTrashTypes = (trashType) => {
    if (!trashType) return [];
    
    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(trashType);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      // If parsed but not array, return as single item
      return [String(parsed)];
    } catch {
      // Not JSON, return as single item array
      return [trashType];
    }
  };

  // ✅ NEW: Check if all individual types are selected
  const ALL_INDIVIDUAL_TYPES = ['Biodegradable', 'Non-Biodegradable', 'Recyclable', 'Hazardous'];
  
  const isAllTypesSelected = (types) => {
    if (!types || types.length === 0) return false;
    return ALL_INDIVIDUAL_TYPES.every(t => 
      types.some(type => type.toLowerCase() === t.toLowerCase())
    );
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const sortedReports = [...reports].sort((a, b) => {
    let aValue = a[sortField]
    let bValue = b[sortField]

    // Handle nested resident name
    if (sortField === 'resident_name') {
      aValue = a.residents?.name || ''
      bValue = b.residents?.name || ''
    }

    // Handle nested collector name
    if (sortField === 'collector_name') {
      aValue = a.collectors?.name || ''
      bValue = b.collectors?.name || ''
    }

    // Handle timestamp sorting
    if (sortField === 'timestamp' || sortField === 'created_at') {
      aValue = new Date(aValue || 0).getTime()
      bValue = new Date(bValue || 0).getTime()
    }

    // ✅ NEW: Handle trash_type sorting (by count of types)
    if (sortField === 'trash_type') {
      const aTypes = parseTrashTypes(aValue)
      const bTypes = parseTrashTypes(bValue)
      aValue = aTypes.length
      bValue = bTypes.length
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  // Handle status update
  const handleStatusChange = async (reportId, newStatus) => {
    setUpdatingStatus(reportId)
    try {
      await onUpdateStatus(reportId, newStatus)
    } finally {
      setUpdatingStatus(null)
    }
  }

  // Get status badge styling
  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'reported':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          dot: 'bg-red-500',
          icon: '🔴',
          label: 'Reported'
        }
      case 'reviewing':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          dot: 'bg-yellow-500',
          icon: '🟡',
          label: 'Reviewing'
        }
      case 'resolved':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          dot: 'bg-green-500',
          icon: '🟢',
          label: 'Resolved'
        }
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          dot: 'bg-gray-500',
          icon: '⚪',
          label: status || 'Unknown'
        }
    }
  }

  // ✅ ENHANCED: Get trash type badge with full styling
  const getTrashTypeBadgeStyles = (trashType) => {
    const type = trashType?.toLowerCase()
    
    switch (type) {
      case 'all types':
        return {
          gradient: 'from-purple-100 to-purple-200',
          bg: 'bg-purple-100',
          text: 'text-purple-700',
          dot: 'bg-purple-500',
          border: 'border-purple-300',
          icon: '⭐',
          ring: 'ring-purple-300'
        }
      case 'biodegradable':
        return {
          gradient: 'from-green-100 to-green-200',
          bg: 'bg-green-100',
          text: 'text-green-700',
          dot: 'bg-green-500',
          border: 'border-green-300',
          icon: '🌿',
          ring: 'ring-green-300'
        }
      case 'non-biodegradable':
        return {
          gradient: 'from-blue-100 to-blue-200',
          bg: 'bg-blue-100',
          text: 'text-blue-700',
          dot: 'bg-blue-500',
          border: 'border-blue-300',
          icon: '📦',
          ring: 'ring-blue-300'
        }
      case 'recyclable':
        return {
          gradient: 'from-orange-100 to-orange-200',
          bg: 'bg-orange-100',
          text: 'text-orange-700',
          dot: 'bg-orange-500',
          border: 'border-orange-300',
          icon: '♻️',
          ring: 'ring-orange-300'
        }
      case 'hazard':
      case 'hazardous':
        return {
          gradient: 'from-red-100 to-red-200',
          bg: 'bg-red-100',
          text: 'text-red-700',
          dot: 'bg-red-500',
          border: 'border-red-300',
          icon: '☢️',
          ring: 'ring-red-300'
        }
      default:
        return {
          gradient: 'from-gray-100 to-gray-200',
          bg: 'bg-gray-100',
          text: 'text-gray-700',
          dot: 'bg-gray-500',
          border: 'border-gray-300',
          icon: '📋',
          ring: 'ring-gray-300'
        }
    }
  }

  // ============================================================
  // ✅ NEW: Component to render single type badge
  // ============================================================
  const TypeBadge = ({ type, size = 'sm', showIcon = true }) => {
    const styles = getTrashTypeBadgeStyles(type)
    
    const sizeClasses = {
      xs: 'px-1.5 py-0.5 text-[10px]',
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-xs',
      lg: 'px-3 py-1.5 text-sm'
    }
    
    return (
      <span 
        className={`
          inline-flex items-center gap-1 rounded-full font-semibold
          ${styles.bg} ${styles.text} border ${styles.border}
          ${sizeClasses[size]}
        `}
      >
        {showIcon && <span className="flex-shrink-0">{styles.icon}</span>}
        <span className="truncate">{type}</span>
      </span>
    )
  }

  // ============================================================
  // ✅ NEW: Component to render multiple type badges (compact for table)
  // ============================================================
  const MultiTypeBadges = ({ trashType, maxVisible = 2 }) => {
    const types = parseTrashTypes(trashType)
    const allSelected = isAllTypesSelected(types)
    
    // If no types, show unknown
    if (types.length === 0) {
      return <TypeBadge type="Unknown" size="sm" />
    }
    
    // If all types selected, show special "All Types" badge
    if (allSelected) {
      return (
        <div className="flex items-center gap-1">
          <span 
            className="
              inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold
              bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 
              border-2 border-purple-300 shadow-sm
              ring-2 ring-purple-200 ring-offset-1
            "
          >
            <span>⭐</span>
            <span>All Types</span>
            <span className="bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded-full text-[10px] ml-1">
              {types.length}
            </span>
          </span>
        </div>
      )
    }
    
    // If single type, show single badge
    if (types.length === 1) {
      return <TypeBadge type={types[0]} size="sm" />
    }
    
    // Multiple types (but not all) - show compact view
    const visibleTypes = types.slice(0, maxVisible)
    const remainingCount = types.length - maxVisible
    
    return (
      <div className="flex flex-wrap items-center gap-1">
        {visibleTypes.map((type, index) => (
          <TypeBadge key={index} type={type} size="xs" showIcon={false} />
        ))}
        {remainingCount > 0 && (
          <span 
            className="
              inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold
              bg-gray-200 text-gray-600 border border-gray-300
            "
            title={types.slice(maxVisible).join(', ')}
          >
            +{remainingCount}
          </span>
        )}
      </div>
    )
  }

  // ============================================================
  // ✅ NEW: Component to render all type badges (for expanded view)
  // ============================================================
  const AllTypeBadges = ({ trashType }) => {
    const types = parseTrashTypes(trashType)
    const allSelected = isAllTypesSelected(types)
    
    if (types.length === 0) {
      return (
        <div className="text-gray-400 italic text-sm">No types specified</div>
      )
    }
    
    return (
      <div className="space-y-2">
        {/* All Types indicator */}
        {allSelected && (
          <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
            <span className="text-lg">⭐</span>
            <div>
              <span className="font-bold text-purple-700 text-sm">All Types Selected</span>
              <p className="text-xs text-purple-600">All waste categories are involved</p>
            </div>
          </div>
        )}
        
        {/* Individual badges */}
        <div className="flex flex-wrap gap-1.5">
          {types.map((type, index) => (
            <TypeBadge key={index} type={type} size="md" />
          ))}
        </div>
        
        {/* Count summary */}
        <div className="text-xs text-gray-500 mt-1">
          {types.length} type{types.length > 1 ? 's' : ''} {allSelected ? '(all categories)' : 'selected'}
        </div>
      </div>
    )
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    return sortOrder === 'asc' ? (
      <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    )
  }

  // Toggle row expansion
  const toggleRowExpansion = (reportId) => {
    setExpandedRow(expandedRow === reportId ? null : reportId)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
          <tr>
            {/* Expand Column */}
            <th className="px-3 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-10">
              <span className="sr-only">Expand</span>
            </th>
            
            {/* Resident Name */}
            <th 
              className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => handleSort('resident_name')}
            >
              <div className="flex items-center gap-2">
                Resident
                <SortIcon field="resident_name" />
              </div>
            </th>

            {/* Reported By (Collector) */}
            <th 
              className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => handleSort('collector_name')}
            >
              <div className="flex items-center gap-2">
                Reported By
                <SortIcon field="collector_name" />
              </div>
            </th>

            {/* Location */}
            <th 
              className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => handleSort('location')}
            >
              <div className="flex items-center gap-2">
                Location
                <SortIcon field="location" />
              </div>
            </th>

            {/* Trash Type - ✅ UPDATED header */}
            <th 
              className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => handleSort('trash_type')}
            >
              <div className="flex items-center gap-2">
                Type(s)
                <SortIcon field="trash_type" />
              </div>
            </th>

            {/* Status */}
            <th 
              className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => handleSort('status')}
            >
              <div className="flex items-center gap-2">
                Status
                <SortIcon field="status" />
              </div>
            </th>

            {/* Timestamp */}
            <th 
              className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => handleSort('timestamp')}
            >
              <div className="flex items-center gap-2">
                Date
                <SortIcon field="timestamp" />
              </div>
            </th>

            {/* Actions */}
            <th className="px-4 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sortedReports.map((report, index) => {
            const isExpanded = expandedRow === report.id
            const isNew = report.status === 'reported'
            
            // ✅ NEW: Parse and check types
            const trashTypes = parseTrashTypes(report.trash_type)
            const hasAllTypes = isAllTypesSelected(trashTypes)
            const hasMultipleTypes = trashTypes.length > 1

            return (
              <React.Fragment key={report.id}>
                {/* Main Row */}
                <tr 
                  className={`
                    hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent transition-all
                    ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    ${isNew ? 'border-l-4 border-l-red-500' : ''}
                    ${hasAllTypes ? 'border-l-4 border-l-purple-500' : ''}
                    ${hasMultipleTypes && !hasAllTypes ? 'border-l-4 border-l-indigo-400' : ''}
                    ${isExpanded ? 'bg-blue-50' : ''}
                  `}
                >
                  {/* Expand Button */}
                  <td className="px-3 py-4">
                    <button
                      onClick={() => toggleRowExpansion(report.id)}
                      className={`p-1 rounded-lg transition-all ${
                        isExpanded 
                          ? 'bg-primary-100 text-primary-600' 
                          : 'hover:bg-gray-100 text-gray-400'
                      }`}
                    >
                      <svg 
                        className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </td>

                  {/* Resident Name */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-primary-50 to-primary-100 p-2 rounded-xl shadow-sm">
                        <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">
                          {report.residents?.name || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {report.residents?.phone || report.residents?.email || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Reported By (Collector) */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    {report.collectors?.name ? (
                      <div className="flex items-center gap-2">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-2 rounded-lg">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {report.collectors.name}
                          </div>
                          <div className="text-xs text-gray-500">Collector</div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 italic">System</span>
                    )}
                  </td>

                  {/* Location */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="max-w-[150px] truncate" title={report.location}>
                        {report.location || 'N/A'}
                      </span>
                    </div>
                  </td>

                  {/* ✅ MODIFIED: Trash Type(s) with Multi-Select support */}
                  <td className="px-4 py-4">
                    <MultiTypeBadges trashType={report.trash_type} maxVisible={2} />
                  </td>

                  {/* Status */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="relative">
                      <select
                        value={report.status || 'reported'}
                        onChange={(e) => handleStatusChange(report.id, e.target.value)}
                        disabled={updatingStatus === report.id}
                        className={`
                          appearance-none cursor-pointer
                          pl-3 pr-8 py-1.5 rounded-lg text-xs font-bold
                          border-2 transition-all
                          focus:ring-2 focus:ring-offset-1
                          ${updatingStatus === report.id ? 'opacity-50 cursor-wait' : ''}
                          ${report.status === 'reported' 
                            ? 'bg-red-50 text-red-700 border-red-200 focus:ring-red-500' 
                            : report.status === 'reviewing'
                            ? 'bg-yellow-50 text-yellow-700 border-yellow-200 focus:ring-yellow-500'
                            : report.status === 'resolved'
                            ? 'bg-green-50 text-green-700 border-green-200 focus:ring-green-500'
                            : 'bg-gray-50 text-gray-700 border-gray-200 focus:ring-gray-500'
                          }
                        `}
                      >
                        <option value="reported">🔴 Reported</option>
                        <option value="reviewing">🟡 Reviewing</option>
                        <option value="resolved">🟢 Resolved</option>
                      </select>
                      {updatingStatus === report.id && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          <svg className="animate-spin h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Timestamp */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">
                          {formatDate(report.timestamp || report.created_at)}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      {/* View Details Button */}
                      <button
                        onClick={() => toggleRowExpansion(report.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="View Details"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>

                      {/* Map Link (if has coordinates) */}
                      {report.latitude && report.longitude && report.latitude !== 0 && report.longitude !== 0 && (
                        <a
                          href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                          title="View on Map"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                        </a>
                      )}

                      {/* Delete Button */}
                      <button
                        onClick={() => onDeleteReport(report.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete Report"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>

                {/* ✅ ENHANCED: Expanded Details Row with Multi-Type support */}
                {isExpanded && (
                  <tr className={`bg-gradient-to-r ${hasAllTypes ? 'from-purple-50 to-indigo-50' : hasMultipleTypes ? 'from-indigo-50 to-blue-50' : 'from-blue-50 to-indigo-50'}`}>
                    <td colSpan="8" className="px-6 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Violation Description */}
                        <div className="md:col-span-2">
                          <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Violation Description
                          </h4>
                          <div className={`bg-white rounded-xl p-4 border shadow-sm ${hasAllTypes ? 'border-purple-200' : 'border-red-100'}`}>
                            {report.description ? (
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {report.description}
                              </p>
                            ) : (
                              <p className="text-sm text-gray-400 italic">
                                No description provided
                              </p>
                            )}
                          </div>
                          
                          {/* ✅ NEW: Violation/Trash Types Section */}
                          <div className="mt-4">
                            <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                              Violation Type(s)
                              <span className="text-xs font-normal text-gray-500">
                                ({trashTypes.length} selected)
                              </span>
                            </h4>
                            <div className={`bg-white rounded-xl p-4 border shadow-sm ${hasAllTypes ? 'border-purple-200' : 'border-indigo-100'}`}>
                              <AllTypeBadges trashType={report.trash_type} />
                            </div>
                          </div>
                        </div>

                        {/* Additional Info */}
                        <div className="space-y-4">
                          {/* Resident Details */}
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              Resident Details
                            </h4>
                            <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Name:</span>
                                <span className="font-medium text-gray-900">
                                  {report.residents?.name || 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Email:</span>
                                <span className="font-medium text-gray-900">
                                  {report.residents?.email || 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Phone:</span>
                                <span className="font-medium text-gray-900">
                                  {report.residents?.phone || 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Address:</span>
                                <span className="font-medium text-gray-900 text-right max-w-[150px] truncate">
                                  {report.residents?.address || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Report Metadata */}
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                              <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Report Info
                            </h4>
                            <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm space-y-2">
                              {/* Type Count */}
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Types Count:</span>
                                <span className={`
                                  px-2 py-0.5 rounded-full text-xs font-bold
                                  ${hasAllTypes 
                                    ? 'bg-purple-100 text-purple-700' 
                                    : hasMultipleTypes 
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'bg-gray-100 text-gray-700'
                                  }
                                `}>
                                  {trashTypes.length} type{trashTypes.length > 1 ? 's' : ''}
                                  {hasAllTypes && ' ⭐'}
                                </span>
                              </div>
                              {report.bin_id && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Bin ID:</span>
                                  <span className="font-mono font-medium text-gray-900">
                                    {report.bin_id}
                                  </span>
                                </div>
                              )}
                              {report.latitude && report.longitude && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Coordinates:</span>
                                  <span className="font-mono text-xs text-gray-900">
                                    {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Report ID:</span>
                                <span className="font-mono text-xs text-gray-500">
                                  {report.id?.substring(0, 8)}...
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-3">
                        <span className="text-sm font-medium text-gray-600">Quick Actions:</span>
                        
                        {report.status !== 'reviewing' && (
                          <button
                            onClick={() => handleStatusChange(report.id, 'reviewing')}
                            className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-200 transition-all flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Mark as Reviewing
                          </button>
                        )}
                        
                        {report.status !== 'resolved' && (
                          <button
                            onClick={() => handleStatusChange(report.id, 'resolved')}
                            className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-all flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Mark as Resolved
                          </button>
                        )}

                        {report.latitude && report.longitude && (
                          <a
                            href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-all flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Open in Google Maps
                          </a>
                        )}

                        <button
                          onClick={() => onDeleteReport(report.id)}
                          className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-all flex items-center gap-1 ml-auto"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete Report
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>

      {/* Empty State */}
      {sortedReports.length === 0 && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 font-medium">No reports to display</p>
        </div>
      )}
    </div>
  )
}

export default ReportsTable