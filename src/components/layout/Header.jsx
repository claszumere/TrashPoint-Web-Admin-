import React from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useNavigate } from 'react-router-dom'

const Header = ({ toggleSidebar }) => {
  const { user, signOut } = useAuth()
  const { darkMode, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [showDropdown, setShowDropdown] = React.useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="bg-white dark:bg-dark-100 shadow-sm border-b border-gray-200 dark:border-dark-200 z-10 transition-colors duration-300">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left: Menu Button & Logo */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={toggleSidebar}
            className="lg:hidden text-gray-600 dark:text-dark-600 hover:text-gray-900 dark:hover:text-dark-800 focus:outline-none transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Logo - Hidden on mobile when sidebar is present */}
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-2xl">♻️</span>
            <span className="text-xl font-bold text-primary-600 dark:text-primary-400">TrashPoint</span>
          </div>
        </div>

        {/* Right: User Menu */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button className="relative text-gray-600 dark:text-dark-600 hover:text-gray-900 dark:hover:text-dark-800 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500"></span>
          </button>

          {/* ✅ ADDED: Dark Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            className="relative p-2 rounded-xl text-gray-600 dark:text-dark-600 hover:bg-gray-100 dark:hover:bg-dark-200 transition-all duration-300 group"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {/* Sun Icon (shown in dark mode) */}
            <svg
              className={`w-6 h-6 transition-all duration-300 ${
                darkMode 
                  ? 'rotate-0 scale-100 text-yellow-400' 
                  : 'rotate-90 scale-0 absolute'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            
            {/* Moon Icon (shown in light mode) */}
            <svg
              className={`w-6 h-6 transition-all duration-300 ${
                darkMode 
                  ? '-rotate-90 scale-0 absolute' 
                  : 'rotate-0 scale-100 text-gray-600 dark:text-dark-600'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
            
            {/* Tooltip */}
            <span className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 dark:bg-dark-200 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-dark-200 rounded-lg px-3 py-2 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="hidden md:block text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-dark-800">
                    {user?.email?.split('@')[0] || 'Admin'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-dark-500">Administrator</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary-600 dark:bg-primary-500 flex items-center justify-center text-white font-bold">
                  {user?.email?.charAt(0).toUpperCase() || 'A'}
                </div>
              </div>
              <svg className="w-4 h-4 text-gray-600 dark:text-dark-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-100 rounded-lg shadow-lg border border-gray-200 dark:border-dark-200 py-1 z-20 transition-colors">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-200">
                    <p className="text-sm font-medium text-gray-900 dark:text-dark-800 truncate">
                      {user?.email || 'admin@trashpoint.com'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-dark-500">Admin Account</p>
                  </div>
                  
                  {/* ✅ ADDED: Dark Mode Toggle in Dropdown */}
                  <button
                    onClick={() => {
                      toggleTheme()
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-dark-700 hover:bg-gray-50 dark:hover:bg-dark-200 flex items-center gap-2 transition-colors"
                  >
                    {darkMode ? (
                      <>
                        <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Light Mode
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                        Dark Mode
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowDropdown(false)
                      navigate('/dashboard')
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-dark-700 hover:bg-gray-50 dark:hover:bg-dark-200 flex items-center gap-2 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Dashboard
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header