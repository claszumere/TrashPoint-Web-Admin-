// src/pages/Announcements.jsx

import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  Plus, 
  Megaphone, 
  Users, 
  AlertCircle, 
  Calendar, 
  X, 
  Trash2, 
  Eye, 
  EyeOff,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';  // ✅ USE THIS INSTEAD OF useToast
import { logActivity, ACTIONS, ENTITIES } from '../services/activityLog';

const Announcements = () => {
  // ✅ USE NOTIFICATION HOOK (same as Schedules.jsx)
  const { showSuccess, showError, showWarning, showInfo, showConfirm } = useNotification();

  const [announcements, setAnnouncements] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'general',
    target_audience: 'all',
    expires_at: ''
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setAnnouncements(data);
  };

  // Helper function to prepare form data for submission
  const prepareAnnouncementData = (data) => {
    return {
      title: data.title.trim(),
      message: data.message.trim(),
      type: data.type,
      target_audience: data.target_audience,
      expires_at: data.expires_at && data.expires_at.trim() !== '' 
        ? new Date(data.expires_at).toISOString() 
        : null,
      is_active: true,
      created_at: new Date().toISOString(),
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const announcementData = prepareAnnouncementData(formData);
      
      console.log('📤 Submitting announcement data:', announcementData);

      const { data: announcement, error: announcementError } = await supabase
        .from('announcements')
        .insert([announcementData])
        .select()
        .single();

      if (announcementError) {
        console.error('Supabase error:', announcementError);
        throw announcementError;
      }

      const notificationResult = await sendNotifications(announcement);

      await logActivity({
        action: ACTIONS.CREATE,
        entityType: ENTITIES.ANNOUNCEMENT,
        entityId: announcement.id,
        entityName: announcement.title,
        description: `Created announcement: ${announcement.title}`,
        metadata: {
          type: announcement.type,
          target_audience: announcement.target_audience,
          recipients_count: notificationResult.userCount,
          expires_at: announcement.expires_at || null
        }
      });

      resetForm();
      setShowModal(false);
      fetchAnnouncements();

      showSuccess(
        `Announcement sent to ${notificationResult.userCount} ${
          announcement.target_audience === 'all' ? 'users' : announcement.target_audience
        }.`,
        '🎉 Announcement Created'
      );

    } catch (error) {
      console.error('Error creating announcement:', error);

      let errorMessage = 'Something went wrong.';
      if (error.message) {
        if (error.message.includes('timestamp')) {
          errorMessage = 'Invalid date format. Please check the expiry date.';
        } else if (error.message.includes('null value')) {
          errorMessage = 'Please fill in all required fields.';
        } else {
          errorMessage = error.message;
        }
      }

      showError(errorMessage, 'Failed to Create Announcement');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      type: 'general',
      target_audience: 'all',
      expires_at: ''
    });
  };

  // ✅ UPDATED: Toggle announcement status with custom confirmation
  const toggleAnnouncementStatus = async (announcement) => {
    const newStatus = !announcement.is_active;
    const actionText = newStatus ? 'activate' : 'deactivate';
    
    await showConfirm({
      title: newStatus ? 'Activate Announcement' : 'Deactivate Announcement',
      message: (
        <div className="space-y-4 text-left">
          <p>Are you sure you want to {actionText} this announcement?</p>
          
          {/* Announcement Preview Card */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${newStatus ? 'bg-green-100' : 'bg-orange-100'}`}>
                {newStatus ? (
                  <Eye size={20} className="text-green-600" />
                ) : (
                  <EyeOff size={20} className="text-orange-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900">{announcement.title}</h4>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{announcement.message}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <span className={`px-2 py-0.5 rounded-full ${getTypeColor(announcement.type)}`}>
                    {announcement.type}
                  </span>
                  <span>•</span>
                  <span className="capitalize">{announcement.target_audience}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Info Message */}
          <div className={`rounded-xl p-3 ${newStatus ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
            <p className={`text-sm flex items-center gap-2 ${newStatus ? 'text-green-700' : 'text-orange-700'}`}>
              <AlertCircle size={18} className="flex-shrink-0" />
              <span>
                {newStatus 
                  ? 'This announcement will be visible to users again.'
                  : 'This announcement will be hidden from users but not deleted.'}
              </span>
            </p>
          </div>
        </div>
      ),
      type: newStatus ? 'success' : 'warning',
      confirmText: newStatus ? 'Activate' : 'Deactivate',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('announcements')
            .update({ is_active: newStatus })
            .eq('id', announcement.id);

          if (error) throw error;

          await logActivity({
            action: ACTIONS.UPDATE,
            entityType: ENTITIES.ANNOUNCEMENT,
            entityId: announcement.id,
            entityName: announcement.title,
            description: `${newStatus ? 'Activated' : 'Deactivated'} announcement: ${announcement.title}`,
            metadata: { is_active: newStatus }
          });

          fetchAnnouncements();
          
          if (newStatus) {
            showSuccess(`Announcement "${announcement.title}" is now visible to users.`, '✅ Activated');
          } else {
            showWarning(`Announcement "${announcement.title}" is now hidden from users.`, '🔕 Deactivated');
          }
        } catch (error) {
          console.error('Error toggling status:', error);
          showError('Failed to update announcement status.', 'Error');
        }
      }
    });
  };

  // ✅ UPDATED: Delete announcement with custom confirmation (REPLACES window.confirm)
  const deleteAnnouncement = async (announcement) => {
    await showConfirm({
      title: 'Delete Announcement',
      message: (
        <div className="space-y-4 text-left">
          <p>Are you sure you want to delete this announcement?</p>
          
          {/* Announcement Preview Card */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="bg-red-100 p-2 rounded-lg">
                <Megaphone size={20} className="text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900">{announcement.title}</h4>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{announcement.message}</p>
                
                <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs uppercase font-semibold">Type</p>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold mt-1 ${getTypeColor(announcement.type)}`}>
                      {announcement.type}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase font-semibold">Audience</p>
                    <p className="font-medium text-gray-700 capitalize">{announcement.target_audience}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase font-semibold">Status</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold mt-1 ${
                      announcement.is_active 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {announcement.is_active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {announcement.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase font-semibold">Created</p>
                    <p className="font-medium text-gray-700">
                      {new Date(announcement.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Expiry Info */}
                {announcement.expires_at && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock size={14} className="text-gray-500" />
                      <span className="text-gray-600">
                        {new Date(announcement.expires_at) < new Date() 
                          ? 'Expired on ' 
                          : 'Expires on '}
                        {new Date(announcement.expires_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Warning Message */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-sm text-red-700 flex items-center gap-2">
              <AlertCircle size={18} className="flex-shrink-0" />
              <span>This action cannot be undone. All related notifications will also be affected.</span>
            </p>
          </div>
        </div>
      ),
      type: 'danger',
      confirmText: 'Delete Announcement',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('announcements')
            .delete()
            .eq('id', announcement.id);

          if (error) throw error;

          await logActivity({
            action: ACTIONS.DELETE,
            entityType: ENTITIES.ANNOUNCEMENT,
            entityId: announcement.id,
            entityName: announcement.title,
            description: `Deleted announcement: ${announcement.title}`,
          });

          fetchAnnouncements();
          
          showSuccess(`Announcement "${announcement.title}" has been permanently deleted.`, '🗑️ Deleted');
        } catch (error) {
          console.error('Error deleting announcement:', error);
          showError('Failed to delete announcement.', 'Delete Failed');
        }
      }
    });
  };

  const sendNotifications = async (announcement) => {
    let users = [];

    if (announcement.target_audience === 'all' || announcement.target_audience === 'residents') {
      const { data: residents } = await supabase
        .from('residents')
        .select('id');
      if (residents) {
        users.push(...residents.map(r => ({ user_id: r.id, user_type: 'resident' })));
      }
    }

    if (announcement.target_audience === 'all' || announcement.target_audience === 'collectors') {
      const { data: collectors } = await supabase
        .from('collectors')
        .select('id');
      if (collectors) {
        users.push(...collectors.map(c => ({ user_id: c.id, user_type: 'collector' })));
      }
    }

    const notifications = users.map(user => ({
      user_id: user.user_id,
      user_type: user.user_type,
      title: announcement.title,
      message: announcement.message,
      type: 'announcement',
      reference_id: announcement.id
    }));

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }

    await sendPushNotifications(users, announcement);

    return { userCount: users.length };
  };

  const sendPushNotifications = async (users, announcement) => {
    const userIds = users.map(u => u.user_id);
    
    if (userIds.length === 0) return;
    
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('*')
      .in('user_id', userIds);

    if (tokens && tokens.length > 0) {
      console.log('Sending push notifications to:', tokens.length, 'devices');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'urgent': return <AlertCircle className="text-red-500" />;
      case 'reminder': return <Calendar className="text-blue-500" />;
      case 'maintenance': return <AlertCircle className="text-orange-500" />;
      default: return <Megaphone className="text-green-500" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'reminder': return 'bg-blue-100 text-blue-800';
      case 'maintenance': return 'bg-orange-100 text-orange-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const formatExpiryDate = (dateString) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    const now = new Date();
    
    if (date < now) {
      return { text: 'Expired', isExpired: true };
    }
    
    return { 
      text: `Expires: ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 
      isExpired: false 
    };
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Megaphone className="text-green-600" size={36} />
            Announcements
          </h1>
          <p className="text-gray-600 mt-1">Create and manage system announcements</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-green-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-all shadow-lg"
        >
          <Plus size={20} />
          Create Announcement
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Announcements</p>
              <h3 className="text-4xl font-bold mt-2">{announcements.length}</h3>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <Megaphone size={32} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Active</p>
              <h3 className="text-4xl font-bold mt-2">
                {announcements.filter(a => a.is_active).length}
              </h3>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <Eye size={32} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">This Month</p>
              <h3 className="text-4xl font-bold mt-2">
                {announcements.filter(a => 
                  new Date(a.created_at).getMonth() === new Date().getMonth()
                ).length}
              </h3>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <Calendar size={32} />
            </div>
          </div>
        </div>
      </div>

      {/* Announcements List */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800">Recent Announcements</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {announcements.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Megaphone size={64} className="mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium mb-2">No Announcements Yet</h3>
              <p className="text-sm">Create your first announcement to notify users!</p>
            </div>
          ) : (
            announcements.map((announcement) => {
              const expiry = formatExpiryDate(announcement.expires_at);
              
              return (
                <div 
                  key={announcement.id} 
                  className={`p-6 hover:bg-gray-50 transition ${
                    !announcement.is_active ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1">{getTypeIcon(announcement.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-800 truncate">
                            {announcement.title}
                          </h3>
                          <p className="text-gray-600 mt-1 line-clamp-2">{announcement.message}</p>
                        </div>
                        
                        {/* Status Badge & Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            announcement.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {announcement.is_active ? 'Active' : 'Inactive'}
                          </span>
                          
                          {/* Action Buttons */}
                          <button
                            onClick={() => toggleAnnouncementStatus(announcement)}
                            className={`p-2 rounded-lg transition ${
                              announcement.is_active 
                                ? 'hover:bg-orange-50 text-orange-600' 
                                : 'hover:bg-green-50 text-green-600'
                            }`}
                            title={announcement.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {announcement.is_active ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                          
                          <button
                            onClick={() => deleteAnnouncement(announcement)}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      
                      {/* Meta Info */}
                      <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users size={14} />
                          <span className="capitalize">{announcement.target_audience}</span>
                        </span>
                        <span>•</span>
                        <span>{new Date(announcement.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(announcement.type)}`}>
                          {announcement.type}
                        </span>
                        
                        {/* Expiry Info */}
                        {expiry && (
                          <>
                            <span>•</span>
                            <span className={`text-xs ${expiry.isExpired ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                              {expiry.text}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Megaphone className="text-green-600" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Create New Announcement</h2>
                  <p className="text-sm text-gray-500">Send a notification to your users</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowModal(false); resetForm(); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-5">
                {/* Title */}
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
                    placeholder="Enter announcement title"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition resize-none"
                    placeholder="Enter announcement message"
                  />
                </div>

                {/* Type & Target Audience */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 transition appearance-none bg-white"
                    >
                      <option value="general">📢 General</option>
                      <option value="urgent">🚨 Urgent</option>
                      <option value="reminder">📅 Reminder</option>
                      <option value="maintenance">🔧 Maintenance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Target Audience <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.target_audience}
                      onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 transition appearance-none bg-white"
                    >
                      <option value="all">👥 All Users</option>
                      <option value="residents">🏠 Residents Only</option>
                      <option value="collectors">🚛 Collectors Only</option>
                    </select>
                  </div>
                </div>

                {/* Expires At */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Expires At <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 transition"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty for no expiration. Expired announcements won't be shown to users.
                  </p>
                </div>

                {/* Preview */}
                {formData.title && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Preview</p>
                    <div className="flex items-start gap-3">
                      {getTypeIcon(formData.type)}
                      <div>
                        <h4 className="font-semibold text-gray-800">{formData.title}</h4>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{formData.message}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <span className={`px-2 py-0.5 rounded-full ${getTypeColor(formData.type)}`}>
                            {formData.type}
                          </span>
                          <span>→</span>
                          <span className="capitalize">{formData.target_audience}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-4 mt-8 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Plus size={20} />
                      Create Announcement
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

export default Announcements;