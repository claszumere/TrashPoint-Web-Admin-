import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'  // ✅ ADD THIS

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>        {/* ✅ ADD THIS - Wrap everything with ThemeProvider */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>        {/* ✅ ADD THIS */}
  </React.StrictMode>,
)