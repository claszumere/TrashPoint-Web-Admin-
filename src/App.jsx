// src/App.jsx

import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { ToastProvider } from './components/ui/Toast'
import ActivityLog from './pages/ActivityLog'
import LiveChat from './pages/LiveChat'   // 🆕 import Live Chat page

// Pages
import Home from './pages/Home'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Reports from './pages/Reports'
import Map from './pages/Map'
import GenerateQR from './pages/GenerateQR'
import Announcements from './pages/Announcements'
import Schedules from './pages/Schedules'
import Collectors from './pages/Collectors'

// Layout
import Layout from './components/layout/Layout'

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, isAdmin } = useAuth()
  
  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

function App() {
  const { user, isAdmin } = useAuth()

  return (
    <ToastProvider position="top-right">
      <NotificationProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route 
              path="/login" 
              element={user && isAdmin ? <Navigate to="/dashboard" replace /> : <Login />} 
            />

            {/* Protected Admin Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Reports />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/map"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Map />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/generate-qr"
              element={
                <ProtectedRoute>
                  <Layout>
                    <GenerateQR />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/announcements"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Announcements />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/schedules"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Schedules />
                  </Layout>
                </ProtectedRoute>
              }
            />
            {/* Collectors Route */}
            <Route
              path="/collectors"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Collectors />
                  </Layout>
                </ProtectedRoute>
              }
            />
            {/* Activity Log Route */}
            <Route
              path="/activity-log"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ActivityLog />
                  </Layout>
                </ProtectedRoute>
              }
            />
            {/* 🆕 Live Chat Route */}
            <Route
              path="/live-chat"
              element={
                <ProtectedRoute>
                  <Layout>
                    <LiveChat />
                  </Layout>
                </ProtectedRoute>
              }
            />
            {/* Fallback Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </NotificationProvider>
    </ToastProvider>
  )
}

export default App