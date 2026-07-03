// src/pages/ActivityLog.jsx

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { getActivityLogs, getActivityStats, ACTIONS, ENTITIES } from '../services/activityLog'
import { supabase } from '../services/supabase'
import { useNotification } from '../context/NotificationContext'

const ActivityLog = () => {
  const { showSuccess, showError, showInfo } = useNotification()
  
  // ✅ Use ref to store notification functions to avoid dependency issues
  const notificationRef = useRef({ showSuccess, showError, showInfo })
  
  // Update ref when notifications change
  useEffect(() => {
    notificationRef.current = { showSuccess, showError, showInfo }
  }, [showSuccess, showError, showInfo])
  
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)  // ✅ NEW: Separate refreshing state
  const [stats, setStats] = useState(null)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const logsPerPage = 15
  
  // Filters
  const [filters, setFilters] = useState({
    action: 'all',
    entityType: 'all',
    startDate: '',
    endDate: '',
    searchTerm: ''
  })

  // ✅ FIXED: Fetch activity logs without notification in dependencies
  const fetchLogs = useCallback(async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) {
      setLoading(true)
    }
    
    try {
      console.log('📋 Fetching activity logs...', { currentPage, filters })
      
      const { data, error, count, totalPages: pages } = await getActivityLogs({
        page: currentPage,
        limit: logsPerPage,
        action: filters.action !== 'all' ? filters.action : null,
        entityType: filters.entityType !== 'all' ? filters.entityType : null,
        startDate: filters.startDate || null,
        endDate: filters.endDate || null,
        searchTerm: filters.searchTerm || null
      })

      if (error) throw error

      console.log('✅ Fetched', data?.length, 'logs')
      
      setLogs(data || [])
      setTotalPages(pages || 1)
      setTotalCount(count || 0)
      
      return { success: true, count: data?.length || 0 }
    } catch (error) {
      console.error('❌ Error fetching logs:', error)
      notificationRef.current.showError('Failed to load activity logs', 'Error')
      return { success: false, error }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [currentPage, filters]) // ✅ Removed showError from dependencies

  // ✅ FIXED: Fetch stats without dependencies issue
  const fetchStats = useCallback(async () => {
    try {
      const { data } = await getActivityStats(7)
      if (data) {
        setStats(data)
        console.log('📊 Stats updated:', data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }, [])

  // ✅ FIXED: Manual refresh function
  const handleRefresh = async () => {
    console.log('🔄 Manual refresh triggered')
    setRefreshing(true)
    
    try {
      // Fetch both logs and stats
      const [logsResult] = await Promise.all([
        fetchLogs(false),  // Don't show main loading spinner
        fetchStats()
      ])
      
      if (logsResult.success) {
        notificationRef.current.showSuccess(
          `Loaded ${logsResult.count} activity logs`,
          '🔄 Refreshed'
        )
      }
    } catch (error) {
      console.error('Refresh error:', error)
      notificationRef.current.showError('Failed to refresh', 'Error')
    } finally {
      setRefreshing(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchLogs()
    fetchStats()
  }, [fetchLogs, fetchStats])

  // Real-time subscription
  useEffect(() => {
    console.log('📡 Setting up real-time subscription...')
    
    const channel = supabase
      .channel('activity-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs'
        },
        (payload) => {
          console.log('🔔 New activity:', payload.new)
          setLogs(prev => [payload.new, ...prev].slice(0, logsPerPage))
          setTotalCount(prev => prev + 1)
          fetchStats()
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status)
      })

    return () => {
      console.log('📡 Cleaning up subscription...')
      supabase.removeChannel(channel)
    }
  }, [fetchStats, logsPerPage])

  // Handle filter change
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }))
    setCurrentPage(1)
  }

  // Clear filters
  const clearFilters = () => {
    setFilters({
      action: 'all',
      entityType: 'all',
      startDate: '',
      endDate: '',
      searchTerm: ''
    })
    setCurrentPage(1)
    showInfo('All filters cleared', 'Filters Reset')
  }

  // Export to CSV
  const handleExport = async () => {
    try {
      const { data } = await getActivityLogs({ limit: 1000 })
      
      if (!data || data.length === 0) {
        showError('No data to export', 'Export Failed')
        return
      }

      const headers = ['Date', 'Time', 'User', 'Action', 'Entity Type', 'Entity Name', 'Description']
      const csvData = data.map(log => [
        new Date(log.created_at).toLocaleDateString(),
        new Date(log.created_at).toLocaleTimeString(),
        log.user_email || 'System',
        log.action,
        log.entity_type || 'N/A',
        log.entity_name || 'N/A',
        log.description
      ])

      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `activity_log_${new Date().toISOString().split('T')[0]}.csv`
      link.click()

      showSuccess(`Exported ${data.length} activity logs to CSV`, 'Export Complete')
    } catch (error) {
      showError('Failed to export logs', 'Export Error')
    }
  }

  // Get action badge style
  const getActionBadge = (action) => {
    const styles = {
      CREATE: 'bg-green-100 text-green-700 border-green-200',
      UPDATE: 'bg-blue-100 text-blue-700 border-blue-200',
      DELETE: 'bg-red-100 text-red-700 border-red-200',
      LOGIN: 'bg-purple-100 text-purple-700 border-purple-200',
      LOGOUT: 'bg-gray-100 text-gray-700 border-gray-200',
      ACTIVATE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      DEACTIVATE: 'bg-orange-100 text-orange-700 border-orange-200',
      GENERATE_QR: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      CHANGE_PASSWORD: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      EXPORT: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      STATUS_CHANGE: 'bg-pink-100 text-pink-700 border-pink-200',
      CHATBOT_MESSAGE: 'bg-violet-100 text-violet-700 border-violet-200',
      CHATBOT_AGENT_STARTED: 'bg-teal-100 text-teal-700 border-teal-200',
      CHATBOT_AGENT_MESSAGE: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      CHATBOT_AGENT_REPLY: 'bg-sky-100 text-sky-700 border-sky-200'
    }
    return styles[action] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  // Get action icon
  const getActionIcon = (action) => {
    const icons = {
      CREATE: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      UPDATE: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      DELETE: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      LOGIN: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
      ),
      LOGOUT: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      ),
      STATUS_CHANGE: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      CHATBOT_MESSAGE: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
      CHATBOT_AGENT_STARTED: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.701 2.701 0 01-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z" />
        </svg>
      ),
      CHATBOT_AGENT_MESSAGE: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
       </svg>
      ),
      CHATBOT_AGENT_REPLY: (
       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      )
    }
    return icons[action] || (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }

  // Get entity icon
  const getEntityIcon = (entityType) => {
    const icons = {
      resident: '👤',
      collector: '🚛',
      report: '📋',
      announcement: '📢',
      schedule: '📅',
      admin: '👨‍💼',
      system: '⚙️'
    }
    return icons[entityType] || '📄'
  }

  // Format relative time
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  // Loading state for initial load only
  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading activity logs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent mb-2">
            Activity Log
          </h1>
          <p className="text-gray-600 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Tracking {totalCount} system activities in real-time
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* ✅ FIXED: Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-200 transition-all flex items-center gap-2 ${
              refreshing ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            <svg 
              className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </span>
          </button>

          <button 
            onClick={handleExport}
            className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2.5 rounded-xl hover:from-green-700 hover:to-green-800 transition-all flex items-center gap-2 shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-xl transform hover:scale-105 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">Total Activities</p>
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-blue-200 text-xs mt-1">Last 7 days</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white shadow-xl transform hover:scale-105 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium mb-1">Created</p>
                <p className="text-3xl font-bold">{stats.byAction?.CREATE || 0}</p>
                <p className="text-green-200 text-xs mt-1">New records</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl p-5 text-white shadow-xl transform hover:scale-105 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium mb-1">Updated</p>
                <p className="text-3xl font-bold">{stats.byAction?.UPDATE || 0}</p>
                <p className="text-yellow-200 text-xs mt-1">Modifications</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-5 text-white shadow-xl transform hover:scale-105 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium mb-1">Deleted</p>
                <p className="text-3xl font-bold">{stats.byAction?.DELETE || 0}</p>
                <p className="text-red-200 text-xs mt-1">Removals</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search activities..."
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            />
            <svg 
              className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Action Filter */}
          <select
            value={filters.action}
            onChange={(e) => handleFilterChange('action', e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Actions</option>
            {Object.values(ACTIONS).map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>

          {/* Entity Filter */}
          <select
            value={filters.entityType}
            onChange={(e) => handleFilterChange('entityType', e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Entities</option>
            {Object.values(ENTITIES).map(entity => (
              <option key={entity} value={entity}>{entity.charAt(0).toUpperCase() + entity.slice(1)}</option>
            ))}
          </select>

          {/* Date Range */}
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />

          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />

          {/* Clear Filters */}
          <button
            onClick={clearFilters}
            className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all font-medium"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Activity Log Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Loading Overlay */}
        {(loading || refreshing) && logs.length > 0 && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
            <div className="bg-white rounded-xl shadow-lg p-4 flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              <span className="text-gray-600 font-medium">Updating...</span>
            </div>
          </div>
        )}

        {logs.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-6 shadow-inner">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No Activity Logs Found</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {filters.action !== 'all' || filters.entityType !== 'all' || filters.searchTerm
                ? 'Try adjusting your filters to see more results'
                : 'Activity logs will appear here as actions are performed'}
            </p>
            <button
              onClick={handleRefresh}
              className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all"
            >
              Refresh
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto relative">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Entity</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.map((log, index) => (
                    <tr 
                      key={log.id} 
                      className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent transition-all ${
                        index === 0 ? 'bg-green-50/50' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">
                            {formatRelativeTime(log.created_at)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="bg-gradient-to-br from-primary-100 to-primary-200 p-2 rounded-lg">
                            <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{log.user_name || log.user_email || 'System'}</p>
                            <p className="text-xs text-gray-500">{log.user_email || 'system@trashpoint.com'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${getActionBadge(log.action)}`}>
                          {getActionIcon(log.action)}
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.entity_type ? (
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getEntityIcon(log.entity_type)}</span>
                            <div>
                              <p className="text-sm font-medium text-gray-900 capitalize">{log.entity_type}</p>
                              {log.entity_name && (
                                <p className="text-xs text-gray-500 truncate max-w-[150px]">{log.entity_name}</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-700 max-w-md truncate" title={log.description}>
                          {log.description}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-gray-600">
                Showing {((currentPage - 1) * logsPerPage) + 1} to {Math.min(currentPage * logsPerPage, totalCount)} of {totalCount} activities
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                
                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                          currentPage === pageNum
                            ? 'bg-primary-600 text-white shadow-lg'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ActivityLog