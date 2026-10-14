// src/pages/Map.jsx

import React, { useState, useEffect, useCallback } from 'react'
import MapView from '../components/map/MapView'
import { getAllMapData, supabase, getCollectionLogs, getReports } from '../services/supabase'

const Map = () => {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState(null)
  const [filterTrashType, setFilterTrashType] = useState('all')
  
  // Track total records vs records with coordinates
  const [totalStats, setTotalStats] = useState({
    totalRecords: 0,
    recordsWithCoords: 0,
    recordsWithoutCoords: 0,
    violations: 0,
    collections: 0,
  })

  // Enhanced fetch function with stats
  const fetchReports = useCallback(async () => {
    setLoading(true)
    try {
      console.log('🗺️ Fetching map data...')
      
      // Get data WITH coordinates (for map display)
      const { data: mapData, error: mapError } = await getAllMapData()
      
      if (mapError) throw mapError
      
      if (mapData) {
        console.log('📍 Map data loaded:', mapData.length, 'items with coordinates')
        setReports(mapData)
      }

      // Also fetch ALL data to show stats about records without coordinates
      const [logsResult, reportsResult] = await Promise.all([
        getCollectionLogs(),
        getReports()
      ])

      const allLogs = logsResult.data || []
      const allReports = reportsResult.data || []
      const totalAll = allLogs.length + allReports.length

      // Count records with valid coordinates
      const logsWithCoords = allLogs.filter(l => 
        l.latitude != null && l.longitude != null && 
        l.latitude !== 0 && l.longitude !== 0
      ).length

      const reportsWithCoords = allReports.filter(r => 
        r.latitude != null && r.longitude != null && 
        r.latitude !== 0 && r.longitude !== 0
      ).length

      const totalWithCoords = logsWithCoords + reportsWithCoords
      const totalWithoutCoords = totalAll - totalWithCoords

      setTotalStats({
        totalRecords: totalAll,
        recordsWithCoords: totalWithCoords,
        recordsWithoutCoords: totalWithoutCoords,
        violations: allReports.length,
        collections: allLogs.length,
      })

      console.log('📊 Stats:')
      console.log(`   Total records: ${totalAll}`)
      console.log(`   With coordinates: ${totalWithCoords}`)
      console.log(`   Without coordinates: ${totalWithoutCoords}`)

    } catch (error) {
      console.error('❌ Error fetching map data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  // Real-time subscription for map data. Refetching keeps stats and markers correct
  // for INSERT/UPDATE/DELETE without duplicating rows in local state.
  useEffect(() => {
    console.log('📡 Setting up real-time subscriptions for map...')

    const handleRealtimeChange = () => {
      fetchReports()
    }

    const logsChannel = supabase
      .channel('map-collection-logs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'collection_logs' },
        handleRealtimeChange
      )
      .subscribe()

    const reportsChannel = supabase
      .channel('map-reports')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports' },
        handleRealtimeChange
      )
      .subscribe()

    return () => {
      console.log('📡 Cleaning up map subscriptions...')
      supabase.removeChannel(logsChannel)
      supabase.removeChannel(reportsChannel)
    }
  }, [fetchReports])

  // ✅ MODIFIED: Filter reports - handle different trash type naming conventions including "All Types"
  const filteredReports = filterTrashType === 'all' 
    ? reports 
    : reports.filter(report => {
        const trashType = report.trash_type?.toLowerCase() || ''
        const filterType = filterTrashType.toLowerCase()
        
        // ✅ NEW: Handle "All Types" filter
        if (filterType === 'all types') {
          return trashType === 'all types'
        }
        if (filterType === 'biodegradable') {
          return trashType === 'biodegradable'
        }
        if (filterType === 'non-biodegradable') {
          return trashType === 'non-biodegradable'
        }
        if (filterType === 'non-recyclable' || filterType === 'recyclable') {
          return trashType === 'non-recyclable' || trashType === 'recyclable'
        }
        if (filterType === 'hazard' || filterType === 'hazardous') {
          return trashType === 'hazard' || trashType === 'hazardous'
        }
        return report.trash_type === filterTrashType
      })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading map data...</p>
        </div>
      </div>
    )
  }

  // ✅ MODIFIED: Count by trash type - handle variations including "All Types"
  const allTypesCount = reports.filter(r => 
    r.trash_type?.toLowerCase() === 'all types'
  ).length

  const biodegradableCount = reports.filter(r => 
    r.trash_type?.toLowerCase() === 'biodegradable'
  ).length
  
  const nonBioCount = reports.filter(r => 
    r.trash_type?.toLowerCase() === 'non-biodegradable'
  ).length
  
  const recyclableCount = reports.filter(r => 
    ['non-recyclable', 'recyclable'].includes(r.trash_type?.toLowerCase())
  ).length
  
  const hazardCount = reports.filter(r => 
    ['hazard', 'hazardous'].includes(r.trash_type?.toLowerCase())
  ).length

  // Count by source
  const collectionsOnMap = reports.filter(r => r.source === 'collection').length
  const violationsOnMap = reports.filter(r => r.source === 'violation').length

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent mb-2">
            Interactive Map View
          </h1>
          <p className="text-gray-600 flex items-center gap-2 flex-wrap">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Showing {filteredReports.length} locations on map
            {/* Show warning if some records don't have coordinates */}
            {totalStats.recordsWithoutCoords > 0 && (
              <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-medium">
                ⚠️ {totalStats.recordsWithoutCoords} records without GPS
              </span>
            )}
          </p>
        </div>
        
        <button
          onClick={fetchReports}
          className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-2.5 rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Data Source Summary */}
      {totalStats.totalRecords > 0 && (
        <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-gray-900">{totalStats.totalRecords}</div>
              <div className="text-xs text-gray-500">Total Records</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-green-700">{totalStats.recordsWithCoords}</div>
              <div className="text-xs text-green-600">📍 On Map</div>
            </div>
            <div className={`rounded-xl p-3 ${totalStats.recordsWithoutCoords > 0 ? 'bg-yellow-50' : 'bg-gray-50'}`}>
              <div className={`text-2xl font-bold ${totalStats.recordsWithoutCoords > 0 ? 'text-yellow-700' : 'text-gray-400'}`}>
                {totalStats.recordsWithoutCoords}
              </div>
              <div className={`text-xs ${totalStats.recordsWithoutCoords > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                ⚠️ No GPS Data
              </div>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-blue-700">{collectionsOnMap}</div>
              <div className="text-xs text-blue-600">📦 Collections</div>
            </div>
            <div className="bg-red-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-red-700">{violationsOnMap}</div>
              <div className="text-xs text-red-600">⚠️ Violations</div>
            </div>
          </div>
          
          {/* Warning message for records without GPS */}
          {totalStats.recordsWithoutCoords > 0 && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  {totalStats.recordsWithoutCoords} records don't have GPS coordinates
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  These records were synced without location data (possibly scanned offline without GPS). 
                  They appear in the Reports page but not on this map.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ✅ MODIFIED: Total Reports Statistics with "All Types" */}
      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-1 h-6 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full"></span>
          Map Markers by Trash Type
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {/* Total on Map */}
          <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-gray-900 mb-1">{reports.length}</div>
            <div className="text-xs text-gray-600 font-medium">On Map</div>
          </div>

          {/* ✅ NEW: All Types - Purple */}
          <div 
            className={`bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-center text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer ${filterTrashType === 'All Types' ? 'ring-4 ring-purple-300' : ''}`}
            onClick={() => setFilterTrashType(filterTrashType === 'All Types' ? 'all' : 'All Types')}
          >
            <div className="text-3xl font-bold mb-1">{allTypesCount}</div>
            <div className="text-xs font-medium flex items-center justify-center gap-1">
              <span className="text-2xl">⭐</span>
              All Types
            </div>
            <div className="text-xs mt-1 opacity-90">All Categories</div>
          </div>

          {/* Biodegradable - Green */}
          <div 
            className={`bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-center text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer ${filterTrashType === 'Biodegradable' ? 'ring-4 ring-green-300' : ''}`}
            onClick={() => setFilterTrashType(filterTrashType === 'Biodegradable' ? 'all' : 'Biodegradable')}
          >
            <div className="text-3xl font-bold mb-1">{biodegradableCount}</div>
            <div className="text-xs font-medium flex items-center justify-center gap-1">
              <span className="text-2xl">🌿</span>
              Green Type
            </div>
            <div className="text-xs mt-1 opacity-90">Biodegradable</div>
          </div>

          {/* Non-Biodegradable - Blue */}
          <div 
            className={`bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-center text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer ${filterTrashType === 'Non-Biodegradable' ? 'ring-4 ring-blue-300' : ''}`}
            onClick={() => setFilterTrashType(filterTrashType === 'Non-Biodegradable' ? 'all' : 'Non-Biodegradable')}
          >
            <div className="text-3xl font-bold mb-1">{nonBioCount}</div>
            <div className="text-xs font-medium flex items-center justify-center gap-1">
              <span className="text-2xl">🔵</span>
              Blue Type
            </div>
            <div className="text-xs mt-1 opacity-90">Non-Biodegradable</div>
          </div>

          {/* Recyclable - Yellow */}
          <div 
            className={`bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-4 text-center text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer ${filterTrashType === 'Recyclable' ? 'ring-4 ring-yellow-300' : ''}`}
            onClick={() => setFilterTrashType(filterTrashType === 'Recyclable' ? 'all' : 'Recyclable')}
          >
            <div className="text-3xl font-bold mb-1">{recyclableCount}</div>
            <div className="text-xs font-medium flex items-center justify-center gap-1">
              <span className="text-2xl">🟡</span>
              Yellow Type
            </div>
            <div className="text-xs mt-1 opacity-90">Recyclable</div>
          </div>

          {/* Hazard - Red */}
          <div 
            className={`bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-center text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer ${filterTrashType === 'Hazardous' ? 'ring-4 ring-red-300' : ''}`}
            onClick={() => setFilterTrashType(filterTrashType === 'Hazardous' ? 'all' : 'Hazardous')}
          >
            <div className="text-3xl font-bold mb-1">{hazardCount}</div>
            <div className="text-xs font-medium flex items-center justify-center gap-1">
              <span className="text-2xl">🔴</span>
              Red Type
            </div>
            <div className="text-xs mt-1 opacity-90">Hazardous</div>
          </div>
        </div>
        
        {/* ✅ MODIFIED: Filter indicator with "All Types" styling */}
        {filterTrashType !== 'all' && (
          <div className={`mt-4 flex items-center justify-between p-3 rounded-lg ${
            filterTrashType === 'All Types' 
              ? 'bg-purple-50' 
              : 'bg-primary-50'
          }`}>
            <p className={`text-sm font-medium ${
              filterTrashType === 'All Types' 
                ? 'text-purple-700' 
                : 'text-primary-700'
            }`}>
              Filtering by: <span className="font-bold">{filterTrashType}</span>
              <span className={`ml-2 ${
                filterTrashType === 'All Types' 
                  ? 'text-purple-600' 
                  : 'text-primary-600'
              }`}>({filteredReports.length} markers)</span>
            </p>
            <button
              onClick={() => setFilterTrashType('all')}
              className={`text-sm font-semibold ${
                filterTrashType === 'All Types' 
                  ? 'text-purple-600 hover:text-purple-800' 
                  : 'text-primary-600 hover:text-primary-800'
              }`}
            >
              Clear Filter
            </button>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-gray-200">
        <div className="h-[700px] relative">
          {filteredReports.length === 0 ? (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="text-center p-8">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full mb-6 shadow-inner">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">No Locations to Display</h3>
                <p className="text-gray-600 max-w-md mx-auto mb-6">
                  {filterTrashType !== 'all' 
                    ? `No ${filterTrashType} collections found. Try selecting a different type.`
                    : totalStats.recordsWithoutCoords > 0
                      ? `${totalStats.recordsWithoutCoords} records exist but have no GPS coordinates. They appear in the Reports page.`
                      : 'No collection logs have been recorded yet. Start scanning QR codes to see data here.'}
                </p>
                {filterTrashType !== 'all' && (
                  <button
                    onClick={() => setFilterTrashType('all')}
                    className="bg-primary-600 text-white px-6 py-3 rounded-xl hover:bg-primary-700 transition-all shadow-lg"
                  >
                    Show All Collections
                  </button>
                )}
              </div>
            </div>
          ) : (
            <MapView 
              reports={filteredReports} 
              onMarkerClick={setSelectedReport}
              filterTrashType={filterTrashType}
            />
          )}
        </div>
      </div>

      {/* Selected Report/Resident Details Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className={`sticky top-0 p-6 rounded-t-3xl z-10 ${
              selectedReport.trash_type?.toLowerCase() === 'all types'
                ? 'bg-gradient-to-r from-purple-600 to-purple-700'
                : 'bg-gradient-to-r from-primary-600 to-primary-700'
            }`}>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <div className="bg-white/20 backdrop-blur-sm p-2 rounded-xl">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  {selectedReport.source === 'collection' ? 'Collection Details' : 'Violation Details'}
                </h2>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-white/80 hover:text-white bg-white/20 hover:bg-white/30 rounded-xl p-2 transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-8">
              {/* Source Badge */}
              <div className="mb-4 flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                  selectedReport.source === 'collection' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {selectedReport.source === 'collection' ? '📦 QR Collection' : '⚠️ Violation Report'}
                </span>
                
                {/* Show synced badge */}
                {selectedReport.synced && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                    🔄 Synced
                  </span>
                )}

                {/* ✅ NEW: Show "All Types" badge */}
                {selectedReport.trash_type?.toLowerCase() === 'all types' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 ring-2 ring-purple-200">
                    ⭐ All Types
                  </span>
                )}
              </div>

              {/* Resident Info */}
              {selectedReport.residents && (
                <div className="mb-6 bg-gradient-to-br from-primary-50 to-primary-100 p-6 rounded-2xl">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Resident Details
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-600 font-semibold uppercase">Full Name</p>
                      <p className="text-lg font-bold text-gray-900">{selectedReport.residents?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-semibold uppercase">Email</p>
                      <p className="text-sm text-gray-700">{selectedReport.residents?.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-semibold uppercase">Phone</p>
                      <p className="text-sm text-gray-700">{selectedReport.residents?.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-semibold uppercase">Address</p>
                      <p className="text-sm text-gray-700">{selectedReport.residents?.address || 'N/A'}</p>
                    </div>
                    {/* Show QR code */}
                    {selectedReport.residents?.qr_code && (
                      <div>
                        <p className="text-xs text-gray-600 font-semibold uppercase">QR Code</p>
                        <p className="text-xs text-gray-500 font-mono break-all">{selectedReport.residents.qr_code}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Collector Info */}
              {selectedReport.collectors && (
                <div className="mb-6 bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    {selectedReport.source === 'collection' ? 'Collected By' : 'Reported By'}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-600 font-semibold uppercase">Collector Name</p>
                      <p className="text-lg font-bold text-gray-900">{selectedReport.collectors?.name || 'N/A'}</p>
                    </div>
                    {selectedReport.collectors?.vehicle_number && (
                      <div>
                        <p className="text-xs text-gray-600 font-semibold uppercase">Vehicle Number</p>
                        <p className="text-sm text-gray-700">{selectedReport.collectors.vehicle_number}</p>
                      </div>
                    )}
                    {selectedReport.collectors?.phone && (
                      <div>
                        <p className="text-xs text-gray-600 font-semibold uppercase">Phone</p>
                        <p className="text-sm text-gray-700">{selectedReport.collectors.phone}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Collection/Report Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-2xl">
                  <p className="text-sm font-semibold text-gray-500 mb-2">
                    {selectedReport.source === 'collection' ? 'QR Code' : 'Bin ID'}
                  </p>
                  <p className="text-lg font-bold text-gray-900 break-all">
                    {selectedReport.qr_code || selectedReport.bin_id || 'N/A'}
                  </p>
                </div>
                
                {/* ✅ MODIFIED: Trash Type with "All Types" styling */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-2xl">
                  <p className="text-sm font-semibold text-gray-500 mb-2">Trash Type</p>
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-md ${
                    selectedReport.trash_type?.toLowerCase() === 'all types' ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white ring-2 ring-purple-300' :
                    selectedReport.trash_type?.toLowerCase() === 'biodegradable' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' :
                    selectedReport.trash_type?.toLowerCase() === 'non-biodegradable' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' :
                    ['non-recyclable', 'recyclable'].includes(selectedReport.trash_type?.toLowerCase()) ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white' :
                    'bg-gradient-to-r from-red-500 to-red-600 text-white'
                  }`}>
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                    {selectedReport.trash_type?.toLowerCase() === 'all types' && '⭐ '}
                    {selectedReport.trash_type || 'Unknown'}
                  </span>
                </div>
                
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-2xl">
                  <p className="text-sm font-semibold text-gray-500 mb-2">Status</p>
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${
                    selectedReport.status === 'collected' ? 'bg-green-100 text-green-700' :
                    selectedReport.status === 'reported' ? 'bg-yellow-100 text-yellow-700' :
                    selectedReport.status === 'reviewing' ? 'bg-blue-100 text-blue-700' :
                    selectedReport.status === 'resolved' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedReport.status || 'N/A'}
                  </span>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-2xl">
                  <p className="text-sm font-semibold text-gray-500 mb-2">Timestamp</p>
                  <p className="text-sm font-bold text-gray-900">
                    {selectedReport.timestamp 
                      ? new Date(selectedReport.timestamp).toLocaleString() 
                      : 'N/A'}
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-2xl md:col-span-2">
                  <p className="text-sm font-semibold text-gray-500 mb-2">Location</p>
                  <p className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {selectedReport.location || 'N/A'}
                  </p>
                </div>
                
                {selectedReport.latitude && selectedReport.longitude && (
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-2xl md:col-span-2">
                    <p className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      GPS Coordinates
                    </p>
                    <p className="text-lg font-bold text-green-800 font-mono">
                      {selectedReport.latitude}, {selectedReport.longitude}
                    </p>
                  </div>
                )}

                {(selectedReport.notes || selectedReport.description) && (
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-2xl md:col-span-2">
                    <p className="text-sm font-semibold text-gray-500 mb-2">
                      {selectedReport.source === 'collection' ? 'Notes' : 'Description'}
                    </p>
                    <p className="text-sm text-gray-700">{selectedReport.notes || selectedReport.description}</p>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-gray-200">
                <button
                  onClick={() => setSelectedReport(null)}
                  className={`w-full py-4 rounded-xl transition-all shadow-lg hover:shadow-xl font-semibold ${
                    selectedReport.trash_type?.toLowerCase() === 'all types'
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white'
                      : 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white'
                  }`}
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ MODIFIED: Map Legend with "All Types" */}
      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-1 h-6 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full"></span>
          Map Legend
        </h3>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Marker Colors (Trash Type):</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {/* ✅ NEW: All Types - Purple */}
              <div className="flex items-center gap-3 bg-purple-50 p-3 rounded-xl">
                <div className="w-8 h-8 bg-purple-500 rounded-full shadow-lg flex items-center justify-center text-white font-bold">⭐</div>
                <div>
                  <span className="text-sm font-medium text-gray-700 block">Purple</span>
                  <span className="text-xs text-gray-500">All Types</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-green-50 p-3 rounded-xl">
                <div className="w-8 h-8 bg-green-500 rounded-full shadow-lg flex items-center justify-center text-white font-bold">🌿</div>
                <div>
                  <span className="text-sm font-medium text-gray-700 block">Green</span>
                  <span className="text-xs text-gray-500">Biodegradable</span>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-xl">
                <div className="w-8 h-8 bg-blue-500 rounded-full shadow-lg flex items-center justify-center text-white font-bold">🔵</div>
                <div>
                  <span className="text-sm font-medium text-gray-700 block">Blue</span>
                  <span className="text-xs text-gray-500">Non-Biodegradable</span>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-yellow-50 p-3 rounded-xl">
                <div className="w-8 h-8 bg-yellow-500 rounded-full shadow-lg flex items-center justify-center text-white font-bold">🟡</div>
                <div>
                  <span className="text-sm font-medium text-gray-700 block">Yellow</span>
                  <span className="text-xs text-gray-500">Recyclable</span>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-red-50 p-3 rounded-xl">
                <div className="w-8 h-8 bg-red-500 rounded-full shadow-lg flex items-center justify-center text-white font-bold">☢️</div>
                <div>
                  <span className="text-sm font-medium text-gray-700 block">Red</span>
                  <span className="text-xs text-gray-500">Hazardous</span>
                </div>
              </div>
            </div>
          </div>

          {/* Data source legend */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm font-semibold text-gray-700 mb-3">Data Sources:</p>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg">
                <span className="text-lg">📦</span>
                <span className="text-sm text-blue-700 font-medium">QR Collections</span>
              </div>
              <div className="flex items-center gap-2 bg-red-50 px-3 py-2 rounded-lg">
                <span className="text-lg">⚠️</span>
                <span className="text-sm text-red-700 font-medium">Violation Reports</span>
              </div>
              <div className="flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-lg">
                <span className="text-lg">🔄</span>
                <span className="text-sm text-purple-700 font-medium">Synced from Offline</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Click on any marker to view collection and resident information. Only records with GPS coordinates appear on this map.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Map