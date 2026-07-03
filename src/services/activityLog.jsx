// src/services/activityLog.js

import { supabase } from './supabase'

// Activity action types
export const ACTIONS = {
  // Auth
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  
  // CRUD
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  
  // Specific actions
  ACTIVATE: 'ACTIVATE',
  DEACTIVATE: 'DEACTIVATE',
  GENERATE_QR: 'GENERATE_QR',
  CHANGE_PASSWORD: 'CHANGE_PASSWORD',
  EXPORT: 'EXPORT',
  STATUS_CHANGE: 'STATUS_CHANGE',
  CHATBOT_MESSAGE: 'CHATBOT_MESSAGE',
  CHATBOT_AGENT_STARTED: 'CHATBOT_AGENT_STARTED', // 🆕 Chatbot Started
  CHATBOT_AGENT_MESSAGE: 'CHATBOT_AGENT_MESSAGE', // 🆕 user message
  CHATBOT_AGENT_REPLY: 'CHATBOT_AGENT_REPLY'      // 🆕 admin reply
}

// Entity types
export const ENTITIES = {
  RESIDENT: 'resident',
  COLLECTOR: 'collector',
  REPORT: 'report',
  ANNOUNCEMENT: 'announcement',
  SCHEDULE: 'schedule',
  ADMIN: 'admin',
  SYSTEM: 'system',
  CHATBOT: 'chatbot'
}

/**
 * Log an activity
 * @param {Object} params - Activity parameters
 * @param {string} params.action - Action type (CREATE, UPDATE, DELETE, etc.)
 * @param {string} params.entityType - Entity type (resident, collector, etc.)
 * @param {string} params.entityId - Entity ID (optional)
 * @param {string} params.entityName - Entity name for display (optional)
 * @param {string} params.description - Human-readable description
 * @param {Object} params.metadata - Additional data (optional)
 */
export const logActivity = async ({
  action,
  entityType,
  entityId = null,
  entityName = null,
  description,
  metadata = {}
}) => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.warn('No user found for activity logging')
      return { data: null, error: 'No user found' }
    }

    // Get user details from admin or collectors table
    let userName = user.user_metadata?.full_name || user.email
    let userRole = 'admin'

    const { data, error } = await supabase
      .from('activity_logs')
      .insert([{
        user_id: user.id,
        user_email: user.email,
        user_name: userName,
        user_role: userRole,
        action,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        description,
        metadata,
        created_at: new Date().toISOString()
      }])
      .select()

    if (error) {
      console.error('Error logging activity:', error)
      return { data: null, error }
    }

    console.log('📝 Activity logged:', description)
    return { data, error: null }

  } catch (error) {
    console.error('Error in logActivity:', error)
    return { data: null, error }
  }
}

/**
 * Get activity logs with filters
 */
export const getActivityLogs = async ({
  page = 1,
  limit = 20,
  action = null,
  entityType = null,
  userId = null,
  startDate = null,
  endDate = null,
  searchTerm = null
} = {}) => {
  try {
    let query = supabase
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters
    if (action && action !== 'all') {
      query = query.eq('action', action)
    }

    if (entityType && entityType !== 'all') {
      query = query.eq('entity_type', entityType)
    }

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    if (searchTerm) {
      query = query.or(`description.ilike.%${searchTerm}%,entity_name.ilike.%${searchTerm}%,user_email.ilike.%${searchTerm}%`)
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    return {
      data,
      error: null,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    }

  } catch (error) {
    console.error('Error fetching activity logs:', error)
    return { data: null, error, count: 0, totalPages: 0, currentPage: 1 }
  }
}

/**
 * Get activity stats
 */
export const getActivityStats = async (days = 7) => {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('activity_logs')
      .select('action, entity_type, created_at')
      .gte('created_at', startDate.toISOString())

    if (error) throw error

    // Calculate stats
    const stats = {
      total: data.length,
      byAction: {},
      byEntity: {},
      byDay: {}
    }

    data.forEach(log => {
      // By action
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1
      
      // By entity
      if (log.entity_type) {
        stats.byEntity[log.entity_type] = (stats.byEntity[log.entity_type] || 0) + 1
      }
      
      // By day
      const day = new Date(log.created_at).toLocaleDateString()
      stats.byDay[day] = (stats.byDay[day] || 0) + 1
    })

    return { data: stats, error: null }

  } catch (error) {
    console.error('Error fetching activity stats:', error)
    return { data: null, error }
  }
}

/**
 * Delete old activity logs (cleanup)
 */
export const deleteOldLogs = async (daysOld = 90) => {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const { error } = await supabase
      .from('activity_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString())

    if (error) throw error

    return { success: true, error: null }

  } catch (error) {
    console.error('Error deleting old logs:', error)
    return { success: false, error }
  }
}