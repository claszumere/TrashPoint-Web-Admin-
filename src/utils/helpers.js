// src/utils/helpers.js

// ============================================================
// ✅ CONSTANTS
// ============================================================

// All individual trash types
export const ALL_INDIVIDUAL_TYPES = ['Biodegradable', 'Non-Biodegradable', 'Recyclable', 'Hazardous'];

// Type selection categories
export const TYPE_SELECTION_CATEGORIES = {
  ALL_TYPES: 'all-types',
  MULTIPLE: 'multiple',
  SINGLE: 'single'
};

// Color palette for all trash types and categories
export const TRASH_TYPE_COLORS = {
  // Individual types
  'Biodegradable': '#22c55e',
  'Non-Biodegradable': '#3b82f6',
  'Recyclable': '#f97316',
  'Hazardous': '#ef4444',
  'Hazard': '#ef4444',
  'Non-Recyclable': '#f59e0b',
  
  // Multi-type categories
  'All Types': '#8b5cf6',
  'all-types': '#8b5cf6',
  'Multiple Types': '#6366f1',
  'multiple': '#6366f1',
  'Single Type': '#64748b',
  'single': '#64748b',
  
  // Default
  'Unknown': '#9ca3af',
};

// Icon mapping
export const TRASH_TYPE_ICONS = {
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
  'Unknown': '📋',
};

// ============================================================
// ✅ MULTI-SELECT TRASH TYPE HELPERS
// ============================================================

/**
 * Parse trash_type which can be JSON array or single string
 * @param {string|array} trashType - The trash type value (can be JSON string or array)
 * @returns {array} - Array of trash types
 */
export const parseTrashTypes = (trashType) => {
  if (!trashType) return [];
  
  // If already an array, return it
  if (Array.isArray(trashType)) {
    return trashType;
  }
  
  // Try to parse as JSON
  try {
    const parsed = JSON.parse(trashType);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [String(parsed)];
  } catch {
    // Not JSON, return as single item array
    return [trashType];
  }
};

/**
 * Check if all individual types are selected
 * @param {string|array} trashType - The trash type value
 * @returns {boolean}
 */
export const isAllTypesSelected = (trashType) => {
  const types = parseTrashTypes(trashType);
  if (!types || types.length === 0) return false;
  
  return ALL_INDIVIDUAL_TYPES.every(t => 
    types.some(type => type.toLowerCase() === t.toLowerCase())
  );
};

/**
 * Check if a specific type is included in the trash types
 * @param {string|array} trashTypeField - The trash type field value
 * @param {string} targetType - The type to check for
 * @returns {boolean}
 */
export const hasTrashType = (trashTypeField, targetType) => {
  const types = parseTrashTypes(trashTypeField);
  return types.some(t => t.toLowerCase() === targetType.toLowerCase());
};

/**
 * Get the type selection category (all-types, multiple, single)
 * @param {string|array} trashType - The trash type value
 * @returns {string} - 'all-types', 'multiple', or 'single'
 */
export const getTypeSelectionCategory = (trashType) => {
  const types = parseTrashTypes(trashType);
  
  if (types.length === 0) return 'single';
  if (isAllTypesSelected(types)) return TYPE_SELECTION_CATEGORIES.ALL_TYPES;
  if (types.length > 1) return TYPE_SELECTION_CATEGORIES.MULTIPLE;
  return TYPE_SELECTION_CATEGORIES.SINGLE;
};

/**
 * Get count of types selected
 * @param {string|array} trashType - The trash type value
 * @returns {number}
 */
export const getTypesCount = (trashType) => {
  return parseTrashTypes(trashType).length;
};

/**
 * Format types for display (e.g., "3 Types" or "All Types")
 * @param {string|array} trashType - The trash type value
 * @returns {string}
 */
export const formatTypesForDisplay = (trashType) => {
  const types = parseTrashTypes(trashType);
  
  if (types.length === 0) return 'Unknown';
  if (isAllTypesSelected(types)) return 'All Types';
  if (types.length === 1) return types[0];
  return `${types.length} Types`;
};

/**
 * Convert types array to JSON string for storage
 * @param {array} typesArray - Array of trash types
 * @returns {string} - JSON string
 */
export const typesToJson = (typesArray) => {
  if (!typesArray || typesArray.length === 0) return null;
  if (typesArray.length === 1) return typesArray[0]; // Store single type as string
  return JSON.stringify(typesArray);
};

/**
 * Check if trash type value represents multiple selections
 * @param {string|array} trashType - The trash type value
 * @returns {boolean}
 */
export const isMultipleTypes = (trashType) => {
  const types = parseTrashTypes(trashType);
  return types.length > 1 && !isAllTypesSelected(types);
};

/**
 * Check if trash type value represents a single selection
 * @param {string|array} trashType - The trash type value
 * @returns {boolean}
 */
export const isSingleType = (trashType) => {
  const types = parseTrashTypes(trashType);
  return types.length === 1;
};

/**
 * Get types breakdown from an array of reports
 * @param {array} reports - Array of report objects
 * @returns {object} - Breakdown object { Biodegradable: 5, ... }
 */
export const getTypesBreakdown = (reports) => {
  const breakdown = {};
  
  reports.forEach(report => {
    const types = parseTrashTypes(report.trash_type);
    types.forEach(type => {
      breakdown[type] = (breakdown[type] || 0) + 1;
    });
  });
  
  return breakdown;
};

/**
 * Get type selection stats from an array of reports
 * @param {array} reports - Array of report objects
 * @returns {object} - { allTypesCount, multipleTypesCount, singleTypeCount }
 */
export const getTypeSelectionStats = (reports) => {
  let allTypesCount = 0;
  let multipleTypesCount = 0;
  let singleTypeCount = 0;
  
  reports.forEach(report => {
    const category = getTypeSelectionCategory(report.trash_type);
    
    if (category === TYPE_SELECTION_CATEGORIES.ALL_TYPES) {
      allTypesCount++;
    } else if (category === TYPE_SELECTION_CATEGORIES.MULTIPLE) {
      multipleTypesCount++;
    } else {
      singleTypeCount++;
    }
  });
  
  return { allTypesCount, multipleTypesCount, singleTypeCount };
};

/**
 * Filter reports by type selection category
 * @param {array} reports - Array of report objects
 * @param {string} category - 'all-types', 'multiple', 'single', or 'all'
 * @returns {array}
 */
export const filterByTypeSelection = (reports, category) => {
  if (category === 'all') return reports;
  
  return reports.filter(report => {
    const reportCategory = getTypeSelectionCategory(report.trash_type);
    return reportCategory === category;
  });
};

/**
 * Filter reports that contain a specific trash type
 * @param {array} reports - Array of report objects
 * @param {string} targetType - Type to filter by
 * @returns {array}
 */
export const filterByContainsType = (reports, targetType) => {
  return reports.filter(report => hasTrashType(report.trash_type, targetType));
};

// ============================================================
// ✅ DATE & TIME HELPERS
// ============================================================

/**
 * Format date to readable string with Philippine Timezone
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return date.toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Format date to simple date with Philippine Timezone
 */
export const formatSimpleDate = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return date.toLocaleDateString('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Format time only with Philippine Timezone
 */
export const formatTime = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'Invalid Time';
    }
    
    return date.toLocaleTimeString('en-PH', {
      timeZone: 'Asia/Manila',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'Invalid Time';
  }
};

/**
 * Format relative time (e.g., "2 hours ago", "Just now")
 */
export const formatRelativeTime = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return formatSimpleDate(dateString);
    }
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'Invalid Date';
  }
};

/**
 * Format full date with day name
 */
export const formatFullDate = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return date.toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting full date:', error);
    return 'Invalid Date';
  }
};

/**
 * Check if date is today (Philippine Time)
 */
