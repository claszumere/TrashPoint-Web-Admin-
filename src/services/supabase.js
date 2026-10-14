// src/services/supabase.js

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!')
  console.error('   Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// ==================== CONSTANTS ====================

// ✅ UPDATED: Define trash types as array (for multi-select)
export const TRASH_TYPES = {
  ALL_TYPES: 'All Types',
  BIODEGRADABLE: 'Biodegradable',
  NON_BIODEGRADABLE: 'Non-Biodegradable',
  RECYCLABLE: 'Recyclable',
  HAZARDOUS: 'Hazardous',
}

// ✅ Get all trash types as array (excluding "All Types")
export const TRASH_TYPES_ARRAY = [
  TRASH_TYPES.BIODEGRADABLE,
  TRASH_TYPES.NON_BIODEGRADABLE,
  TRASH_TYPES.RECYCLABLE,
  TRASH_TYPES.HAZARDOUS,
]

// ✅ UPDATED: Define violation types as array (for multi-select)
export const VIOLATION_TYPES = {
  ALL_TYPES: 'All Types',
  IMPROPER_SEGREGATION: 'Improper Segregation',
  ILLEGAL_DUMPING: 'Illegal Dumping',
  MISSED_COLLECTION: 'Missed Collection',
  CONTAMINATION: 'Contamination',
  OVERFLOWING_BIN: 'Overflowing Bin',
}

// ✅ Get all violation types as array (excluding "All Types")
export const VIOLATION_TYPES_ARRAY = [
  VIOLATION_TYPES.IMPROPER_SEGREGATION,
  VIOLATION_TYPES.ILLEGAL_DUMPING,
  VIOLATION_TYPES.MISSED_COLLECTION,
  VIOLATION_TYPES.CONTAMINATION,
  VIOLATION_TYPES.OVERFLOWING_BIN,
]

// ==================== TYPE HELPER FUNCTIONS ====================

/**
 * ✅ Check if a type value represents "All Types"
 * Handles both string and array formats
 */
export const isAllTypes = (type) => {
  if (!type) return false
  
  // If it's an array, check if it contains "All Types" or all individual types
  if (Array.isArray(type)) {
    const hasAllTypesString = type.some(t => 
      t?.toLowerCase?.()?.trim() === 'all types' || t?.toLowerCase?.()?.trim() === 'all'
    )
    if (hasAllTypesString) return true
    
    // Check if array contains all trash types
    const allTrashTypesSelected = TRASH_TYPES_ARRAY.every(trashType =>
      type.some(t => t?.toLowerCase?.()?.trim() === trashType.toLowerCase())
    )
    if (allTrashTypesSelected) return true
    
    // Check if array contains all violation types
    const allViolationTypesSelected = VIOLATION_TYPES_ARRAY.every(violationType =>
      type.some(t => t?.toLowerCase?.()?.trim() === violationType.toLowerCase())
    )
    if (allViolationTypesSelected) return true
    
    return false
  }
  
  // If it's a string
  const normalizedType = type.toLowerCase().trim()
  return normalizedType === 'all types' || normalizedType === 'all'
}

/**
 * ✅ NEW: Parse types - handles both string and JSON array formats
 * Returns an array of types
 */
export const parseTypes = (types) => {
  if (!types) return []
  
  // Already an array
  if (Array.isArray(types)) {
    return types.filter(t => t && typeof t === 'string')
  }
  
  // Try to parse as JSON
  if (typeof types === 'string') {
    // Check if it's a JSON array string
    if (types.startsWith('[')) {
      try {
        const parsed = JSON.parse(types)
        if (Array.isArray(parsed)) {
          return parsed.filter(t => t && typeof t === 'string')
        }
      } catch {
        // Not valid JSON, treat as single string
      }
    }
    // Single string value
    return [types]
  }
  
  return []
}

/**
 * ✅ NEW: Convert types to array for storage
 * Ensures consistent array format for Supabase
 */
export const typesToArray = (types) => {
  if (!types) return []
  if (Array.isArray(types)) return types
  if (typeof types === 'string') {
    // Check if "All Types" was selected
    if (isAllTypes(types)) {
      return [types] // Store as ["All Types"]
    }
    return [types]
  }
  return []
}

/**
 * ✅ NEW: Check if a record's types contain any of the filter types
 * Used for filtering records by selected types
 */
export const matchesTypeFilter = (recordTypes, filterTypes) => {
  const recordTypesArray = parseTypes(recordTypes)
  const filterTypesArray = parseTypes(filterTypes)
  
  // If no filter, match everything
  if (filterTypesArray.length === 0) return true
  
  // If filter is "All Types", match everything
  if (filterTypesArray.some(t => isAllTypes(t))) return true
  
  // If record has "All Types", it matches any filter
  if (recordTypesArray.some(t => isAllTypes(t))) return true
  
  // Check if any record type matches any filter type
  return recordTypesArray.some(recordType =>
    filterTypesArray.some(filterType =>
      recordType?.toLowerCase?.()?.trim() === filterType?.toLowerCase?.()?.trim()
    )
  )
}

/**
 * ✅ NEW: Check if a record contains a specific type
 */
export const containsType = (recordTypes, type) => {
  const typesArray = parseTypes(recordTypes)
  if (!type) return false
  
  return typesArray.some(t => 
    t?.toLowerCase?.()?.trim() === type?.toLowerCase?.()?.trim()
  )
}

/**
 * ✅ NEW: Get display string for types array
 * Converts ["Biodegradable", "Recyclable"] to "Biodegradable, Recyclable"
 */
export const getTypesDisplayString = (types, maxDisplay = 2) => {
  const typesArray = parseTypes(types)
  
  if (typesArray.length === 0) return 'Unknown'
  
  // Check if it's "All Types"
  if (isAllTypes(typesArray)) return 'All Types'
  
  if (typesArray.length <= maxDisplay) {
    return typesArray.join(', ')
  }
  
  return `${typesArray.slice(0, maxDisplay).join(', ')} +${typesArray.length - maxDisplay} more`
}

/**
 * ✅ NEW: Get all unique types from an array of types arrays
 */
export const getUniqueTypes = (typesArrays) => {
  const allTypes = new Set()
  
  typesArrays.forEach(types => {
    const parsed = parseTypes(types)
    parsed.forEach(type => {
      if (type && !isAllTypes(type)) {
        allTypes.add(type)
      }
    })
  })
  
  return Array.from(allTypes).sort()
}

const sanitizeSearchTerm = (term) => String(term ?? '')
  .replace(/[%,()]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

// ==================== QR CODE UTILITIES ====================

/**
 * Generate a unique QR code string for a resident
 * Format: RESIDENT-{timestamp}-{randomString}
 * Example: RESIDENT-1766983567733-abc123xyz
 */
export const generateQRCode = () => {
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 11)
  const qrCode = `RESIDENT-${timestamp}-${randomStr}`
  console.log('🔲 Generated QR Code:', qrCode)
  return qrCode
}

/**
 * Validate if a QR code string is in the correct format
 */
export const isValidQRCode = (qrCode) => {
  if (!qrCode || typeof qrCode !== 'string') return false
  const regex = /^RESIDENT-\d+-[a-z0-9]+$/
  return regex.test(qrCode)
}

/**
 * Parse QR code to extract information
 */
export const parseQRCode = (qrCode) => {
  if (!qrCode) return { valid: false, error: 'No QR code provided' }
  
  const parts = qrCode.split('-')
  
  if (parts.length >= 3 && parts[0] === 'RESIDENT') {
    return {
      valid: true,
      type: 'resident',
      timestamp: parts[1],
      uniqueId: parts.slice(2).join('-'),
      createdAt: new Date(parseInt(parts[1])),
      raw: qrCode,
    }
  }
  
  return { valid: false, error: 'Invalid QR code format', raw: qrCode }
}

// ==================== AUTH FUNCTIONS ====================

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

// ==================== RESIDENTS FUNCTIONS ====================

export const createResident = async (residentData) => {
  const dataWithQR = {
    ...residentData,
    qr_code: residentData.qr_code || generateQRCode(),
    is_active: residentData.is_active !== undefined ? residentData.is_active : true,
    created_at: residentData.created_at || new Date().toISOString(),
  }

  console.log('📤 Creating resident with data:', {
    name: dataWithQR.name,
    email: dataWithQR.email,
    qr_code: dataWithQR.qr_code,
  })

  const { data, error } = await supabase
    .from('residents')
    .insert([dataWithQR])
    .select()

  if (error) {
    console.error('❌ Error creating resident:', error)
  } else {
    console.log('✅ Resident created successfully:', data?.[0]?.id)
  }

  return { data, error }
}

export const createResidentWithValidation = async (residentData) => {
  const errors = []
  
  if (!residentData.name?.trim()) errors.push('Name is required')
  if (!residentData.email?.trim()) errors.push('Email is required')
  if (!residentData.phone?.trim()) errors.push('Phone is required')
  if (!residentData.address?.trim()) errors.push('Address is required')
  
  if (errors.length > 0) {
    return { data: null, error: { message: errors.join(', ') } }
  }

  const { data: existing } = await supabase
    .from('residents')
    .select('id')
    .eq('email', residentData.email.trim())
    .single()

  if (existing) {
    return { data: null, error: { message: 'Email already registered' } }
  }

  return createResident(residentData)
}

export const getResidents = async () => {
  const { data, error } = await supabase
    .from('residents')
    .select('*')
    .order('created_at', { ascending: false })
  return { data, error }
}

export const getResidentsWithQRStatus = async () => {
  const { data, error } = await supabase
    .from('residents')
    .select('*')
    .order('created_at', { ascending: false })

  if (data) {
    const enrichedData = data.map(resident => ({
      ...resident,
      hasQRCode: !!resident.qr_code,
      qrCodeValid: isValidQRCode(resident.qr_code),
    }))
    return { data: enrichedData, error }
  }

  return { data, error }
}

export const getResidentsWithoutQRCode = async () => {
  const { data, error } = await supabase
    .from('residents')
    .select('*')
    .or('qr_code.is.null,qr_code.eq.')
    .order('created_at', { ascending: false })
  return { data, error }
}

export const getResidentByQRCode = async (qrCode) => {
  const { data, error } = await supabase
    .from('residents')
    .select('*')
    .eq('qr_code', qrCode)
    .single()
  return { data, error }
}

export const validateAndGetResident = async (qrCode) => {
  if (!isValidQRCode(qrCode)) {
    return { 
      data: null, 
      error: { message: 'Invalid QR code format' },
      valid: false 
    }
  }

  const { data, error } = await getResidentByQRCode(qrCode)
  
  if (error || !data) {
    return { 
      data: null, 
      error: error || { message: 'QR code not found in database' },
      valid: false 
    }
  }

  return { 
    data, 
    error: null, 
    valid: true,
    resident: {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      qr_code: data.qr_code,
    }
  }
}

export const searchResidents = async (searchTerm) => {
  const sanitizedTerm = sanitizeSearchTerm(searchTerm)

  if (!sanitizedTerm) {
    return getResidents()
  }

  const { data, error } = await supabase
    .from('residents')
    .select('*')
    .or(`name.ilike.%${sanitizedTerm}%,email.ilike.%${sanitizedTerm}%,address.ilike.%${sanitizedTerm}%,qr_code.ilike.%${sanitizedTerm}%`)
    .order('created_at', { ascending: false })
  return { data, error }
}

export const getResidentById = async (id) => {
  const { data, error } = await supabase
    .from('residents')
    .select('*')
    .eq('id', id)
    .single()
  return { data, error }
}

export const updateResident = async (id, residentData) => {
  const { data, error } = await supabase
    .from('residents')
    .update(residentData)
    .eq('id', id)
    .select()
  return { data, error }
}

export const updateResidentQRCode = async (id, qrCode = null) => {
  const newQRCode = qrCode || generateQRCode()
  
  console.log(`🔲 Updating QR code for resident ${id}:`, newQRCode)
  
  const { data, error } = await supabase
    .from('residents')
    .update({ qr_code: newQRCode })
    .eq('id', id)
    .select()

  if (error) {
    console.error('❌ Error updating QR code:', error)
  } else {
    console.log('✅ QR code updated successfully')
  }

  return { data, error, qrCode: newQRCode }
}

export const generateMissingQRCodes = async () => {
  const { data: residents, error: fetchError } = await getResidentsWithoutQRCode()
  
  if (fetchError) {
    return { success: false, error: fetchError, updated: 0 }
  }

  if (!residents || residents.length === 0) {
    return { success: true, message: 'All residents have QR codes', updated: 0 }
  }

  let successCount = 0
  let failCount = 0
  const errors = []

  for (const resident of residents) {
    const { error } = await updateResidentQRCode(resident.id)
    if (error) {
      failCount++
      errors.push({ id: resident.id, name: resident.name, error: error.message })
    } else {
      successCount++
    }
  }

  return {
    success: failCount === 0,
    updated: successCount,
    failed: failCount,
    errors,
    total: residents.length,
  }
}

export const deleteResident = async (id) => {
  const { data, error } = await supabase
    .from('residents')
    .delete()
    .eq('id', id)
  return { data, error }
}

// ==================== COLLECTORS FUNCTIONS ====================

export const createCollector = async (collectorData) => {
  const { data, error } = await supabase
    .from('collectors')
    .insert([{
      ...collectorData,
      is_active: collectorData.is_active !== undefined ? collectorData.is_active : true,
      created_at: collectorData.created_at || new Date().toISOString(),
    }])
    .select()
  return { data, error }
}

export const getCollectors = async () => {
  const { data, error } = await supabase
    .from('collectors')
    .select('*')
    .order('created_at', { ascending: false })
  return { data, error }
}

export const searchCollectors = async (searchTerm) => {
  const sanitizedTerm = sanitizeSearchTerm(searchTerm)

  if (!sanitizedTerm) {
    return getCollectors()
  }

  const { data, error } = await supabase
    .from('collectors')
    .select('*')
    .or(`name.ilike.%${sanitizedTerm}%,email.ilike.%${sanitizedTerm}%,vehicle_number.ilike.%${sanitizedTerm}%`)
    .order('created_at', { ascending: false })
  return { data, error }
}

export const getCollectorById = async (id) => {
  const { data, error } = await supabase
    .from('collectors')
    .select('*')
    .eq('id', id)
    .single()
  return { data, error }
}

export const updateCollector = async (id, collectorData) => {
  const { data, error } = await supabase
    .from('collectors')
    .update(collectorData)
    .eq('id', id)
    .select()
  return { data, error }
}

export const deleteCollector = async (id) => {
  const { data, error } = await supabase
    .from('collectors')
    .delete()
    .eq('id', id)
  return { data, error }
}

// ==================== COLLECTION LOGS FUNCTIONS ====================

/**
 * ✅ MODIFIED: Get ALL collection logs with multi-type support
 */
export const getCollectionLogs = async () => {
  console.log('📦 Fetching all collection logs...')
  
  const { data, error } = await supabase
    .from('collection_logs')
    .select(`
      *,
      collectors (
        id,
        name,
        email,
        phone
      ),
      residents (
        id,
        name,
        address,
        email,
        phone,
        qr_code
      )
    `)
    .order('timestamp', { ascending: false })
  
  if (data) {
    console.log(`📦 Fetched ${data.length} collection logs`)
    
    // ✅ Log how many have coordinates
    const withCoords = data.filter(log => 
      log.latitude != null && log.longitude != null && 
      log.latitude !== 0 && log.longitude !== 0
    ).length
    console.log(`   📍 With coordinates: ${withCoords}`)
    console.log(`   ⚠️ Without coordinates: ${data.length - withCoords}`)
    
    // ✅ Log multi-type entries count
    const multiTypeCount = data.filter(log => {
      const types = parseTypes(log.trash_types || log.trash_type)
      return types.length > 1
    }).length
    console.log(`   🗂️ Multi-type entries: ${multiTypeCount}`)
    
    // ✅ Log "All Types" count
    const allTypesCount = data.filter(log => 
      isAllTypes(log.trash_types || log.trash_type)
    ).length
    if (allTypesCount > 0) {
      console.log(`   🗂️ "All Types" entries: ${allTypesCount}`)
    }
  }
  
  return { data, error }
}

export const getCollectionLogsByCollector = async (collectorId) => {
  const { data, error } = await supabase
    .from('collection_logs')
    .select(`
      *,
      collectors (
        id,
        name,
        email,
        phone
      ),
      residents (
        id,
        name,
        address,
        email,
        phone,
        qr_code
      )
    `)
    .eq('collector_id', collectorId)
    .order('timestamp', { ascending: false })
  return { data, error }
}

/**
 * ✅ MODIFIED: Handle multi-select and "All Types" filter
 * Now supports filtering by multiple trash types
 */
export const getCollectionLogsByTrashType = async (trashTypes) => {
  console.log(`📦 Fetching collection logs by trash type(s):`, trashTypes)
  
  const typesArray = parseTypes(trashTypes)
  
  // ✅ If filtering by "All Types" or empty, get all logs
  if (typesArray.length === 0 || isAllTypes(typesArray)) {
    console.log('   🗂️ "All Types" filter - returning all collection logs')
    return getCollectionLogs()
  }
  
  // ✅ For single type - use simple query
  if (typesArray.length === 1) {
    const { data, error } = await supabase
      .from('collection_logs')
      .select(`
        *,
        collectors (id, name, email, phone),
        residents (id, name, address, email, phone, qr_code)
      `)
      .or(`trash_type.ilike.%${typesArray[0]}%,trash_types.cs.["${typesArray[0]}"]`)
      .order('timestamp', { ascending: false })
    return { data, error }
  }
  
  // ✅ For multiple types - use contains any (&&) operator
  // This requires the column to be a JSONB array in Supabase
  const { data, error } = await supabase
    .from('collection_logs')
    .select(`
      *,
      collectors (id, name, email, phone),
      residents (id, name, address, email, phone, qr_code)
    `)
    .order('timestamp', { ascending: false })
  
  // Filter in JavaScript for complex multi-type matching
  if (data) {
    const filtered = data.filter(log => {
      const logTypes = parseTypes(log.trash_types || log.trash_type)
      return matchesTypeFilter(logTypes, typesArray)
    })
    return { data: filtered, error: null }
  }
  
  return { data, error }
}

/**
 * ✅ NEW: Get collection logs by multiple trash types (array filter)
 */
export const getCollectionLogsByTrashTypesArray = async (trashTypesArray) => {
  console.log('📦 Fetching collection logs by multiple trash types:', trashTypesArray)
  
  if (!trashTypesArray || trashTypesArray.length === 0 || isAllTypes(trashTypesArray)) {
    return getCollectionLogs()
  }
  
  const { data, error } = await supabase
    .from('collection_logs')
    .select(`
      *,
      collectors (id, name, email, phone),
      residents (id, name, address, email, phone, qr_code)
    `)
    .order('timestamp', { ascending: false })
  
  if (data) {
    const filtered = data.filter(log => {
      const logTypes = parseTypes(log.trash_types || log.trash_type)
      return trashTypesArray.some(filterType =>
        logTypes.some(logType => 
          logType?.toLowerCase?.()?.trim() === filterType?.toLowerCase?.()?.trim()
        )
      )
    })
    console.log(`📦 Filtered to ${filtered.length} logs matching types`)
    return { data: filtered, error: null }
  }
  
  return { data, error }
}

/**
 * ✅ Get collection logs that have "All Types" as their trash_type value
 */
export const getCollectionLogsWithAllTypes = async () => {
  console.log('📦 Fetching collection logs with "All Types" trash type...')
  
  const { data, error } = await supabase
    .from('collection_logs')
    .select(`
      *,
      collectors (id, name, email, phone),
      residents (id, name, address, email, phone, qr_code)
    `)
    .order('timestamp', { ascending: false })
  
  if (data) {
    const filtered = data.filter(log => isAllTypes(log.trash_types || log.trash_type))
    console.log(`📦 Found ${filtered.length} collection logs with "All Types"`)
    return { data: filtered, error: null }
  }
  
  return { data, error }
}

export const getCollectionLogsByQRCode = async (qrCode) => {
  const { data, error } = await supabase
    .from('collection_logs')
    .select(`
      *,
      collectors (id, name, email, phone),
      residents (id, name, address, email, phone, qr_code)
    `)
    .eq('qr_code', qrCode)
    .order('timestamp', { ascending: false })
  return { data, error }
}

/**
 * ✅ KEEP: This function is for MAP only - requires valid coordinates
 */
export const getCollectionLogsForMap = async () => {
  console.log('🗺️ Fetching collection logs for map (with coordinates only)...')
  
  const { data, error } = await supabase
    .from('collection_logs')
    .select(`
      *,
      collectors (id, name, email, phone),
      residents (id, name, address, email, phone, qr_code)
    `)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .neq('latitude', 0)
    .neq('longitude', 0)
    .order('timestamp', { ascending: false })
  
  if (data) {
    console.log(`🗺️ Fetched ${data.length} collection logs with valid coordinates`)
  }
  
  return { data, error }
}

/**
 * ✅ MODIFIED: Create collection log with multi-type support
 */
export const createCollectionLog = async (logData) => {
  // ✅ Normalize trash_types to array format
  const trashTypes = typesToArray(logData.trash_types || logData.trash_type)
  
  // Log type info
  if (isAllTypes(trashTypes)) {
    console.log('📦 Creating collection log with "All Types" trash type')
  } else if (trashTypes.length > 1) {
    console.log(`📦 Creating collection log with ${trashTypes.length} trash types:`, trashTypes)
  }
  
  const { data, error } = await supabase
    .from('collection_logs')
    .insert([{
      ...logData,
      trash_types: trashTypes, // ✅ Store as JSON array
      trash_type: trashTypes.join(', '), // ✅ Also store as string for backward compatibility
      timestamp: logData.timestamp || new Date().toISOString(),
      created_at: logData.created_at || new Date().toISOString(),
    }])
    .select()
  return { data, error }
}

export const deleteCollectionLog = async (id) => {
  const { data, error } = await supabase
    .from('collection_logs')
    .delete()
    .eq('id', id)
  return { data, error }
}

// ==================== REPORTS/VIOLATIONS FUNCTIONS ====================

/**
 * ✅ MODIFIED: Get ALL reports with multi-type support
 */
export const getReports = async () => {
  console.log('📋 Fetching all reports...')
  
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      residents (id, name, address, email, phone, qr_code),
      collectors (id, name, email)
    `)
    .order('created_at', { ascending: false })
  
  if (data) {
    console.log(`📋 Fetched ${data.length} reports`)
    
    // Log coordinate stats
    const withCoords = data.filter(report => 
      report.latitude != null && report.longitude != null && 
      report.latitude !== 0 && report.longitude !== 0
    ).length
    console.log(`   📍 With coordinates: ${withCoords}`)
    console.log(`   ⚠️ Without coordinates: ${data.length - withCoords}`)
    
    // ✅ Log multi-type entries
    const multiTrashTypeCount = data.filter(r => {
      const types = parseTypes(r.trash_types || r.trash_type)
      return types.length > 1
    }).length
    const multiViolationTypeCount = data.filter(r => {
      const types = parseTypes(r.violation_types || r.violation_type)
      return types.length > 1
    }).length
    
    if (multiTrashTypeCount > 0) {
      console.log(`   🗂️ Multi trash-type entries: ${multiTrashTypeCount}`)
    }
    if (multiViolationTypeCount > 0) {
      console.log(`   🗂️ Multi violation-type entries: ${multiViolationTypeCount}`)
    }
    
    // Log "All Types" count
    const allTypesTrashCount = data.filter(r => isAllTypes(r.trash_types || r.trash_type)).length
    const allTypesViolationCount = data.filter(r => isAllTypes(r.violation_types || r.violation_type)).length
    if (allTypesTrashCount > 0) {
      console.log(`   🗂️ "All Types" trash_type entries: ${allTypesTrashCount}`)
    }
    if (allTypesViolationCount > 0) {
      console.log(`   🗂️ "All Types" violation_type entries: ${allTypesViolationCount}`)
    }
  }
  
  return { data, error }
}

export const getReportsByStatus = async (status) => {
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      residents (id, name, address, email, phone, qr_code),
      collectors (id, name, email)
    `)
    .eq('status', status)
    .order('created_at', { ascending: false })
  return { data, error }
}

