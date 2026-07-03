// src/pages/GenerateQR.jsx

import React, { useState, useEffect } from 'react'
import QRGenerator from '../components/qr/QRGenerator'
import { supabase } from '../services/supabase'
import { getResidents, searchResidents } from '../services/supabase'
import { debounce } from '../utils/helpers'
import { useAuth } from '../context/AuthContext'
import { useNotification } from '../context/NotificationContext'
import { logActivity, ACTIONS, ENTITIES } from '../services/activityLog'


const GenerateQR = () => {
  const { createResidentAccount } = useAuth()
  const { showSuccess, showError, showWarning, showInfo, showConfirm } = useNotification()
  
  const [residents, setResidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedResident, setSelectedResident] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [viewMode, setViewMode] = useState('grid')
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    qr_code: ''
  })
  
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(null)
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [formErrors, setFormErrors] = useState({})

  // Change Password States
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [changePasswordResident, setChangePasswordResident] = useState(null)
  const [changePasswordData, setChangePasswordData] = useState({
    newPassword: '',
    confirmNewPassword: ''
  })
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false)
  const [changePasswordErrors, setChangePasswordErrors] = useState({})
  const [changingPassword, setChangingPassword] = useState(false)

  

  useEffect(() => {
    fetchResidents()
  }, [])

  useEffect(() => {
    if (showModal && !formData.qr_code) {
      generateQRCode()
    }
  }, [showModal])

  const fetchResidents = async () => {
    setLoading(true)
    try {
      const { data, error } = await getResidents()
      if (error) throw error
      if (data) setResidents(data)
    } catch (error) {
      console.error('Error fetching residents:', error)
      showError('Failed to load residents', 'Loading Error')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = debounce(async (term) => {
    if (!term) {
      fetchResidents()
      return
    }
    
    try {
      const { data, error } = await searchResidents(term)
      if (error) throw error
      if (data) setResidents(data)
    } catch (error) {
      console.error('Error searching residents:', error)
      showError('Failed to search residents', 'Search Error')
    }
  }, 300)

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

  const generateQRCode = () => {
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 11)
    const qrData = `RESIDENT-${timestamp}-${randomStr}`
    
    console.log('🔲 Generated QR Code:', qrData)
    
    setFormData(prev => ({
      ...prev,
      qr_code: qrData
    }))
    
    return qrData
  }

  const handleOpenModal = () => {
    const newQRCode = `RESIDENT-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      address: '',
      qr_code: newQRCode
    })
    setFormErrors({})
    setShowPassword(false)
    setShowConfirmPassword(false)
    
    console.log('📝 Modal opened with QR Code:', newQRCode)
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
      address: '',
      qr_code: ''
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
    } else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(formData.email)) {
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
    
    if (!formData.address.trim()) {
      errors.address = 'Address is required'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      showWarning('Please fill in all required fields correctly', 'Validation Error')
      return
    }
    
    let qrCodeToUse = formData.qr_code
    if (!qrCodeToUse) {
      qrCodeToUse = generateQRCode()
    }
    
    setSubmitting(true)

    try {
      console.log('📤 Creating resident account...')

      const { data: authData, error: authError } = await createResidentAccount(
        formData.email.trim(),
        formData.password,
        { name: formData.name.trim() }
      )

      if (authError) {
        console.error('❌ Auth error:', authError)
        throw new Error(authError.message)
      }

      if (!authData?.user) {
        throw new Error('Failed to create user account')
      }

      console.log('✅ Auth user created:', authData.user.id)

      const { data: residentData, error: residentError } = await supabase
        .from('residents')
        .insert([{
          id: authData.user.id,
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim(),
          qr_code: qrCodeToUse,
          is_active: true,
          created_at: new Date().toISOString()
        }])
        .select()

      if (residentError) {
        console.error('❌ Resident creation error:', residentError)
        throw new Error(residentError.message)
      }

      console.log('✅ Resident account created successfully!')

      // LOG ACTIVITY: Create Resident
      await logActivity({
        action: ACTIONS.CREATE,
        entityType: ENTITIES.RESIDENT,
        entityId: residentData?.[0]?.id,
        entityName: formData.name,
        description: `Created new resident account for "${formData.name}" (${formData.email})`
      })

      showSuccess(
        `Account for "${formData.name}" has been created with login credentials and QR code.`,
        'Resident Account Created'
      )
      
      handleCloseModal()
      fetchResidents()
      
    } catch (error) {
      console.error('❌ Error creating resident account:', error)
      
      let errorMessage = 'Failed to create resident account'
      
      if (error.message.includes('already registered')) {
        errorMessage = 'This email is already registered'
      } else if (error.message.includes('invalid email')) {
        errorMessage = 'Please enter a valid email address'
      } else if (error.message.includes('weak password')) {
        errorMessage = 'Password is too weak. Please use a stronger password'
      } else {
        errorMessage = error.message || errorMessage
      }
      
      showError(errorMessage, 'Creation Failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleViewQR = (resident) => {
    setSelectedResident(resident)
  }

  const handleDeleteResident = async (resident) => {
    await showConfirm({
      title: 'Delete Resident',
      message: (
        <div className="space-y-3 text-left">
          <p>Are you sure you want to delete <strong className="text-gray-900">"{resident.name}"</strong>?</p>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm">
            <p className="font-bold text-red-800 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              This will permanently remove:
            </p>
            <ul className="text-red-700 space-y-1.5 ml-6">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                Resident profile & account
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                Associated QR code
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                Login credentials
              </li>
            </ul>
          </div>
          <p className="text-sm text-gray-500 italic">⚠️ This action cannot be undone.</p>
        </div>
      ),
      type: 'danger',
      confirmText: 'Yes, Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setDeleting(resident.id)

        try {
          const { data: collectionLogs } = await supabase
            .from('collection_logs')
            .select('id')
            .eq('resident_id', resident.id)
            .limit(1)

          const { data: reports } = await supabase
            .from('reports')
            .select('id')
            .eq('resident_id', resident.id)
            .limit(1)

          if ((collectionLogs && collectionLogs.length > 0) || (reports && reports.length > 0)) {
            showWarning(
              'This resident has associated collection logs or reports. Proceeding with deletion...',
              'Data Warning'
            )
          }

          const { error } = await supabase
            .from('residents')
            .delete()
            .eq('id', resident.id)

          if (error) throw error

          setResidents(prev => prev.filter(r => r.id !== resident.id))
          
          if (selectedResident?.id === resident.id) {
            setSelectedResident(null)
          }

          // LOG ACTIVITY: Delete Resident
          await logActivity({
            action: ACTIONS.DELETE,
            entityType: ENTITIES.RESIDENT,
            entityId: resident.id,
            entityName: resident.name,
            description: `Deleted resident "${resident.name}" (${resident.email})`
          })
          
          showSuccess(
            `"${resident.name}" has been permanently removed from the system.`,
            'Resident Deleted'
          )

        } catch (error) {
          console.error('Error deleting resident:', error)
          showError(
            `Failed to delete resident: ${error.message}`,
            'Delete Failed'
          )
        } finally {
          setDeleting(null)
        }
      }
    })
  }

  const handleGenerateQRForExisting = async (resident) => {
    await showConfirm({
      title: 'Generate QR Code',
      message: (
        <div className="text-left">
          <p className="mb-3">Generate a new QR code for <strong className="text-gray-900">"{resident.name}"</strong>?</p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
            <p className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              A unique QR code will be created for waste collection tracking.
            </p>
          </div>
        </div>
      ),
      type: 'info',
      confirmText: 'Generate QR',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          const newQRCode = `RESIDENT-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
          
          console.log('🔲 Generating QR for existing resident:', resident.id)

          const { error } = await supabase
            .from('residents')
            .update({ qr_code: newQRCode })
            .eq('id', resident.id)

          if (error) throw error

          setResidents(prev => prev.map(r => 
            r.id === resident.id 
              ? { ...r, qr_code: newQRCode }
              : r
          ))

          // LOG ACTIVITY: Generate QR Code
          await logActivity({
            action: ACTIONS.GENERATE_QR,
            entityType: ENTITIES.RESIDENT,
            entityId: resident.id,
            entityName: resident.name,
            description: `Generated QR code for resident "${resident.name}"`
          })

          showSuccess(
            `QR code has been generated for "${resident.name}". They can now use it for waste collection.`,
            'QR Code Generated'
          )
          
          fetchResidents()
        } catch (error) {
          console.error('❌ Error generating QR code:', error)
          showError(
            `Failed to generate QR code: ${error.message}`,
            'Generation Failed'
          )
        }
      }
    })
  }

  // Change Password Functions
  const handleOpenChangePassword = (resident) => {
    setChangePasswordResident(resident)
    setChangePasswordData({
      newPassword: '',
      confirmNewPassword: ''
    })
    setChangePasswordErrors({})
    setShowNewPassword(false)
    setShowConfirmNewPassword(false)
    setShowChangePasswordModal(true)
  }

  const handleCloseChangePassword = () => {
    setShowChangePasswordModal(false)
    setChangePasswordResident(null)
    setChangePasswordData({
      newPassword: '',
      confirmNewPassword: ''
    })
    setChangePasswordErrors({})
  }

  const handleChangePasswordInput = (e) => {
    const { name, value } = e.target
    setChangePasswordData(prev => ({
      ...prev,
      [name]: value
    }))
    
    if (changePasswordErrors[name]) {
      setChangePasswordErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const generateRandomPassword = () => {
    const length = 12
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    setChangePasswordData({
      newPassword: password,
      confirmNewPassword: password
    })
    setShowNewPassword(true)
    setShowConfirmNewPassword(true)
    
    showInfo('A secure password has been generated. Make sure to copy it!', 'Password Generated')
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    showSuccess('Password copied to clipboard!', 'Copied')
  }

  const validateChangePassword = () => {
    const errors = {}
    
    if (!changePasswordData.newPassword) {
      errors.newPassword = 'New password is required'
    } else if (changePasswordData.newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters'
    }
    
    if (!changePasswordData.confirmNewPassword) {
      errors.confirmNewPassword = 'Please confirm the new password'
    } else if (changePasswordData.newPassword !== changePasswordData.confirmNewPassword) {
      errors.confirmNewPassword = 'Passwords do not match'
    }
    
    setChangePasswordErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateChangePassword()) {
      showWarning('Please fix the errors before submitting', 'Validation Error')
      return
    }
    
    setChangingPassword(true)

    try {
      console.log('🔐 Changing password for:', changePasswordResident.email)

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/admin/users/${changePasswordResident.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
        },
        body: JSON.stringify({
          password: changePasswordData.newPassword
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update password')
      }

      console.log('✅ Password changed successfully!')

      // LOG ACTIVITY: Change Password
      await logActivity({
        action: ACTIONS.CHANGE_PASSWORD,
        entityType: ENTITIES.RESIDENT,
        entityId: changePasswordResident.id,
        entityName: changePasswordResident.name,
        description: `Changed password for resident "${changePasswordResident.name}"`
      })
      
      showSuccess(
        `Password for "${changePasswordResident.name}" has been updated successfully. Please share the new credentials securely.`,
        'Password Changed'
      )
      
      handleCloseChangePassword()
      
    } catch (error) {
      console.error('❌ Error changing password:', error)
      showError(
        `Failed to change password: ${error.message}`,
        'Update Failed'
      )
    } finally {
      setChangingPassword(false)
    }
  }

  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: 'Enter password', color: 'bg-gray-200' }
    
    let strength = 0
    if (password.length >= 6) strength += 1
    if (password.length >= 8) strength += 1
    if (/[A-Z]/.test(password)) strength += 1
    if (/[0-9]/.test(password)) strength += 1
    if (/[^A-Za-z0-9]/.test(password)) strength += 1
    
    if (strength <= 1) return { strength: 20, label: 'Very Weak', color: 'bg-red-500' }
    if (strength === 2) return { strength: 40, label: 'Weak', color: 'bg-orange-500' }
    if (strength === 3) return { strength: 60, label: 'Fair', color: 'bg-yellow-500' }
    if (strength === 4) return { strength: 80, label: 'Strong', color: 'bg-green-500' }
    return { strength: 100, label: 'Very Strong', color: 'bg-emerald-500' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600 font-medium">Loading residents...</p>
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
            QR Code Management
          </h1>
          <p className="text-gray-600 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Manage residents and generate unique QR codes
          </p>
        </div>
        
        <button
          onClick={handleOpenModal}
          className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span className="font-semibold">Create Resident Account</span>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Total Residents</p>
              <p className="text-4xl font-bold">{residents.length}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
              <span className="text-3xl">👥</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">QR Codes Generated</p>
              <p className="text-4xl font-bold">{residents.filter(r => r.qr_code).length}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
              <span className="text-3xl">📱</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-purple-100 text-sm font-medium mb-1">Active Accounts</p>
              <p className="text-4xl font-bold">{residents.filter(r => r.is_active !== false).length}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
              <span className="text-3xl">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-orange-100 text-sm font-medium mb-1">Missing QR</p>
              <p className="text-4xl font-bold">{residents.filter(r => !r.qr_code).length}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
              <span className="text-3xl">⚠️</span>
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
              placeholder="🔍 Search residents by name, email, or address..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                handleSearch(e.target.value)
              }}
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

      {/* Residents Display */}
      {residents.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-16 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-6 shadow-inner">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No Residents Yet</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Get started by creating your first resident account with login credentials and a unique QR code
          </p>
          <button
            onClick={handleOpenModal}
            className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-8 py-3 rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg font-semibold"
          >
            Create First Resident Account
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {residents.map((resident) => (
            <div key={resident.id} className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2 border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-4">
                <div className="flex items-center justify-between">
                  <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                    <span className="text-3xl">👤</span>
                  </div>
                  <span className={`backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-white ${
                    resident.qr_code 
                      ? 'bg-green-500/80' 
                      : 'bg-red-500/80'
                  }`}>
                    {resident.qr_code ? '✓ Has QR' : '✗ No QR'}
                  </span>
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{resident.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{resident.email}</p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-xl">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>{resident.phone || 'No phone'}</span>
                  </div>
                  
                  <div className="flex items-start gap-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-xl">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="flex-1">{resident.address || 'No address'}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {resident.qr_code ? (
                    <button
                      onClick={() => handleViewQR(resident)}
                      className="flex-1 bg-gradient-to-r from-primary-50 to-primary-100 text-primary-600 py-3 rounded-xl hover:from-primary-100 hover:to-primary-200 transition-all font-semibold flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      View QR
                    </button>
                  ) : (
                    <button
                      onClick={() => handleGenerateQRForExisting(resident)}
                      className="flex-1 bg-gradient-to-r from-orange-50 to-orange-100 text-orange-600 py-3 rounded-xl hover:from-orange-100 hover:to-orange-200 transition-all font-semibold flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Generate QR
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleOpenChangePassword(resident)}
                    className="bg-blue-50 text-blue-600 py-3 px-4 rounded-xl hover:bg-blue-100 transition-all font-semibold flex items-center justify-center"
                    title="Change Password"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => handleDeleteResident(resident)}
                    disabled={deleting === resident.id}
                    className="bg-red-50 text-red-600 py-3 px-4 rounded-xl hover:bg-red-100 transition-all font-semibold flex items-center justify-center disabled:opacity-50"
                    title="Delete Resident"
                  >
                    {deleting === resident.id ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Resident</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Address</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">QR Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {residents.map((resident) => (
                <tr key={resident.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary-100 p-2 rounded-full">
                        <span className="text-xl">👤</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{resident.name}</p>
                        <p className="text-sm text-gray-500">{resident.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{resident.phone || '-'}</td>
                  <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{resident.address || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      resident.qr_code 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {resident.qr_code ? '✓ Has QR' : '✗ No QR'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      {resident.qr_code ? (
                        <button
                          onClick={() => handleViewQR(resident)}
                          className="bg-primary-50 text-primary-600 py-2 px-3 rounded-lg hover:bg-primary-100 transition-all text-sm font-medium"
                        >
                          View QR
                        </button>
                      ) : (
                        <button
                          onClick={() => handleGenerateQRForExisting(resident)}
                          className="bg-orange-50 text-orange-600 py-2 px-3 rounded-lg hover:bg-orange-100 transition-all text-sm font-medium"
                        >
                          Generate
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenChangePassword(resident)}
                        className="bg-blue-50 text-blue-600 py-2 px-3 rounded-lg hover:bg-blue-100 transition-all"
                        title="Change Password"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteResident(resident)}
                        disabled={deleting === resident.id}
                        className="bg-red-50 text-red-600 py-2 px-3 rounded-lg hover:bg-red-100 transition-all disabled:opacity-50"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================== CREATE RESIDENT MODAL ==================== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fadeIn">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Create Resident Account</h2>
                    <p className="text-primary-100 text-sm">Add new resident with login credentials</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-xl transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* QR Code Preview */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 text-center border-2 border-dashed border-gray-200">
                <p className="text-sm text-gray-500 mb-3 font-medium">QR Code Preview</p>
                {formData.qr_code && (
                  <div className="inline-block bg-white p-4 rounded-xl shadow-lg">
                    <QRGenerator value={formData.qr_code} size={120} />
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-3 font-mono bg-gray-200 inline-block px-3 py-1 rounded-full">
                  {formData.qr_code || 'Generating...'}
                </p>
              </div>

              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <span className="bg-primary-100 text-primary-600 p-1.5 rounded-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                  Personal Information
                </h3>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all ${
                      formErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                    placeholder="Enter resident's full name"
                  />
                  {formErrors.name && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all ${
                      formErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                    placeholder="resident@email.com"
                  />
                  {formErrors.email && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formErrors.email}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 pr-12 border-2 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all ${
                          formErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-200'
                        }`}
                        placeholder="Min. 6 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {formErrors.password && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formErrors.password}
                      </p>
                    )}
                    {/* Password Strength */}
                    {formData.password && (
                      <div className="mt-2">
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${getPasswordStrength(formData.password).color}`}
                            style={{ width: `${getPasswordStrength(formData.password).strength}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{getPasswordStrength(formData.password).label}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password *</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 pr-12 border-2 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all ${
                          formErrors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-200'
                        }`}
                        placeholder="Re-enter password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                      >
                        {showConfirmPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                                        {formErrors.confirmPassword && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formErrors.confirmPassword}
                      </p>
                    )}
                    {/* Password Match Indicator */}
                    {formData.confirmPassword && formData.password === formData.confirmPassword && (
                      <p className="mt-1.5 text-sm text-green-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Passwords match
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all ${
                      formErrors.phone ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                    placeholder="09XX XXX XXXX"
                  />
                  {formErrors.phone && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formErrors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Address *</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows={3}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-none ${
                      formErrors.address ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                    placeholder="Enter complete address"
                  />
                  {formErrors.address && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formErrors.address}
                    </p>
                  )}
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-sm text-blue-700">
                    <p className="font-semibold mb-1">Account Information</p>
                    <p>The resident will use their email and password to log in. A unique QR code will be generated for waste collection tracking.</p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      Create Account
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== VIEW QR CODE MODAL ==================== */}
      {selectedResident && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-fadeIn">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">QR Code</h2>
                    <p className="text-primary-100 text-sm">{selectedResident.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedResident(null)}
                  className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-xl transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* QR Code Display */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 text-center mb-6">
                <div className="inline-block bg-white p-6 rounded-2xl shadow-lg">
                  <QRGenerator value={selectedResident.qr_code} size={200} />
                </div>
                <p className="text-xs text-gray-500 mt-4 font-mono bg-white px-4 py-2 rounded-full inline-block shadow-sm">
                  {selectedResident.qr_code}
                </p>
              </div>

              {/* Resident Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="bg-primary-100 p-2 rounded-lg">
                    <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="font-semibold text-gray-900">{selectedResident.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-semibold text-gray-900">{selectedResident.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Address</p>
                    <p className="font-semibold text-gray-900">{selectedResident.address || 'No address'}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    const canvas = document.querySelector('canvas')
                    if (canvas) {
                      const link = document.createElement('a')
                      link.download = `QR-${selectedResident.name.replace(/\s+/g, '-')}.png`
                      link.href = canvas.toDataURL()
                      link.click()
                      showSuccess('QR Code downloaded successfully!', 'Download Complete')
                    }
                  }}
                  className="flex-1 bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 py-3 rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all font-semibold flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
                <button
                  onClick={() => {
                    window.print()
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-200 transition-all font-semibold flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CHANGE PASSWORD MODAL ==================== */}
      {showChangePasswordModal && changePasswordResident && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-fadeIn">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Change Password</h2>
                    <p className="text-blue-100 text-sm">{changePasswordResident.name}</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseChangePassword}
                  className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-xl transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleChangePasswordSubmit} className="p-6 space-y-6">
              {/* Resident Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <span className="text-2xl">👤</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{changePasswordResident.name}</p>
                    <p className="text-sm text-gray-500">{changePasswordResident.email}</p>
                  </div>
                </div>
              </div>

              {/* Generate Random Password Button */}
              <button
                type="button"
                onClick={generateRandomPassword}
                className="w-full bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 px-4 py-3 rounded-xl hover:from-purple-100 hover:to-purple-200 transition-all font-semibold flex items-center justify-center gap-2 border border-purple-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Generate Random Password
              </button>

              {/* New Password Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">New Password *</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    name="newPassword"
                    value={changePasswordData.newPassword}
                    onChange={handleChangePasswordInput}
                    className={`w-full px-4 py-3 pr-20 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                      changePasswordErrors.newPassword ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                    placeholder="Enter new password"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {changePasswordData.newPassword && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(changePasswordData.newPassword)}
                        className="text-gray-400 hover:text-gray-600 p-1"
                        title="Copy password"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      {showNewPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                {changePasswordErrors.newPassword && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {changePasswordErrors.newPassword}
                  </p>
                )}
                {/* Password Strength */}
                {changePasswordData.newPassword && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${getPasswordStrength(changePasswordData.newPassword).color}`}
                        style={{ width: `${getPasswordStrength(changePasswordData.newPassword).strength}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{getPasswordStrength(changePasswordData.newPassword).label}</p>
                  </div>
                )}
              </div>

              {/* Confirm New Password Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm New Password *</label>
                <div className="relative">
                  <input
                    type={showConfirmNewPassword ? 'text' : 'password'}
                    name="confirmNewPassword"
                    value={changePasswordData.confirmNewPassword}
                    onChange={handleChangePasswordInput}
                    className={`w-full px-4 py-3 pr-12 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                      changePasswordErrors.confirmNewPassword ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                    placeholder="Re-enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    {showConfirmNewPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {changePasswordErrors.confirmNewPassword && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {changePasswordErrors.confirmNewPassword}
                  </p>
                )}
                {/* Password Match Indicator */}
                {changePasswordData.confirmNewPassword && changePasswordData.newPassword === changePasswordData.confirmNewPassword && (
                  <p className="mt-1.5 text-sm text-green-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Passwords match
                  </p>
                )}
              </div>

              {/* Warning Box */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="text-sm text-amber-700">
                    <p className="font-semibold mb-1">Important</p>
                    <p>Make sure to securely share the new password with the resident. They will need it to log in.</p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseChangePassword}
                  className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {changingPassword ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Updating...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Update Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default GenerateQR