export const isToday = (dateString) => {
  if (!dateString) return false;
  
  try {
    const date = new Date(dateString);
    const today = new Date();
    
    const dateInPH = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const todayInPH = new Date(today.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    
    return (
      dateInPH.getDate() === todayInPH.getDate() &&
      dateInPH.getMonth() === todayInPH.getMonth() &&
      dateInPH.getFullYear() === todayInPH.getFullYear()
    );
  } catch (error) {
    return false;
  }
};

/**
 * Get current Philippine time
 */
export const getCurrentPHTime = () => {
  return new Date().toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

// ============================================================
// ✅ TRASH TYPE STYLING HELPERS
// ============================================================

/**
 * Get trash type color (Tailwind classes)
 * Supports both single types and type selection categories
 */
export const getTrashTypeColor = (trashType) => {
  // First check if it's a multi-type field
  const types = parseTrashTypes(trashType);
  
  if (isAllTypesSelected(types)) {
    return 'bg-purple-100 text-purple-800';
  }
  
  if (types.length > 1) {
    return 'bg-indigo-100 text-indigo-800';
  }
  
  // Single type or category name
  const type = (types[0] || trashType)?.toLowerCase();
  
  switch (type) {
    case 'all types':
    case 'all-types':
      return 'bg-purple-100 text-purple-800';
    case 'multiple types':
    case 'multiple':
      return 'bg-indigo-100 text-indigo-800';
    case 'single type':
    case 'single':
      return 'bg-gray-100 text-gray-800';
    case 'biodegradable':
      return 'bg-green-100 text-green-800';
    case 'non-biodegradable':
      return 'bg-blue-100 text-blue-800';
    case 'recyclable':
      return 'bg-orange-100 text-orange-800';
    case 'non-recyclable':
      return 'bg-amber-100 text-amber-800';
    case 'hazard':
    case 'hazardous':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Get trash type badge color for gradients
 */
export const getTrashTypeBadgeColor = (trashType) => {
  const types = parseTrashTypes(trashType);
  
  if (isAllTypesSelected(types)) {
    return 'from-purple-100 to-indigo-100 text-purple-700 border-purple-300';
  }
  
  if (types.length > 1) {
    return 'from-indigo-100 to-blue-100 text-indigo-700 border-indigo-300';
  }
  
  const type = (types[0] || trashType)?.toLowerCase();
  
  switch (type) {
    case 'all types':
    case 'all-types':
      return 'from-purple-100 to-indigo-100 text-purple-700 border-purple-300';
    case 'multiple types':
    case 'multiple':
      return 'from-indigo-100 to-blue-100 text-indigo-700 border-indigo-300';
    case 'biodegradable':
      return 'from-green-100 to-green-200 text-green-700 border-green-300';
    case 'non-biodegradable':
      return 'from-blue-100 to-blue-200 text-blue-700 border-blue-300';
    case 'recyclable':
      return 'from-orange-100 to-orange-200 text-orange-700 border-orange-300';
    case 'non-recyclable':
      return 'from-amber-100 to-amber-200 text-amber-700 border-amber-300';
    case 'hazard':
    case 'hazardous':
      return 'from-red-100 to-red-200 text-red-700 border-red-300';
    default:
      return 'from-gray-100 to-gray-200 text-gray-700 border-gray-300';
  }
};

/**
 * Get trash type icon
 */
export const getTrashTypeIcon = (trashType) => {
  const types = parseTrashTypes(trashType);
  
  if (isAllTypesSelected(types)) {
    return '⭐';
  }
  
  if (types.length > 1) {
    return '🔢';
  }
  
  const type = (types[0] || trashType)?.toLowerCase();
  
  switch (type) {
    case 'all types':
    case 'all-types':
      return '⭐';
    case 'multiple types':
    case 'multiple':
      return '🔢';
    case 'single type':
    case 'single':
      return '1️⃣';
    case 'biodegradable':
      return '🌿';
    case 'non-biodegradable':
      return '📦';
    case 'recyclable':
      return '♻️';
    case 'non-recyclable':
      return '🟡';
    case 'hazard':
    case 'hazardous':
      return '☢️';
    default:
      return '📋';
  }
};

/**
 * Get hex color for trash type (useful for charts and inline styles)
 */
export const getTrashTypeHexColor = (trashType) => {
  const types = parseTrashTypes(trashType);
  
  if (isAllTypesSelected(types)) {
    return '#8b5cf6'; // Purple
  }
  
  if (types.length > 1) {
    return '#6366f1'; // Indigo
  }
  
  const type = (types[0] || trashType)?.toLowerCase();
  
  switch (type) {
    case 'all types':
    case 'all-types':
      return '#8b5cf6'; // Purple
    case 'multiple types':
    case 'multiple':
      return '#6366f1'; // Indigo
    case 'single type':
    case 'single':
      return '#64748b'; // Gray
    case 'biodegradable':
      return '#22c55e'; // Green
    case 'non-biodegradable':
      return '#3b82f6'; // Blue
    case 'recyclable':
      return '#f97316'; // Orange
    case 'non-recyclable':
      return '#f59e0b'; // Amber
    case 'hazard':
    case 'hazardous':
      return '#ef4444'; // Red
    default:
      return '#6b7280'; // Gray
  }
};

/**
 * Get map marker color
 */
export const getMarkerColor = (trashType) => {
  return getTrashTypeHexColor(trashType);
};

/**
 * Get Tailwind background color class
 */
export const getTrashTypeBgClass = (trashType) => {
  const types = parseTrashTypes(trashType);
  
  if (isAllTypesSelected(types)) {
    return 'bg-purple-500';
  }
  
  if (types.length > 1) {
    return 'bg-indigo-500';
  }
  
  const type = (types[0] || trashType)?.toLowerCase();
  
  switch (type) {
    case 'all types':
    case 'all-types':
      return 'bg-purple-500';
    case 'multiple types':
    case 'multiple':
      return 'bg-indigo-500';
    case 'biodegradable':
      return 'bg-green-500';
    case 'non-biodegradable':
      return 'bg-blue-500';
    case 'recyclable':
      return 'bg-orange-500';
    case 'non-recyclable':
      return 'bg-amber-500';
    case 'hazard':
    case 'hazardous':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
};

/**
 * Get Tailwind text color class
 */
export const getTrashTypeTextClass = (trashType) => {
  const types = parseTrashTypes(trashType);
  
  if (isAllTypesSelected(types)) {
    return 'text-purple-600';
  }
  
  if (types.length > 1) {
    return 'text-indigo-600';
  }
  
  const type = (types[0] || trashType)?.toLowerCase();
  
  switch (type) {
    case 'all types':
    case 'all-types':
      return 'text-purple-600';
    case 'multiple types':
    case 'multiple':
      return 'text-indigo-600';
    case 'biodegradable':
      return 'text-green-600';
    case 'non-biodegradable':
      return 'text-blue-600';
    case 'recyclable':
      return 'text-orange-600';
    case 'non-recyclable':
      return 'text-amber-600';
    case 'hazard':
    case 'hazardous':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

/**
 * Get Tailwind border color class
 */
export const getTrashTypeBorderClass = (trashType) => {
  const types = parseTrashTypes(trashType);
  
  if (isAllTypesSelected(types)) {
    return 'border-purple-300';
  }
  
  if (types.length > 1) {
    return 'border-indigo-300';
  }
  
  const type = (types[0] || trashType)?.toLowerCase();
  
  switch (type) {
    case 'all types':
    case 'all-types':
      return 'border-purple-300';
    case 'multiple types':
    case 'multiple':
      return 'border-indigo-300';
    case 'biodegradable':
      return 'border-green-300';
    case 'non-biodegradable':
      return 'border-blue-300';
    case 'recyclable':
      return 'border-orange-300';
    case 'non-recyclable':
      return 'border-amber-300';
    case 'hazard':
    case 'hazardous':
      return 'border-red-300';
    default:
      return 'border-gray-300';
  }
};

/**
 * Get Tailwind ring color class (for focus/highlight)
 */
export const getTrashTypeRingClass = (trashType) => {
  const types = parseTrashTypes(trashType);
  
  if (isAllTypesSelected(types)) {
    return 'ring-purple-300';
  }
  
  if (types.length > 1) {
    return 'ring-indigo-300';
  }
  
  const type = (types[0] || trashType)?.toLowerCase();
  
  switch (type) {
    case 'all types':
    case 'all-types':
      return 'ring-purple-300';
    case 'multiple types':
    case 'multiple':
      return 'ring-indigo-300';
    case 'biodegradable':
      return 'ring-green-300';
    case 'non-biodegradable':
      return 'ring-blue-300';
    case 'recyclable':
      return 'ring-orange-300';
    case 'hazard':
    case 'hazardous':
      return 'ring-red-300';
    default:
      return 'ring-gray-300';
  }
};

/**
 * Get complete trash type style object (for inline styles)
 */
export const getTrashTypeStyles = (trashType) => {
  const color = getTrashTypeHexColor(trashType);
  return {
    backgroundColor: `${color}20`, // 20% opacity
    color: color,
    borderColor: `${color}50`, // 50% opacity
  };
};

/**
 * Get all available trash types configuration
 */
export const getAllTrashTypes = () => {
  return [
    { value: 'All Types', label: 'All Types', icon: '⭐', color: '#8b5cf6', category: 'selection' },
    { value: 'Biodegradable', label: 'Biodegradable', icon: '🌿', color: '#22c55e', category: 'type' },
    { value: 'Non-Biodegradable', label: 'Non-Biodegradable', icon: '📦', color: '#3b82f6', category: 'type' },
    { value: 'Recyclable', label: 'Recyclable', icon: '♻️', color: '#f97316', category: 'type' },
    { value: 'Hazardous', label: 'Hazardous', icon: '☢️', color: '#ef4444', category: 'type' },
  ];
};

/**
 * Get type selection options (for filters)
 */
export const getTypeSelectionOptions = () => {
  return [
    { value: 'all', label: 'Any Selection', icon: '📋', color: '#6b7280' },
    { value: 'all-types', label: 'All Types (4)', icon: '⭐', color: '#8b5cf6' },
    { value: 'multiple', label: 'Multiple (2-3)', icon: '🔢', color: '#6366f1' },
    { value: 'single', label: 'Single Type', icon: '1️⃣', color: '#64748b' },
  ];
};

/**
 * Get trash type configuration by value
 */
export const getTrashTypeConfig = (trashType) => {
  const types = getAllTrashTypes();
  const type = (trashType || '').toLowerCase();
  
  // Check for selection categories first
  if (type === 'all types' || type === 'all-types') {
    return { value: 'All Types', label: 'All Types', icon: '⭐', color: '#8b5cf6' };
  }
  if (type === 'multiple types' || type === 'multiple') {
    return { value: 'Multiple Types', label: 'Multiple Types', icon: '🔢', color: '#6366f1' };
  }
  
  return types.find(t => t.value.toLowerCase() === type) || {
    value: trashType || 'Unknown',
    label: trashType || 'Unknown',
    icon: '📋',
    color: '#6b7280'
  };
};

// ============================================================
// ✅ STATUS HELPERS
// ============================================================

/**
 * Get status color classes
 */
export const getStatusColor = (status) => {
  const statusLower = status?.toLowerCase();
  switch (statusLower) {
    case 'active':
    case 'completed':
    case 'resolved':
    case 'approved':
    case 'collected':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'pending':
    case 'reviewing':
    case 'in-progress':
    case 'scheduled':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'inactive':
    case 'cancelled':
    case 'rejected':
    case 'reported':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

/**
 * Get status icon
 */
export const getStatusIcon = (status) => {
  const statusLower = status?.toLowerCase();
  switch (statusLower) {
    case 'active':
    case 'completed':
    case 'resolved':
    case 'approved':
    case 'collected':
      return '✅';
    case 'pending':
    case 'reviewing':
    case 'in-progress':
    case 'scheduled':
      return '⏳';
    case 'inactive':
    case 'cancelled':
    case 'rejected':
    case 'reported':
      return '🔴';
    default:
      return '⚪';
  }
};

// ============================================================
// ✅ VALIDATION HELPERS
// ============================================================

/**
 * Generate random bin ID
 */
export const generateBinId = () => {
  const prefix = 'BIN';
  const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${randomNum}`;
};

/**
 * Validate email
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (Philippine format)
 */
export const isValidPhone = (phone) => {
  const phoneRegex = /^(\+63|0)?9\d{9}$/;
  const cleanedPhone = phone?.replace(/[\s-]/g, '');
  return phoneRegex.test(cleanedPhone);
};

/**
 * Generate unique ID
 */
export const generateUniqueId = (prefix = 'ID') => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${randomStr}`.toUpperCase();
};

// ============================================================
// ✅ TEXT HELPERS
// ============================================================

/**
 * Truncate text
 */
export const truncateText = (text, maxLength) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Capitalize first letter of each word
 */
export const capitalizeWords = (str) => {
  if (!str) return '';
  return str.replace(/\b\w/g, char => char.toUpperCase());
};

/**
 * Format number with commas
 */
export const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// ============================================================
// ✅ DATA HELPERS
// ============================================================

/**
 * Calculate percentage
 */
export const calculatePercentage = (value, total) => {
  if (total === 0) return 0;
  return ((value / total) * 100).toFixed(1);
};

/**
 * Sort data by field
 */
export const sortData = (data, field, order = 'asc') => {
  return [...data].sort((a, b) => {
    if (order === 'asc') {
      return a[field] > b[field] ? 1 : -1;
    } else {
      return a[field] < b[field] ? 1 : -1;
    }
  });
};

/**
 * Filter data by search term
 */
export const filterBySearch = (data, searchTerm, fields) => {
  if (!searchTerm) return data;
  
  const lowerSearch = searchTerm.toLowerCase();
  return data.filter(item => 
    fields.some(field => {
      const value = item[field];
      
      // Handle trash_type field specially (might be JSON array)
      if (field === 'trash_type') {
        const types = parseTrashTypes(value);
        return types.some(t => t.toLowerCase().includes(lowerSearch));
      }
      
      return value?.toString().toLowerCase().includes(lowerSearch);
    })
  );
};

/**
 * Debounce function
 */
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Sleep/delay function
 */
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================
// ✅ CLIPBOARD & DOWNLOAD HELPERS
// ============================================================

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * Download data as JSON file
 */
export const downloadAsJSON = (data, filename = 'data.json') => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Download data as CSV file
 * Handles multi-type trash_type field
 */
export const downloadAsCSV = (data, filename = 'data.csv') => {
  if (!data || data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        let value = row[header];
        
        // Special handling for trash_type (might be JSON array)
        if (header === 'trash_type') {
          const types = parseTrashTypes(value);
          value = types.join('; ');
        }
        
        const strValue = value?.toString() || '';
        return strValue.includes(',') || strValue.includes('"') 
          ? `"${strValue.replace(/"/g, '""')}"` 
          : strValue;
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ============================================================
// ✅ CHART HELPERS
// ============================================================

/**
 * Chart colors constant
 */
export const chartColors = {
  // Multi-type categories
  allTypes: '#8b5cf6',
  multipleTypes: '#6366f1',
  singleType: '#64748b',
  
  // Individual types
  biodegradable: '#22c55e',
  nonBiodegradable: '#3b82f6',
  recyclable: '#f97316',
  nonRecyclable: '#f59e0b',
  hazard: '#ef4444',
  hazardous: '#ef4444',
  
  // Sources
  violation: '#ef4444',
  collection: '#3b82f6',
  
  // Status
  reported: '#ef4444',
  reviewing: '#f59e0b',
  resolved: '#22c55e',
};

/**
 * Get chart data from reports with multi-type support
 */
export const getChartDataFromReports = (reports, includeMultiTypeCategories = true) => {
  const typeBreakdown = getTypesBreakdown(reports);
  const selectionStats = getTypeSelectionStats(reports);
  
  const result = [];
  
  // Add multi-type categories if requested
  if (includeMultiTypeCategories) {
    if (selectionStats.allTypesCount > 0) {
      result.push({
        name: 'All Types',
        value: selectionStats.allTypesCount,
        color: chartColors.allTypes,
        percentage: calculatePercentage(selectionStats.allTypesCount, reports.length)
      });
    }
    if (selectionStats.multipleTypesCount > 0) {
      result.push({
        name: 'Multiple Types',
        value: selectionStats.multipleTypesCount,
        color: chartColors.multipleTypes,
        percentage: calculatePercentage(selectionStats.multipleTypesCount, reports.length)
      });
    }
  }
  
  // Add individual types
  Object.entries(typeBreakdown).forEach(([type, count]) => {
    result.push({
      name: type,
      value: count,
      color: getTrashTypeHexColor(type),
      percentage: calculatePercentage(count, reports.length)
    });
  });
  
  return result.sort((a, b) => b.value - a.value);
};

// ============================================================
// ✅ LEGACY SUPPORT (for backward compatibility)
// ============================================================

/**
 * Check if trash type is "All Types" (legacy function name)
 */
export const isAllTypes = (trashType) => {
  const types = parseTrashTypes(trashType);
  return isAllTypesSelected(types);
};

// Export constants for external use
export default {
  ALL_INDIVIDUAL_TYPES,
  TYPE_SELECTION_CATEGORIES,
  TRASH_TYPE_COLORS,
  TRASH_TYPE_ICONS,
  chartColors,
};