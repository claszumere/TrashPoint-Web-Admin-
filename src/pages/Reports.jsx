// src/pages/Reports.jsx

import React, { useState, useEffect, useCallback } from 'react'
import ReportsTable from '../components/reports/ReportsTable'
import ReportFilters from '../components/reports/ReportFilters'
import { supabase, getAllDataForReports } from '../services/supabase'
import { useNotification } from '../context/NotificationContext'
import { logActivity, ACTIONS, ENTITIES } from '../services/activityLog'

const Reports = () => {
  const { showSuccess, showError, showWarning, showInfo, showConfirm } = useNotification()

  const [reports, setReports] = useState([])
  const [filteredReports, setFilteredReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    trashType: 'all',
    status: 'all',
    searchTerm: '',
    source: 'all',
    hasCoordinates: 'all',
    typeSelection: 'all'  // ✅ NEW: Filter by selection type (single, multiple, all-types)
  })
  const [viewMode, setViewMode] = useState('table')
  const [dataStats, setDataStats] = useState(null)

  // ============================================================
  // ✅ NEW: Helper function to parse trash_type (JSON array or string)
  // ============================================================
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

  // ✅ NEW: All individual types constant
  const ALL_INDIVIDUAL_TYPES = ['Biodegradable', 'Non-Biodegradable', 'Recyclable', 'Hazardous'];

  // ✅ NEW: Check if all types are selected
  const isAllTypesSelected = (types) => {
    if (!types || types.length === 0) return false;
    return ALL_INDIVIDUAL_TYPES.every(t => 
      types.some(type => type.toLowerCase() === t.toLowerCase())
    );
  };

  // ✅ NEW: Check if a specific type is included in the types array
  const hasTrashType = (trashTypeField, targetType) => {
    const types = parseTrashTypes(trashTypeField);
    return types.some(t => t.toLowerCase() === targetType.toLowerCase());
  };

  // ✅ NEW: Format types for display
  const formatTypesForDisplay = (trashType) => {
    const types = parseTrashTypes(trashType);
    if (types.length === 0) return 'Unknown';
    if (isAllTypesSelected(types)) return 'All Types';
    if (types.length === 1) return types[0];
    return `${types.length} Types`;
  };

  // Fetch ALL reports
  const fetchReports = useCallback(async () => {
    setLoading(true)
    try {
      console.log('📥 Fetching all reports data...')
      
      const { data, error, stats } = await getAllDataForReports()

      if (error) throw error
      
      if (data) {
        console.log('📥 Fetched reports:', data.length)
        console.log('📊 Stats:', stats)
        
        setReports(data)
        setFilteredReports(data)
        setDataStats(stats)
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
      showError('Failed to load reports. Please try again.', 'Loading Error')
    } finally {
      setLoading(false)
    }
  }, [showError])

  // Initial fetch
  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  // Real-time subscription for both reports AND collection_logs
  useEffect(() => {
    // Subscribe to reports table
    const reportsChannel = supabase
      .channel('reports-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reports'
        },
        async (payload) => {
          console.log('🔔 Reports real-time update:', payload)
          
          if (payload.eventType === 'INSERT') {
            const { data: newReport } = await supabase
              .from('reports')
              .select(`
                *,
                residents (id, name, email, phone, address),
                collectors (id, name, email)
              `)
              .eq('id', payload.new.id)
              .single()

            if (newReport) {
              // ✅ MODIFIED: Parse types for notification
              const types = parseTrashTypes(newReport.trash_type);
              const typeLabel = isAllTypesSelected(types) 
                ? 'All Types' 
                : types.length > 1 
                  ? `${types.length} types (${types.join(', ')})`
                  : types[0] || 'unknown';

              const enrichedReport = {
                ...newReport,
                source: 'violation',
                bin_id: newReport.bin_id || 'N/A',
                hasCoordinates: newReport.latitude != null && newReport.longitude != null &&
                               newReport.latitude !== 0 && newReport.longitude !== 0,
              }
              
              setReports(prev => [enrichedReport, ...prev])
              showWarning(
                `A new violation (${typeLabel}) has been reported at ${newReport.location || 'unknown location'}`,
                '🚨 New Violation Report'
              )
            }
          } else if (payload.eventType === 'UPDATE') {
            setReports(prev =>
              prev.map(report =>
                report.id === payload.new.id
                  ? { ...report, ...payload.new }
                  : report
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setReports(prev => prev.filter(report => report.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    // Subscribe to collection_logs table
    const logsChannel = supabase
      .channel('collection-logs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collection_logs'
        },
        async (payload) => {
          console.log('🔔 Collection logs real-time update:', payload)
          
          if (payload.eventType === 'INSERT') {
            const { data: newLog } = await supabase
              .from('collection_logs')
              .select(`
                *,
                collectors (id, name, email, phone),
                residents (id, name, email, phone, address, qr_code)
              `)
              .eq('id', payload.new.id)
              .single()

            if (newLog) {
              // ✅ MODIFIED: Parse types for notification
              const types = parseTrashTypes(newLog.trash_type);
              const typeLabel = isAllTypesSelected(types) 
                ? 'All Types' 
                : types.length > 1 
                  ? `${types.length} types`
                  : types[0] || 'unknown';

              const enrichedLog = {
                ...newLog,
                source: 'collection',
                bin_id: newLog.qr_code || 'N/A',
                description: newLog.notes || '',
                hasCoordinates: newLog.latitude != null && newLog.longitude != null &&
                               newLog.latitude !== 0 && newLog.longitude !== 0,
              }
              
              setReports(prev => [enrichedLog, ...prev])
              
              if (newLog.synced) {
                showInfo(
                  `Synced collection: ${typeLabel} at ${newLog.location || 'unknown location'}`,
                  '🔄 Offline Data Synced'
                )
              } else {
                showSuccess(
                  `New collection logged: ${typeLabel}`,
                  '📦 New Collection'
                )
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            setReports(prev =>
              prev.map(report =>
                report.id === payload.new.id
                  ? { ...report, ...payload.new }
                  : report
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setReports(prev => prev.filter(report => report.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(reportsChannel)
      supabase.removeChannel(logsChannel)
    }
  }, [showWarning, showInfo, showSuccess])

  // ============================================================
  // ✅ MODIFIED: Apply filters with multi-type support
  // ============================================================
  useEffect(() => {
    let filtered = [...reports]

    // ✅ MODIFIED: Filter by trash type (supports multi-select)
    if (filters.trashType !== 'all') {
      filtered = filtered.filter(report => {
        const types = parseTrashTypes(report.trash_type);
        
        // Check if the filter type is included in the report's types
        return types.some(t => t.toLowerCase() === filters.trashType.toLowerCase());
      })
    }

    // ✅ NEW: Filter by type selection mode (single, multiple, all-types)
    if (filters.typeSelection !== 'all') {
      filtered = filtered.filter(report => {
        const types = parseTrashTypes(report.trash_type);
        
        if (filters.typeSelection === 'all-types') {
          return isAllTypesSelected(types);
        } else if (filters.typeSelection === 'multiple') {
          return types.length > 1 && !isAllTypesSelected(types);
        } else if (filters.typeSelection === 'single') {
          return types.length === 1;
        }
        return true;
      })
    }

    // Filter by status
    if (filters.status !== 'all') {
      filtered = filtered.filter(report => report.status === filters.status)
    }

    // Filter by source
    if (filters.source !== 'all') {
      filtered = filtered.filter(report => report.source === filters.source)
    }

    // Filter by coordinate status
    if (filters.hasCoordinates !== 'all') {
      if (filters.hasCoordinates === 'yes') {
        filtered = filtered.filter(report => report.hasCoordinates === true)
      } else if (filters.hasCoordinates === 'no') {
        filtered = filtered.filter(report => report.hasCoordinates === false)
      }
    }

    // ✅ MODIFIED: Filter by search term (includes multi-type search)
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(report => {
        // Parse types for searching
        const types = parseTrashTypes(report.trash_type);
        const typesMatch = types.some(t => t.toLowerCase().includes(searchLower));
        
        return (
          typesMatch ||
          report.bin_id?.toLowerCase().includes(searchLower) ||
          report.location?.toLowerCase().includes(searchLower) ||
          report.description?.toLowerCase().includes(searchLower) ||
          report.qr_code?.toLowerCase().includes(searchLower) ||
          report.residents?.name?.toLowerCase().includes(searchLower) ||
          report.residents?.email?.toLowerCase().includes(searchLower) ||
          report.collectors?.name?.toLowerCase().includes(searchLower) ||
          // ✅ NEW: Search for "all types" or "multiple"
          (searchLower.includes('all type') && isAllTypesSelected(types)) ||
          (searchLower.includes('multiple') && types.length > 1)
        )
      })
    }

    setFilteredReports(filtered)
  }, [filters, reports])

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }))
  }

  // ============================================================
  // ✅ MODIFIED: TypeBadge component for display
  // ============================================================
  const TypeBadge = ({ type, size = 'sm' }) => {
    const getStyles = (trashType) => {
      const t = trashType?.toLowerCase();
      switch (t) {
        case 'all types':
          return 'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 border-purple-300 ring-2 ring-purple-200';
        case 'biodegradable':
          return 'bg-green-100 text-green-700 border-green-300';
        case 'non-biodegradable':
          return 'bg-blue-100 text-blue-700 border-blue-300';
        case 'recyclable':
          return 'bg-orange-100 text-orange-700 border-orange-300';
        case 'hazardous':
        case 'hazard':
          return 'bg-red-100 text-red-700 border-red-300';
        default:
          return 'bg-gray-100 text-gray-700 border-gray-300';
      }
    };

    const getIcon = (trashType) => {
      const t = trashType?.toLowerCase();
      switch (t) {
        case 'all types': return '⭐';
        case 'biodegradable': return '🌿';
        case 'non-biodegradable': return '📦';
        case 'recyclable': return '♻️';
        case 'hazardous':
        case 'hazard': return '☢️';
        default: return '📋';
      }
    };

    const sizeClasses = {
      xs: 'px-1.5 py-0.5 text-[10px]',
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-xs'
    };

    return (
      <span className={`inline-flex items-center gap-1 rounded-full font-semibold border ${getStyles(type)} ${sizeClasses[size]}`}>
        <span>{getIcon(type)}</span>
        <span>{type}</span>
      </span>
    );
  };

  // ============================================================
  // ✅ NEW: MultiTypeBadges component for grid view
  // ============================================================
  const MultiTypeBadges = ({ trashType, maxVisible = 2, showAll = false }) => {
    const types = parseTrashTypes(trashType);
    const allSelected = isAllTypesSelected(types);

    if (types.length === 0) {
      return <TypeBadge type="Unknown" size="sm" />;
    }

    if (allSelected) {
      return (
        <div className="flex flex-wrap items-center gap-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 border-2 border-purple-300 shadow-sm ring-2 ring-purple-200">
            <span>⭐</span>
            <span>All Types</span>
            <span className="bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded-full text-[10px] ml-1">
              {types.length}
            </span>
          </span>
        </div>
      );
    }

    if (types.length === 1) {
      return <TypeBadge type={types[0]} size="sm" />;
    }

    if (showAll) {
      return (
        <div className="flex flex-wrap gap-1">
          {types.map((type, index) => (
            <TypeBadge key={index} type={type} size="xs" />
          ))}
        </div>
      );
    }

    const visibleTypes = types.slice(0, maxVisible);
    const remainingCount = types.length - maxVisible;

    return (
      <div className="flex flex-wrap items-center gap-1">
        {visibleTypes.map((type, index) => (
          <TypeBadge key={index} type={type} size="xs" />
        ))}
        {remainingCount > 0 && (
          <span 
            className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-600 border border-gray-300"
            title={types.slice(maxVisible).join(', ')}
          >
            +{remainingCount}
          </span>
        )}
      </div>
    );
  };

  // ============================================================
  // ✅ MODIFIED: Delete report with multi-type display
  // ============================================================
  const handleDeleteReport = async (reportId) => {
    const report = reports.find(r => r.id === reportId)
    const isCollectionLog = report?.source === 'collection'
    
    // ✅ Parse types for display
    const types = parseTrashTypes(report?.trash_type);
    const allSelected = isAllTypesSelected(types);
    
    await showConfirm({
      title: isCollectionLog ? 'Delete Collection Log' : 'Delete Violation Report',
      message: (
        <div className="space-y-4 text-left">
          <p>Are you sure you want to delete this {isCollectionLog ? 'collection log' : 'violation report'}?</p>
          
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500 text-xs uppercase font-semibold mb-1">
                  {isCollectionLog ? 'Resident' : 'Reported For'}
                </p>
                <p className="font-bold text-gray-900">{report?.residents?.name || 'N/A'}</p>
              </div>
              
              {/* ✅ MODIFIED: Show multi-type display */}
              <div className="col-span-2">
                <p className="text-gray-500 text-xs uppercase font-semibold mb-2">
                  Trash Type(s) {types.length > 1 && `(${types.length} selected)`}
                </p>
                <div className="flex flex-wrap gap-1">
                  {allSelected ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 border-2 border-purple-300">
                      <span>⭐</span>
                      <span>All Types</span>
                      <span className="bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded-full text-[10px] ml-1">4</span>
                    </span>
                  ) : (
                    types.map((type, index) => (
                      <TypeBadge key={index} type={type} size="sm" />
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="text-gray-500 text-xs uppercase font-semibold mb-1">Source</p>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                  isCollectionLog ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                }`}>
                  {isCollectionLog ? '📦 Collection' : '⚠️ Violation'}
                </span>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase font-semibold mb-1">Date</p>
                <p className="font-medium text-gray-700">
                  {report?.timestamp ? new Date(report.timestamp).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase font-semibold mb-1">Map Location</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                  report?.hasCoordinates ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {report?.hasCoordinates ? '📍 Has GPS' : '❌ No GPS'}
                </span>
              </div>
              {report?.location && (
                <div className="col-span-2">
                  <p className="text-gray-500 text-xs uppercase font-semibold mb-1">Location</p>
                  <p className="font-medium text-gray-700 flex items-center gap-1">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {report.location}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-sm text-red-700 flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>This action cannot be undone.</span>
            </p>
          </div>
        </div>
      ),
      type: 'danger',
      confirmText: isCollectionLog ? 'Delete Log' : 'Delete Report',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          const tableName = isCollectionLog ? 'collection_logs' : 'reports'
          
          const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', reportId)

          if (error) throw error

          setReports(prev => prev.filter(r => r.id !== reportId))

          await logActivity({
            action: ACTIONS.DELETE,
            entityType: isCollectionLog ? ENTITIES.COLLECTION : ENTITIES.REPORT,
            entityId: reportId,
            entityName: report?.residents?.name,
            description: `Deleted ${isCollectionLog ? 'collection log' : 'violation report'} for "${report?.residents?.name || 'Unknown'}" with ${types.length} type(s)`
          })
          
          showSuccess(
            `The ${isCollectionLog ? 'collection log' : 'violation report'} has been permanently deleted.`,
            isCollectionLog ? 'Log Deleted' : 'Report Deleted'
          )
        } catch (error) {
          console.error('Error deleting:', error)
          showError(
            `Failed to delete: ${error.message}`,
            'Delete Failed'
          )
        }
      }
    })
  }

  // Update status (only for violation reports)
  const handleUpdateStatus = async (reportId, newStatus) => {
    const report = reports.find(r => r.id === reportId)
    
    if (report?.source === 'collection') {
      showWarning('Collection logs cannot have their status changed.', 'Not Applicable')
      return
    }
    
    const oldStatus = report?.status || 'reported'
    
    if (oldStatus === newStatus) return

    await showConfirm({
      title: 'Update Report Status',
      message: (
        <div className="space-y-4 text-left">
          <p>Change the status of this violation report?</p>
          
          <div className="flex items-center justify-center gap-3 py-4">
            <div className="text-center">
              <span className={`inline-flex px-3 py-1.5 rounded-full text-sm font-bold ${
                oldStatus === 'resolved' ? 'bg-green-100 text-green-700' :
                oldStatus === 'reviewing' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {oldStatus.charAt(0).toUpperCase() + oldStatus.slice(1)}
              </span>
              <p className="text-xs text-gray-500 mt-1">Current</p>
            </div>
            
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            
            <div className="text-center">
              <span className={`inline-flex px-3 py-1.5 rounded-full text-sm font-bold ${
                newStatus === 'resolved' ? 'bg-green-100 text-green-700' :
                newStatus === 'reviewing' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}
              </span>
              <p className="text-xs text-gray-500 mt-1">New</p>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm">
            <p className="text-gray-500">Resident: <strong className="text-gray-900">{report?.residents?.name || 'N/A'}</strong></p>
            <p className="text-gray-500">Location: <strong className="text-gray-900">{report?.location || 'N/A'}</strong></p>
          </div>
        </div>
      ),
      type: newStatus === 'resolved' ? 'success' : newStatus === 'reviewing' ? 'warning' : 'info',
      confirmText: 'Update Status',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('reports')
            .update({ status: newStatus })
            .eq('id', reportId)

          if (error) throw error

          setReports(prev =>
            prev.map(r =>
              r.id === reportId
                ? { ...r, status: newStatus }
                : r
            )
          )

          await logActivity({
            action: ACTIONS.STATUS_CHANGE,
            entityType: ENTITIES.REPORT,
            entityId: reportId,
            entityName: report?.residents?.name,
            description: `Changed report status from "${oldStatus}" to "${newStatus}" for "${report?.residents?.name}"`
          })
          
          if (newStatus === 'resolved') {
            showSuccess(
              `Report has been marked as resolved. The violation issue has been addressed.`,
              '✅ Report Resolved'
            )
          } else if (newStatus === 'reviewing') {
            showInfo(
              `Report is now under review. Follow up actions will be taken.`,
              '👀 Under Review'
            )
          } else {
            showWarning(
              `Report status has been reset to reported.`,
              '📋 Status Updated'
            )
          }
        } catch (error) {
          console.error('Error updating status:', error)
          showError(
            `Failed to update status: ${error.message}`,
            'Update Failed'
          )
        }
      }
    })
  }

  // ============================================================
  // ✅ MODIFIED: Export reports to CSV with multi-type support
  // ============================================================
  const handleExport = async () => {
    if (filteredReports.length === 0) {
      showWarning('No reports to export. Try adjusting your filters.', 'No Data')
      return
    }

    const headers = [
      'ID',
      'Source',
      'Resident Name',
      'Resident Email',
      'Collector Name',
      'Trash Types',           // ✅ MODIFIED: Changed from "Trash Type"
      'Types Count',           // ✅ NEW
      'Is All Types',          // ✅ NEW
      'Location',
      'Description',
      'Status',
      'Bin ID / QR Code',
      'Has GPS',
      'Latitude',
      'Longitude',
      'Synced',
      'Timestamp'
    ]

    const csvData = filteredReports.map(report => {
      const types = parseTrashTypes(report.trash_type);
      const allSelected = isAllTypesSelected(types);
      
      return [
        report.id,
        report.source || 'unknown',
        report.residents?.name || 'N/A',
        report.residents?.email || 'N/A',
        report.collectors?.name || 'N/A',
        types.join('; ') || 'N/A',              // ✅ Join types with semicolon
        types.length,                            // ✅ Types count
        allSelected ? 'Yes' : 'No',              // ✅ Is all types
        report.location || 'N/A',
        report.description || report.notes || 'N/A',
        report.status || 'N/A',
        report.bin_id || report.qr_code || 'N/A',
        report.hasCoordinates ? 'Yes' : 'No',
        report.latitude || 'N/A',
        report.longitude || 'N/A',
        report.synced ? 'Yes' : 'No',
        report.timestamp ? new Date(report.timestamp).toLocaleString() : 'N/A'
      ]
    })

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `all_reports_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    await logActivity({
      action: ACTIONS.EXPORT,
      entityType: ENTITIES.REPORT,
      description: `Exported ${filteredReports.length} reports to CSV`
    })

    showSuccess(
      `Successfully exported ${filteredReports.length} reports to CSV file.`,
      'Export Complete'
    )
  }

  const handleRefresh = async () => {
    await fetchReports()
    showInfo('Reports data has been refreshed.', 'Data Refreshed')
  }

  const handleClearFilters = () => {
    setFilters({
      trashType: 'all',
      status: 'all',
      searchTerm: '',
      source: 'all',
      hasCoordinates: 'all',
      typeSelection: 'all'
    })
    showInfo('All filters have been cleared.', 'Filters Reset')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading reports...</p>
        </div>
      </div>
    )
  }

  // ============================================================
  // ✅ MODIFIED: Calculate stats with multi-type support
  // ============================================================
  
  // Count reports that INCLUDE each type (can be counted multiple times if multi-type)
  const biodegradableCount = reports.filter(r => hasTrashType(r.trash_type, 'biodegradable')).length
  const nonBioCount = reports.filter(r => hasTrashType(r.trash_type, 'non-biodegradable')).length
  const recyclableCount = reports.filter(r => hasTrashType(r.trash_type, 'recyclable')).length
  const hazardCount = reports.filter(r => 
    hasTrashType(r.trash_type, 'hazardous') || hasTrashType(r.trash_type, 'hazard')
  ).length

  // ✅ NEW: Count by type selection mode
  const allTypesCount = reports.filter(r => isAllTypesSelected(parseTrashTypes(r.trash_type))).length
  const multipleTypesCount = reports.filter(r => {
    const types = parseTrashTypes(r.trash_type);
    return types.length > 1 && !isAllTypesSelected(types);
  }).length
  const singleTypeCount = reports.filter(r => parseTrashTypes(r.trash_type).length === 1).length

  // Count by source
  const violationsCount = reports.filter(r => r.source === 'violation').length
  const collectionsCount = reports.filter(r => r.source === 'collection').length

  // Count by coordinate status
  const withCoordsCount = reports.filter(r => r.hasCoordinates === true).length
  const withoutCoordsCount = reports.filter(r => r.hasCoordinates === false).length

  const reportedCount = reports.filter(r => r.status === 'reported').length
  const reviewingCount = reports.filter(r => r.status === 'reviewing').length
  const resolvedCount = reports.filter(r => r.status === 'resolved').length

  // Check if any filter is active
  const hasActiveFilters = filters.trashType !== 'all' || 
                          filters.status !== 'all' || 
                          filters.source !== 'all' ||
                          filters.hasCoordinates !== 'all' ||
                          filters.typeSelection !== 'all' ||
                          filters.searchTerm !== ''

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent mb-2">
            All Reports & Collections
          </h1>
          <p className="text-gray-600 flex items-center gap-2 flex-wrap">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Showing {filteredReports.length} of {reports.length} records
            {violationsCount > 0 && (
              <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">
                {violationsCount} violations
              </span>
            )}
            {collectionsCount > 0 && (
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                {collectionsCount} collections
              </span>
            )}
            {/* ✅ NEW: Show multi-type stats */}
            {allTypesCount > 0 && (
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium">
                ⭐ {allTypesCount} all types
              </span>
            )}
            {withoutCoordsCount > 0 && (
              <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-medium">
                ⚠️ {withoutCoordsCount} without GPS
              </span>
            )}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-primary-600 shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-primary-600 shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>

          <button
            onClick={handleRefresh}
            className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-2.5 rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button 
            onClick={handleExport}
            className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-2.5 rounded-xl hover:from-green-700 hover:to-green-800 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ✅ NEW: Type Selection Stats (All Types, Multiple, Single) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          onClick={() => handleFilterChange('typeSelection', filters.typeSelection === 'all' ? 'all' : 'all')}
          className={`cursor-pointer bg-white rounded-2xl p-5 shadow-xl border border-gray-100 text-center transform hover:scale-105 transition-all ${
            filters.typeSelection === 'all' ? 'ring-2 ring-primary-500' : ''
          }`}
        >
          <div className="text-sm text-gray-600 mb-1">Total Records</div>
          <div className="text-3xl font-bold text-gray-900">{reports.length}</div>
        </div>

        {/* ✅ NEW: All Types Card */}
        <div 
          onClick={() => handleFilterChange('typeSelection', filters.typeSelection === 'all-types' ? 'all' : 'all-types')}
          className={`cursor-pointer rounded-2xl p-5 shadow-xl text-center transform hover:scale-105 transition-all ${
            filters.typeSelection === 'all-types' 
              ? 'bg-purple-600 text-white ring-4 ring-purple-300' 
              : 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white'
          }`}
        >
          <div className="text-sm opacity-90 mb-1 flex items-center justify-center gap-1">
            <span>⭐</span> All Types Selected
          </div>
          <div className="text-3xl font-bold">{allTypesCount}</div>
        </div>

        {/* ✅ NEW: Multiple Types Card */}
        <div 
          onClick={() => handleFilterChange('typeSelection', filters.typeSelection === 'multiple' ? 'all' : 'multiple')}
          className={`cursor-pointer rounded-2xl p-5 shadow-xl text-center transform hover:scale-105 transition-all ${
            filters.typeSelection === 'multiple' 
              ? 'bg-indigo-600 text-white ring-4 ring-indigo-300' 
              : 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white'
          }`}
        >
          <div className="text-sm opacity-90 mb-1">Multiple Types</div>
          <div className="text-3xl font-bold">{multipleTypesCount}</div>
        </div>

        {/* ✅ NEW: Single Type Card */}
        <div 
          onClick={() => handleFilterChange('typeSelection', filters.typeSelection === 'single' ? 'all' : 'single')}
          className={`cursor-pointer rounded-2xl p-5 shadow-xl text-center transform hover:scale-105 transition-all ${
            filters.typeSelection === 'single' 
              ? 'bg-gray-700 text-white ring-4 ring-gray-400' 
              : 'bg-gradient-to-br from-gray-500 to-gray-600 text-white'
          }`}
        >
          <div className="text-sm opacity-90 mb-1">Single Type</div>
          <div className="text-3xl font-bold">{singleTypeCount}</div>
        </div>
      </div>

      {/* Source Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          onClick={() => handleFilterChange('source', filters.source === 'violation' ? 'all' : 'violation')}
          className={`cursor-pointer bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-5 text-white shadow-xl text-center transform hover:scale-105 transition-all ${
            filters.source === 'violation' ? 'ring-4 ring-red-300' : ''
          }`}
        >
          <div className="text-sm text-red-100 mb-1">⚠️ Violations</div>
          <div className="text-3xl font-bold">{violationsCount}</div>
        </div>

        <div 
          onClick={() => handleFilterChange('source', filters.source === 'collection' ? 'all' : 'collection')}
          className={`cursor-pointer bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-xl text-center transform hover:scale-105 transition-all ${
            filters.source === 'collection' ? 'ring-4 ring-blue-300' : ''
          }`}
        >
          <div className="text-sm text-blue-100 mb-1">📦 Collections</div>
          <div className="text-3xl font-bold">{collectionsCount}</div>
        </div>

        <div 
          onClick={() => handleFilterChange('hasCoordinates', filters.hasCoordinates === 'yes' ? 'all' : 'yes')}
          className={`cursor-pointer rounded-2xl p-5 shadow-xl text-center transform hover:scale-105 transition-all ${
            filters.hasCoordinates === 'yes'
              ? 'bg-green-600 text-white ring-4 ring-green-300'
              : 'bg-gradient-to-br from-green-500 to-green-600 text-white'
          }`}
        >
          <div className="text-sm opacity-90 mb-1">📍 With GPS</div>
          <div className="text-3xl font-bold">{withCoordsCount}</div>
        </div>

        <div 
          onClick={() => handleFilterChange('hasCoordinates', filters.hasCoordinates === 'no' ? 'all' : 'no')}
          className={`cursor-pointer rounded-2xl p-5 shadow-xl text-center transform hover:scale-105 transition-all ${
            withoutCoordsCount > 0 
              ? filters.hasCoordinates === 'no'
                ? 'bg-yellow-500 text-white ring-4 ring-yellow-300'
                : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
              : 'bg-green-50 text-green-700'
          }`}
        >
          <div className="text-sm mb-1">
            {withoutCoordsCount > 0 ? '⚠️ No GPS Data' : '✅ All Have GPS'}
          </div>
          <div className="text-3xl font-bold">{withoutCoordsCount}</div>
        </div>
      </div>

      {/* Quick Stats - Trash Types (now shows reports CONTAINING each type) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          onClick={() => handleFilterChange('trashType', filters.trashType === 'biodegradable' ? 'all' : 'biodegradable')}
          className={`cursor-pointer rounded-2xl p-5 shadow-xl text-center transform hover:scale-105 transition-all ${
            filters.trashType === 'biodegradable'
              ? 'bg-green-600 text-white ring-4 ring-green-300'
              : 'bg-gradient-to-br from-green-500 to-green-600 text-white'
          }`}
        >
          <div className="text-sm opacity-90 mb-1">🌿 Biodegradable</div>
          <div className="text-3xl font-bold">{biodegradableCount}</div>
          <div className="text-xs opacity-75 mt-1">includes multi-type</div>
        </div>

        <div 
          onClick={() => handleFilterChange('trashType', filters.trashType === 'non-biodegradable' ? 'all' : 'non-biodegradable')}
          className={`cursor-pointer rounded-2xl p-5 shadow-xl text-center transform hover:scale-105 transition-all ${
            filters.trashType === 'non-biodegradable'
              ? 'bg-blue-600 text-white ring-4 ring-blue-300'
              : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
          }`}
        >
          <div className="text-sm opacity-90 mb-1">📦 Non-Biodegradable</div>
          <div className="text-3xl font-bold">{nonBioCount}</div>
          <div className="text-xs opacity-75 mt-1">includes multi-type</div>
        </div>

        <div 
          onClick={() => handleFilterChange('trashType', filters.trashType === 'recyclable' ? 'all' : 'recyclable')}
          className={`cursor-pointer rounded-2xl p-5 shadow-xl text-center transform hover:scale-105 transition-all ${
            filters.trashType === 'recyclable'
              ? 'bg-orange-600 text-white ring-4 ring-orange-300'
              : 'bg-gradient-to-br from-orange-500 to-orange-600 text-white'
          }`}
        >
          <div className="text-sm opacity-90 mb-1">♻️ Recyclable</div>
          <div className="text-3xl font-bold">{recyclableCount}</div>
          <div className="text-xs opacity-75 mt-1">includes multi-type</div>
        </div>

        <div 
          onClick={() => handleFilterChange('trashType', filters.trashType === 'hazardous' ? 'all' : 'hazardous')}
          className={`cursor-pointer rounded-2xl p-5 shadow-xl text-center transform hover:scale-105 transition-all ${
            filters.trashType === 'hazardous'
              ? 'bg-red-600 text-white ring-4 ring-red-300'
              : 'bg-gradient-to-br from-red-500 to-red-600 text-white'
          }`}
        >
          <div className="text-sm opacity-90 mb-1">☢️ Hazardous</div>
          <div className="text-3xl font-bold">{hazardCount}</div>
          <div className="text-xs opacity-75 mt-1">includes multi-type</div>
        </div>
      </div>

      {/* Status Stats (only for violations) */}
      <div className="grid grid-cols-3 gap-4">
        <div 
          onClick={() => handleFilterChange('status', filters.status === 'reported' ? 'all' : 'reported')}
          className={`cursor-pointer rounded-2xl p-4 shadow-lg text-center transform hover:scale-105 transition-all ${
            filters.status === 'reported' 
              ? 'bg-red-600 text-white ring-4 ring-red-300' 
              : 'bg-red-50 text-red-700 hover:bg-red-100'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm font-medium">Reported</span>
          </div>
          <div className="text-2xl font-bold mt-1">{reportedCount}</div>
        </div>

        <div 
          onClick={() => handleFilterChange('status', filters.status === 'reviewing' ? 'all' : 'reviewing')}
          className={`cursor-pointer rounded-2xl p-4 shadow-lg text-center transform hover:scale-105 transition-all ${
            filters.status === 'reviewing' 
              ? 'bg-yellow-500 text-white ring-4 ring-yellow-300' 
              : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="text-sm font-medium">Reviewing</span>
          </div>
          <div className="text-2xl font-bold mt-1">{reviewingCount}</div>
        </div>

        <div 
          onClick={() => handleFilterChange('status', filters.status === 'resolved' ? 'all' : 'resolved')}
          className={`cursor-pointer rounded-2xl p-4 shadow-lg text-center transform hover:scale-105 transition-all ${
            filters.status === 'resolved' 
              ? 'bg-green-600 text-white ring-4 ring-green-300' 
              : 'bg-green-50 text-green-700 hover:bg-green-100'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">Resolved</span>
          </div>
          <div className="text-2xl font-bold mt-1">{resolvedCount}</div>
        </div>
      </div>

      {/* Filters */}
      <ReportFilters filters={filters} onFilterChange={handleFilterChange} />

      {/* ✅ MODIFIED: Active filters indicator with typeSelection */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500">Active filters:</span>
          {filters.trashType !== 'all' && (
            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              Type contains: {filters.trashType}
              <button 
                onClick={() => handleFilterChange('trashType', 'all')}
                className="ml-1 hover:text-red-500"
              >
                ×
              </button>
            </span>
          )}
          {filters.typeSelection !== 'all' && (
            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              {filters.typeSelection === 'all-types' ? '⭐ All Types' : 
               filters.typeSelection === 'multiple' ? 'Multiple Types' : 'Single Type'}
              <button 
                onClick={() => handleFilterChange('typeSelection', 'all')}
                className="ml-1 hover:text-red-500"
              >
                ×
              </button>
            </span>
          )}
          {filters.status !== 'all' && (
            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              Status: {filters.status}
              <button 
                onClick={() => handleFilterChange('status', 'all')}
                className="ml-1 hover:text-red-500"
              >
                ×
              </button>
            </span>
          )}
          {filters.source !== 'all' && (
            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              Source: {filters.source}
              <button 
                onClick={() => handleFilterChange('source', 'all')}
                className="ml-1 hover:text-red-500"
              >
                ×
              </button>
            </span>
          )}
          {filters.hasCoordinates !== 'all' && (
            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              GPS: {filters.hasCoordinates === 'yes' ? 'With GPS' : 'Without GPS'}
              <button 
                onClick={() => handleFilterChange('hasCoordinates', 'all')}
                className="ml-1 hover:text-red-500"
              >
                ×
              </button>
            </span>
          )}
          {filters.searchTerm && (
            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              Search: "{filters.searchTerm}"
              <button 
                onClick={() => handleFilterChange('searchTerm', '')}
                className="ml-1 hover:text-red-500"
              >
                ×
              </button>
            </span>
          )}
          <button
            onClick={handleClearFilters}
            className="text-primary-600 hover:text-primary-700 text-xs font-medium underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Reports Content */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {filteredReports.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-6 shadow-inner">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
                        </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No Records Found</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {hasActiveFilters
                ? 'Try adjusting your filters to see more results'
                : 'No violation reports or collection logs have been submitted yet'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="bg-primary-600 text-white px-6 py-3 rounded-xl hover:bg-primary-700 transition-all shadow-lg"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : viewMode === 'table' ? (
          <ReportsTable 
            reports={filteredReports} 
            onDeleteReport={handleDeleteReport}
            onUpdateStatus={handleUpdateStatus}
          />
        ) : (
          // ============================================================
          // ✅ MODIFIED: Grid View with Multi-Type Support
          // ============================================================
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReports.map((report) => {
              // ✅ NEW: Parse types for each card
              const types = parseTrashTypes(report.trash_type);
              const allSelected = isAllTypesSelected(types);
              const hasMultiple = types.length > 1;

              return (
                <div 
                  key={report.id} 
                  className={`
                    bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 border-2 
                    hover:shadow-xl transition-all transform hover:-translate-y-1
                    ${allSelected 
                      ? 'border-purple-300 ring-2 ring-purple-100' 
                      : hasMultiple 
                        ? 'border-indigo-200 ring-1 ring-indigo-100'
                        : 'border-gray-200'
                    }
                  `}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Source Badge */}
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        report.source === 'collection' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {report.source === 'collection' ? '📦 Collection' : '⚠️ Violation'}
                      </span>
                      
                      {/* Status Badge (only for violations) */}
                      {report.source === 'violation' && (
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          report.status === 'reported' ? 'bg-red-100 text-red-700' :
                          report.status === 'reviewing' ? 'bg-yellow-100 text-yellow-700' :
                          report.status === 'resolved' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {report.status?.charAt(0).toUpperCase() + report.status?.slice(1) || 'Unknown'}
                        </span>
                      )}

                      {/* ✅ NEW: Multi-type indicator */}
                      {hasMultiple && (
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          allSelected 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {allSelected ? '⭐ All' : `${types.length} types`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ✅ MODIFIED: Trash Type Badges Section */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-2">
                      Trash Type{types.length > 1 ? 's' : ''}
                    </p>
                    <MultiTypeBadges trashType={report.trash_type} maxVisible={3} />
                  </div>

                  {/* Resident Info */}
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {report.residents?.name || 'Unknown Resident'}
                  </h3>
                  <p className="text-sm text-gray-500 mb-3">
                    {report.residents?.email || 'No email'}
                  </p>
                  
                  {/* Description */}
                  {(report.description || report.notes) && (
                    <div className={`border rounded-lg p-3 mb-4 ${
                      report.source === 'violation' 
                        ? allSelected 
                          ? 'bg-purple-50 border-purple-100'
                          : 'bg-red-50 border-red-100' 
                        : 'bg-blue-50 border-blue-100'
                    }`}>
                      <p className={`text-sm font-medium mb-1 ${
                        report.source === 'violation' 
                          ? allSelected ? 'text-purple-800' : 'text-red-800' 
                          : 'text-blue-800'
                      }`}>
                        {report.source === 'violation' ? 'Violation Description:' : 'Notes:'}
                      </p>
                      <p className={`text-sm ${
                        report.source === 'violation' 
                          ? allSelected ? 'text-purple-700' : 'text-red-700'
                          : 'text-blue-700'
                      }`}>
                        {report.description || report.notes}
                      </p>
                    </div>
                  )}

                  {/* Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="truncate">{report.location || 'No location'}</span>
                    </div>

                    {/* GPS Status Indicator */}
                    <div className="flex items-center gap-2 text-sm">
                      {report.hasCoordinates ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          GPS coordinates available
                        </span>
                      ) : (
                        <span className="text-yellow-600 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          No GPS - won't show on map
                        </span>
                      )}
                    </div>

                    {(report.bin_id || report.qr_code) && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        <span className="truncate">
                          {report.source === 'collection' ? 'QR: ' : 'Bin: '}
                          {report.bin_id || report.qr_code}
                        </span>
                      </div>
                    )}

                    {report.collectors?.name && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>
                          {report.source === 'collection' ? 'Collected by: ' : 'Reported by: '}
                          {report.collectors.name}
                        </span>
                      </div>
                    )}

                    {/* Show if synced from offline */}
                    {report.synced && (
                      <div className="flex items-center gap-2 text-xs text-purple-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                        <span>Synced from offline</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{report.timestamp ? new Date(report.timestamp).toLocaleString() : 'No date'}</span>
                    </div>
                  </div>

                  {/* ✅ NEW: Expanded Types View (on hover/click) */}
                  {hasMultiple && (
                    <div className={`mb-4 p-3 rounded-lg ${
                      allSelected 
                        ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200'
                        : 'bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200'
                    }`}>
                      <p className="text-xs font-semibold text-gray-600 mb-2">All Selected Types:</p>
                      <div className="flex flex-wrap gap-1">
                        {types.map((type, index) => (
                          <TypeBadge key={index} type={type} size="xs" />
                        ))}
                      </div>
                      {allSelected && (
                        <p className="text-xs text-purple-600 mt-2 flex items-center gap-1">
                          <span>⭐</span>
                          <span>All waste categories selected</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {report.source === 'violation' ? (
                      <select
                        value={report.status || 'reported'}
                        onChange={(e) => handleUpdateStatus(report.id, e.target.value)}
                        className={`flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                          allSelected ? 'border-purple-200' : 'border-gray-200'
                        }`}
                      >
                        <option value="reported">Reported</option>
                        <option value="reviewing">Reviewing</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    ) : (
                      <div className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg text-center font-medium">
                        ✅ Collected
                      </div>
                    )}

                    {/* View on Map Button (if has coordinates) */}
                    {report.hasCoordinates && (
                      <a
                        href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-green-50 text-green-600 rounded-lg font-medium hover:bg-green-100 transition-all"
                        title="View on Map"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                      </a>
                    )}

                    <button
                      onClick={() => handleDeleteReport(report.id)}
                      className="px-3 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Reports