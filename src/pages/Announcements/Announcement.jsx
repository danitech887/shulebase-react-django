import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Announcement.css';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// Axios instance with auth
const api = axios.create({ baseURL: BASE_URL });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default function Announcement() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // User info
  const [userRole, setUserRole] = useState(localStorage.getItem('user_role') || ''); // Admin, Teacher, Student
  
  // Form state
  const [form, setForm] = useState({ title: '', content: '', target_audience: [] });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
    // Fetch user role if not in localStorage
    if (!userRole) {
      api.get('/api/students/auth/me/')
        .then(res => {
          setUserRole(res.data.role);
          localStorage.setItem('user_role', res.data.role);
        })
        .catch(err => console.error("Could not fetch user role", err));
    }
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/school/announcements/');
      setAnnouncements(res.data);
      setError('');
    } catch (err) {
      setError('Failed to load announcements.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAudienceChange = (audience) => {
    setForm(prev => {
      let nextAudience = [...prev.target_audience];
      if (nextAudience.includes(audience)) {
        nextAudience = nextAudience.filter(a => a !== audience);
      } else {
        nextAudience.push(audience);
      }
      return { ...prev, target_audience: nextAudience };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.content || form.target_audience.length === 0) {
      alert("Please fill in all fields and select at least one target audience.");
      return;
    }

    setSaving(true);
    // Convert audience array to string
    const payload = {
      ...form,
      target_audience: form.target_audience.includes('All') ? 'All' : form.target_audience.join(',')
    };

    try {
      if (editingId) {
        await api.patch(`/api/school/announcements/${editingId}/`, payload);
      } else {
        await api.post('/api/school/announcements/', payload);
      }
      setForm({ title: '', content: '', target_audience: [] });
      setEditingId(null);
      fetchAnnouncements();
    } catch (err) {
      alert("Failed to save announcement. Ensure you are an Admin.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (ann) => {
    setEditingId(ann.id);
    setForm({
      title: ann.title,
      content: ann.content,
      target_audience: ann.target_audience === 'All' ? ['All'] : ann.target_audience.split(',')
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    try {
      await api.delete(`/api/school/announcements/${id}/`);
      fetchAnnouncements();
    } catch (err) {
      alert("Failed to delete announcement.");
    }
  };

  const isAdmin = userRole.toLowerCase() === 'admin';

  return (
    <div className="ann-container">
      <div className="ann-header">
        <h1>📢 School Announcements</h1>
        <p>Stay updated with the latest news from your school.</p>
      </div>

      {isAdmin && (
        <div className="ann-card ann-form-card">
          <h2>{editingId ? '📝 Edit Announcement' : '✨ Create New Announcement'}</h2>
          <form onSubmit={handleSubmit} className="ann-form">
            <div className="form-group">
              <label>Title</label>
              <input 
                type="text" 
                name="title" 
                value={form.title} 
                onChange={handleChange} 
                placeholder="Announcement Title"
                required
              />
            </div>
            <div className="form-group">
              <label>Content</label>
              <textarea 
                name="content" 
                value={form.content} 
                onChange={handleChange} 
                placeholder="Write your announcement here..."
                rows="4"
                required
              />
            </div>
            <div className="form-group">
              <label>Target Audience</label>
              <div className="audience-options">
                {['All', 'Students', 'Teachers'].map(aud => (
                  <label key={aud} className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={form.target_audience.includes(aud)}
                      onChange={() => handleAudienceChange(aud)}
                    />
                    <span>{aud}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-save" disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update' : 'Post Announcement'}
              </button>
              {editingId && (
                <button type="button" className="btn-cancel" onClick={() => {
                  setEditingId(null);
                  setForm({ title: '', content: '', target_audience: [] });
                }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="ann-loader">Loading announcements...</div>
      ) : error ? (
        <div className="ann-error">{error}</div>
      ) : (
        <div className="ann-list">
          {announcements.length === 0 ? (
            <p className="no-ann">No announcements found.</p>
          ) : (
            announcements.map(ann => (
              <div key={ann.id} className="ann-card ann-item">
                <div className="ann-item-header">
                  <h3>{ann.title}</h3>
                  <span className="ann-date">
                    {new Date(ann.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="ann-content">{ann.content}</p>
                <div className="ann-item-footer">
                  <span className="ann-target">Target: {ann.target_audience}</span>
                  {isAdmin && (
                    <div className="ann-admin-tools">
                      <button onClick={() => handleEdit(ann)} className="btn-tool-edit">Edit</button>
                      <button onClick={() => handleDelete(ann.id)} className="btn-tool-del">Delete</button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