/**
 * ✅ MODIFIED: Handle multi-select "All Types" filter for trash type
 */
export const getReportsByTrashType = async (trashTypes) => {
  console.log(`📋 Fetching reports by trash type(s):`, trashTypes)
  
  const typesArray = parseTypes(trashTypes)
  
  // If filtering by "All Types" or empty, get all reports
  if (typesArray.length === 0 || isAllTypes(typesArray)) {
    console.log('   🗂️ "All Types" filter - returning all reports')
    return getReports()
  }
  
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      residents (id, name, address, email, phone, qr_code),
      collectors (id, name, email)
    `)
    .order('created_at', { ascending: false })
  
  // Filter in JavaScript for multi-type matching
  if (data) {
    const filtered = data.filter(report => {
      const reportTypes = parseTypes(report.trash_types || report.trash_type)
      return matchesTypeFilter(reportTypes, typesArray)
    })
    return { data: filtered, error: null }
  }
  
  return { data, error }
}

/**
 * ✅ MODIFIED: Get reports by violation type with multi-select support
 */
export const getReportsByViolationType = async (violationTypes) => {
  console.log(`📋 Fetching reports by violation type(s):`, violationTypes)
  
  const typesArray = parseTypes(violationTypes)
  
  // If filtering by "All Types" or empty, get all reports
  if (typesArray.length === 0 || isAllTypes(typesArray)) {
    console.log('   🗂️ "All Types" filter - returning all reports')
    return getReports()
  }
  
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      residents (id, name, address, email, phone, qr_code),
      collectors (id, name, email)
    `)
    .order('created_at', { ascending: false })
  
  // Filter in JavaScript for multi-type matching
  if (data) {
    const filtered = data.filter(report => {
      const reportTypes = parseTypes(report.violation_types || report.violation_type)
      return matchesTypeFilter(reportTypes, typesArray)
    })
    return { data: filtered, error: null }
  }
  
  return { data, error }
}

