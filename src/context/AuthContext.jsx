// src/context/AuthContext.jsx

import React, { createContext, useState, useEffect, useContext, useRef } from 'react'
import { supabase, getCurrentUser, signIn as supabaseSignIn, signOut as supabaseSignOut } from '../services/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  
  // 🆕 Renamed: Flag to prevent auth state changes during user creation (resident or collector)
  const isCreatingUser = useRef(false)
  // Store admin session for restoration
  const adminSession = useRef(null)

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { user: currentUser } = await getCurrentUser()
        setUser(currentUser)
        
        if (currentUser) {
          setIsAdmin(true)
          // Store session
          const { data } = await supabase.auth.getSession()
          if (data?.session) {
            adminSession.current = data.session
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth event:', event)
        
        // 🆕 CRITICAL: Ignore auth changes while creating any user (resident or collector)
        if (isCreatingUser.current) {
          console.log('⏭️ Ignoring auth change - user creation in progress')
          return
        }

        if (event === 'SIGNED_IN') {
          const currentUser = session?.user ?? null
          setUser(currentUser)
          setIsAdmin(!!currentUser)
          if (session) {
            adminSession.current = session
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setIsAdmin(false)
          adminSession.current = null
        } else if (event === 'TOKEN_REFRESHED' && session) {
          adminSession.current = session
        }
        
        setLoading(false)
      }
    )

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabaseSignIn(email, password)
      if (error) throw error
      
      setUser(data.user)
      setIsAdmin(true)
      
      const { data: sessionData } = await supabase.auth.getSession()
      if (sessionData?.session) {
        adminSession.current = sessionData.session
      }
      
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabaseSignOut()
      if (error) throw error
      
      setUser(null)
      setIsAdmin(false)
      adminSession.current = null
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  // Function to create resident WITHOUT affecting admin session
  const createResidentAccount = async (email, password, userData) => {
    console.log('🚀 Creating resident account...')
    
    // Set flag to ignore auth changes
    isCreatingUser.current = true
    
    // Store current admin session
    const currentAdminSession = adminSession.current
    
    try {
      // Create the new resident auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            role: 'resident',
            full_name: userData?.name || ''
          }
        }
      })

      if (authError) {
        throw authError
      }

      if (!authData.user) {
        throw new Error('Failed to create user account')
      }

      console.log('✅ Resident auth created:', authData.user.id)

      // IMMEDIATELY restore admin session
      if (currentAdminSession) {
        console.log('🔄 Restoring admin session...')
        
        await supabase.auth.setSession({
          access_token: currentAdminSession.access_token,
          refresh_token: currentAdminSession.refresh_token
        })
        
        console.log('✅ Admin session restored!')
      }

      return { data: authData, error: null }

    } catch (error) {
      console.error('❌ Error creating resident:', error)
      
      // Ensure admin session is restored even on error
      if (currentAdminSession) {
        await supabase.auth.setSession({
          access_token: currentAdminSession.access_token,
          refresh_token: currentAdminSession.refresh_token
        })
      }
      
      return { data: null, error }
    } finally {
      // Reset flag after a delay
      setTimeout(() => {
        isCreatingUser.current = false
        console.log('🏁 Resident creation flag reset')
      }, 2000)
    }
  }

  // 🆕 Function to create collector WITHOUT affecting admin session
  const createCollectorAccount = async (email, password, userData) => {
    console.log('🚀 Creating collector account...')
    
    // Set flag to ignore auth changes
    isCreatingUser.current = true
    
    // Store current admin session
    const currentAdminSession = adminSession.current
    
    try {
      // Create the new collector auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            role: 'collector',
            full_name: userData?.name || ''
          }
        }
      })

      if (authError) {
        throw authError
      }

      if (!authData.user) {
        throw new Error('Failed to create user account')
      }

      console.log('✅ Collector auth created:', authData.user.id)

      // IMMEDIATELY restore admin session
      if (currentAdminSession) {
        console.log('🔄 Restoring admin session...')
        
        await supabase.auth.setSession({
          access_token: currentAdminSession.access_token,
          refresh_token: currentAdminSession.refresh_token
        })
        
        console.log('✅ Admin session restored!')
      }

      return { data: authData, error: null }

    } catch (error) {
      console.error('❌ Error creating collector:', error)
      
      // Ensure admin session is restored even on error
      if (currentAdminSession) {
        await supabase.auth.setSession({
          access_token: currentAdminSession.access_token,
          refresh_token: currentAdminSession.refresh_token
        })
      }
      
      return { data: null, error }
    } finally {
      // Reset flag after a delay
      setTimeout(() => {
        isCreatingUser.current = false
        console.log('🏁 Collector creation flag reset')
      }, 2000)
    }
  }

  const value = {
    user,
    isAdmin,
    loading,
    signIn,
    signOut,
    createResidentAccount,
    createCollectorAccount,  // 🆕 Added
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}