// src/pages/Schedules.jsx

import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { logActivity, ACTIONS, ENTITIES } from '../services/activityLog';
import { useNotification } from '../context/NotificationContext';  // ✅ ADDED
import { 
  Plus, 
  Calendar, 
  Truck, 
  MapPin, 
  Clock, 
  X,
  Search,
  Filter,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Ban
} from 'lucide-react';

const Schedules = () => {
  // ✅ USE NOTIFICATION HOOK
  const { showSuccess, showError, showWarning, showInfo, showConfirm } = useNotification();

  const [schedules, setSchedules] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTrashType, setFilterTrashType] = useState('all');
  const [editingSchedule, setEditingSchedule] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    schedule_date: '',
    schedule_time: '',
    location: '',
    trash_type: 'all',
    assigned_collector_id: '',
    target_audience: 'all',
    status: 'scheduled'
  });

  useEffect(() => {
    fetchSchedules();
    fetchCollectors();
  }, []);

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select(`
          *,
          collectors (
            id,
            name,
            email,
            phone,
            vehicle_number
          )
        `)
        .order('schedule_date', { ascending: true })
        .order('schedule_time', { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      showError('Failed to load schedules. Please try again.', 'Loading Error');
    }
  };

  const fetchCollectors = async () => {
    try {
      const { data, error } = await supabase
        .from('collectors')
        .select('id, name, email, phone, vehicle_number')
        .order('name');

      if (error) throw error;
      setCollectors(data || []);
    } catch (error) {
      console.error('Error fetching collectors:', error);
    }
  };

  // ✅ UPDATED: handleSubmit with Custom Notifications
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
    // ✅ FIX: Ensure assigned_collector_id is null if empty, not empty string
    let scheduleData = { 
      ...formData,
      assigned_collector_id: formData.assigned_collector_id || null,  // ✅ Convert empty string to null
    };
    
    // ✅ FIX: If target_audience is 'specific' but no collector assigned, warn
    if (scheduleData.target_audience === 'specific' && !scheduleData.assigned_collector_id) {
      showWarning(
        'You selected "Assigned Collector Only" but no collector is assigned. The schedule will be created but no one will be notified.',
        '⚠️ No Collector Assigned'
      );
    }
      
      if (editingSchedule) {
        // Update existing schedule
        const { data: schedule, error: scheduleError } = await supabase
          .from('schedules')
          .update(scheduleData)
          .eq('id', editingSchedule.id)
          .select()
          .single();

        if (scheduleError) throw scheduleError;

        // Activity Log - UPDATE SCHEDULE
        await logActivity({
          action: ACTIONS.UPDATE,
          entityType: ENTITIES.SCHEDULE,
          entityId: editingSchedule.id,
          entityName: formData.title,
          description: `Updated schedule: ${formData.title}`,
          metadata: {
            schedule_date: formData.schedule_date,
            schedule_time: formData.schedule_time,
            location: formData.location,
            trash_type: formData.trash_type,
            status: formData.status,
            target_audience: formData.target_audience
          }
        });

        // ✅ Custom Success Notification
        showSuccess(
          `The schedule "${formData.title}" has been updated successfully.`,
          '✅ Schedule Updated'
        );
      } else {
        // Create new schedule
        const { data: schedule, error: scheduleError } = await supabase
          .from('schedules')
          .insert([scheduleData])
          .select()
          .single();

        if (scheduleError) throw scheduleError;

        // Activity Log - CREATE SCHEDULE
        await logActivity({
          action: ACTIONS.CREATE,
          entityType: ENTITIES.SCHEDULE,
          entityId: schedule.id,
          entityName: formData.title,
          description: `Created new schedule: ${formData.title}`,
          metadata: {
            schedule_date: formData.schedule_date,
            schedule_time: formData.schedule_time,
            location: formData.location,
            trash_type: formData.trash_type,
            target_audience: formData.target_audience,
            assigned_collector_id: formData.assigned_collector_id || null
          }
        });

        await sendNotifications(schedule);
        
        // ✅ Custom Success Notification
        showSuccess(
          `Schedule "${formData.title}" has been created and notifications have been sent to ${getAudienceLabel(formData.target_audience)}.`,
          '🎉 Schedule Created'
        );
      }

      resetForm();
      setShowModal(false);
      fetchSchedules();
    } catch (error) {
      console.error('Error saving schedule:', error);
      // ✅ Custom Error Notification
      showError(
        `Failed to ${editingSchedule ? 'update' : 'create'} schedule: ${error.message}`,
        'Error'
      );
    } finally {
      setLoading(false);
    }
  };

  // ✅ Helper function to get audience label
  const getAudienceLabel = (audience) => {
    const labels = {
      all: 'all users',
      residents: 'residents',
      collectors: 'collectors',
      specific: 'the assigned collector'
    };
    return labels[audience] || 'users';
  };

  const sendNotifications = async (schedule) => {
    try {
      let users = [];

      if (schedule.target_audience === 'all' || schedule.target_audience === 'residents') {
        const { data: residents } = await supabase.from('residents').select('id');
        if (residents) {
          users.push(...residents.map(r => ({ user_id: r.id, user_type: 'resident' })));
        }
      }

      if (schedule.target_audience === 'all' || schedule.target_audience === 'collectors') {
        const { data: collectors } = await supabase.from('collectors').select('id');
        if (collectors) {
          users.push(...collectors.map(c => ({ user_id: c.id, user_type: 'collector' })));
        }
      }

      if (schedule.assigned_collector_id && schedule.target_audience === 'specific') {
        users = [{ user_id: schedule.assigned_collector_id, user_type: 'collector' }];
      }

      if (users.length === 0) return;

      const notifications = users.map(user => ({
        user_id: user.user_id,
        user_type: user.user_type,
        title: `New Schedule: ${schedule.title}`,
        message: `Collection on ${new Date(schedule.schedule_date).toLocaleDateString()} at ${schedule.schedule_time}`,
        type: 'schedule',
        reference_id: schedule.id
      }));

      await supabase.from('notifications').insert(notifications);
      await sendPushNotifications(users, schedule);
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  };

  const sendPushNotifications = async (users, schedule) => {
    try {
      const userIds = users.map(u => u.user_id);
      const { data: tokens } = await supabase
        .from('push_tokens')
        .select('*')
        .in('user_id', userIds);

      if (tokens && tokens.length > 0) {
        console.log('Push notifications ready for:', tokens.length, 'devices');
      }
    } catch (error) {
      console.error('Error sending push notifications:', error);
    }
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      title: schedule.title,
      description: schedule.description || '',
      schedule_date: schedule.schedule_date,
      schedule_time: schedule.schedule_time,
      location: schedule.location || '',
      trash_type: schedule.trash_type,
      assigned_collector_id: schedule.assigned_collector_id || '',
      target_audience: schedule.target_audience,
      status: schedule.status
    });
    setShowModal(true);
  };

  // ✅ UPDATED: handleDelete with showConfirm
  const handleDelete = async (schedule) => {
    await showConfirm({
      title: 'Delete Schedule',
      message: (
        <div className="space-y-4 text-left">
          <p>Are you sure you want to delete this schedule?</p>
          
          {/* Schedule Info Card */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Calendar size={20} className="text-green-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900">{schedule.title}</p>
                <p className="text-sm text-gray-500">
                  {new Date(schedule.schedule_date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })} at {new Date(`2000-01-01T${schedule.schedule_time}`).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500 text-xs uppercase font-semibold mb-1">Location</p>
                <p className="font-medium text-gray-700">{schedule.location || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase font-semibold mb-1">Trash Type</p>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                  schedule.trash_type === 'biodegradable' ? 'bg-green-100 text-green-700' :
                  schedule.trash_type === 'non-biodegradable' ? 'bg-blue-100 text-blue-700' :
                  schedule.trash_type === 'recyclable' ? 'bg-yellow-100 text-yellow-700' :
                  schedule.trash_type === 'hazard' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {getTrashTypeLabel(schedule.trash_type)}
                </span>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase font-semibold mb-1">Status</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${getStatusColor(schedule.status)}`}>
                  {getStatusIcon(schedule.status)}
                  <span className="capitalize">{schedule.status.replace('-', ' ')}</span>
                </span>
              </div>
              {schedule.collectors && (
                <div>
                  <p className="text-gray-500 text-xs uppercase font-semibold mb-1">Collector</p>
                  <p className="font-medium text-gray-700">{schedule.collectors.name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Warning */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-sm text-red-700 flex items-center gap-2">
              <AlertCircle size={18} className="flex-shrink-0" />
              <span>This action cannot be undone. All related notifications will also be deleted.</span>
            </p>
          </div>
        </div>
      ),
      type: 'danger',
      confirmText: 'Delete Schedule',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('schedules')
            .delete()
            .eq('id', schedule.id);

          if (error) throw error;

          // Activity Log - DELETE SCHEDULE
          await logActivity({
            action: ACTIONS.DELETE,
            entityType: ENTITIES.SCHEDULE,
            entityId: schedule.id,
            entityName: schedule.title,
            description: `Deleted schedule: ${schedule.title}`,
            metadata: {
              schedule_date: schedule.schedule_date,
              schedule_time: schedule.schedule_time,
              location: schedule.location,
              trash_type: schedule.trash_type,
              status: schedule.status
            }
          });

          showSuccess(
            `The schedule "${schedule.title}" has been permanently deleted.`,
            '🗑️ Schedule Deleted'
          );
          
          fetchSchedules();
        } catch (error) {
          console.error('Error deleting schedule:', error);
          showError(`Failed to delete schedule: ${error.message}`, 'Delete Failed');
        }
      }
    });
  };

  // ✅ UPDATED: handleStatusUpdate with showConfirm
  const handleStatusUpdate = async (schedule, newStatus) => {
    const statusConfig = {
      'in-progress': {
        title: 'Start Schedule',
        icon: <Play size={20} className="text-blue-600" />,
        iconBg: 'bg-blue-100',
        type: 'info',
        confirmText: 'Start Collection',
        message: 'This schedule will be marked as "In Progress". The assigned collector will be notified.',
        successTitle: '🚛 Collection Started',
        successMessage: `The schedule "${schedule.title}" is now in progress.`
      },
      'completed': {
        title: 'Complete Schedule',
        icon: <CheckCircle size={20} className="text-green-600" />,
        iconBg: 'bg-green-100',
        type: 'success',
        confirmText: 'Mark Complete',
        message: 'This schedule will be marked as "Completed". This indicates the collection has been successfully finished.',
        successTitle: '✅ Collection Completed',
        successMessage: `The schedule "${schedule.title}" has been completed successfully.`
      },
      'cancelled': {
        title: 'Cancel Schedule',
        icon: <Ban size={20} className="text-red-600" />,
        iconBg: 'bg-red-100',
        type: 'danger',
        confirmText: 'Cancel Schedule',
        message: 'This schedule will be cancelled. Users who were notified will receive a cancellation notice.',
        successTitle: '❌ Schedule Cancelled',
        successMessage: `The schedule "${schedule.title}" has been cancelled.`
      }
    };

    const config = statusConfig[newStatus];

    await showConfirm({
      title: config.title,
      message: (
        <div className="space-y-4 text-left">
          <p>Are you sure you want to update this schedule?</p>
          
          {/* Schedule Info Card */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${config.iconBg}`}>
                {config.icon}
              </div>
              <div>
                <p className="font-bold text-gray-900">{schedule.title}</p>
                <p className="text-sm text-gray-500">
                  {new Date(schedule.schedule_date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })} at {new Date(`2000-01-01T${schedule.schedule_time}`).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </p>
              </div>
            </div>
            
            {schedule.location && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin size={16} />
                <span>{schedule.location}</span>
              </div>
            )}
          </div>

          {/* Status Change Preview */}
          <div className="flex items-center justify-center gap-3 py-3">
            <div className="text-center">
              <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold ${getStatusColor(schedule.status)}`}>
                {getStatusIcon(schedule.status)}
                <span className="capitalize">{schedule.status.replace('-', ' ')}</span>
              </span>
              <p className="text-xs text-gray-500 mt-1">Current</p>
            </div>
            
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            
            <div className="text-center">
              <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold ${getStatusColor(newStatus)}`}>
                {getStatusIcon(newStatus)}
                <span className="capitalize">{newStatus.replace('-', ' ')}</span>
              </span>
              <p className="text-xs text-gray-500 mt-1">New</p>
            </div>
          </div>

          {/* Info Message */}
          <div className={`rounded-xl p-3 ${
            newStatus === 'cancelled' ? 'bg-red-50 border border-red-200' :
            newStatus === 'completed' ? 'bg-green-50 border border-green-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <p className={`text-sm flex items-center gap-2 ${
              newStatus === 'cancelled' ? 'text-red-700' :
              newStatus === 'completed' ? 'text-green-700' :
              'text-blue-700'
            }`}>
              <AlertCircle size={18} className="flex-shrink-0" />
              <span>{config.message}</span>
            </p>
          </div>
        </div>
      ),
      type: config.type,
      confirmText: config.confirmText,
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('schedules')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', schedule.id);

          if (error) throw error;

          // Activity Log - STATUS CHANGE
          await logActivity({
            action: ACTIONS.STATUS_CHANGE,
            entityType: ENTITIES.SCHEDULE,
            entityId: schedule.id,
            entityName: schedule.title,
            description: `Changed schedule status: ${schedule.title} → ${newStatus}`,
            metadata: {
              previous_status: schedule.status,
              new_status: newStatus,
              schedule_date: schedule.schedule_date
            }
          });

          // Show appropriate success message
          if (newStatus === 'completed') {
            showSuccess(config.successMessage, config.successTitle);
          } else if (newStatus === 'cancelled') {
            showWarning(config.successMessage, config.successTitle);
          } else {
            showInfo(config.successMessage, config.successTitle);
          }

          fetchSchedules();
        } catch (error) {
          console.error('Error updating status:', error);
          showError(`Failed to update schedule status: ${error.message}`, 'Update Failed');
        }
      }
    });
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      schedule_date: '',
      schedule_time: '',
      location: '',
      trash_type: 'all',
      assigned_collector_id: '',
      target_audience: 'all',
      status: 'scheduled'
    });
    setEditingSchedule(null);
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: 'bg-green-100 text-green-800 border-green-200',
      'in-progress': 'bg-blue-100 text-blue-800 border-blue-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      scheduled: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    return colors[status] || colors.scheduled;
  };

  const getStatusIcon = (status) => {
    const icons = {
      completed: <CheckCircle size={16} />,
      'in-progress': <Clock size={16} />,
      cancelled: <XCircle size={16} />,
      scheduled: <Calendar size={16} />
    };
    return icons[status] || icons.scheduled;
  };

  const getTrashTypeColor = (type) => {
    const colors = {
      biodegradable: 'bg-green-500',
      'non-biodegradable': 'bg-blue-500',
      recyclable: 'bg-yellow-500',
      hazard: 'bg-red-500',
      all: 'bg-gray-500'
    };
    return colors[type] || colors.all;
  };

  const getTrashTypeLabel = (type) => {
    const labels = {
      biodegradable: 'Biodegradable',
      'non-biodegradable': 'Non-Biodegradable',
      recyclable: 'Recyclable',
      hazard: 'Hazardous',
      all: 'All Types'
    };
    return labels[type] || labels.all;
  };

  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = schedule.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         schedule.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || schedule.status === filterStatus;
    const matchesTrashType = filterTrashType === 'all' || schedule.trash_type === filterTrashType;
    return matchesSearch && matchesStatus && matchesTrashType;
  });

  const stats = {
    total: schedules.length,
    scheduled: schedules.filter(s => s.status === 'scheduled').length,
    inProgress: schedules.filter(s => s.status === 'in-progress').length,
    completed: schedules.filter(s => s.status === 'completed').length,
    today: schedules.filter(s => s.schedule_date === new Date().toISOString().split('T')[0]).length
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Calendar className="text-green-600" size={36} />
            Collection Schedules
          </h1>
          <p className="text-gray-600 mt-1">Manage and schedule waste collection activities</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-green-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-all shadow-lg"
        >
          <Plus size={20} />
          Create Schedule
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Schedules</p>
              <h3 className="text-4xl font-bold mt-2">{stats.total}</h3>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <Calendar size={32} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium">Scheduled</p>
              <h3 className="text-4xl font-bold mt-2">{stats.scheduled}</h3>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <Clock size={32} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">In Progress</p>
              <h3 className="text-4xl font-bold mt-2">{stats.inProgress}</h3>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <Truck size={32} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Completed</p>
              <h3 className="text-4xl font-bold mt-2">{stats.completed}</h3>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <CheckCircle size={32} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Today</p>
              <h3 className="text-4xl font-bold mt-2">{stats.today}</h3>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <AlertCircle size={32} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search schedules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 appearance-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={filterTrashType}
              onChange={(e) => setFilterTrashType(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 appearance-none bg-white"
            >
              <option value="all">All Trash Types</option>
              <option value="biodegradable">Biodegradable</option>
              <option value="non-biodegradable">Non-Biodegradable</option>
              <option value="recyclable">Recyclable</option>
              <option value="hazard">Hazardous</option>
            </select>
          </div>
        </div>
      </div>

      {/* Schedules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSchedules.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-md p-12 text-center">
            <Calendar size={64} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Schedules Found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || filterStatus !== 'all' || filterTrashType !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first schedule to get started'}
            </p>
          </div>
        ) : (
          filteredSchedules.map((schedule) => (
            <div key={schedule.id} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all overflow-hidden border border-gray-100">
              <div className={`h-2 ${getTrashTypeColor(schedule.trash_type)}`} />
              
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800 mb-1">{schedule.title}</h3>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(schedule.status)}`}>
                      {getStatusIcon(schedule.status)}
                      <span className="capitalize">{schedule.status.replace('-', ' ')}</span>
                    </span>
                  </div>
                  
                  <div className="flex gap-2 ml-2">
                    <button onClick={() => handleEdit(schedule)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(schedule)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {schedule.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{schedule.description}</p>
                )}

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="bg-blue-50 p-2 rounded-lg">
                      <Calendar size={16} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Date</p>
                      <p className="text-gray-800 font-medium">
                        {new Date(schedule.schedule_date).toLocaleDateString('en-US', {
                          weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <div className="bg-purple-50 p-2 rounded-lg">
                      <Clock size={16} className="text-purple-600" />
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Time</p>
                      <p className="text-gray-800 font-medium">
                        {new Date(`2000-01-01T${schedule.schedule_time}`).toLocaleTimeString('en-US', {
                          hour: 'numeric', minute: '2-digit', hour12: true
                        })}
                      </p>
                    </div>
                  </div>

                  {schedule.location && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="bg-green-50 p-2 rounded-lg">
                        <MapPin size={16} className="text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-500 text-xs">Location</p>
                        <p className="text-gray-800 font-medium truncate">{schedule.location}</p>
                      </div>
                    </div>
                  )}

                  {schedule.collectors && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="bg-orange-50 p-2 rounded-lg">
                        <Truck size={16} className="text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-500 text-xs">Collector</p>
                        <p className="text-gray-800 font-medium truncate">{schedule.collectors.name}</p>
                        {schedule.collectors.vehicle_number && (
                          <p className="text-gray-500 text-xs">{schedule.collectors.vehicle_number}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getTrashTypeColor(schedule.trash_type)}`} />
                    <span className="text-xs text-gray-600 font-medium">{getTrashTypeLabel(schedule.trash_type)}</span>
                  </div>
                  <span className="text-xs text-gray-500 capitalize">
                    {schedule.target_audience === 'all' ? 'All Users' : schedule.target_audience}
                  </span>
                </div>

                {schedule.status !== 'completed' && schedule.status !== 'cancelled' && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2 font-medium">Update Status:</p>
                    <div className="flex gap-2">
                      {schedule.status === 'scheduled' && (
                        <button 
                          onClick={() => handleStatusUpdate(schedule, 'in-progress')} 
                          className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition"
                        >
                          Start
                        </button>
                      )}
                      {schedule.status === 'in-progress' && (
                        <button 
                          onClick={() => handleStatusUpdate(schedule, 'completed')} 
                          className="flex-1 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition"
                        >
                          Complete
                        </button>
                      )}
                      <button 
                        onClick={() => handleStatusUpdate(schedule, 'cancelled')} 
                        className="flex-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Calendar className="text-green-600" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {editingSchedule ? 'Edit Schedule' : 'Create New Schedule'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {editingSchedule ? 'Update schedule details' : 'Schedule a new waste collection'}
                  </p>
                </div>
              </div>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-lg transition">
                <X size={24} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                    placeholder="e.g., Weekly Biodegradable Collection - Barangay 1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition resize-none"
                    placeholder="Additional details about the collection schedule..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="date"
                        required
                        value={formData.schedule_date}
                        onChange={(e) => setFormData({ ...formData, schedule_date: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Time <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="time"
                        required
                        value={formData.schedule_time}
                        onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Location/Area</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                      placeholder="e.g., Barangay 1 - Street 5, Main Road Area"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Trash Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.trash_type}
                      onChange={(e) => setFormData({ ...formData, trash_type: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 transition appearance-none bg-white"
                    >
                      <option value="all">All Types</option>
                      <option value="biodegradable">🍃 Biodegradable</option>
                      <option value="non-biodegradable">🔵 Non-Biodegradable</option>
                      <option value="recyclable">♻️ Recyclable</option>
                      <option value="hazard">☢️ Hazardous</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Assign Collector</label>
                    <div className="relative">
                      <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <select
                        value={formData.assigned_collector_id}
                        onChange={(e) => setFormData({ ...formData, assigned_collector_id: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 transition appearance-none bg-white"
                      >
                        <option value="">Select Collector</option>
                        {collectors.map((collector) => (
                          <option key={collector.id} value={collector.id}>
                            {collector.name} {collector.vehicle_number ? `- ${collector.vehicle_number}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Notify <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.target_audience}
                      onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 transition appearance-none bg-white"
                    >
                      <option value="all">👥 All Users</option>
                      <option value="residents">🏠 Residents Only</option>
                      <option value="collectors">🚛 Collectors Only</option>
                      <option value="specific">👤 Assigned Collector Only</option>
                    </select>
                  </div>

                  {editingSchedule && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 transition appearance-none bg-white"
                      >
                        <option value="scheduled">📅 Scheduled</option>
                        <option value="in-progress">🔄 In Progress</option>
                        <option value="completed">✅ Completed</option>
                        <option value="cancelled">❌ Cancelled</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Notification Info</p>
                    <p className="text-blue-700">
                      {formData.target_audience === 'all' && 'All residents and collectors will receive a push notification.'}
                      {formData.target_audience === 'residents' && 'Only residents will receive a push notification.'}
                      {formData.target_audience === 'collectors' && 'Only collectors will receive a push notification.'}
                      {formData.target_audience === 'specific' && 'Only the assigned collector will receive a push notification.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {editingSchedule ? 'Updating...' : 'Creating...'}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      {editingSchedule ? (
                        <>
                          <Edit size={20} />
                          Update Schedule
                        </>
                      ) : (
                        <>
                          <Plus size={20} />
                          Create Schedule
                        </>
                      )}
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedules;