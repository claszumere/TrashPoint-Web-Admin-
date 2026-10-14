// src/components/dashboard/TrashChart.jsx

import React from 'react'
import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, 
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line
} from 'recharts'

// ============================================================
// ✅ CONSTANTS & HELPERS
// ============================================================

// Color palette for all trash types and categories
const COLORS = {
  // Individual types
  'Biodegradable': '#22c55e',      // Green
  'Non-Biodegradable': '#3b82f6',  // Blue
  'Recyclable': '#f97316',         // Orange
  'Hazardous': '#ef4444',          // Red
  'Hazard': '#ef4444',             // Red (alias)
  'Non-Recyclable': '#f59e0b',     // Amber
  
  // ✅ NEW: Multi-type categories
  'All Types': '#8b5cf6',          // Purple
  'all-types': '#8b5cf6',          // Purple (alias)
  'Multiple Types': '#6366f1',     // Indigo
  'multiple': '#6366f1',           // Indigo (alias)
  'Single Type': '#64748b',        // Gray
  'single': '#64748b',             // Gray (alias)
  
  // Sources
  'Violation': '#ef4444',          // Red
  'Collection': '#3b82f6',         // Blue
  
  // Default
  'Unknown': '#9ca3af',            // Gray
}

// Icon mapping for each type
const ICONS = {
  'All Types': '⭐',
  'all-types': '⭐',
  'Multiple Types': '🔢',
  'multiple': '🔢',
  'Single Type': '1️⃣',
  'single': '1️⃣',
  'Biodegradable': '🌿',
  'Non-Biodegradable': '📦',
  'Recyclable': '♻️',
  'Hazardous': '☢️',
  'Hazard': '☢️',
  'Non-Recyclable': '🟡',
  'Violation': '⚠️',
  'Collection': '📦',
  'Unknown': '📋',
}

// All individual types constant
const ALL_INDIVIDUAL_TYPES = ['Biodegradable', 'Non-Biodegradable', 'Recyclable', 'Hazardous']

// ============================================================
// ✅ HELPER FUNCTIONS
// ============================================================

// Parse trash_type which can be JSON array or single string
const parseTrashTypes = (trashType) => {
  if (!trashType) return []
  
  try {
    const parsed = JSON.parse(trashType)
    if (Array.isArray(parsed)) {
      return parsed
    }
    return [String(parsed)]
  } catch {
    return [trashType]
  }
}

// Check if all types are selected
const isAllTypesSelected = (types) => {
  if (!types || types.length === 0) return false
  return ALL_INDIVIDUAL_TYPES.every(t => 
    types.some(type => type.toLowerCase() === t.toLowerCase())
  )
}

// Get color with fallback (handles case variations)
const getColor = (name) => {
  if (!name) return COLORS['Unknown']
  
  // Direct match
  if (COLORS[name]) return COLORS[name]
  
  // Case-insensitive match
  const lowerName = name.toLowerCase()
  
  for (const [key, color] of Object.entries(COLORS)) {
    if (key.toLowerCase() === lowerName) return color
  }
  
  // Partial match
  for (const [key, color] of Object.entries(COLORS)) {
    if (key.toLowerCase().includes(lowerName) || lowerName.includes(key.toLowerCase())) {
      return color
    }
  }
  
  return COLORS['Unknown']
}

// Get icon for type
const getIcon = (name) => {
  if (!name) return ICONS['Unknown']
  
  // Direct match
  if (ICONS[name]) return ICONS[name]
  
  // Case-insensitive match
  const lowerName = name.toLowerCase()
  
  for (const [key, icon] of Object.entries(ICONS)) {
    if (key.toLowerCase() === lowerName) return icon
  }
  
  return ICONS['Unknown']
}

// Check if item is "All Types"
const isAllTypes = (name) => {
  const lower = name?.toLowerCase() || ''
  return lower === 'all types' || lower === 'all-types'
}

// Check if item is "Multiple Types"
const isMultipleTypes = (name) => {
  const lower = name?.toLowerCase() || ''
  return lower === 'multiple types' || lower === 'multiple'
}