/**
 * ✅ NEW: Get reports by both trash types AND violation types (multi-select)
 */
export const getReportsByMultipleTypes = async (trashTypes, violationTypes) => {
  console.log('📋 Fetching reports by multiple types:', { trashTypes, violationTypes })
  
  const trashTypesArray = parseTypes(trashTypes)
  const violationTypesArray = parseTypes(violationTypes)
  
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      residents (id, name, address, email, phone, qr_code),
      collectors (id, name, email)
    `)
    .order('created_at', { ascending: false })
  
  if (data) {
    const filtered = data.filter(report => {
      const reportTrashTypes = parseTypes(report.trash_types || report.trash_type)
      const reportViolationTypes = parseTypes(report.violation_types || report.violation_type)
      
      const matchesTrash = trashTypesArray.length === 0 || 
                           isAllTypes(trashTypesArray) ||
                           matchesTypeFilter(reportTrashTypes, trashTypesArray)
      
      const matchesViolation = violationTypesArray.length === 0 || 
                               isAllTypes(violationTypesArray) ||
                               matchesTypeFilter(reportViolationTypes, violationTypesArray)
      
      return matchesTrash && matchesViolation
    })
    
    console.log(`📋 Filtered to ${filtered.length} reports matching types`)
    return { data: filtered, error: null }
  }
  
  return { data, error }
}

/**
 * ✅ Get reports that have "All Types" as their value
 */
export const getReportsWithAllTypes = async () => {
  console.log('📋 Fetching reports with "All Types" values...')
  
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      residents (id, name, address, email, phone, qr_code),
      collectors (id, name, email)
    `)
    .order('created_at', { ascending: false })
  
  if (data) {
    const filtered = data.filter(report => 
      isAllTypes(report.trash_types || report.trash_type) || 
      isAllTypes(report.violation_types || report.violation_type)
    )
    console.log(`📋 Found ${filtered.length} reports with "All Types"`)
    return { data: filtered, error: null }
  }
  
  return { data, error }
}

/**
 * ✅ KEEP: This function is for MAP only - requires valid coordinates
 */
export const getReportsForMap = async () => {
  console.log('🗺️ Fetching reports for map (with coordinates only)...')
  
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      residents (id, name, address, email, phone, qr_code),
      collectors (id, name, email)
    `)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .neq('latitude', 0)
    .neq('longitude', 0)
    .order('timestamp', { ascending: false })
  
  if (data) {
    console.log(`🗺️ Fetched ${data.length} reports with valid coordinates`)
  }
  
  return { data, error }
}

export const getReportById = async (id) => {
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      residents (id, name, address, email, phone, qr_code),
      collectors (id, name, email)
    `)
    .eq('id', id)
    .single()
  return { data, error }
}

/**
 * ✅ MODIFIED: Create report with multi-type support
 */
export const createReport = async (reportData) => {
  // ✅ Normalize types to array format
  const trashTypes = typesToArray(reportData.trash_types || reportData.trash_type)
  const violationTypes = typesToArray(reportData.violation_types || reportData.violation_type)
  
  // Log type info
  if (isAllTypes(trashTypes)) {
    console.log('📋 Creating report with "All Types" trash type')
  } else if (trashTypes.length > 1) {
    console.log(`📋 Creating report with ${trashTypes.length} trash types:`, trashTypes)
  }
  
  if (isAllTypes(violationTypes)) {
    console.log('📋 Creating report with "All Types" violation type')
  } else if (violationTypes.length > 1) {
    console.log(`📋 Creating report with ${violationTypes.length} violation types:`, violationTypes)
  }
  
  const { data, error } = await supabase
    .from('reports')
    .insert([{
      ...reportData,
      trash_types: trashTypes, // ✅ Store as JSON array
      trash_type: trashTypes.join(', '), // ✅ Backward compatibility
      violation_types: violationTypes, // ✅ Store as JSON array
      violation_type: violationTypes.join(', '), // ✅ Backward compatibility
      status: reportData.status || 'reported',
      timestamp: reportData.timestamp || new Date().toISOString(),
      created_at: reportData.created_at || new Date().toISOString(),
    }])
    .select()
  return { data, error }
}

