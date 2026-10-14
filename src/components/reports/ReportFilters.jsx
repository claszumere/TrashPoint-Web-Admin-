// src/components/reports/ReportFilters.jsx

import React, { useState, useRef, useEffect } from 'react'
import { 
  TRASH_TYPES_ARRAY, 
  VIOLATION_TYPES_ARRAY,
  parseTypes,
  getTypesDisplayString 
} from '../../services/supabase'

const ReportFilters = ({ filters, onFilterChange, stats = null }) => {
  const [showTrashTypeDropdown, setShowTrashTypeDropdown] = useState(false)
  const [showViolationTypeDropdown, setShowViolationTypeDropdown] = useState(false)
  
  const trashTypeDropdownRef = useRef(null)
  const violationTypeDropdownRef = useRef(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (trashTypeDropdownRef.current && !trashTypeDropdownRef.current.contains(event.target)) {
        setShowTrashTypeDropdown(false)
      }
      if (violationTypeDropdownRef.current && !violationTypeDropdownRef.current.contains(event.target)) {
        setShowViolationTypeDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ✅ Get selected trash types as array
  const selectedTrashTypes = parseTypes(filters.trashTypes || filters.trashType || [])
  const selectedViolationTypes = parseTypes(filters.violationTypes || filters.violationType || [])

  // ✅ Check if any filters are active
  const hasActiveFilters = 
    selectedTrashTypes.length > 0 ||
    selectedViolationTypes.length > 0 ||
    filters.status !== 'all' || 
    filters.source !== 'all' ||
    filters.typeSelection !== 'all' ||
    filters.hasCoordinates !== 'all' ||
    filters.searchTerm

  // ✅ Clear all filters
  const clearAllFilters = () => {
    onFilterChange('trashTypes', [])
    onFilterChange('violationTypes', [])
    onFilterChange('status', 'all')
    onFilterChange('source', 'all')
    onFilterChange('typeSelection', 'all')
    onFilterChange('hasCoordinates', 'all')
    onFilterChange('searchTerm', '')
  }

  // ============================================================
  // ✅ Trash type options for multi-select
  // ============================================================
  const trashTypeOptions = [
    { value: 'Biodegradable', label: 'Biodegradable', icon: '🌿', color: 'green' },
    { value: 'Non-Biodegradable', label: 'Non-Biodegradable', icon: '📦', color: 'blue' },
    { value: 'Recyclable', label: 'Recyclable', icon: '♻️', color: 'orange' },
    { value: 'Hazardous', label: 'Hazardous', icon: '☢️', color: 'red' },
  ]

  // ============================================================
  // ✅ NEW: Violation type options for multi-select
  // ============================================================
  const violationTypeOptions = [
    { value: 'Improper Segregation', label: 'Improper Segregation', icon: '🚫', color: 'red' },
    { value: 'Illegal Dumping', label: 'Illegal Dumping', icon: '🗑️', color: 'darkred' },
    { value: 'Missed Collection', label: 'Missed Collection', icon: '⏰', color: 'amber' },
    { value: 'Contamination', label: 'Contamination', icon: '☣️', color: 'yellow' },
    { value: 'Overflowing Bin', label: 'Overflowing Bin', icon: '📤', color: 'orange' },
  ]

  // ✅ Type Selection options (single, multiple, all-types)
  const typeSelectionOptions = [
    { value: 'all', label: 'Any Selection', icon: '📋', color: 'gray', description: 'Show all records' },
    { value: 'all-types', label: 'All Types Selected', icon: '⭐', color: 'purple', description: 'All 4 types selected' },
    { value: 'multiple', label: 'Multiple Types', icon: '🔢', color: 'indigo', description: '2-3 types selected' },
    { value: 'single', label: 'Single Type', icon: '1️⃣', color: 'gray', description: 'Only 1 type selected' },
  ]

  // ✅ Source options
  const sourceOptions = [
    { value: 'all', label: 'All Sources', icon: '📋', color: 'gray' },
    { value: 'violation', label: 'Violations', icon: '⚠️', color: 'red' },
    { value: 'collection', label: 'Collections', icon: '📦', color: 'blue' },
  ]

  // ✅ GPS/Coordinates options
  const coordinatesOptions = [
    { value: 'all', label: 'All Records', icon: '📋', color: 'gray' },
    { value: 'yes', label: 'With GPS', icon: '📍', color: 'green' },
    { value: 'no', label: 'Without GPS', icon: '❌', color: 'yellow' },
  ]

  // Status options with colors
  const statusOptions = [
    { value: 'all', label: 'All Status', icon: '📋', color: 'gray' },
    { value: 'reported', label: 'Reported', icon: '🔴', color: 'red' },
    { value: 'reviewing', label: 'Reviewing', icon: '🟡', color: 'yellow' },
    { value: 'resolved', label: 'Resolved', icon: '🟢', color: 'green' },
  ]

  // ============================================================
  // ✅ Multi-select handler for trash types
  // ============================================================
  const handleTrashTypeToggle = (type) => {
    const current = [...selectedTrashTypes]
    const index = current.findIndex(t => t.toLowerCase() === type.toLowerCase())
    
    if (index > -1) {
      current.splice(index, 1)
    } else {
      current.push(type)
    }
    
    onFilterChange('trashTypes', current)
  }

  // ✅ Select/Deselect all trash types
  const handleSelectAllTrashTypes = () => {
    if (selectedTrashTypes.length === trashTypeOptions.length) {
      onFilterChange('trashTypes', [])
    } else {
      onFilterChange('trashTypes', trashTypeOptions.map(o => o.value))
    }
  }

  // ============================================================
  // ✅ Multi-select handler for violation types
  // ============================================================
  const handleViolationTypeToggle = (type) => {
    const current = [...selectedViolationTypes]
    const index = current.findIndex(t => t.toLowerCase() === type.toLowerCase())
    
    if (index > -1) {
      current.splice(index, 1)
    } else {
      current.push(type)
    }
    
    onFilterChange('violationTypes', current)
  }

  // ✅ Select/Deselect all violation types
  const handleSelectAllViolationTypes = () => {
    if (selectedViolationTypes.length === violationTypeOptions.length) {
      onFilterChange('violationTypes', [])
    } else {
      onFilterChange('violationTypes', violationTypeOptions.map(o => o.value))
    }
  }

  // ✅ Check if a type is selected
  const isTrashTypeSelected = (type) => {
    return selectedTrashTypes.some(t => t.toLowerCase() === type.toLowerCase())
  }

  const isViolationTypeSelected = (type) => {
    return selectedViolationTypes.some(t => t.toLowerCase() === type.toLowerCase())
  }

  // ============================================================
  // ✅ Helper functions for styling
  // ============================================================
  const getTypeColor = (type) => {
    const colors = {
      'biodegradable': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', activeBg: 'bg-green-600' },
      'non-biodegradable': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', activeBg: 'bg-blue-600' },
      'recyclable': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', activeBg: 'bg-orange-500' },
      'hazardous': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', activeBg: 'bg-red-600' },
      'improper segregation': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', activeBg: 'bg-red-600' },
      'illegal dumping': { bg: 'bg-red-100', text: 'text-red-900', border: 'border-red-300', activeBg: 'bg-red-700' },
      'missed collection': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', activeBg: 'bg-amber-600' },
      'contamination': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', activeBg: 'bg-yellow-600' },
      'overflowing bin': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', activeBg: 'bg-orange-600' },
    }
    return colors[type.toLowerCase()] || { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200', activeBg: 'bg-gray-600' }
  }

  const getTagColorClasses = (type, category = 'trashType') => {
    if (category === 'typeSelection') {
      switch (type) {
        case 'all-types': return 'bg-purple-100 text-purple-800 border-purple-200'
        case 'multiple': return 'bg-indigo-100 text-indigo-800 border-indigo-200'
        case 'single': return 'bg-gray-100 text-gray-800 border-gray-200'
        default: return 'bg-gray-100 text-gray-800 border-gray-200'
      }
    }
    
    if (category === 'source') {
      switch (type) {
        case 'violation': return 'bg-red-100 text-red-800 border-red-200'
        case 'collection': return 'bg-blue-100 text-blue-800 border-blue-200'
        default: return 'bg-gray-100 text-gray-800 border-gray-200'
      }
    }

    if (category === 'coordinates') {
      switch (type) {
        case 'yes': return 'bg-green-100 text-green-800 border-green-200'
        case 'no': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
        default: return 'bg-gray-100 text-gray-800 border-gray-200'
      }
    }

    const colors = getTypeColor(type)
    return `${colors.bg} ${colors.text} ${colors.border}`
  }

  // Count active filters
  const activeFilterCount = [
    selectedTrashTypes.length > 0,
    selectedViolationTypes.length > 0,
    filters.status !== 'all',
    filters.source !== 'all',
    filters.typeSelection !== 'all',
    filters.hasCoordinates !== 'all',
    filters.searchTerm
  ].filter(Boolean).length

  // ============================================================
  // ✅ Multi-Select Dropdown Component
  // ============================================================
  const MultiSelectDropdown = ({ 
    label, 
    options, 
    selectedValues, 
    onToggle, 
    onSelectAll, 
    isOpen, 
    setIsOpen, 
    dropdownRef,
    icon = '🏷️'
  }) => {
    const allSelected = selectedValues.length === options.length
    const someSelected = selectedValues.length > 0 && selectedValues.length < options.length

    return (
      <div className="relative" ref={dropdownRef}>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
          {selectedValues.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs font-bold">
              {selectedValues.length}
            </span>
          )}
        </label>
        
        {/* Dropdown Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-4 py-3 border-2 rounded-xl text-left flex items-center justify-between transition-all ${
            selectedValues.length > 0
              ? 'border-primary-300 bg-primary-50'
              : 'border-gray-200 bg-gray-50 hover:bg-white'
          }`}
        >
          <span className="flex items-center gap-2 truncate">
            <span>{icon}</span>
            {selectedValues.length === 0 ? (
              <span className="text-gray-500">Select types...</span>
            ) : selectedValues.length === options.length ? (
              <span className="font-medium">All Types Selected</span>
            ) : (
              <span className="font-medium">
                {getTypesDisplayString(selectedValues, 2)}
              </span>
            )}
          </span>
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-50 mt-2 w-full bg-white border-2 border-gray-200 rounded-xl shadow-xl overflow-hidden">
            {/* Select All Option */}
            <button
              type="button"
              onClick={onSelectAll}
              className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                allSelected ? 'bg-purple-50' : ''
              }`}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                allSelected 
                  ? 'bg-purple-600 border-purple-600' 
                  : someSelected
                  ? 'bg-purple-200 border-purple-400'
                  : 'border-gray-300'
              }`}>
                {allSelected && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {someSelected && !allSelected && (
                  <div className="w-2 h-2 bg-purple-600 rounded-sm"></div>
                )}
              </div>
              <span className="font-semibold text-purple-700">
                ⭐ Select All Types
              </span>
              <span className="ml-auto text-xs text-gray-500">
                ({options.length})
              </span>
            </button>

            {/* Individual Options */}
            <div className="max-h-60 overflow-y-auto">
              {options.map((option) => {
                const isSelected = selectedValues.some(v => v.toLowerCase() === option.value.toLowerCase())
                const colors = getTypeColor(option.value)
                
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onToggle(option.value)}
                    className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                      isSelected ? colors.bg : ''
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      isSelected 
                        ? `${colors.activeBg} border-transparent` 
                        : 'border-gray-300'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={`${isSelected ? 'font-semibold' : ''} ${colors.text}`}>
                      {option.icon} {option.label}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Clear Selection */}
            {selectedValues.length > 0 && (
              <button
                type="button"
                onClick={() => onToggle('__clear__')}
                className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 border-t border-gray-100 transition-colors"
              >
                Clear selection
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // Handle clear for multi-select
  const handleTrashTypeClear = (type) => {
    if (type === '__clear__') {
      onFilterChange('trashTypes', [])
    } else {
      handleTrashTypeToggle(type)
    }
  }

  const handleViolationTypeClear = (type) => {
    if (type === '__clear__') {
      onFilterChange('violationTypes', [])
    } else {
      handleViolationTypeToggle(type)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Main Filter Bar */}
      <div className="p-6">
        {/* Row 1: Search and Primary Filters */}
        <div className="flex flex-col xl:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 min-w-0">
            <label htmlFor="search" className="block text-sm font-semibold text-gray-700 mb-2">
              Search Reports
            </label>
            <div className="relative">
              <input
                id="search"
                type="text"
                value={filters.searchTerm || ''}
                onChange={(e) => onFilterChange('searchTerm', e.target.value)}
                placeholder="Search by name, location, type..."
                className="w-full px-4 py-3 pl-11 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-gray-50 focus:bg-white"
              />
              <svg 
                className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {filters.searchTerm && (
                <button
                  onClick={() => onFilterChange('searchTerm', '')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* ✅ Multi-Select Trash Types */}
          <div className="w-full xl:w-56">
            <MultiSelectDropdown
              label="Trash Types"
              options={trashTypeOptions}
              selectedValues={selectedTrashTypes}
              onToggle={handleTrashTypeClear}
              onSelectAll={handleSelectAllTrashTypes}
              isOpen={showTrashTypeDropdown}
              setIsOpen={setShowTrashTypeDropdown}
              dropdownRef={trashTypeDropdownRef}
              icon="🗑️"
            />
          </div>

          {/* ✅ NEW: Multi-Select Violation Types */}
          <div className="w-full xl:w-56">
            <MultiSelectDropdown
              label="Violation Types"
              options={violationTypeOptions}
              selectedValues={selectedViolationTypes}
              onToggle={handleViolationTypeClear}
              onSelectAll={handleSelectAllViolationTypes}
              isOpen={showViolationTypeDropdown}
              setIsOpen={setShowViolationTypeDropdown}
              dropdownRef={violationTypeDropdownRef}
              icon="⚠️"
            />
          </div>

          {/* Status Filter */}
          <div className="w-full xl:w-40">
            <label htmlFor="status" className="block text-sm font-semibold text-gray-700 mb-2">
              Status
            </label>
            <select
              id="status"
              value={filters.status || 'all'}
              onChange={(e) => onFilterChange('status', e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50 focus:bg-white transition-all appearance-none cursor-pointer ${
                filters.status && filters.status !== 'all'
                  ? 'border-primary-300 bg-primary-50' 
                  : 'border-gray-200'
              }`}
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Type Selection Filter */}
        <div className="mt-4 flex flex-col lg:flex-row gap-4">
          {/* Type Selection (Single/Multiple/All Types) */}
          <div className="w-full lg:w-52">
            <label htmlFor="typeSelection" className="block text-sm font-semibold text-gray-700 mb-2">
              Selection Type
              <span className="ml-1 text-xs font-normal text-gray-500">(how many types)</span>
            </label>
            <select
              id="typeSelection"
              value={filters.typeSelection || 'all'}
              onChange={(e) => onFilterChange('typeSelection', e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50 focus:bg-white transition-all appearance-none cursor-pointer ${
                filters.typeSelection === 'all-types'
                  ? 'border-purple-300 bg-purple-50'
                  : filters.typeSelection === 'multiple'
                  ? 'border-indigo-300 bg-indigo-50'
                  : filters.typeSelection === 'single'
                  ? 'border-gray-300 bg-gray-50'
                  : 'border-gray-200'
              }`}
            >
              {typeSelectionOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Source Filter */}
          <div className="w-full lg:w-44">
            <label htmlFor="source" className="block text-sm font-semibold text-gray-700 mb-2">
              Source
            </label>
            <select
              id="source"
              value={filters.source || 'all'}
              onChange={(e) => onFilterChange('source', e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50 focus:bg-white transition-all appearance-none cursor-pointer ${
                filters.source === 'violation'
                  ? 'border-red-300 bg-red-50'
                  : filters.source === 'collection'
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200'
              }`}
            >
              {sourceOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* GPS/Coordinates Filter */}
          <div className="w-full lg:w-44">
            <label htmlFor="hasCoordinates" className="block text-sm font-semibold text-gray-700 mb-2">
              GPS Location
            </label>
            <select
              id="hasCoordinates"
              value={filters.hasCoordinates || 'all'}
              onChange={(e) => onFilterChange('hasCoordinates', e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50 focus:bg-white transition-all appearance-none cursor-pointer ${
                filters.hasCoordinates === 'yes'
                  ? 'border-green-300 bg-green-50'
                  : filters.hasCoordinates === 'no'
                  ? 'border-yellow-300 bg-yellow-50'
                  : 'border-gray-200'
              }`}
            >
              {coordinatesOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Stats Display (if provided) */}
          {stats && (
            <div className="flex-1 flex items-end">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 bg-gray-100 rounded-lg text-gray-600">
                  📋 {stats.totalReports || 0} violations
                </span>
                <span className="px-2 py-1 bg-gray-100 rounded-lg text-gray-600">
                  📦 {stats.totalLogs || 0} collections
                </span>
                {stats.reportsWithMultiType > 0 && (
                  <span className="px-2 py-1 bg-indigo-100 rounded-lg text-indigo-600">
                    🔢 {stats.reportsWithMultiType + (stats.logsWithMultiType || 0)} multi-type
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Filter Buttons */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          {/* Type Selection Quick Filters */}
          <div className="mb-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-600 mr-2 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Quick:
              </span>
              
              <button
                onClick={() => onFilterChange('typeSelection', filters.typeSelection === 'all-types' ? 'all' : 'all-types')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  filters.typeSelection === 'all-types'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-300'
                    : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                }`}
              >
                ⭐ All Types (4)
              </button>

              <button
                onClick={() => onFilterChange('typeSelection', filters.typeSelection === 'multiple' ? 'all' : 'multiple')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  filters.typeSelection === 'multiple'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-300'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                }`}
              >
                🔢 Multiple (2-3)
              </button>

              <button
                onClick={() => onFilterChange('typeSelection', filters.typeSelection === 'single' ? 'all' : 'single')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  filters.typeSelection === 'single'
                    ? 'bg-gray-600 text-white border-gray-600 shadow-md ring-2 ring-gray-300'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                1️⃣ Single
              </button>

              <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block"></div>

              {/* Status Quick Filters */}
              <button
                onClick={() => onFilterChange('status', filters.status === 'reported' ? 'all' : 'reported')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  filters.status === 'reported'
                    ? 'bg-red-500 text-white border-red-500 shadow-md ring-2 ring-red-300'
                    : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                }`}
              >
                🔴 New
              </button>
              
              <button
                onClick={() => onFilterChange('status', filters.status === 'reviewing' ? 'all' : 'reviewing')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  filters.status === 'reviewing'
                    ? 'bg-yellow-500 text-white border-yellow-500 shadow-md ring-2 ring-yellow-300'
                    : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
                }`}
              >
                🟡 Reviewing
              </button>
              
              <button
                onClick={() => onFilterChange('status', filters.status === 'resolved' ? 'all' : 'resolved')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  filters.status === 'resolved'
                    ? 'bg-green-500 text-white border-green-500 shadow-md ring-2 ring-green-300'
                    : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                }`}
              >
                🟢 Resolved
              </button>

              <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block"></div>

              {/* Source Quick Filters */}
              <button
                onClick={() => onFilterChange('source', filters.source === 'violation' ? 'all' : 'violation')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  filters.source === 'violation'
                    ? 'bg-red-600 text-white border-red-600 shadow-md ring-2 ring-red-300'
                    : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                }`}
              >
                ⚠️ Violations
              </button>

              <button
                onClick={() => onFilterChange('source', filters.source === 'collection' ? 'all' : 'collection')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  filters.source === 'collection'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300'
                    : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                }`}
              >
                📦 Collections
              </button>
            </div>
          </div>

          {/* Trash Type Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-600 mr-2">Trash:</span>
            
            {trashTypeOptions.map(option => {
              const isSelected = isTrashTypeSelected(option.value)
              const colors = getTypeColor(option.value)
              
              return (
                <button
                  key={option.value}
                  onClick={() => handleTrashTypeToggle(option.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                    isSelected
                      ? `${colors.activeBg} text-white border-transparent shadow-md ring-2 ring-opacity-50`
                      : `${colors.bg} ${colors.text} ${colors.border} hover:opacity-80`
                  }`}
                  style={isSelected ? { boxShadow: `0 0 0 2px ${colors.activeBg}40` } : {}}
                >
                  {option.icon} {option.label}
                </button>
              )
            })}

            <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block"></div>

            <span className="text-sm font-medium text-gray-600 mr-2">Violation:</span>
            
            {violationTypeOptions.slice(0, 3).map(option => {
              const isSelected = isViolationTypeSelected(option.value)
              const colors = getTypeColor(option.value)
              
              return (
                <button
                  key={option.value}
                  onClick={() => handleViolationTypeToggle(option.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                    isSelected
                      ? `${colors.activeBg} text-white border-transparent shadow-md`
                      : `${colors.bg} ${colors.text} ${colors.border} hover:opacity-80`
                  }`}
                >
                  {option.icon} {option.label.split(' ')[0]}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Active Filters Bar */}
      {/* ============================================================ */}
      {hasActiveFilters && (
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters ({activeFilterCount}):
            </span>
            
            {/* ✅ Trash Types Tags (Multi-select) */}
            {selectedTrashTypes.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-xs text-gray-500 mr-1">Trash:</span>
                {selectedTrashTypes.map(type => {
                  const option = trashTypeOptions.find(o => o.value.toLowerCase() === type.toLowerCase())
                  const colors = getTypeColor(type)
                  
                  return (
                    <span 
                      key={type}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text} ${colors.border} border`}
                    >
                      {option?.icon} {option?.label || type}
                      <button
                        onClick={() => handleTrashTypeToggle(type)}
                        className="hover:opacity-70 transition-opacity"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  )
                })}
              </div>
            )}

            {/* ✅ Violation Types Tags (Multi-select) */}
            {selectedViolationTypes.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-xs text-gray-500 mr-1">Violations:</span>
                {selectedViolationTypes.map(type => {
                  const option = violationTypeOptions.find(o => o.value.toLowerCase() === type.toLowerCase())
                  const colors = getTypeColor(type)
                  
                  return (
                    <span 
                      key={type}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text} ${colors.border} border`}
                    >
                      {option?.icon} {option?.label?.split(' ')[0] || type}
                      <button
                        onClick={() => handleViolationTypeToggle(type)}
                        className="hover:opacity-70 transition-opacity"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  )
                })}
              </div>
            )}

            {/* Type Selection Tag */}
            {filters.typeSelection && filters.typeSelection !== 'all' && (
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm border ${getTagColorClasses(filters.typeSelection, 'typeSelection')}`}>
                {typeSelectionOptions.find(o => o.value === filters.typeSelection)?.icon}{' '}
                {typeSelectionOptions.find(o => o.value === filters.typeSelection)?.label}
                <button
                  onClick={() => onFilterChange('typeSelection', 'all')}
                  className="hover:opacity-70 transition-opacity ml-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}

            {/* Status Tag */}
            {filters.status && filters.status !== 'all' && (
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm border ${
                filters.status === 'reported' ? 'bg-red-100 text-red-800 border-red-200' :
                filters.status === 'reviewing' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                'bg-green-100 text-green-800 border-green-200'
              }`}>
                {statusOptions.find(o => o.value === filters.status)?.icon}{' '}
                {filters.status.charAt(0).toUpperCase() + filters.status.slice(1)}
                <button
                  onClick={() => onFilterChange('status', 'all')}
                  className="hover:opacity-70 transition-opacity ml-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}

            {/* Source Tag */}
            {filters.source && filters.source !== 'all' && (
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm border ${getTagColorClasses(filters.source, 'source')}`}>
                {sourceOptions.find(o => o.value === filters.source)?.icon}{' '}
                {sourceOptions.find(o => o.value === filters.source)?.label}
                <button
                  onClick={() => onFilterChange('source', 'all')}
                  className="hover:opacity-70 transition-opacity ml-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}

            {/* GPS Tag */}
            {filters.hasCoordinates && filters.hasCoordinates !== 'all' && (
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm border ${getTagColorClasses(filters.hasCoordinates, 'coordinates')}`}>
                {coordinatesOptions.find(o => o.value === filters.hasCoordinates)?.icon}{' '}
                {coordinatesOptions.find(o => o.value === filters.hasCoordinates)?.label}
                <button
                  onClick={() => onFilterChange('hasCoordinates', 'all')}
                  className="hover:opacity-70 transition-opacity ml-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}

            {/* Search Tag */}
            {filters.searchTerm && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-800 border border-purple-200 rounded-full text-sm font-semibold shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                "{filters.searchTerm}"
                <button
                  onClick={() => onFilterChange('searchTerm', '')}
                  className="hover:opacity-70 transition-opacity ml-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}

            {/* Clear All Button */}
            <button
              onClick={clearAllFilters}
              className="ml-auto px-4 py-1.5 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-all text-sm font-semibold flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReportFilters