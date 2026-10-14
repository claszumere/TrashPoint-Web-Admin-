// src/pages/Collectors.jsx

import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { getCollectors } from '../services/supabase'
import { useNotification } from '../context/NotificationContext'
import { logActivity, ACTIONS, ENTITIES } from '../services/activityLog'

const Collectors = () => {
  const { showSuccess, showError, showWarning, showInfo } = useNotification()
  
  const [collectors, setCollectors] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [viewMode, setViewMode] = useState('grid')
  const [selectedCollector, setSelectedCollector] = useState(null)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    vehicle_number: '',
    assigned_area: ''
  })
  
  const [submitting, setSubmitting] = useState(false)
  const [deleting] = useState(null)
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [formErrors, setFormErrors] = useState({})

  // ✅ NEW: Custom Confirm Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'danger',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: () => {},
    isLoading: false,
    collectorData: null
  })

  useEffect(() => {
    fetchCollectors()
  }, [])

  const fetchCollectors = async () => {
    setLoading(true)
    try {
      const { data, error } = await getCollectors()
      if (error) throw error
      if (data) setCollectors(data)
    } catch (error) {
      console.error('Error fetching collectors:', error)
      showError('Failed to load collectors. Please try again.', 'Loading Error')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (term) => {
    setSearchTerm(term)
  }

  const filteredCollectors = collectors.filter(collector => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      collector.name?.toLowerCase().includes(search) ||
      collector.email?.toLowerCase().includes(search) ||
      collector.vehicle_number?.toLowerCase().includes(search) ||
      collector.assigned_area?.toLowerCase().includes(search)
    )
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleOpenModal = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      vehicle_number: '',
      assigned_area: ''
    })
    setFormErrors({})
    setShowPassword(false)
    setShowConfirmPassword(false)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      vehicle_number: '',
      assigned_area: ''
    })
    setFormErrors({})
  }

  const validateForm = () => {
    const errors = {}
    
    if (!formData.name.trim()) {
      errors.name = 'Full name is required'
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[\w.-]+@([\w-]+\.)+[\w-]{2,4}$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }
    
    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }
    
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }
    
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required'
    }
    
    if (!formData.vehicle_number.trim()) {
      errors.vehicle_number = 'Vehicle number is required'
    }
    
    if (!formData.assigned_area.trim()) {
      errors.assigned_area = 'Assigned area is required'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Create Collector
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      showWarning('Please fill in all required fields correctly.', 'Validation Error')
      return
    }
    
    setSubmitting(true)

    try {
      const { data: { session: adminSession } } = await supabase.auth.getSession()
      
      if (!adminSession) {
        throw new Error('Admin session not found. Please log in again.')
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            role: 'collector',
            full_name: formData.name.trim()
          }
        }
      })

      if (authError) throw new Error(authError.message)
      if (!authData.user) throw new Error('Failed to create user account')

      const { error: restoreError } = await supabase.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token
      })

      if (restoreError) {
        showWarning('Session expired. Page will refresh...', 'Session Warning')
        window.location.reload()
        return
      }

      const { data: collectorData, error: collectorError } = await supabase
        .from('collectors')
        .insert([{
          id: authData.user.id,
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          vehicle_number: formData.vehicle_number.trim(),
          assigned_area: formData.assigned_area.trim(),
          is_active: true,
          created_at: new Date().toISOString()
        }])
        .select()

      if (collectorError) throw new Error(collectorError.message)

      await logActivity({
        action: ACTIONS.CREATE,
        entityType: ENTITIES.COLLECTOR,
        entityId: collectorData?.[0]?.id || authData.user.id,
        entityName: formData.name.trim(),
        description: `Created new collector account: ${formData.name.trim()}`,
        metadata: {
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          vehicle_number: formData.vehicle_number.trim(),
          assigned_area: formData.assigned_area.trim()
        }
      })

      showSuccess(
        `Collector account for "${formData.name}" has been created successfully.`,
        '🚛 Collector Account Created'
      )
      
      handleCloseModal()
      fetchCollectors()
      
    } catch (error) {
      console.error('Error creating collector account:', error)
      showError(error.message || 'Failed to create collector account', 'Creation Failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleViewCollector = (collector) => {
    setSelectedCollector(collector)
  }

  // ✅ NEW: Open Delete Confirm Modal
  const handleDeleteCollector = (collector) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Collector',
      type: 'danger',
      confirmText: 'Yes, Delete',
      cancelText: 'Cancel',
      isLoading: false,
      collectorData: collector,
      actionType: 'delete'
    })
  }

  // ✅ NEW: Open Toggle Status Confirm Modal
  const handleToggleStatus = (collector) => {
    const newStatus = !collector.is_active
    setConfirmModal({
      isOpen: true,
      title: newStatus ? 'Activate Collector' : 'Deactivate Collector',
      type: newStatus ? 'success' : 'warning',
      confirmText: newStatus ? 'Activate' : 'Deactivate',
      cancelText: 'Cancel',
      isLoading: false,
      collectorData: collector,
      actionType: 'toggle',
      newStatus: newStatus
    })
  }

  // ✅ NEW: Handle Confirm Action
  const handleConfirmAction = async () => {
    const { actionType, collectorData, newStatus } = confirmModal
    
    setConfirmModal(prev => ({ ...prev, isLoading: true }))

    try {
      if (actionType === 'delete') {
        const { data: collectionLogs } = await supabase
          .from('collection_logs')
          .select('id')
          .eq('collector_id', collectorData.id)
          .limit(1)

        const { data: reports } = await supabase
          .from('reports')
          .select('id')
          .eq('collector_id', collectorData.id)
          .limit(1)

        const hasRelatedRecords = (collectionLogs && collectionLogs.length > 0) || (reports && reports.length > 0)

        const mutation = hasRelatedRecords
          ? supabase
              .from('collectors')
              .update({ is_active: false })
              .eq('id', collectorData.id)
          : supabase
              .from('collectors')
              .delete()
              .eq('id', collectorData.id)

        const { error } = await mutation

        if (error) throw error

        setCollectors(prev => hasRelatedRecords
          ? prev.map(c => c.id === collectorData.id ? { ...c, is_active: false } : c)
          : prev.filter(c => c.id !== collectorData.id)
        )
        
        if (selectedCollector?.id === collectorData.id) {
          setSelectedCollector(hasRelatedRecords ? { ...selectedCollector, is_active: false } : null)
        }

        await logActivity({
          action: hasRelatedRecords ? ACTIONS.DEACTIVATE : ACTIONS.DELETE,
          entityType: ENTITIES.COLLECTOR,
          entityId: collectorData.id,
          entityName: collectorData.name,
          description: hasRelatedRecords
            ? `Deactivated collector: ${collectorData.name} because related history exists`
            : `Deleted collector: ${collectorData.name}`,
          metadata: {
            email: collectorData.email,
            vehicle_number: collectorData.vehicle_number,
            assigned_area: collectorData.assigned_area,
            was_active: collectorData.is_active,
            preservedHistory: hasRelatedRecords
          }
        })

        showSuccess(
          hasRelatedRecords
            ? `"${collectorData.name}" has been deactivated to preserve related reports/collections. Revoke auth access from a secure backend/admin console if needed.`
            : `"${collectorData.name}" has been removed from the collectors table. Remove the auth user from a secure backend/admin console if login must be revoked.`,
          hasRelatedRecords ? 'Collector Deactivated' : 'Collector Deleted'
        )

      } else if (actionType === 'toggle') {
        // Toggle status
        const { error } = await supabase
          .from('collectors')
          .update({ is_active: newStatus })
          .eq('id', collectorData.id)

        if (error) throw error

        setCollectors(prev => prev.map(c => 
          c.id === collectorData.id 
            ? { ...c, is_active: newStatus }
            : c
        ))

        if (selectedCollector?.id === collectorData.id) {
          setSelectedCollector(prev => ({ ...prev, is_active: newStatus }))
        }

        await logActivity({
          action: newStatus ? ACTIONS.ACTIVATE : ACTIONS.DEACTIVATE,
          entityType: ENTITIES.COLLECTOR,
          entityId: collectorData.id,
          entityName: collectorData.name,
          description: `${newStatus ? 'Activated' : 'Deactivated'} collector: ${collectorData.name}`,
          metadata: {
            email: collectorData.email,
            previousStatus: collectorData.is_active,
            newStatus: newStatus
          }
        })

        if (newStatus) {
          showSuccess(
            `"${collectorData.name}" is now active and can perform collections.`,
            '✅ Collector Activated'
          )
        } else {
          showWarning(
            `"${collectorData.name}" has been deactivated.`,
            '⏸️ Collector Deactivated'
          )
        }
      }
    } catch (error) {
      console.error('Error:', error)
      showError(`Failed to ${actionType} collector: ${error.message}`, 'Error')
    } finally {
      setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }))
    }
  }

  // ✅ NEW: Close Confirm Modal
  const closeConfirmModal = () => {
    if (!confirmModal.isLoading) {
      setConfirmModal(prev => ({ ...prev, isOpen: false }))
    }
  }

  const handleRefresh = async () => {
    await fetchCollectors()
    showInfo('Collectors data has been refreshed.', 'Data Refreshed')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600 font-medium">Loading collectors...</p>
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
            Collectors Management
          </h1>
          <p className="text-gray-600 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Manage garbage collectors and their assignments
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="bg-gray-100 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-200 transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Refresh</span>
          </button>
          
          <button
            onClick={handleOpenModal}
            className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span className="font-semibold">Create Collector Account</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Total Collectors</p>
              <p className="text-4xl font-bold">{collectors.length}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
              <span className="text-3xl">🚛</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">Active Collectors</p>
              <p className="text-4xl font-bold">{collectors.filter(c => c.is_active !== false).length}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
              <span className="text-3xl">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-yellow-100 text-sm font-medium mb-1">Inactive Collectors</p>
              <p className="text-4xl font-bold">{collectors.filter(c => c.is_active === false).length}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
              <span className="text-3xl">⏸️</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-purple-100 text-sm font-medium mb-1">Assigned Areas</p>
              <p className="text-4xl font-bold">{new Set(collectors.map(c => c.assigned_area)).size}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
              <span className="text-3xl">📍</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and View Controls */}
      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="🔍 Search collectors by name, email, vehicle, or area..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-6 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
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

          <div className="flex bg-gray-100 rounded-xl p-1">
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
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-primary-600 shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Collectors Display */}
      {filteredCollectors.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-16 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-6 shadow-inner">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            {searchTerm ? 'No Collectors Found' : 'No Collectors Yet'}
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {searchTerm 
              ? 'Try adjusting your search term to find collectors'
              : 'Get started by creating your first collector account'
            }
          </p>
          {!searchTerm && (
            <button
              onClick={handleOpenModal}
              className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-8 py-3 rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg font-semibold"
            >
              Create First Collector Account
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCollectors.map((collector) => (
            <div key={collector.id} className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2 border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4">
                <div className="flex items-center justify-between">
                  <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                    <span className="text-3xl">🚛</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-white ${
                      collector.is_active !== false ? 'bg-green-500/80' : 'bg-red-500/80'
                    }`}>
                      {collector.is_active !== false ? '✓ Active' : '✗ Inactive'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCollector(collector)
                      }}
                      disabled={deleting === collector.id}
                      className="bg-red-500/80 hover:bg-red-600 backdrop-blur-sm p-2 rounded-lg text-white transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      title="Delete Collector"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{collector.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{collector.email}</p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-xl">
                    <span>📞</span>
                    <span>{collector.phone || 'No phone'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-xl">
                    <span>🚛</span>
                    <span>{collector.vehicle_number || 'No vehicle'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-xl">
                    <span>📍</span>
                    <span>{collector.assigned_area || 'No area assigned'}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewCollector(collector)}
                    className="flex-1 bg-gradient-to-r from-primary-50 to-primary-100 text-primary-600 py-3 rounded-xl hover:from-primary-100 hover:to-primary-200 transition-all font-semibold"
                  >
                    👁️ View
                  </button>
                  <button
                    onClick={() => handleToggleStatus(collector)}
                    className={`flex-1 py-3 rounded-xl transition-all font-semibold ${
                      collector.is_active !== false
                        ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-600 hover:from-yellow-100 hover:to-yellow-200'
                        : 'bg-gradient-to-r from-green-50 to-green-100 text-green-600 hover:from-green-100 hover:to-green-200'
                    }`}
                  >
                    {collector.is_active !== false ? '⏸️ Deactivate' : '▶️ Activate'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // List View
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Collector</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Vehicle</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Area</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCollectors.map((collector) => (
                <tr key={collector.id} className="hover:bg-gray-50 transition-all">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🚛</span>
                      <div>
                        <div className="font-bold text-gray-900">{collector.name}</div>
                        <div className="text-xs text-gray-500">{collector.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{collector.phone || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">{collector.vehicle_number || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{collector.assigned_area || 'N/A'}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      collector.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {collector.is_active !== false ? '✓ Active' : '✗ Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleViewCollector(collector)}
                        className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-primary-700"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleToggleStatus(collector)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold text-white ${
                          collector.is_active !== false
                            ? 'bg-yellow-500 hover:bg-yellow-600'
                            : 'bg-green-500 hover:bg-green-600'
                        }`}
                      >
                        {collector.is_active !== false ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteCollector(collector)}
                        className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ✅ NEW: Custom Confirm Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={closeConfirmModal}
          />

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div 
              className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={closeConfirmModal}
                disabled={confirmModal.isLoading}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="p-6">
                {/* Icon */}
                <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                  confirmModal.type === 'danger' ? 'bg-red-100' :
                  confirmModal.type === 'warning' ? 'bg-yellow-100' :
                  confirmModal.type === 'success' ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {confirmModal.type === 'danger' && (
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                  {confirmModal.type === 'warning' && (
                    <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )}
                  {confirmModal.type === 'success' && (
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                  {confirmModal.title}
                </h3>

                {/* Collector Info Card */}
                {confirmModal.collectorData && (
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">🚛</span>
                      <div>
                        <p className="font-bold text-gray-900">{confirmModal.collectorData.name}</p>
                        <p className="text-sm text-gray-500">{confirmModal.collectorData.email}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Vehicle:</span>
                        <span className="ml-1 font-medium">{confirmModal.collectorData.vehicle_number || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Area:</span>
                        <span className="ml-1 font-medium">{confirmModal.collectorData.assigned_area || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <span className={`ml-1 font-medium ${
                          confirmModal.collectorData.is_active !== false ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {confirmModal.collectorData.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Warning Message */}
                <div className={`rounded-xl p-4 mb-6 ${
                  confirmModal.type === 'danger' ? 'bg-red-50 border border-red-200' :
                  confirmModal.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                  'bg-green-50 border border-green-200'
                }`}>
                  {confirmModal.actionType === 'delete' ? (
                    <div className="text-sm">
                      <p className={`font-semibold mb-2 ${
                        confirmModal.type === 'danger' ? 'text-red-800' : 'text-gray-800'
                      }`}>
                        ⚠️ This action cannot be undone!
                      </p>
                      <p className="text-red-700">
                        This will permanently remove the collector account, login credentials, and all collection history.
                      </p>
                    </div>
                  ) : (
                    <p className={`text-sm ${
                      confirmModal.newStatus ? 'text-green-700' : 'text-yellow-700'
                    }`}>
                      {confirmModal.newStatus 
                        ? '✅ This collector will be able to log in and perform collections.'
                        : '⏸️ This collector will not be able to log in or perform collections.'
                      }
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={closeConfirmModal}
                    disabled={confirmModal.isLoading}
                    className="flex-1 px-4 py-3 rounded-xl font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all disabled:opacity-50"
                  >
                    {confirmModal.cancelText}
                  </button>
                  <button
                    onClick={handleConfirmAction}
                    disabled={confirmModal.isLoading}
                    className={`flex-1 px-4 py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                      confirmModal.type === 'danger' 
                        ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' :
                      confirmModal.type === 'warning'
                        ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700' :
                        'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                    }`}
                  >
                    {confirmModal.isLoading ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Processing...
                      </>
                    ) : (
                      confirmModal.confirmText
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Collector Modal - Keep existing */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 p-6 rounded-t-3xl z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Create Collector Account</h2>
                <button onClick={handleCloseModal} className="text-white/80 hover:text-white p-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {/* Personal Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border-2 rounded-xl ${formErrors.name ? 'border-red-300' : 'border-gray-200'}`}
                    placeholder="John Doe"
                  />
                  {formErrors.name && <p className="mt-1 text-sm text-red-500">{formErrors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Phone *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border-2 rounded-xl ${formErrors.phone ? 'border-red-300' : 'border-gray-200'}`}
                    placeholder="+63 912 345 6789"
                  />
                  {formErrors.phone && <p className="mt-1 text-sm text-red-500">{formErrors.phone}</p>}
                </div>
              </div>

              {/* Work Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Vehicle Number *</label>
                  <input
                    type="text"
                    name="vehicle_number"
                    value={formData.vehicle_number}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border-2 rounded-xl ${formErrors.vehicle_number ? 'border-red-300' : 'border-gray-200'}`}
                    placeholder="ABC-1234"
                  />
                  {formErrors.vehicle_number && <p className="mt-1 text-sm text-red-500">{formErrors.vehicle_number}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Assigned Area *</label>
                  <input
                    type="text"
                    name="assigned_area"
                    value={formData.assigned_area}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border-2 rounded-xl ${formErrors.assigned_area ? 'border-red-300' : 'border-gray-200'}`}
                    placeholder="Barangay San Antonio"
                  />
                  {formErrors.assigned_area && <p className="mt-1 text-sm text-red-500">{formErrors.assigned_area}</p>}
                </div>
              </div>

              {/* Login Credentials */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border-2 rounded-xl ${formErrors.email ? 'border-red-300' : 'border-gray-200'}`}
                  placeholder="collector@example.com"
                />
                {formErrors.email && <p className="mt-1 text-sm text-red-500">{formErrors.email}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border-2 rounded-xl ${formErrors.password ? 'border-red-300' : 'border-gray-200'}`}
                      placeholder="Min. 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {formErrors.password && <p className="mt-1 text-sm text-red-500">{formErrors.password}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Confirm Password *</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border-2 rounded-xl ${formErrors.confirmPassword ? 'border-red-300' : 'border-gray-200'}`}
                      placeholder="Re-enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showConfirmPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {formErrors.confirmPassword && <p className="mt-1 text-sm text-red-500">{formErrors.confirmPassword}</p>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl hover:bg-gray-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-xl hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 font-semibold"
                >
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Collector Modal */}
      {selectedCollector && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Collector Details</h2>
                <button onClick={() => setSelectedCollector(null)} className="text-white/80 hover:text-white p-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-8">
              <div className="text-center mb-6">
                <span className="text-6xl">🚛</span>
                <h3 className="text-2xl font-bold text-gray-900 mt-4">{selectedCollector.name}</h3>
                <p className="text-gray-600">{selectedCollector.email}</p>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                  selectedCollector.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {selectedCollector.is_active !== false ? '✓ Active' : '✗ Inactive'}
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <span className="text-2xl">📞</span>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-semibold">{selectedCollector.phone || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <span className="text-2xl">🚛</span>
                  <div>
                    <p className="text-sm text-gray-500">Vehicle</p>
                    <p className="font-semibold">{selectedCollector.vehicle_number || 'Not assigned'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <span className="text-2xl">📍</span>
                  <div>
                    <p className="text-sm text-gray-500">Area</p>
                    <p className="font-semibold">{selectedCollector.assigned_area || 'Not assigned'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-6">
                <button
                  onClick={() => handleToggleStatus(selectedCollector)}
                  className={`py-3 rounded-xl font-semibold text-white ${
                    selectedCollector.is_active !== false
                      ? 'bg-yellow-500 hover:bg-yellow-600'
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {selectedCollector.is_active !== false ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => handleDeleteCollector(selectedCollector)}
                  className="bg-red-500 text-white py-3 rounded-xl hover:bg-red-600 font-semibold"
                >
                  Delete
                </button>
                <button
                  onClick={() => setSelectedCollector(null)}
                  className="bg-gray-100 text-gray-700 py-3 rounded-xl hover:bg-gray-200 font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Collectors