export const updateReport = async (id, reportData) => {
  // ✅ Normalize types if provided
  const updateData = { ...reportData }
  
  if (reportData.trash_types || reportData.trash_type) {
    const trashTypes = typesToArray(reportData.trash_types || reportData.trash_type)
    updateData.trash_types = trashTypes
    updateData.trash_type = trashTypes.join(', ')
  }
  
  if (reportData.violation_types || reportData.violation_type) {
    const violationTypes = typesToArray(reportData.violation_types || reportData.violation_type)
    updateData.violation_types = violationTypes
    updateData.violation_type = violationTypes.join(', ')
  }
  
  const { data, error } = await supabase
    .from('reports')
    .update(updateData)
    .eq('id', id)
    .select()
  return { data, error }
}

export const updateReportStatus = async (id, status) => {
  const { data, error } = await supabase
    .from('reports')
    .update({ status })
    .eq('id', id)
    .select()
  return { data, error }
}

export const deleteReport = async (id) => {
  const { data, error } = await supabase
    .from('reports')
    .delete()
    .eq('id', id)
  return { data, error }
}

export const getRecentReports = async (hours = 24) => {
  const date = new Date()
  date.setHours(date.getHours() - hours)
  
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      residents (id, name, address, email, phone, qr_code),
      collectors (id, name, email)
    `)
    .gte('created_at', date.toISOString())
    .order('created_at', { ascending: false })
  return { data, error }
}

// ==================== MAP DATA FUNCTIONS ====================

/**
 * ✅ MODIFIED: Enhanced with multi-type support
 */
export const getAllMapData = async () => {
  console.log('🗺️ Fetching all map data...')
  
  try {
    // Get reports WITH valid coordinates (for map)
    const { data: reportsData, error: reportsError } = await supabase
      .from('reports')
      .select(`
        *,
        residents (id, name, address, email, phone, qr_code),
        collectors (id, name, email)
      `)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .neq('latitude', 0)
      .neq('longitude', 0)
      .order('timestamp', { ascending: false })

    // Get collection logs WITH valid coordinates (for map)
    const { data: logsData, error: logsError } = await supabase
      .from('collection_logs')
      .select(`
        *,
        collectors (id, name, email, phone),
        residents (id, name, address, email, phone, qr_code)
      `)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .neq('latitude', 0)
      .neq('longitude', 0)
      .order('timestamp', { ascending: false })

    if (reportsError) console.error('❌ Error fetching reports:', reportsError)
    if (logsError) console.error('❌ Error fetching collection logs:', logsError)

    const reports = reportsData || []
    const logs = logsData || []

    console.log(`🗺️ Map data summary:`)
    console.log(`   📋 Reports with coordinates: ${reports.length}`)
    console.log(`   📦 Collection logs with coordinates: ${logs.length}`)
    
    // ✅ Log multi-type and "All Types" entries
    const multiTypeReports = reports.filter(r => {
      const trashTypes = parseTypes(r.trash_types || r.trash_type)
      const violationTypes = parseTypes(r.violation_types || r.violation_type)
      return trashTypes.length > 1 || violationTypes.length > 1
    }).length
    
    const allTypesReports = reports.filter(r => 
      isAllTypes(r.trash_types || r.trash_type) || 
      isAllTypes(r.violation_types || r.violation_type)
    ).length
    
    const allTypesLogs = logs.filter(l => isAllTypes(l.trash_types || l.trash_type)).length
    
    if (multiTypeReports > 0) {
      console.log(`   🗂️ Multi-type reports: ${multiTypeReports}`)
    }
    if (allTypesReports > 0 || allTypesLogs > 0) {
      console.log(`   🗂️ "All Types" reports: ${allTypesReports}`)
      console.log(`   🗂️ "All Types" collection logs: ${allTypesLogs}`)
    }

    const normalizedReports = reports.map(item => ({
      ...item,
      source: 'violation',
      bin_id: item.bin_id || 'N/A',
      // ✅ Add parsed types arrays
      trashTypesArray: parseTypes(item.trash_types || item.trash_type),
      violationTypesArray: parseTypes(item.violation_types || item.violation_type),
      isAllTypes: isAllTypes(item.trash_types || item.trash_type) || 
                  isAllTypes(item.violation_types || item.violation_type),
      isMultiType: parseTypes(item.trash_types || item.trash_type).length > 1 ||
                   parseTypes(item.violation_types || item.violation_type).length > 1,
    }))

    const normalizedLogs = logs.map(item => ({
      ...item,
      source: 'collection',
      bin_id: item.qr_code || 'N/A',
      description: item.notes || '',
      // ✅ Add parsed types array
      trashTypesArray: parseTypes(item.trash_types || item.trash_type),
      isAllTypes: isAllTypes(item.trash_types || item.trash_type),
      isMultiType: parseTypes(item.trash_types || item.trash_type).length > 1,
    }))

    const combinedData = [...normalizedReports, ...normalizedLogs]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    console.log(`   📊 Total map markers: ${combinedData.length}`)

    return { data: combinedData, error: null }
  } catch (error) {
    console.error('❌ Error fetching map data:', error)
    return { data: [], error }
  }
}

/**
 * ✅ MODIFIED: Get map data filtered by types (multi-select support)
 */
export const getMapDataByType = async (trashTypes = null, violationTypes = null) => {
  console.log(`🗺️ Fetching map data by type - Trash: ${trashTypes}, Violation: ${violationTypes}`)
  
  const trashTypesArray = parseTypes(trashTypes)
  const violationTypesArray = parseTypes(violationTypes)
  
  // If both are "All Types" or null, return all map data
  if ((trashTypesArray.length === 0 || isAllTypes(trashTypesArray)) && 
      (violationTypesArray.length === 0 || isAllTypes(violationTypesArray))) {
    return getAllMapData()
  }
  
  try {
    const { data: allData, error } = await getAllMapData()
    
    if (error || !allData) {
      return { data: [], error }
    }
    
    // Filter data based on selected types
    const filtered = allData.filter(item => {
      const itemTrashTypes = parseTypes(item.trash_types || item.trash_type)
      const itemViolationTypes = parseTypes(item.violation_types || item.violation_type)
      
      const matchesTrash = trashTypesArray.length === 0 || 
                           isAllTypes(trashTypesArray) ||
                           matchesTypeFilter(itemTrashTypes, trashTypesArray)
      
      const matchesViolation = item.source === 'collection' || // Collection logs don't have violation types
                               violationTypesArray.length === 0 || 
                               isAllTypes(violationTypesArray) ||
                               matchesTypeFilter(itemViolationTypes, violationTypesArray)
      
      return matchesTrash && matchesViolation
    })
    
    console.log(`🗺️ Filtered map data: ${filtered.length} markers`)
    
    return { data: filtered, error: null }
  } catch (error) {
    console.error('❌ Error fetching filtered map data:', error)
    return { data: [], error }
  }
}

/**
 * ✅ MODIFIED: Get ALL data for reports page with multi-type support
 */
export const getAllDataForReports = async () => {
  console.log('📊 Fetching all data for reports page...')
  
  try {
    // Get ALL reports (regardless of coordinates)
    const { data: reportsData, error: reportsError } = await supabase
      .from('reports')
      .select(`
        *,
        residents (id, name, address, email, phone, qr_code),
        collectors (id, name, email)
      `)
      .order('timestamp', { ascending: false })

    // Get ALL collection logs (regardless of coordinates)
    const { data: logsData, error: logsError } = await supabase
      .from('collection_logs')
      .select(`
        *,
        collectors (id, name, email, phone),
        residents (id, name, address, email, phone, qr_code)
      `)
      .order('timestamp', { ascending: false })

    if (reportsError) console.error('❌ Error fetching reports:', reportsError)
    if (logsError) console.error('❌ Error fetching collection logs:', logsError)

    const reports = reportsData || []
    const logs = logsData || []

    console.log(`📊 Reports page data summary:`)
    console.log(`   📋 Total reports: ${reports.length}`)
    console.log(`   📦 Total collection logs: ${logs.length}`)

    // ✅ Add hasCoordinates, isAllTypes, isMultiType flags and parsed arrays
    const normalizedReports = reports.map(item => {
      const trashTypesArray = parseTypes(item.trash_types || item.trash_type)
      const violationTypesArray = parseTypes(item.violation_types || item.violation_type)
      
      return {
        ...item,
        source: 'violation',
        bin_id: item.bin_id || 'N/A',
        hasCoordinates: item.latitude != null && item.longitude != null && 
                        item.latitude !== 0 && item.longitude !== 0,
        trashTypesArray,
        violationTypesArray,
        isAllTypes: isAllTypes(trashTypesArray) || isAllTypes(violationTypesArray),
        isMultiType: trashTypesArray.length > 1 || violationTypesArray.length > 1,
        trashTypesDisplay: getTypesDisplayString(trashTypesArray),
        violationTypesDisplay: getTypesDisplayString(violationTypesArray),
      }
    })

    const normalizedLogs = logs.map(item => {
      const trashTypesArray = parseTypes(item.trash_types || item.trash_type)
      
      return {
        ...item,
        source: 'collection',
        bin_id: item.qr_code || 'N/A',
        description: item.notes || '',
        hasCoordinates: item.latitude != null && item.longitude != null && 
                        item.latitude !== 0 && item.longitude !== 0,
        trashTypesArray,
        violationTypesArray: [],
        isAllTypes: isAllTypes(trashTypesArray),
        isMultiType: trashTypesArray.length > 1,
        trashTypesDisplay: getTypesDisplayString(trashTypesArray),
        violationTypesDisplay: 'N/A',
      }
    })

    // Calculate stats
    const reportsWithCoords = normalizedReports.filter(r => r.hasCoordinates).length
    const logsWithCoords = normalizedLogs.filter(l => l.hasCoordinates).length
    const reportsWithAllTypes = normalizedReports.filter(r => r.isAllTypes).length
    const logsWithAllTypes = normalizedLogs.filter(l => l.isAllTypes).length
    const reportsWithMultiType = normalizedReports.filter(r => r.isMultiType).length
    const logsWithMultiType = normalizedLogs.filter(l => l.isMultiType).length
    
    console.log(`   📍 Reports with coordinates: ${reportsWithCoords}/${reports.length}`)
    console.log(`   📍 Logs with coordinates: ${logsWithCoords}/${logs.length}`)
    console.log(`   🗂️ Reports with "All Types": ${reportsWithAllTypes}`)
    console.log(`   🗂️ Logs with "All Types": ${logsWithAllTypes}`)
    console.log(`   🗂️ Reports with multi-type: ${reportsWithMultiType}`)
    console.log(`   🗂️ Logs with multi-type: ${logsWithMultiType}`)

    const combinedData = [...normalizedReports, ...normalizedLogs]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    console.log(`   📊 Total records: ${combinedData.length}`)

    return { 
      data: combinedData, 
      error: null,
      stats: {
        totalReports: reports.length,
        totalLogs: logs.length,
        reportsWithCoords,
        logsWithCoords,
        reportsWithoutCoords: reports.length - reportsWithCoords,
        logsWithoutCoords: logs.length - logsWithCoords,
        reportsWithAllTypes,
        logsWithAllTypes,
        reportsWithMultiType,
        logsWithMultiType,
      }
    }
  } catch (error) {
    console.error('❌ Error fetching reports data:', error)
    return { data: [], error, stats: null }
  }
}

/**
 * ✅ MODIFIED: Get filtered data for reports page with multi-select support
 */
export const getFilteredDataForReports = async (filters = {}) => {
  const { trashTypes, violationTypes, status, source, dateFrom, dateTo, searchTerm } = filters
  
  console.log('📊 Fetching filtered data for reports page...', filters)
  
  try {
    // Get all data first
    const { data: allData, error, stats: baseStats } = await getAllDataForReports()
    
    if (error || !allData) {
      return { data: [], error, stats: null }
    }
    
    const trashTypesArray = parseTypes(trashTypes)
    const violationTypesArray = parseTypes(violationTypes)
    
    // Apply filters
    let filtered = allData
    
    // Filter by trash types (multi-select)
    if (trashTypesArray.length > 0 && !isAllTypes(trashTypesArray)) {
      filtered = filtered.filter(item => 
        matchesTypeFilter(item.trashTypesArray, trashTypesArray)
      )
    }
    
    // Filter by violation types (multi-select)
    if (violationTypesArray.length > 0 && !isAllTypes(violationTypesArray)) {
      filtered = filtered.filter(item => 
        item.source === 'collection' || // Collection logs pass through
        matchesTypeFilter(item.violationTypesArray, violationTypesArray)
      )
    }
    
    // Filter by status
    if (status && status !== 'all') {
      filtered = filtered.filter(item => item.status === status)
    }
    
    // Filter by source
    if (source && source !== 'all') {
      filtered = filtered.filter(item => item.source === source)
    }
    
    // Filter by date range
    if (dateFrom) {
      filtered = filtered.filter(item => new Date(item.created_at) >= new Date(dateFrom))
    }
    if (dateTo) {
      filtered = filtered.filter(item => new Date(item.created_at) <= new Date(dateTo))
    }
    
    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(item => 
        item.bin_id?.toLowerCase?.()?.includes(search) ||
        item.description?.toLowerCase?.()?.includes(search) ||
        item.location?.toLowerCase?.()?.includes(search) ||
        item.residents?.name?.toLowerCase?.()?.includes(search) ||
        item.residents?.address?.toLowerCase?.()?.includes(search) ||
        item.collectors?.name?.toLowerCase?.()?.includes(search) ||
        item.trashTypesDisplay?.toLowerCase?.()?.includes(search) ||
        item.violationTypesDisplay?.toLowerCase?.()?.includes(search)
      )
    }

    console.log(`📊 Filtered results: ${filtered.length} records`)

    return { 
      data: filtered, 
      error: null,
      stats: {
        ...baseStats,
        filteredCount: filtered.length,
        filteredReports: filtered.filter(r => r.source === 'violation').length,
        filteredLogs: filtered.filter(r => r.source === 'collection').length,
      }
    }
  } catch (error) {
    console.error('❌ Error fetching filtered reports data:', error)
    return { data: [], error, stats: null }
  }
}

/**
 * ✅ Get synced offline data specifically (for debugging)
 */
export const getSyncedOfflineData = async () => {
  console.log('🔄 Fetching synced offline data...')
  
  try {
    const { data: logsData, error: logsError } = await supabase
      .from('collection_logs')
      .select(`
        *,
        collectors (id, name),
        residents (id, name, address)
      `)
      .eq('synced', true)
      .order('created_at', { ascending: false })
      .limit(50)

    if (logsError) {
      console.error('❌ Error fetching synced logs:', logsError)
      return { data: null, error: logsError }
    }

    console.log(`🔄 Found ${logsData?.length || 0} synced collection logs`)
    
    if (logsData && logsData.length > 0) {
      console.log('   Recent synced records:')
      logsData.slice(0, 5).forEach((log, i) => {
        const hasCoords = log.latitude != null && log.longitude != null && 
                         log.latitude !== 0 && log.longitude !== 0
        const types = parseTypes(log.trash_types || log.trash_type)
        const typeInfo = isAllTypes(types) ? 'All Types' : 
                        types.length > 1 ? `${types.length} types` : types[0] || 'Unknown'
        console.log(`   ${i + 1}. ID: ${log.id?.substring(0, 8)}... | ` +
                   `Coords: ${hasCoords ? '✅' : '❌'} | ` +
                   `Types: ${typeInfo} | ` +
                   `Created: ${log.created_at}`)
      })
    }

    return { data: logsData, error: null }
  } catch (error) {
    console.error('❌ Error:', error)
    return { data: null, error }
  }
}

// ==================== ANNOUNCEMENTS FUNCTIONS ====================

export const createAnnouncement = async (announcementData) => {
  const { data, error } = await supabase
    .from('announcements')
    .insert([{
      ...announcementData,
      is_active: announcementData.is_active !== undefined ? announcementData.is_active : true,
      created_at: announcementData.created_at || new Date().toISOString(),
    }])
    .select()
  return { data, error }
}

export const getAnnouncements = async () => {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })
  return { data, error }
}

export const getAnnouncementById = async (id) => {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('id', id)
    .single()
  return { data, error }
}

export const updateAnnouncement = async (id, announcementData) => {
  const { data, error } = await supabase
    .from('announcements')
    .update(announcementData)
    .eq('id', id)
    .select()
  return { data, error }
}

export const deleteAnnouncement = async (id) => {
  const { data, error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id)
  return { data, error }
}

export const getActiveAnnouncements = async () => {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  return { data, error }
}

// ==================== SCHEDULES FUNCTIONS ====================

export const createSchedule = async (scheduleData) => {
  const { data, error } = await supabase
    .from('schedules')
    .insert([{
      ...scheduleData,
      status: scheduleData.status || 'scheduled',
      created_at: scheduleData.created_at || new Date().toISOString(),
    }])
    .select()
  return { data, error }
}

export const getSchedules = async () => {
  const { data, error } = await supabase
    .from('schedules')
    .select(`
      *,
      collectors (id, name, email, phone)
    `)
    .order('schedule_date', { ascending: true })
        .order('schedule_time', { ascending: true })
  return { data, error }
}

export const getScheduleById = async (id) => {
  const { data, error } = await supabase
    .from('schedules')
    .select(`
      *,
      collectors (id, name, email, phone)
    `)
    .eq('id', id)
    .single()
  return { data, error }
}

export const updateSchedule = async (id, scheduleData) => {
  const { data, error } = await supabase
    .from('schedules')
    .update(scheduleData)
    .eq('id', id)
    .select()
  return { data, error }
}

export const deleteSchedule = async (id) => {
  const { data, error } = await supabase
    .from('schedules')
    .delete()
    .eq('id', id)
  return { data, error }
}

export const getSchedulesByStatus = async (status) => {
  const { data, error } = await supabase
    .from('schedules')
    .select(`
      *,
      collectors (id, name, email, phone)
    `)
    .eq('status', status)
    .order('schedule_date', { ascending: true })
  return { data, error }
}

export const getSchedulesByCollector = async (collectorId) => {
  const { data, error } = await supabase
    .from('schedules')
    .select(`
      *,
      collectors (id, name, email, phone)
    `)
    .eq('assigned_collector_id', collectorId)
    .order('schedule_date', { ascending: true })
  return { data, error }
}

export const getTodaySchedules = async () => {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('schedules')
    .select(`
      *,
      collectors (id, name, email, phone)
    `)
    .eq('schedule_date', today)
    .order('schedule_time', { ascending: true })
  return { data, error }
}

// ==================== NOTIFICATIONS FUNCTIONS ====================

export const createNotification = async (notificationData) => {
  const { data, error } = await supabase
    .from('notifications')
    .insert([{
      ...notificationData,
      is_read: false,
      created_at: new Date().toISOString(),
    }])
    .select()
  return { data, error }
}

export const createBulkNotifications = async (notificationsArray) => {
  const { data, error } = await supabase
    .from('notifications')
    .insert(notificationsArray)
    .select()
  return { data, error }
}

export const getNotificationsByUser = async (userId, userType) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('user_type', userType)
    .order('created_at', { ascending: false })
  return { data, error }
}

export const markNotificationAsRead = async (notificationId) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .select()
  return { data, error }
}

export const markAllNotificationsAsRead = async (userId, userType) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('user_type', userType)
    .select()
  return { data, error }
}

export const getUnreadNotifications = async (userId, userType) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('user_type', userType)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
  return { data, error }
}

export const deleteNotification = async (id) => {
  const { data, error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)
  return { data, error }
}

// ==================== PUSH TOKENS FUNCTIONS ====================

export const savePushToken = async (tokenData) => {
  const { data, error } = await supabase
    .from('push_tokens')
    .upsert([tokenData], { onConflict: 'token' })
    .select()
  return { data, error }
}

export const getPushTokensByUsers = async (userIds) => {
  const { data, error } = await supabase
    .from('push_tokens')
    .select('*')
    .in('user_id', userIds)
  return { data, error }
}

export const getPushTokensByUserType = async (userType) => {
  const { data, error } = await supabase
    .from('push_tokens')
    .select('*')
    .eq('user_type', userType)
  return { data, error }
}

export const deletePushToken = async (token) => {
  const { data, error } = await supabase
    .from('push_tokens')
    .delete()
    .eq('token', token)
  return { data, error }
}

// ==================== DASHBOARD STATISTICS ====================

/**
 * ✅ MODIFIED: Normalize trash type with multi-type support
 */
const normalizeTrashType = (trashType) => {
  if (!trashType) return 'unknown'
  
  // Handle array format
  if (Array.isArray(trashType)) {
    if (trashType.length === 0) return 'unknown'
    if (isAllTypes(trashType)) return 'all_types'
    // Return first type for normalization (for backward compatibility)
    return normalizeTrashType(trashType[0])
  }
  
  const lower = trashType.toLowerCase().trim()
  
  if (lower === 'all types' || lower === 'all') return 'all_types'
  if (lower === 'biodegradable') return 'biodegradable'
  if (lower === 'non-biodegradable') return 'non-biodegradable'
  if (lower === 'recyclable' || lower === 'non-recyclable') return 'recyclable'
  if (lower === 'hazard' || lower === 'hazardous') return 'hazardous'
  
  return 'unknown'
}

/**
 * ✅ MODIFIED: Normalize violation type with multi-type support
 */
const normalizeViolationType = (violationType) => {
  if (!violationType) return 'unknown'
  
  // Handle array format
  if (Array.isArray(violationType)) {
    if (violationType.length === 0) return 'unknown'
    if (isAllTypes(violationType)) return 'all_types'
    return normalizeViolationType(violationType[0])
  }
  
  const lower = violationType.toLowerCase().trim()
  
  if (lower === 'all types' || lower === 'all') return 'all_types'
  if (lower.includes('improper') || lower.includes('segregation')) return 'improper_segregation'
  if (lower.includes('illegal') || lower.includes('dumping')) return 'illegal_dumping'
  if (lower.includes('missed') || lower.includes('collection')) return 'missed_collection'
  if (lower.includes('contamination')) return 'contamination'
  if (lower.includes('overflow')) return 'overflowing_bin'
  
  return 'other'
}

/**
 * ✅ NEW: Count occurrences of each type in multi-type records
 * This properly counts each type even when multiple are selected
 */
const countTypeOccurrences = (records, typeField, typeNormalizer) => {
  const counts = {}
  
  records.forEach(record => {
    const types = parseTypes(record[typeField] || record[typeField.replace('_types', '_type')])
    
    types.forEach(type => {
      const normalized = typeNormalizer(type)
      counts[normalized] = (counts[normalized] || 0) + 1
    })
  })
  
  return counts
}

/**
 * ✅ MODIFIED: Enhanced dashboard stats with multi-type support
 */
export const getDashboardStats = async () => {
  try {
    const { data: reports, error: reportsError } = await supabase
      .from('reports')
      .select('*')
    
    if (reportsError) console.error('Reports error:', reportsError)

    const { data: collectionLogs, error: logsError } = await supabase
      .from('collection_logs')
      .select('*')
    
    if (logsError) console.error('Collection logs error:', logsError)

    const { count: residentsCount, error: residentsError } = await supabase
      .from('residents')
      .select('*', { count: 'exact', head: true })
    
    if (residentsError) console.error('Residents error:', residentsError)

    const { data: residentsWithoutQR } = await supabase
      .from('residents')
      .select('id')
      .or('qr_code.is.null,qr_code.eq.')

    const { count: collectorsCount, error: collectorsError } = await supabase
      .from('collectors')
      .select('*', { count: 'exact', head: true })
    
    if (collectorsError) console.error('Collectors error:', collectorsError)

    const { count: announcementsCount } = await supabase
      .from('announcements')
      .select('*', { count: 'exact', head: true })

    const { count: schedulesCount } = await supabase
      .from('schedules')
      .select('*', { count: 'exact', head: true })

    const allReports = reports || []
    const allLogs = collectionLogs || []

    // Count records with/without coordinates
    const reportsWithCoords = allReports.filter(r => 
      r.latitude != null && r.longitude != null && 
      r.latitude !== 0 && r.longitude !== 0
    ).length

    const logsWithCoords = allLogs.filter(l => 
      l.latitude != null && l.longitude != null && 
      l.latitude !== 0 && l.longitude !== 0
    ).length

    // ✅ NEW: Count type occurrences properly for multi-type records
    const trashTypeCounts = countTypeOccurrences(
      [...allReports, ...allLogs], 
      'trash_types', 
      normalizeTrashType
    )
    
    const violationTypeCounts = countTypeOccurrences(
      allReports, 
      'violation_types', 
      normalizeViolationType
    )

    // ✅ Count multi-type records
    const multiTypeReports = allReports.filter(r => {
      const trashTypes = parseTypes(r.trash_types || r.trash_type)
      const violationTypes = parseTypes(r.violation_types || r.violation_type)
      return trashTypes.length > 1 || violationTypes.length > 1
    }).length

    const multiTypeLogs = allLogs.filter(l => {
      const trashTypes = parseTypes(l.trash_types || l.trash_type)
      return trashTypes.length > 1
    }).length

    // Count "All Types" records
    const allTypesReports = allReports.filter(r => 
      isAllTypes(r.trash_types || r.trash_type) || 
      isAllTypes(r.violation_types || r.violation_type)
    ).length

    const allTypesLogs = allLogs.filter(l => 
      isAllTypes(l.trash_types || l.trash_type)
    ).length

    // By status (violations only)
    const reportedCount = allReports.filter(r => r.status === 'reported').length
    const reviewingCount = allReports.filter(r => r.status === 'reviewing').length
    const resolvedCount = allReports.filter(r => r.status === 'resolved').length

    // Count synced records
    const syncedLogsCount = allLogs.filter(l => l.synced === true).length

    const stats = {
      totalReports: allReports.length + allLogs.length,
      totalViolations: allReports.length,
      totalCollections: allLogs.length,
      totalResidents: residentsCount || 0,
      totalCollectors: collectorsCount || 0,
      totalAnnouncements: announcementsCount || 0,
      totalSchedules: schedulesCount || 0,
      
      // QR Code stats
      residentsWithoutQRCode: residentsWithoutQR?.length || 0,
      
      // Coordinate stats
      reportsWithCoordinates: reportsWithCoords,
      reportsWithoutCoordinates: allReports.length - reportsWithCoords,
      logsWithCoordinates: logsWithCoords,
      logsWithoutCoordinates: allLogs.length - logsWithCoords,
      
      // Sync stats
      syncedCollectionLogs: syncedLogsCount,
      
      // ✅ By trash type (counts each occurrence in multi-type records)
      biodegradableCount: trashTypeCounts['biodegradable'] || 0,
      nonBiodegradableCount: trashTypeCounts['non-biodegradable'] || 0,
      recyclableCount: trashTypeCounts['recyclable'] || 0,
      hazardousCount: trashTypeCounts['hazardous'] || 0,
      allTypesTrashCount: trashTypeCounts['all_types'] || 0,
      
      // ✅ By violation type
      improperSegregationCount: violationTypeCounts['improper_segregation'] || 0,
      illegalDumpingCount: violationTypeCounts['illegal_dumping'] || 0,
      missedCollectionCount: violationTypeCounts['missed_collection'] || 0,
      contaminationCount: violationTypeCounts['contamination'] || 0,
      overflowingBinCount: violationTypeCounts['overflowing_bin'] || 0,
      allTypesViolationCount: violationTypeCounts['all_types'] || 0,
      otherViolationCount: violationTypeCounts['other'] || 0,
      
      // ✅ NEW: Multi-type stats
      multiTypeReports,
      multiTypeLogs,
      totalMultiType: multiTypeReports + multiTypeLogs,
      
      // "All Types" stats
      allTypesReports,
      allTypesLogs,
      allTypesCount: allTypesReports + allTypesLogs,
      totalAllTypes: allTypesReports + allTypesLogs,
      
      // By status (violations only)
      reportedCount,
      reviewingCount,
      resolvedCount,
      
      // ✅ NEW: Raw type counts objects for charts
      trashTypeCounts,
      violationTypeCounts,
    }

    return { data: stats, error: null }
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return { data: null, error }
  }
}

/**
 * ✅ MODIFIED: Enhanced with multi-type support
 */
export const getViolationsByType = async () => {
  try {
    const { data: reports, error } = await supabase
      .from('reports')
      .select('trash_types, trash_type, violation_types, violation_type')

    if (error) throw error
  
    const allReports = reports || []

    // Count only report/violation rows. Collection logs are normal activity and
    // should not inflate violation charts.
    const trashTypeCounts = countTypeOccurrences(allReports, 'trash_types', normalizeTrashType)
    
    // Total is sum of all type occurrences (not record count)
    const total = Object.values(trashTypeCounts).reduce((sum, count) => sum + count, 0)

    const violations = {
      biodegradable: trashTypeCounts['biodegradable'] || 0,
      nonBiodegradable: trashTypeCounts['non-biodegradable'] || 0,
      recyclable: trashTypeCounts['recyclable'] || 0,
      hazardous: trashTypeCounts['hazardous'] || 0,
      allTypes: trashTypeCounts['all_types'] || 0,
      unknown: trashTypeCounts['unknown'] || 0,
    }

    const percentages = {
      biodegradable: total > 0 ? ((violations.biodegradable / total) * 100).toFixed(1) : 0,
      nonBiodegradable: total > 0 ? ((violations.nonBiodegradable / total) * 100).toFixed(1) : 0,
      recyclable: total > 0 ? ((violations.recyclable / total) * 100).toFixed(1) : 0,
      hazardous: total > 0 ? ((violations.hazardous / total) * 100).toFixed(1) : 0,
      allTypes: total > 0 ? ((violations.allTypes / total) * 100).toFixed(1) : 0,
      unknown: total > 0 ? ((violations.unknown / total) * 100).toFixed(1) : 0,
    }

    // ✅ NEW: Count records with multiple types
    const multiTypeCount = allReports.filter(r => {
      const types = parseTypes(r.trash_types || r.trash_type)
      return types.length > 1
    }).length

    return { 
      data: { 
        violations, 
        percentages, 
        total,
        recordCount: allReports.length,
        multiTypeCount,
      }, 
      error: null 
    }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * ✅ MODIFIED: Get violation types breakdown with multi-type support
 */
export const getViolationTypeBreakdown = async () => {
  try {
    const { data: reports } = await supabase
      .from('reports')
      .select('violation_types, violation_type')
    
    const allReports = reports || []

    // ✅ Count each violation type occurrence
    const violationTypeCounts = countTypeOccurrences(allReports, 'violation_types', normalizeViolationType)
    
    const total = Object.values(violationTypeCounts).reduce((sum, count) => sum + count, 0)

    const violationTypes = {
      improperSegregation: violationTypeCounts['improper_segregation'] || 0,
      illegalDumping: violationTypeCounts['illegal_dumping'] || 0,
      missedCollection: violationTypeCounts['missed_collection'] || 0,
      contamination: violationTypeCounts['contamination'] || 0,
      overflowingBin: violationTypeCounts['overflowing_bin'] || 0,
      allTypes: violationTypeCounts['all_types'] || 0,
      other: violationTypeCounts['other'] || 0,
    }

    const percentages = {
      improperSegregation: total > 0 ? ((violationTypes.improperSegregation / total) * 100).toFixed(1) : 0,
      illegalDumping: total > 0 ? ((violationTypes.illegalDumping / total) * 100).toFixed(1) : 0,
      missedCollection: total > 0 ? ((violationTypes.missedCollection / total) * 100).toFixed(1) : 0,
      contamination: total > 0 ? ((violationTypes.contamination / total) * 100).toFixed(1) : 0,
      overflowingBin: total > 0 ? ((violationTypes.overflowingBin / total) * 100).toFixed(1) : 0,
      allTypes: total > 0 ? ((violationTypes.allTypes / total) * 100).toFixed(1) : 0,
      other: total > 0 ? ((violationTypes.other / total) * 100).toFixed(1) : 0,
    }

    // ✅ Count records with multiple violation types
    const multiTypeCount = allReports.filter(r => {
      const types = parseTypes(r.violation_types || r.violation_type)
      return types.length > 1
    }).length

    return { 
      data: { 
        violationTypes, 
        percentages, 
        total,
        recordCount: allReports.length,
        multiTypeCount,
      }, 
      error: null 
    }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * ✅ MODIFIED: Get combined statistics with multi-type support
 */
export const getCombinedTypeStats = async () => {
  try {
    const { data: reports } = await supabase
      .from('reports')
      .select('trash_types, trash_type, violation_types, violation_type, status, created_at')
    
    const { data: logs } = await supabase
      .from('collection_logs')
      .select('trash_types, trash_type, created_at')

    const allReports = reports || []
    const allLogs = logs || []

    // ✅ Trash type stats with proper multi-type counting
    const reportTrashCounts = countTypeOccurrences(allReports, 'trash_types', normalizeTrashType)
    const logTrashCounts = countTypeOccurrences(allLogs, 'trash_types', normalizeTrashType)

    const trashTypeStats = {
      biodegradable: {
        reports: reportTrashCounts['biodegradable'] || 0,
        collections: logTrashCounts['biodegradable'] || 0,
        total: (reportTrashCounts['biodegradable'] || 0) + (logTrashCounts['biodegradable'] || 0),
      },
      nonBiodegradable: {
        reports: reportTrashCounts['non-biodegradable'] || 0,
        collections: logTrashCounts['non-biodegradable'] || 0,
        total: (reportTrashCounts['non-biodegradable'] || 0) + (logTrashCounts['non-biodegradable'] || 0),
      },
      recyclable: {
        reports: reportTrashCounts['recyclable'] || 0,
        collections: logTrashCounts['recyclable'] || 0,
        total: (reportTrashCounts['recyclable'] || 0) + (logTrashCounts['recyclable'] || 0),
      },
      hazardous: {
        reports: reportTrashCounts['hazardous'] || 0,
        collections: logTrashCounts['hazardous'] || 0,
        total: (reportTrashCounts['hazardous'] || 0) + (logTrashCounts['hazardous'] || 0),
      },
      allTypes: {
        reports: reportTrashCounts['all_types'] || 0,
        collections: logTrashCounts['all_types'] || 0,
        total: (reportTrashCounts['all_types'] || 0) + (logTrashCounts['all_types'] || 0),
      },
    }

    // ✅ Violation type stats
    const violationTypeCounts = countTypeOccurrences(allReports, 'violation_types', normalizeViolationType)

    const violationTypeStats = {
      improperSegregation: violationTypeCounts['improper_segregation'] || 0,
      illegalDumping: violationTypeCounts['illegal_dumping'] || 0,
      missedCollection: violationTypeCounts['missed_collection'] || 0,
      contamination: violationTypeCounts['contamination'] || 0,
      overflowingBin: violationTypeCounts['overflowing_bin'] || 0,
      allTypes: violationTypeCounts['all_types'] || 0,
      other: violationTypeCounts['other'] || 0,
    }

    // ✅ Multi-type stats
    const multiTypeStats = {
      reports: {
        multiTrashType: allReports.filter(r => parseTypes(r.trash_types || r.trash_type).length > 1).length,
        multiViolationType: allReports.filter(r => parseTypes(r.violation_types || r.violation_type).length > 1).length,
      },
      collections: {
        multiTrashType: allLogs.filter(l => parseTypes(l.trash_types || l.trash_type).length > 1).length,
      },
    }

    return {
      data: {
        trashTypeStats,
        violationTypeStats,
        multiTypeStats,
        totals: {
          reports: allReports.length,
          collections: allLogs.length,
          combined: allReports.length + allLogs.length,
        },
        rawCounts: {
          reportTrashCounts,
          logTrashCounts,
          violationTypeCounts,
        }
      },
      error: null
    }
  } catch (error) {
    console.error('Combined stats error:', error)
    return { data: null, error }
  }
}

/**
 * ✅ NEW: Get type combination statistics
 * Shows which types are commonly selected together
 */
export const getTypeCombinationStats = async () => {
  try {
    const { data: reports } = await supabase
      .from('reports')
      .select('trash_types, trash_type, violation_types, violation_type')
    
    const { data: logs } = await supabase
      .from('collection_logs')
      .select('trash_types, trash_type')

    const allReports = reports || []
    const allLogs = logs || []

    // Count trash type combinations
    const trashCombinations = {}
    const violationCombinations = {}

    ;[...allReports, ...allLogs].forEach(record => {
      const types = parseTypes(record.trash_types || record.trash_type)
      if (types.length > 1 && !isAllTypes(types)) {
        const key = types.sort().join(' + ')
        trashCombinations[key] = (trashCombinations[key] || 0) + 1
      }
    })

    allReports.forEach(record => {
      const types = parseTypes(record.violation_types || record.violation_type)
      if (types.length > 1 && !isAllTypes(types)) {
        const key = types.sort().join(' + ')
        violationCombinations[key] = (violationCombinations[key] || 0) + 1
      }
    })

    // Sort by count and get top combinations
    const topTrashCombinations = Object.entries(trashCombinations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([combination, count]) => ({ combination, count }))

    const topViolationCombinations = Object.entries(violationCombinations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([combination, count]) => ({ combination, count }))

    return {
      data: {
        trashCombinations: topTrashCombinations,
        violationCombinations: topViolationCombinations,
        totalMultiTypeRecords: {
          trash: Object.values(trashCombinations).reduce((sum, c) => sum + c, 0),
          violation: Object.values(violationCombinations).reduce((sum, c) => sum + c, 0),
        }
      },
      error: null
    }
  } catch (error) {
    console.error('Type combination stats error:', error)
    return { data: null, error }
  }
}

// ==================== REAL-TIME SUBSCRIPTION HELPERS ====================

export const subscribeToReports = (callback) => {
  const channel = supabase
    .channel('reports-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'reports' },
      (payload) => {
        console.log('📡 Reports change:', payload)
        callback(payload)
      }
    )
    .subscribe()

  return channel
}

export const subscribeToCollectionLogs = (callback) => {
  const channel = supabase
    .channel('collection-logs-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'collection_logs' },
      (payload) => {
        console.log('📡 Collection logs change:', payload)
        callback(payload)
      }
    )
    .subscribe()

  return channel
}

export const subscribeToResidents = (callback) => {
  const channel = supabase
    .channel('residents-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'residents' },
      (payload) => {
        console.log('📡 Residents change:', payload)
        callback(payload)
      }
    )
    .subscribe()

  return channel
}

export const subscribeToAllChanges = (callback) => {
  const channel = supabase
    .channel('all-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'reports' },
      (payload) => callback({ ...payload, table: 'reports' })
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'collection_logs' },
      (payload) => callback({ ...payload, table: 'collection_logs' })
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'announcements' },
      (payload) => callback({ ...payload, table: 'announcements' })
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'schedules' },
      (payload) => callback({ ...payload, table: 'schedules' })
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'residents' },
      (payload) => callback({ ...payload, table: 'residents' })
    )
    .subscribe()

  return channel
}

export const unsubscribe = (channel) => {
  if (channel) {
    supabase.removeChannel(channel)
  }
}

// ==================== UTILITY FUNCTIONS ====================

export const sendNotificationsToUsers = async (userIds, userType, title, message, type, referenceId) => {
  const notifications = userIds.map(userId => ({
    user_id: userId,
    user_type: userType,
    title,
    message,
    type,
    reference_id: referenceId,
    is_read: false,
    created_at: new Date().toISOString(),
  }))

  return await createBulkNotifications(notifications)
}

export const getReportsByDateRange = async (startDate, endDate) => {
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      residents (id, name, address, email, phone, qr_code),
      collectors (id, name, email)
    `)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: false })
  return { data, error }
}

export const searchReports = async (searchTerm) => {
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      residents (id, name, address, email, phone, qr_code),
      collectors (id, name, email)
    `)
    .or(`location.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,bin_id.ilike.%${searchTerm}%,trash_type.ilike.%${searchTerm}%,violation_type.ilike.%${searchTerm}%`)
    .order('created_at', { ascending: false })
  return { data, error }
}

/**
 * ✅ MODIFIED: Search with multi-type filter support
 */
export const searchReportsWithFilters = async (searchTerm, filters = {}) => {
  const { trashTypes, violationTypes, status } = filters
  
  let query = supabase
    .from('reports')
    .select(`
      *,
      residents (id, name, address, email, phone, qr_code),
      collectors (id, name, email)
    `)

  // Apply search term
  if (searchTerm) {
    query = query.or(`location.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,bin_id.ilike.%${searchTerm}%,trash_type.ilike.%${searchTerm}%,violation_type.ilike.%${searchTerm}%`)
  }

  // Apply status filter
  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  
  // ✅ Apply multi-type filters in JavaScript
  if (data) {
    const trashTypesArray = parseTypes(trashTypes)
    const violationTypesArray = parseTypes(violationTypes)
    
    let filtered = data
    
    if (trashTypesArray.length > 0 && !isAllTypes(trashTypesArray)) {
      filtered = filtered.filter(report => 
        matchesTypeFilter(report.trash_types || report.trash_type, trashTypesArray)
      )
    }
    
    if (violationTypesArray.length > 0 && !isAllTypes(violationTypesArray)) {
      filtered = filtered.filter(report => 
        matchesTypeFilter(report.violation_types || report.violation_type, violationTypesArray)
      )
    }
    
    return { data: filtered, error: null }
  }
  
  return { data, error }
}

/**
 * ✅ MODIFIED: Get "All Types" summary with multi-type support
 */
export const getAllTypesSummary = async () => {
  try {
    const { data: reports } = await supabase
      .from('reports')
      .select('id, trash_types, trash_type, violation_types, violation_type, status, created_at')
      .order('created_at', { ascending: false })

    const { data: logs } = await supabase
      .from('collection_logs')
      .select('id, trash_types, trash_type, created_at')
      .order('created_at', { ascending: false })

    const allReports = reports || []
    const allLogs = logs || []

    // Filter for "All Types" entries
    const allTypesReports = allReports.filter(r => 
      isAllTypes(r.trash_types || r.trash_type) || 
      isAllTypes(r.violation_types || r.violation_type)
    )
    const allTypesLogs = allLogs.filter(l => 
      isAllTypes(l.trash_types || l.trash_type)
    )

    // ✅ Also get multi-type entries
    const multiTypeReports = allReports.filter(r => {
      const trashTypes = parseTypes(r.trash_types || r.trash_type)
      const violationTypes = parseTypes(r.violation_types || r.violation_type)
      return (trashTypes.length > 1 && !isAllTypes(trashTypes)) || 
             (violationTypes.length > 1 && !isAllTypes(violationTypes))
    })
    const multiTypeLogs = allLogs.filter(l => {
      const trashTypes = parseTypes(l.trash_types || l.trash_type)
      return trashTypes.length > 1 && !isAllTypes(trashTypes)
    })

    // Get recent items (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentAllTypesReports = allTypesReports.filter(r => 
      new Date(r.created_at) >= sevenDaysAgo
    )
    const recentAllTypesLogs = allTypesLogs.filter(l => 
      new Date(l.created_at) >= sevenDaysAgo
    )
    const recentMultiTypeReports = multiTypeReports.filter(r => 
      new Date(r.created_at) >= sevenDaysAgo
    )
    const recentMultiTypeLogs = multiTypeLogs.filter(l => 
      new Date(l.created_at) >= sevenDaysAgo
    )

    return {
      data: {
        allTypes: {
          total: allTypesReports.length + allTypesLogs.length,
          reports: {
            total: allTypesReports.length,
            recent: recentAllTypesReports.length,
            byStatus: {
              reported: allTypesReports.filter(r => r.status === 'reported').length,
              reviewing: allTypesReports.filter(r => r.status === 'reviewing').length,
              resolved: allTypesReports.filter(r => r.status === 'resolved').length,
            }
          },
          collections: {
            total: allTypesLogs.length,
            recent: recentAllTypesLogs.length,
          },
        },
        multiType: {
          total: multiTypeReports.length + multiTypeLogs.length,
          reports: {
            total: multiTypeReports.length,
            recent: recentMultiTypeReports.length,
          },
          collections: {
            total: multiTypeLogs.length,
            recent: recentMultiTypeLogs.length,
          },
        },
        recentItems: [
          ...recentAllTypesReports.map(r => ({ ...r, category: 'allTypes', source: 'report' })),
          ...recentAllTypesLogs.map(l => ({ ...l, category: 'allTypes', source: 'collection' })),
          ...recentMultiTypeReports.map(r => ({ ...r, category: 'multiType', source: 'report' })),
          ...recentMultiTypeLogs.map(l => ({ ...l, category: 'multiType', source: 'collection' })),
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 20),
      },
      error: null
    }
  } catch (error) {
    console.error('All Types summary error:', error)
    return { data: null, error }
  }
}

/**
 * ✅ Export helper for displaying type labels
 */
export const getTypeDisplayLabel = (type) => {
  if (!type) return 'Unknown'
  
  // Handle array
  if (Array.isArray(type)) {
    if (type.length === 0) return 'Unknown'
    if (isAllTypes(type)) return 'All Types'
    if (type.length === 1) return getTypeDisplayLabel(type[0])
    return `${type.length} Types`
  }
  
  if (isAllTypes(type)) return 'All Types'
  
  // Capitalize first letter of each word
  return type
    .split(/[-_\s]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * ✅ Get color for type (for charts/UI)
 */
export const getTypeColor = (type) => {
  const normalizedType = normalizeTrashType(type)
  
  const colors = {
    'biodegradable': '#22c55e',      // Green
    'non-biodegradable': '#ef4444',  // Red
    'recyclable': '#3b82f6',         // Blue
    'hazardous': '#f59e0b',          // Orange/Amber
    'all_types': '#8b5cf6',          // Purple
    'unknown': '#6b7280',            // Gray
  }
  
  return colors[normalizedType] || colors['unknown']
}

/**
 * ✅ Get violation type color
 */
export const getViolationTypeColor = (violationType) => {
  const normalizedType = normalizeViolationType(violationType)
  
  const colors = {
    'improper_segregation': '#ef4444',  // Red
    'illegal_dumping': '#dc2626',       // Dark Red
    'missed_collection': '#f59e0b',     // Amber
    'contamination': '#eab308',         // Yellow
    'overflowing_bin': '#f97316',       // Orange
    'all_types': '#8b5cf6',             // Purple
    'other': '#6b7280',                 // Gray
  }
  
  return colors[normalizedType] || colors['other']
}

/**
 * ✅ NEW: Get colors for multiple types (returns array of colors)
 */
export const getMultiTypeColors = (types, colorFunction = getTypeColor) => {
  const typesArray = parseTypes(types)
  return typesArray.map(type => colorFunction(type))
}

/**
 * ✅ NEW: Get badge data for displaying multiple types
 * Returns array of { label, color } objects
 */
export const getTypeBadges = (types, colorFunction = getTypeColor) => {
  const typesArray = parseTypes(types)
  
  if (typesArray.length === 0) {
    return [{ label: 'Unknown', color: '#6b7280' }]
  }
  
  if (isAllTypes(typesArray)) {
    return [{ label: 'All Types', color: '#8b5cf6' }]
  }
  
  return typesArray.map(type => ({
    label: getTypeDisplayLabel(type),
    color: colorFunction(type),
  }))
}

// ==================== 🆕 LIVE CHAT FUNCTIONS ====================

/**
 * Fetch distinct conversations (latest message per conversation)
 */
export const getLiveConversations = async () => {
  const { data, error } = await supabase
    .from('live_chat_messages')
    .select('conversation_id, sender_type, message, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Group by conversation_id and pick the latest
  const map = new Map();
  data.forEach(msg => {
    if (!map.has(msg.conversation_id)) {
      map.set(msg.conversation_id, msg);
    }
  });

  return Array.from(map.values()).sort((a, b) =>
    new Date(b.created_at) - new Date(a.created_at)
  );
};

/**
 * Fetch all messages for a given conversation
 */
export const getLiveMessages = async (conversationId) => {
  const { data, error } = await supabase
    .from('live_chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
};

/**
 * Admin sends a reply
 */
export const sendAdminLiveMessage = async (conversationId, message) => {
  const { data, error } = await supabase
    .from('live_chat_messages')
    .insert({
      sender_type: 'admin',
      conversation_id: conversationId,
      message,
    });

  if (error) throw error;
  return data;
};

/**
 * Mark messages as read (optional)
 */
export const markLiveChatRead = async (conversationId) => {
  const { error } = await supabase
    .from('live_chat_messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .eq('sender_type', 'user');

  if (error) throw error;
};

/**
 * Subscribe to a conversation (real-time)
 */
export const subscribeToLiveChat = (conversationId, onNewMessage) => {
  return supabase
    .channel(`admin-live-chat:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'live_chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onNewMessage(payload.new);
      }
    )
    .subscribe();
};

/**
 * Fetch user profile (name, email) by ID and role
 */
export const getUserProfile = async (role, userId) => {
  const table = role === 'resident' ? 'residents' : 'collectors';
  const { data, error } = await supabase
    .from(table)
    .select('name, email')
    .eq('id', userId)
    .single();

  if (error) {
    console.warn('Could not fetch user profile:', error);
    return { name: 'Unknown User', email: '' };
  }
  return data || { name: 'Unknown User', email: '' };
};