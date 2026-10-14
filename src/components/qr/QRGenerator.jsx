import React, { useRef, useState } from 'react'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'

/**
 * QRGenerator Component
 * 
 * Features:
 * - Display QR code (SVG or Canvas)
 * - Download as PNG/SVG
 * - Print QR code
 * - Copy QR data to clipboard
 * - Customizable size, colors, and logo
 * 
 * @param {string} value - The data to encode in the QR code
 * @param {number} size - Size of the QR code in pixels (default: 200)
 * @param {string} level - Error correction level: L, M, Q, H (default: 'M')
 * @param {boolean} showActions - Show download/print/copy buttons (default: false)
 * @param {boolean} showValue - Show the QR code value below (default: false)
 * @param {string} residentName - Resident name for download filename
 * @param {string} bgColor - Background color (default: '#ffffff')
 * @param {string} fgColor - Foreground color (default: '#000000')
 * @param {boolean} includeLogo - Include TrashPoint logo in center (default: true)
 */
const QRGenerator = ({ 
  value, 
  size = 200, 
  level = 'M',
  showActions = false,
  showValue = false,
  residentName = 'resident',
  bgColor = '#ffffff',
  fgColor = '#000000',
  includeLogo = true,
}) => {
  const qrRef = useRef(null)
  const canvasRef = useRef(null)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // ============================================
  // NO QR CODE STATE
  // ============================================
  if (!value) {
    return (
      <div 
        className="flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl border-2 border-dashed border-gray-300"
        style={{ width: size, height: size }}
      >
        <div className="text-center text-gray-500 p-4">
          <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          <p className="text-sm font-medium">No QR Code</p>
          <p className="text-xs text-gray-400 mt-1">Generate a QR code first</p>
        </div>
      </div>
    )
  }

  // ============================================
  // DOWNLOAD AS PNG
  // ============================================
  const downloadAsPNG = async () => {
    setDownloading(true)
    try {
      // Create a temporary canvas for download
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const downloadSize = Math.max(size, 300) // Minimum 300px for good quality
      
      canvas.width = downloadSize + 40 // Add padding
      canvas.height = downloadSize + 80 // Add padding for text
      
      // White background
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Get QR code as image
      const svgElement = qrRef.current?.querySelector('svg')
      if (svgElement) {
        const svgData = new XMLSerializer().serializeToString(svgElement)
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
        const svgUrl = URL.createObjectURL(svgBlob)
        
        const img = new Image()
        img.onload = () => {
          // Draw QR code centered
          ctx.drawImage(img, 20, 20, downloadSize, downloadSize)
          
          // Add TrashPoint branding
          ctx.fillStyle = '#16a34a' // Green color
          ctx.font = 'bold 14px Arial'
          ctx.textAlign = 'center'
          ctx.fillText('TrashPoint', canvas.width / 2, downloadSize + 45)
          
          // Add QR code value (truncated)
          ctx.fillStyle = '#666666'
          ctx.font = '10px Arial'
          const displayValue = value.length > 40 ? value.substring(0, 40) + '...' : value
          ctx.fillText(displayValue, canvas.width / 2, downloadSize + 65)
          
          // Download
          const link = document.createElement('a')
          link.download = `trashpoint-qr-${safeFileName(residentName)}-${Date.now()}.png`
          link.href = canvas.toDataURL('image/png')
          link.click()
          
          URL.revokeObjectURL(svgUrl)
          setDownloading(false)
        }
        img.src = svgUrl
      }
    } catch (error) {
      console.error('Error downloading QR code:', error)
      setDownloading(false)
      alert('Failed to download QR code')
    }
  }

  // ============================================
  // DOWNLOAD AS SVG
  // ============================================
  const downloadAsSVG = () => {
    try {
      const svgElement = qrRef.current?.querySelector('svg')
      if (svgElement) {
        const svgData = new XMLSerializer().serializeToString(svgElement)
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
        const svgUrl = URL.createObjectURL(svgBlob)
        
        const link = document.createElement('a')
        link.download = `trashpoint-qr-${safeFileName(residentName)}-${Date.now()}.svg`
        link.href = svgUrl
        link.click()
        
        URL.revokeObjectURL(svgUrl)
      }
    } catch (error) {
      console.error('Error downloading SVG:', error)
      alert('Failed to download SVG')
    }
  }

  const escapeHtml = (input = '') => String(input)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

  const safeFileName = (input = 'resident') => String(input)
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'resident'

  // ============================================
  // PRINT QR CODE
  // ============================================
  const printQRCode = () => {
    try {
      const svgElement = qrRef.current?.querySelector('svg')
      if (svgElement) {
        const svgData = new XMLSerializer().serializeToString(svgElement)
        const safeResidentName = escapeHtml(residentName)
        const safeValue = escapeHtml(value)
        
        const printWindow = window.open('', '_blank')
        if (!printWindow) {
          alert('Popup blocked. Please allow popups to print QR codes.')
          return
        }

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>TrashPoint QR Code - ${safeResidentName}</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: Arial, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                padding: 20px;
              }
              .qr-container {
                text-align: center;
                padding: 30px;
                border: 2px solid #e5e7eb;
                border-radius: 16px;
                background: white;
              }
              .logo {
                font-size: 24px;
                font-weight: bold;
                color: #16a34a;
                margin-bottom: 20px;
              }
              .logo span {
                color: #374151;
              }
              .qr-code {
                margin: 20px 0;
              }
              .resident-name {
                font-size: 18px;
                font-weight: bold;
                color: #374151;
                margin-top: 15px;
              }
              .qr-value {
                font-size: 10px;
                color: #9ca3af;
                margin-top: 10px;
                word-break: break-all;
                max-width: 300px;
              }
              .instructions {
                font-size: 12px;
                color: #6b7280;
                margin-top: 15px;
                padding: 10px;
                background: #f3f4f6;
                border-radius: 8px;
              }
              @media print {
                body {
                  padding: 0;
                }
                .qr-container {
                  border: none;
                  box-shadow: none;
                }
              }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <div class="logo">♻️ Trash<span>Point</span></div>
              <div class="qr-code">
                ${svgData}
              </div>
              <div class="resident-name">${safeResidentName}</div>
              <div class="qr-value">${safeValue}</div>
              <div class="instructions">
                📱 Scan this QR code during waste collection
              </div>
            </div>
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                }
              }
            </script>
          </body>
          </html>
        `)
        printWindow.document.close()
      }
    } catch (error) {
      console.error('Error printing QR code:', error)
      alert('Failed to print QR code')
    }
  }

  // ============================================
  // COPY QR VALUE TO CLIPBOARD
  // ============================================
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = value
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // ============================================
  // TRASHPOINT LOGO SVG DATA
  // ============================================
  const logoSvg = includeLogo ? {
    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%2316a34a'/%3E%3Ctext x='50' y='65' font-size='40' text-anchor='middle' fill='white'%3E♻%3C/text%3E%3C/svg%3E",
    height: size * 0.18,
    width: size * 0.18,
    excavate: true,
  } : undefined

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="inline-flex flex-col items-center">
      {/* QR Code Display */}
      <div 
        ref={qrRef}
        className="bg-white p-2 rounded-lg shadow-sm"
      >
        <QRCodeSVG
          value={value}
          size={size}
          level={level}
          includeMargin={true}
          bgColor={bgColor}
          fgColor={fgColor}
          imageSettings={logoSvg}
        />
      </div>

      {/* QR Value Display */}
      {showValue && (
        <div className="mt-2 px-3 py-1 bg-gray-100 rounded-lg max-w-full">
          <p className="text-xs text-gray-500 font-mono truncate" style={{ maxWidth: size }}>
            {value}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      {showActions && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {/* Download PNG */}
          <button
            onClick={downloadAsPNG}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            title="Download as PNG"
          >
            {downloading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            PNG
          </button>

          {/* Download SVG */}
          <button
            onClick={downloadAsSVG}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-all shadow-sm hover:shadow-md"
            title="Download as SVG"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            SVG
          </button>

          {/* Print */}
          <button
            onClick={printQRCode}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-all shadow-sm hover:shadow-md"
            title="Print QR Code"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>

          {/* Copy */}
          <button
            onClick={copyToClipboard}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all shadow-sm hover:shadow-md ${
              copied 
                ? 'bg-green-100 text-green-700 border border-green-300' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
            }`}
            title="Copy QR Code Value"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
      )}

      {/* Hidden canvas for PNG generation */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

// ============================================
// ADDITIONAL EXPORT: QR CODE CARD COMPONENT
// ============================================
export const QRCodeCard = ({ 
  value, 
  residentName, 
  residentEmail,
  residentAddress,
  size = 200,
  onPrint,
  onDownload,
  onDelete,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-xl">
              <span className="text-2xl">👤</span>
            </div>
            <div className="text-white">
              <h3 className="font-bold text-lg">{residentName}</h3>
              <p className="text-white/80 text-sm">{residentEmail}</p>
            </div>
          </div>
          {value && (
            <span className="bg-green-500/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-white">
              ✓ Active
            </span>
          )}
        </div>
      </div>

      {/* QR Code */}
      <div className="p-6 flex flex-col items-center">
        <QRGenerator 
          value={value} 
          size={size} 
          residentName={residentName}
          showActions={true}
          showValue={true}
        />

        {/* Address */}
        {residentAddress && (
          <div className="mt-4 flex items-start gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl w-full">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="flex-1">{residentAddress}</span>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {(onPrint || onDownload || onDelete) && (
        <div className="px-6 pb-6 flex gap-2">
          {onPrint && (
            <button
              onClick={onPrint}
              className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-xl hover:bg-blue-100 transition-all font-medium text-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="bg-red-50 text-red-600 py-2 px-4 rounded-xl hover:bg-red-100 transition-all font-medium text-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// HELPER: GENERATE QR CODE STRING
// ============================================
export const generateQRCodeString = () => {
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 11)
  return `RESIDENT-${timestamp}-${randomStr}`
}

// ============================================
// HELPER: VALIDATE QR CODE FORMAT
// ============================================
export const isValidQRCodeFormat = (qrCode) => {
  if (!qrCode || typeof qrCode !== 'string') return false
  const regex = /^RESIDENT-\d+-[a-z0-9]+$/
  return regex.hasMatch ? regex.hasMatch(qrCode) : regex.test(qrCode)
}

export default QRGenerator