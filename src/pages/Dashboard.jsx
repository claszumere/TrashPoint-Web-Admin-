// src/pages/Dashboard.jsx

import React, { useState, useEffect } from 'react'
import SummaryCard from '../components/dashboard/SummaryCard'
import TrashChart from '../components/dashboard/TrashChart'
import { getDashboardStats, getReports, getViolationsByType, supabase } from '../services/supabase'
import { formatDate, getTrashTypeBadgeColor } from '../utils/helpers'
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts'

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalReports: 0,
    totalViolations: 0,
    totalResidents: 0,
    totalCollectors: 0,
    allTypesCount: 0,           // ✅ NEW
    biodegradableCount: 0,
    nonBiodegradableCount: 0,
    recyclableCount: 0,
    hazardousCount: 0,
  })
  const [violationData, setViolationData] = useState({
    violations: {},
    percentages: {},
    total: 0
  })
  const [recentReports, setRecentReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('week')
  
  // Trend data state
  const [trendData, setTrendData] = useState([])
  const [trendLoading, setTrendLoading] = useState(true)
  const [trendPeriod, setTrendPeriod] = useState('7days') // '7days', '30days', '3months'
  const [chartType, setChartType] = useState('area') // 'area', 'line', 'bar'

  useEffect(() => {
    fetchDashboardData()
  }, [])

  // Fetch trend data when period changes
  useEffect(() => {
    fetchTrendData()
  }, [trendPeriod])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const { data: statsData, error: statsError } = await getDashboardStats()
      if (statsError) throw statsError
      if (statsData) {
        console.log('📊 Dashboard Stats:', statsData)
        
        setStats({
          ...statsData,
          allTypesCount: statsData.allTypesCount || statsData.totalAllTypes || 0
        })
      }

      const { data: violationStats, error: violationError } = await getViolationsByType()
      if (violationError) throw violationError
      if (violationStats) {
        console.log('📈 Violation Stats:', violationStats)
        setViolationData(violationStats)
      }

      const { data: reportsData, error: reportsError } = await getReports()
      if (reportsError) throw reportsError
      if (reportsData) setRecentReports(reportsData.slice(0, 5))
      
      // Fetch trend data
      await fetchTrendData()
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch trend data for charts
  const fetchTrendData = async () => {
    setTrendLoading(true)
    try {
      // Calculate date range based on selected period
      const now = new Date()
      let startDate = new Date()
      let groupBy = 'day'
      
      switch (trendPeriod) {
        case '7days':
          startDate.setDate(now.getDate() - 7)
          groupBy = 'day'
          break
        case '30days':
          startDate.setDate(now.getDate() - 30)
          groupBy = 'day'
          break
        case '3months':
          startDate.setMonth(now.getMonth() - 3)
          groupBy = 'week'
          break
        default:
          startDate.setDate(now.getDate() - 7)
      }

      // Fetch collection logs
      const { data: collections, error: collectionsError } = await supabase
        .from('collection_logs')
        .select('id, timestamp, trash_type')
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true })

      if (collectionsError) {
        console.error('Error fetching collections:', collectionsError)
      }

      // Fetch violation reports
      const { data: violations, error: violationsError } = await supabase
        .from('reports')
        .select('id, timestamp, trash_type, status')
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true })

      if (violationsError) {
        console.error('Error fetching violations:', violationsError)
      }

      // Process data for chart
      const processedData = processChartData(
        collections || [], 
        violations || [], 
        startDate, 
        now, 
        groupBy
      )
      
      setTrendData(processedData)
      console.log('📈 Trend Data:', processedData)
    } catch (error) {
      console.error('Error fetching trend data:', error)
    } finally {
      setTrendLoading(false)
    }
  }

  // ✅ MODIFIED: Process data for chart display - Added "All Types"
  const processChartData = (collections, violations, startDate, endDate, groupBy) => {
    const data = []
    const current = new Date(startDate)
    
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0]
      const displayDate = formatChartDate(current, groupBy)
      
      // Count collections for this date
      const dayCollections = collections.filter(c => {
        const collectionDate = new Date(c.timestamp).toISOString().split('T')[0]
        return collectionDate === dateStr
      })

      // Count violations for this date
      const dayViolations = violations.filter(v => {
        const violationDate = new Date(v.timestamp).toISOString().split('T')[0]
        return violationDate === dateStr
      })

      // ✅ NEW: Count "All Types"
      const allTypes = dayCollections.filter(c => 
        c.trash_type?.toLowerCase() === 'all types'
      ).length

      // Count by trash type
      const biodegradable = dayCollections.filter(c => 
        c.trash_type?.toLowerCase() === 'biodegradable'
      ).length
      const nonBiodegradable = dayCollections.filter(c => 
        c.trash_type?.toLowerCase() === 'non-biodegradable'
      ).length
      const recyclable = dayCollections.filter(c => 
        c.trash_type?.toLowerCase() === 'recyclable'
      ).length
      const hazardous = dayCollections.filter(c => 
        c.trash_type?.toLowerCase() === 'hazardous' || c.trash_type?.toLowerCase() === 'hazard'
      ).length

      data.push({
        date: displayDate,
        fullDate: dateStr,
        collections: dayCollections.length,
        violations: dayViolations.length,
        allTypes,              // ✅ NEW
        biodegradable,
        nonBiodegradable,
        recyclable,
        hazardous,
        total: dayCollections.length + dayViolations.length
      })

      // Move to next day
      current.setDate(current.getDate() + 1)
    }

    return data
  }

  // Format date for chart display
  const formatChartDate = (date, groupBy) => {
    const options = { month: 'short', day: 'numeric' }
    return date.toLocaleDateString('en-US', options)
  }

  // Calculate trend statistics
  const calculateTrendStats = () => {
    if (trendData.length < 2) return { collectionsChange: 0, violationsChange: 0 }
    
    const midPoint = Math.floor(trendData.length / 2)
    const firstHalf = trendData.slice(0, midPoint)
    const secondHalf = trendData.slice(midPoint)
    
    const firstHalfCollections = firstHalf.reduce((sum, d) => sum + d.collections, 0)
    const secondHalfCollections = secondHalf.reduce((sum, d) => sum + d.collections, 0)
    
    const firstHalfViolations = firstHalf.reduce((sum, d) => sum + d.violations, 0)
    const secondHalfViolations = secondHalf.reduce((sum, d) => sum + d.violations, 0)
    
    const collectionsChange = firstHalfCollections > 0 
      ? ((secondHalfCollections - firstHalfCollections) / firstHalfCollections * 100).toFixed(1)
      : 0
    
    const violationsChange = firstHalfViolations > 0 
      ? ((secondHalfViolations - firstHalfViolations) / firstHalfViolations * 100).toFixed(1)
      : 0
    
    return { 
      collectionsChange: parseFloat(collectionsChange), 
      violationsChange: parseFloat(violationsChange),
      totalCollections: trendData.reduce((sum, d) => sum + d.collections, 0),
      totalViolations: trendData.reduce((sum, d) => sum + d.violations, 0),
      // ✅ NEW: Total "All Types"
      totalAllTypes: trendData.reduce((sum, d) => sum + (d.allTypes || 0), 0)
    }
  }

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-xl shadow-2xl border border-gray-100">
          <p className="font-bold text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">{entry.name}:</span>
              <span className="font-bold" style={{ color: entry.color }}>
                {entry.value}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  const trendStats = calculateTrendStats()

  // ✅ NEW: Helper to get trash type badge styling
  const getTrashTypeBadgeStyle = (trashType) => {
    const type = trashType?.toLowerCase()
    switch (type) {
      case 'all types':
        return 'from-purple-100 to-purple-200 text-purple-700'
      case 'biodegradable':
        return 'from-green-100 to-green-200 text-green-700'
      case 'non-biodegradable':
        return 'from-blue-100 to-blue-200 text-blue-700'
      case 'recyclable':
        return 'from-yellow-100 to-yellow-200 text-yellow-700'
      case 'hazardous':
      case 'hazard':
        return 'from-red-100 to-red-200 text-red-700'
      default:
        return 'from-gray-100 to-gray-200 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent mb-2">
            Dashboard Overview
          </h1>
          <p className="text-gray-600 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Real-time waste management insights
          </p>
        </div>
        
        <div className="flex gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 shadow-sm hover:shadow-md transition-shadow"
          >
            <option value="today">📅 Today</option>
            <option value="week">📊 This Week</option>
            <option value="month">📈 This Month</option>
          </select>
          <button
            onClick={fetchDashboardData}
            className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-2.5 rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          title="Total Reports"
          value={stats.totalReports}
          icon="📊"
          color="blue"
          subtitle="All violations recorded"
          linkTo="/reports"
        />
        <SummaryCard
          title="Total Residents"
          value={stats.totalResidents}
          icon="👥"
          color="green"
          subtitle="Registered users"
          linkTo="/generate-qr"
        />
        <SummaryCard
          title="Total Collectors"
          value={stats.totalCollectors}
          icon="🚛"
          color="purple"
          subtitle="Active collectors"
          linkTo="/collectors"
        />
        <SummaryCard
          title="Total Violations"
          value={stats.totalViolations}
          icon="⚠️"
          color="red"
          subtitle="Waste violations"
          linkTo="/reports"
        />
      </div>

      {/* ✅ MODIFIED: Violation Types Grid - Added "All Types" */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* ✅ NEW: All Types - Purple */}
        <div className="bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 rounded-2xl shadow-2xl p-6 text-white transform hover:scale-105 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-purple-100 text-sm font-medium mb-1">All Types</p>
              <p className="text-4xl font-bold">{stats.allTypesCount || 0}</p>
              <p className="text-purple-200 text-xs mt-1">{violationData.percentages?.allTypes || 0}% of total</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 shadow-lg">
              <span className="text-4xl">⭐</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 via-green-600 to-green-700 rounded-2xl shadow-2xl p-6 text-white transform hover:scale-105 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">Biodegradable</p>
              <p className="text-4xl font-bold">{stats.biodegradableCount}</p>
              <p className="text-green-200 text-xs mt-1">{violationData.percentages?.biodegradable || 0}% of total</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 shadow-lg">
              <span className="text-4xl">🌿</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl shadow-2xl p-6 text-white transform hover:scale-105 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Non-Biodegradable</p>
              <p className="text-4xl font-bold">{stats.nonBiodegradableCount}</p>
              <p className="text-blue-200 text-xs mt-1">{violationData.percentages?.nonBiodegradable || 0}% of total</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 shadow-lg">
              <span className="text-4xl">🔵</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 via-yellow-600 to-yellow-700 rounded-2xl shadow-2xl p-6 text-white transform hover:scale-105 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-yellow-100 text-sm font-medium mb-1">Recyclable</p>
              <p className="text-4xl font-bold">{stats.recyclableCount}</p>
              <p className="text-yellow-200 text-xs mt-1">{violationData.percentages?.recyclable || 0}% of total</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 shadow-lg">
              <span className="text-4xl">🟡</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 via-red-600 to-red-700 rounded-2xl shadow-2xl p-6 text-white transform hover:scale-105 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-red-100 text-sm font-medium mb-1">Hazardous</p>
              <p className="text-4xl font-bold">{stats.hazardousCount}</p>
              <p className="text-red-200 text-xs mt-1">{violationData.percentages?.hazardous || 0}% of total</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 shadow-lg">
              <span className="text-4xl">☢️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Trend Chart Section */}
      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
        {/* Chart Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="w-1 h-6 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full"></span>
              Collection & Violation Trends
            </h2>
            <p className="text-sm text-gray-500 mt-1 ml-3">Track waste management activity over time</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Period Selector */}
            <div className="flex bg-gray-100 rounded-xl p-1">
              {[
                { value: '7days', label: '7 Days' },
                { value: '30days', label: '30 Days' },
                { value: '3months', label: '3 Months' }
              ].map((period) => (
                <button
                  key={period.value}
                  onClick={() => setTrendPeriod(period.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    trendPeriod === period.value
                      ? 'bg-white text-primary-600 shadow-md'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>

            {/* Chart Type Selector */}
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setChartType('area')}
                className={`p-2 rounded-lg transition-all ${
                  chartType === 'area' ? 'bg-white shadow-md text-primary-600' : 'text-gray-500'
                }`}
                title="Area Chart"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4v16" />
                </svg>
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`p-2 rounded-lg transition-all ${
                  chartType === 'line' ? 'bg-white shadow-md text-primary-600' : 'text-gray-500'
                }`}
                title="Line Chart"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`p-2 rounded-lg transition-all ${
                  chartType === 'bar' ? 'bg-white shadow-md text-primary-600' : 'text-gray-500'
                }`}
                title="Bar Chart"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* ✅ MODIFIED: Trend Stats Cards - Added "All Types" */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-medium uppercase">Total Collections</p>
                <p className="text-2xl font-bold text-blue-700">{trendStats.totalCollections}</p>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                trendStats.collectionsChange >= 0 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {trendStats.collectionsChange >= 0 ? '↑' : '↓'}
                {Math.abs(trendStats.collectionsChange)}%
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-600 font-medium uppercase">Total Violations</p>
                <p className="text-2xl font-bold text-red-700">{trendStats.totalViolations}</p>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                trendStats.violationsChange <= 0 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {trendStats.violationsChange >= 0 ? '↑' : '↓'}
                {Math.abs(trendStats.violationsChange)}%
              </div>
            </div>
          </div>

          {/* ✅ NEW: All Types Stat Card */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
            <div>
              <p className="text-xs text-purple-600 font-medium uppercase">⭐ All Types</p>
              <p className="text-2xl font-bold text-purple-700">
                {trendStats.totalAllTypes || 0}
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
            <div>
              <p className="text-xs text-green-600 font-medium uppercase">Avg Daily Collections</p>
              <p className="text-2xl font-bold text-green-700">
                {trendData.length > 0 
                  ? (trendStats.totalCollections / trendData.length).toFixed(1) 
                  : 0}
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4">
            <div>
              <p className="text-xs text-amber-600 font-medium uppercase">Peak Day</p>
              <p className="text-lg font-bold text-amber-700">
                {trendData.length > 0 
                  ? trendData.reduce((max, d) => d.collections > max.collections ? d : max, trendData[0]).date
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-80">
          {trendLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500">Loading trend data...</p>
              </div>
            </div>
          ) : trendData.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-gray-500">No trend data available for this period</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCollections" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorViolations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6B7280" 
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#6B7280" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="collections" 
                    name="Collections"
                    stroke="#10B981" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorCollections)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="violations" 
                    name="Violations"
                    stroke="#EF4444" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorViolations)" 
                  />
                </AreaChart>
              ) : chartType === 'line' ? (
                <LineChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6B7280" 
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#6B7280" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="collections" 
                    name="Collections"
                    stroke="#10B981" 
                    strokeWidth={3}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="violations" 
                    name="Violations"
                    stroke="#EF4444" 
                    strokeWidth={3}
                    dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#EF4444', strokeWidth: 2 }}
                  />
                </LineChart>
              ) : (
                <BarChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6B7280" 
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#6B7280" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                  />
                  <Bar 
                    dataKey="collections" 
                    name="Collections"
                    fill="#10B981" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="violations" 
                    name="Violations"
                    fill="#EF4444" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {/* ✅ MODIFIED: Chart Legend - Trash Types Breakdown - Added "All Types" */}
        {trendData.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-3">Collection Breakdown by Trash Type</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {/* ✅ NEW: All Types */}
              <div className="flex items-center gap-3 bg-purple-50 rounded-lg p-3">
                <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                <div>
                  <p className="text-xs text-gray-500">⭐ All Types</p>
                  <p className="font-bold text-purple-700">
                    {trendData.reduce((sum, d) => sum + (d.allTypes || 0), 0)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-green-50 rounded-lg p-3">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <div>
                  <p className="text-xs text-gray-500">🌿 Biodegradable</p>
                  <p className="font-bold text-green-700">
                    {trendData.reduce((sum, d) => sum + d.biodegradable, 0)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-blue-50 rounded-lg p-3">
                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                <div>
                  <p className="text-xs text-gray-500">🔵 Non-Biodegradable</p>
                  <p className="font-bold text-blue-700">
                    {trendData.reduce((sum, d) => sum + d.nonBiodegradable, 0)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-yellow-50 rounded-lg p-3">
                <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                <div>
                  <p className="text-xs text-gray-500">🟡 Recyclable</p>
                  <p className="font-bold text-yellow-700">
                    {trendData.reduce((sum, d) => sum + d.recyclable, 0)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-red-50 rounded-lg p-3">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <div>
                  <p className="text-xs text-gray-500">☢️ Hazardous</p>
                  <p className="font-bold text-red-700">
                    {trendData.reduce((sum, d) => sum + d.hazardous, 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ✅ MODIFIED: Violation Pie Chart - Added "All Types" */}
      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="w-1 h-6 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full"></span>
              Violation Distribution by Trash Type
            </h2>
            <p className="text-sm text-gray-500 mt-1 ml-3">Percentage breakdown of violations</p>
          </div>
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 p-3 rounded-xl shadow-sm">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
        </div>
        <TrashChart
          data={[
            { name: 'All Types', value: stats.allTypesCount || 0 },  // ✅ NEW
            { name: 'Biodegradable', value: stats.biodegradableCount },
            { name: 'Non-Biodegradable', value: stats.nonBiodegradableCount },
            { name: 'Recyclable', value: stats.recyclableCount },
            { name: 'Hazardous', value: stats.hazardousCount },
          ].filter(item => item.value > 0)} // Only show types with data
          type="pie"
        />
      </div>

      {/* Recent Reports Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 via-white to-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="w-1 h-6 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full"></span>
                Recent Violations
              </h2>
              <p className="text-sm text-gray-500 mt-1 ml-3">Latest waste violation reports</p>
            </div>
            <a 
              href="/reports" 
              className="group text-primary-600 hover:text-primary-700 font-semibold text-sm flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-primary-50 transition-all"
            >
              View All Reports
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
        
        {recentReports.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-6 shadow-inner">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Reports Yet</h3>
            <p className="text-gray-500 max-w-md mx-auto">Violation reports will appear here once they are logged in the system</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Resident Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Bin ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Trash Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentReports.map((report) => {
                  const isAllTypes = report.trash_type?.toLowerCase() === 'all types'
                  
                  return (
                    <tr 
                      key={report.id} 
                      className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent transition-all ${
                        isAllTypes ? 'border-l-4 border-l-purple-500' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl shadow-sm ${
                            isAllTypes 
                              ? 'bg-gradient-to-br from-purple-50 to-purple-100' 
                              : 'bg-gradient-to-br from-primary-50 to-primary-100'
                          }`}>
                            <svg className={`w-5 h-5 ${isAllTypes ? 'text-purple-600' : 'text-primary-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div>
                            <span className="text-sm font-bold text-gray-900">{report.residents?.name || 'Unknown'}</span>
                            <p className="text-xs text-gray-500">{report.residents?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="truncate">{report.location}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">{report.bin_id}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {/* ✅ MODIFIED: Trash type badge with "All Types" support */}
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm bg-gradient-to-r ${
                          isAllTypes 
                            ? 'from-purple-100 to-purple-200 text-purple-700 ring-2 ring-purple-200' 
                            : getTrashTypeBadgeColor(report.trash_type)
                        }`}>
                          <span className={`w-2 h-2 rounded-full animate-pulse ${
                            isAllTypes ? 'bg-purple-500' : 'bg-current'
                          }`}></span>
                          {isAllTypes && '⭐ '}
                          {report.trash_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatDate(report.timestamp)}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <a href="/reports" className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl p-8 text-white shadow-2xl hover:shadow-blue-500/50 transition-all hover:scale-105 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl shadow-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <svg className="w-6 h-6 transform group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-2">View All Reports</h3>
            <p className="text-blue-100 text-sm">Manage and track all violation reports</p>
          </div>
        </a>

        <a href="/map" className="group relative bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 rounded-2xl p-8 text-white shadow-2xl hover:shadow-purple-500/50 transition-all hover:scale-105 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl shadow-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <svg className="w-6 h-6 transform group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-2">Track on Map</h3>
            <p className="text-purple-100 text-sm">View violation locations in real-time</p>
          </div>
        </a>

        <a href="/generate-qr" className="group relative bg-gradient-to-br from-green-500 via-green-600 to-green-700 rounded-2xl p-8 text-white shadow-2xl hover:shadow-green-500/50 transition-all hover:scale-105 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl shadow-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <svg className="w-6 h-6 transform group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-2">Generate QR Code</h3>
            <p className="text-green-100 text-sm">Create new resident accounts with QR codes</p>
          </div>
        </a>
      </div>
    </div>
  )
}

export default Dashboard