// ============================================================
// ✅ MINI TYPE BADGE COMPONENT
// ============================================================
const MiniTypeBadge = ({ type, size = 'sm' }) => {
  const color = getColor(type)
  const icon = getIcon(type)
  
  const sizeClasses = {
    xs: 'text-[8px] px-1 py-0.5',
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1'
  }
  
  return (
    <span 
      className={`inline-flex items-center gap-0.5 rounded-full font-semibold ${sizeClasses[size]}`}
      style={{ backgroundColor: `${color}20`, color: color }}
    >
      <span>{icon}</span>
      <span className="max-w-[50px] truncate">{type}</span>
    </span>
  )
}

// ============================================================
// ✅ CUSTOM TOOLTIP COMPONENT
// ============================================================
const CustomTooltip = ({ active, payload, showBreakdown = false }) => {
  if (!active || !payload || !payload.length) return null
  
  const data = payload[0]
  const name = data.name || data.payload?.name
  const value = data.value
  const icon = getIcon(name)
  const color = getColor(name)
  const isAll = isAllTypes(name)
  const isMulti = isMultipleTypes(name)
  const breakdown = data.payload?.breakdown
  
  return (
    <div className={`
      bg-white p-4 rounded-xl shadow-2xl border-2 min-w-[180px]
      ${isAll ? 'border-purple-300' : isMulti ? 'border-indigo-300' : 'border-gray-200'}
    `}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div 
          className={`
            w-8 h-8 rounded-full flex items-center justify-center text-sm
            ${isAll ? 'ring-2 ring-purple-300 ring-offset-1' : ''}
            ${isMulti ? 'ring-2 ring-indigo-300 ring-offset-1' : ''}
          `}
          style={{ backgroundColor: color }}
        >
          <span className="text-white">{icon}</span>
        </div>
        <div>
          <p className={`
            font-bold text-sm
            ${isAll ? 'text-purple-700' : isMulti ? 'text-indigo-700' : 'text-gray-900'}
          `}>
            {name}
          </p>
          {isAll && (
            <p className="text-[10px] text-purple-500">All 4 waste categories</p>
          )}
          {isMulti && (
            <p className="text-[10px] text-indigo-500">2-3 waste categories</p>
          )}
        </div>
      </div>
      
      {/* Value */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-bold" style={{ color }}>
          {value}
        </span>
        <span className="text-sm text-gray-500">records</span>
      </div>
      
      {/* Percentage */}
      {data.payload?.percentage !== undefined && (
        <p className="text-sm text-gray-600">
          <span className="font-semibold">{data.payload.percentage}%</span> of total
        </p>
      )}
      
      {/* ✅ NEW: Breakdown section for multi-types */}
      {showBreakdown && breakdown && Object.keys(breakdown).length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Type Breakdown</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(breakdown).map(([type, count]) => (
              <span 
                key={type}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium"
                style={{ backgroundColor: `${getColor(type)}20`, color: getColor(type) }}
              >
                {getIcon(type)} {count}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* ✅ NEW: Included types for All Types */}
      {isAll && (
        <div className="mt-3 pt-3 border-t border-purple-100">
          <p className="text-[10px] font-semibold text-purple-500 uppercase mb-2">Includes All Types</p>
          <div className="flex flex-wrap gap-1">
            {ALL_INDIVIDUAL_TYPES.map(type => (
              <MiniTypeBadge key={type} type={type} size="xs" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// ✅ CUSTOM LEGEND COMPONENT
// ============================================================
const CustomLegend = ({ payload }) => {
  if (!payload) return null
  
  return (
    <div className="flex flex-wrap justify-center gap-3 mt-4 px-4">
      {payload.map((entry, index) => {
        const icon = getIcon(entry.value)
        const isAll = isAllTypes(entry.value)
        const isMulti = isMultipleTypes(entry.value)
        
        return (
          <div 
            key={`legend-${index}`}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold
              transition-all hover:scale-105 cursor-default
              ${isAll 
                ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-200' 
                : isMulti
                ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }
            `}
          >
            <div 
              className={`
                w-3 h-3 rounded-full
                ${isAll ? 'ring-2 ring-purple-300' : ''}
                ${isMulti ? 'ring-2 ring-indigo-300' : ''}
              `}
              style={{ backgroundColor: entry.color }}
            />
            <span>{icon} {entry.value}</span>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// ✅ CUSTOM X-AXIS TICK COMPONENT
// ============================================================
const CustomXAxisTick = ({ x, y, payload }) => {
  const icon = getIcon(payload.value)
  const color = getColor(payload.value)
  const isAll = isAllTypes(payload.value)
  const isMulti = isMultipleTypes(payload.value)
  
  // Truncate long names
  const displayName = payload.value.length > 10 
    ? payload.value.substring(0, 8) + '...' 
    : payload.value
  
  return (
    <g transform={`translate(${x},${y})`}>
      <text 
        x={0} 
        y={0} 
        dy={16} 
        textAnchor="middle" 
        fill={color}
        fontSize={14}
      >
        {icon}
      </text>
      <text 
        x={0} 
        y={0} 
        dy={32} 
        textAnchor="middle" 
        fill={isAll ? '#8b5cf6' : isMulti ? '#6366f1' : '#6b7280'}
        fontSize={10}
        fontWeight={isAll || isMulti ? 700 : 600}
      >
        {displayName}
      </text>
    </g>
  )
}

// ============================================================
// ✅ MAIN COMPONENT
// ============================================================
const TrashChart = ({ 
  data, 
  type = 'pie',
  title,
  subtitle,
  showBreakdown = false,
  height = 350,
  // ✅ NEW: Props for type selection distribution
  allTypesCount = 0,
  multipleTypesCount = 0,
  singleTypeCount = 0,
}) => {
  
  // ============================================================
  // PIE CHART
  // ============================================================
  if (type === 'pie') {
    return (
      <div className="w-full">
        {title && (
          <div className="mb-4 text-center">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        )}
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={true}
              label={({ name, percent, value }) => {
                const icon = getIcon(name)
                const percentage = (percent * 100).toFixed(0)
                return `${icon} ${value} (${percentage}%)`
              }}
              outerRadius={height * 0.3}
              fill="#8884d8"
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((entry, index) => {
                const isAll = isAllTypes(entry.name)
                const isMulti = isMultipleTypes(entry.name)
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getColor(entry.name)}
                    stroke={isAll ? '#8b5cf6' : isMulti ? '#6366f1' : '#fff'}
                    strokeWidth={isAll || isMulti ? 3 : 2}
                  />
                )
              })}
            </Pie>
            <Tooltip content={<CustomTooltip showBreakdown={showBreakdown} />} />
            <Legend content={<CustomLegend />} verticalAlign="bottom" height={60} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // ============================================================
  // DONUT CHART
  // ============================================================
  if (type === 'donut') {
    const total = data.reduce((sum, item) => sum + item.value, 0)
    
    return (
      <div className="w-full">
        {title && (
          <div className="mb-4 text-center">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        )}
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={height * 0.15}
              outerRadius={height * 0.3}
              fill="#8884d8"
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
              label={({ name, percent }) => {
                const icon = getIcon(name)
                return `${icon} ${(percent * 100).toFixed(0)}%`
              }}
              labelLine={false}
            >
              {data.map((entry, index) => {
                const isAll = isAllTypes(entry.name)
                const isMulti = isMultipleTypes(entry.name)
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getColor(entry.name)}
                    stroke={isAll ? '#8b5cf6' : isMulti ? '#6366f1' : '#fff'}
                    strokeWidth={isAll || isMulti ? 3 : 2}
                  />
                )
              })}
            </Pie>
            {/* Center text */}
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
              <tspan x="50%" dy="-0.5em" fontSize="24" fontWeight="bold" fill="#1f2937">
                {total}
              </tspan>
              <tspan x="50%" dy="1.5em" fontSize="12" fill="#6b7280">
                Total
              </tspan>
            </text>
            <Tooltip content={<CustomTooltip showBreakdown={showBreakdown} />} />
            <Legend content={<CustomLegend />} verticalAlign="bottom" height={60} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // ============================================================
  // BAR CHART
  // ============================================================
  if (type === 'bar') {
    return (
      <div className="w-full">
        {title && (
          <div className="mb-4 text-center">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        )}
        <ResponsiveContainer width="100%" height={height + 30}>
          <BarChart data={data} margin={{ bottom: 50, left: 10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="name" 
              tick={<CustomXAxisTick />}
              stroke="#6b7280"
              height={60}
              interval={0}
            />
            <YAxis 
              tick={{ fontSize: 12, fontWeight: 600 }}
              stroke="#6b7280"
            />
            <Tooltip content={<CustomTooltip showBreakdown={showBreakdown} />} />
            <Legend content={<CustomLegend />} verticalAlign="bottom" wrapperStyle={{ paddingTop: '10px' }} />
            <Bar 
              dataKey="value" 
              radius={[8, 8, 0, 0]}
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((entry, index) => {
                const isAll = isAllTypes(entry.name)
                const isMulti = isMultipleTypes(entry.name)
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getColor(entry.name)}
                    stroke={isAll ? '#7c3aed' : isMulti ? '#4f46e5' : 'transparent'}
                    strokeWidth={isAll || isMulti ? 2 : 0}
                  />
                )
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // ============================================================
  // ✅ NEW: HORIZONTAL BAR CHART
  // ============================================================
  if (type === 'horizontal-bar') {
    const sortedData = [...data].sort((a, b) => b.value - a.value)
    
    return (
      <div className="w-full">
        {title && (
          <div className="mb-4 text-center">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        )}
        <div className="space-y-3 px-4">
          {sortedData.map((item, index) => {
            const maxValue = Math.max(...data.map(d => d.value))
            const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0
            const totalPercentage = item.percentage || 0
            const color = getColor(item.name)
            const icon = getIcon(item.name)
            const isAll = isAllTypes(item.name)
            const isMulti = isMultipleTypes(item.name)
            
            return (
              <div key={index} className="relative">
                <div className="flex items-center justify-between mb-1">
                  <span className={`
                    text-sm font-semibold flex items-center gap-2
                    ${isAll ? 'text-purple-700' : isMulti ? 'text-indigo-700' : 'text-gray-700'}
                  `}>
                    <span className="text-lg">{icon}</span>
                    {item.name}
                    {isAll && (
                      <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">
                        ⭐ ALL
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-bold" style={{ color }}>
                    {item.value}
                    {totalPercentage > 0 && (
                      <span className="text-xs text-gray-400 ml-1">({totalPercentage}%)</span>
                    )}
                  </span>
                </div>
                <div className={`
                  h-3 bg-gray-100 rounded-full overflow-hidden
                  ${isAll ? 'ring-2 ring-purple-200' : ''}
                  ${isMulti ? 'ring-2 ring-indigo-200' : ''}
                `}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${percentage}%`, 
                      backgroundColor: color,
                      boxShadow: isAll || isMulti ? `0 0 8px ${color}40` : 'none'
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ============================================================
  // ✅ NEW: TYPE SELECTION DISTRIBUTION CHART
  // ============================================================
  if (type === 'type-selection') {
    const total = allTypesCount + multipleTypesCount + singleTypeCount
    
    const selectionData = [
      { 
        name: 'All Types', 
        value: allTypesCount, 
        percentage: total > 0 ? ((allTypesCount / total) * 100).toFixed(1) : 0,
        description: 'All 4 types selected'
      },
      { 
        name: 'Multiple Types', 
        value: multipleTypesCount, 
        percentage: total > 0 ? ((multipleTypesCount / total) * 100).toFixed(1) : 0,
        description: '2-3 types selected'
      },
      { 
        name: 'Single Type', 
        value: singleTypeCount, 
        percentage: total > 0 ? ((singleTypeCount / total) * 100).toFixed(1) : 0,
        description: '1 type selected'
      },
    ].filter(item => item.value > 0)
    
    return (
      <div className="w-full">
        {title && (
          <div className="mb-4 text-center">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        )}
        
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-6 px-4">
          {[
            { name: 'All Types', value: allTypesCount, color: '#8b5cf6', icon: '⭐' },
            { name: 'Multiple', value: multipleTypesCount, color: '#6366f1', icon: '🔢' },
            { name: 'Single', value: singleTypeCount, color: '#64748b', icon: '1️⃣' },
          ].map((item, index) => (
            <div 
              key={index}
              className="text-center p-3 rounded-xl"
              style={{ backgroundColor: `${item.color}10` }}
            >
              <div className="text-2xl mb-1">{item.icon}</div>
              <div className="text-2xl font-bold" style={{ color: item.color }}>
                {item.value}
              </div>
              <div className="text-xs text-gray-500">{item.name}</div>
            </div>
          ))}
        </div>
        
        {/* Stacked bar */}
        <div className="px-4 mb-4">
          <div className="h-8 bg-gray-100 rounded-full overflow-hidden flex">
            {selectionData.map((item, index) => (
              <div
                key={index}
                className="h-full transition-all duration-500 flex items-center justify-center"
                style={{ 
                  width: `${item.percentage}%`, 
                  backgroundColor: getColor(item.name),
                  minWidth: item.value > 0 ? '20px' : '0'
                }}
                title={`${item.name}: ${item.value} (${item.percentage}%)`}
              >
                {parseFloat(item.percentage) > 10 && (
                  <span className="text-white text-xs font-bold">
                    {item.percentage}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-4 px-4">
          {selectionData.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: getColor(item.name) }}
              />
              <div className="text-sm">
                <span className="font-semibold text-gray-700">{getIcon(item.name)} {item.name}</span>
                <span className="text-gray-400 ml-1">({item.value})</span>
              </div>
            </div>
          ))}
        </div>
        
        {/* Donut chart below */}
        {total > 0 && (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={selectionData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
              >
                {selectionData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getColor(entry.name)}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                <tspan x="50%" dy="-0.5em" fontSize="20" fontWeight="bold" fill="#1f2937">
                  {total}
                </tspan>
                <tspan x="50%" dy="1.5em" fontSize="11" fill="#6b7280">
                  Total Records
                </tspan>
              </text>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    )
  }

  // ============================================================
  // ✅ NEW: STACKED BAR CHART (for comparing multi-types over time)
  // ============================================================
  if (type === 'stacked-bar') {
    return (
      <div className="w-full">
        {title && (
          <div className="mb-4 text-center">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        )}
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ bottom: 30, left: 10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 11, fill: '#6b7280' }}
              stroke="#6b7280"
            />
            <YAxis 
              tick={{ fontSize: 11, fill: '#6b7280' }}
              stroke="#6b7280"
            />
            <Tooltip content={<CustomTooltip showBreakdown={true} />} />
            <Legend content={<CustomLegend />} />
            <Bar dataKey="allTypes" name="All Types" stackId="a" fill={COLORS['All Types']} radius={[0, 0, 0, 0]} />
            <Bar dataKey="multipleTypes" name="Multiple Types" stackId="a" fill={COLORS['Multiple Types']} radius={[0, 0, 0, 0]} />
            <Bar dataKey="singleType" name="Single Type" stackId="a" fill={COLORS['Single Type']} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // ============================================================
  // ✅ NEW: AREA CHART (for trends over time)
  // ============================================================
  if (type === 'area') {
    return (
      <div className="w-full">
        {title && (
          <div className="mb-4 text-center">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        )}
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={data} margin={{ bottom: 30, left: 10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 11, fill: '#6b7280' }}
              stroke="#6b7280"
            />
            <YAxis 
              tick={{ fontSize: 11, fill: '#6b7280' }}
              stroke="#6b7280"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
            <Area 
              type="monotone" 
              dataKey="allTypes" 
              name="All Types"
              fill={`${COLORS['All Types']}40`} 
              stroke={COLORS['All Types']}
              strokeWidth={2}
            />
            <Area 
              type="monotone" 
              dataKey="multipleTypes" 
              name="Multiple Types"
              fill={`${COLORS['Multiple Types']}40`} 
              stroke={COLORS['Multiple Types']}
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="total" 
              name="Total"
              stroke="#1f2937"
              strokeWidth={2}
              dot={{ fill: '#1f2937', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // ============================================================
  // ✅ NEW: MINI CHART (compact version for cards)
  // ============================================================
  if (type === 'mini') {
    const total = data.reduce((sum, item) => sum + item.value, 0)
    
    return (
      <div className="w-full">
        {/* Mini stacked bar */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex mb-2">
          {data.map((item, index) => {
            const percentage = total > 0 ? (item.value / total) * 100 : 0
            return (
              <div
                key={index}
                className="h-full transition-all duration-500"
                style={{ 
                  width: `${percentage}%`, 
                  backgroundColor: getColor(item.name),
                  minWidth: item.value > 0 ? '4px' : '0'
                }}
                title={`${item.name}: ${item.value}`}
              />
            )
          })}
        </div>
        
        {/* Mini legend */}
        <div className="flex flex-wrap gap-2">
          {data.slice(0, 4).map((item, index) => (
            <div key={index} className="flex items-center gap-1 text-[10px]">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getColor(item.name) }}
              />
              <span className="text-gray-600">{getIcon(item.name)} {item.value}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}

// ============================================================
// ✅ EXPORT HELPER FUNCTIONS & COMPONENTS
// ============================================================
export { 
  parseTrashTypes, 
  isAllTypesSelected, 
  getColor, 
  getIcon, 
  MiniTypeBadge,
  COLORS,
  ICONS,
  ALL_INDIVIDUAL_TYPES
}
export default TrashChart