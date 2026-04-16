import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { StarFill, Star, SendFill, GeoAltFill, PencilSquare, CheckCircleFill, TrashFill, XCircleFill } from 'react-bootstrap-icons';
import './Reviews.css';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const api = axios.create({ baseURL: BASE_URL });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  
  // Form State
  const [form, setForm] = useState({ content: '', rating: 5, location: '', full_name: '', user_type: '' });
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [userRes, reviewsRes] = await Promise.all([
        api.get('/api/students/auth/me/'),
        api.get('/api/school/reviews/')
      ]);
      setUser(userRes.data);
      setReviews(reviewsRes.data);
      
      // Pre-fill form with user info
      setForm(prev => ({
        ...prev,
        full_name: userRes.data.username,
        user_type: userRes.data.role.toLowerCase()
      }));
    } catch (err) {
      console.error("Error fetching data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRating = (n) => setForm(prev => ({ ...prev, rating: n }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api.patch(`/api/school/reviews/${editingId}/`, form);
      } else {
        await api.post('/api/school/reviews/', form);
      }
      setForm({ ...form, content: '', rating: 5, location: '' });
      setEditingId(null);
      fetchInitialData();
    } catch (err) {
      alert("Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (rev) => {
    setEditingId(rev.id);
    setForm({
      content: rev.content,
      rating: rev.rating,
      location: rev.location,
      full_name: rev.full_name,
      user_type: rev.user_type
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleApprove = async (id, status) => {
    try {
      await api.patch(`/api/school/reviews/${id}/`, { is_approved: status });
      fetchInitialData();
    } catch (err) {
      alert("Approval failed. Only System Owners can approve reviews.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this review?")) return;
    try {
      await api.delete(`/api/school/reviews/${id}/`);
      fetchInitialData();
    } catch (err) {
      alert("Delete failed.");
    }
  };

  const isSystemOwner = user?.role === 'SystemOwner' || user?.is_superuser;

  return (
    <div className="rev-container">
      <div className="rev-header">
        <h1>💬 System Feedback</h1>
        <p>Your thoughts help us improve. How are we doing?</p>
      </div>

      <div className="rev-card rev-form-card">
        <h2>{editingId ? 'Edit Your Review' : 'Share Your Experience'}</h2>
        <form onSubmit={handleSubmit} className="rev-form">
          <div className="star-rating">
            {[1, 2, 3, 4, 5].map(n => (
              <span key={n} onClick={() => handleRating(n)} className="star-btn">
                {n <= form.rating ? <StarFill className="star-active" /> : <Star />}
              </span>
            ))}
            <span className="rating-text">{form.rating} / 5</span>
          </div>

          <div className="form-group">
            <label>Location</label>
            <div className="input-with-icon">
              <GeoAltFill className="input-icon" />
              <input 
                type="text" 
                placeholder="e.g. Nairobi, Kenya" 
                value={form.location}
                onChange={(e) => setForm({...form, location: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Review Message</label>
            <textarea 
              placeholder="What do you feel about the system?"
              value={form.content}
              onChange={(e) => setForm({...form, content: e.target.value})}
              rows="4"
              required
            />
          </div>

          <button type="submit" className="btn-submit" disabled={submitting}>
            {submitting ? 'Sending...' : (
              <>
                <SendFill /> {editingId ? 'Update Review' : 'Post Review'}
              </>
            )}
          </button>
          
          {editingId && (
            <button type="button" className="btn-cancel" onClick={() => {
              setEditingId(null);
              setForm({...form, content: '', rating: 5, location: ''});
            }}>Cancel</button>
          )}
        </form>
      </div>

      <div className="rev-list">
        {loading ? (
          <div className="rev-loader">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <p className="no-rev">No reviews yet. Be the first!</p>
        ) : (
          reviews.map(rev => (
            <div key={rev.id} className={`rev-card rev-item ${!rev.is_approved ? 'pending' : ''}`}>
              {!rev.is_approved && <div className="pending-badge">Pending Approval</div>}
              
              <div className="rev-item-header">
                <div className="user-info">
                  <div className="user-avatar">{rev.full_name[0]}</div>
                  <div>
                    <div className="user-name">{rev.full_name}</div>
                    <div className="user-role">{rev.user_type}</div>
                  </div>
                </div>
                <div className="item-rating">
                  {[1, 2, 3, 4, 5].map(n => (
                    n <= rev.rating ? <StarFill key={n} className="star-sm active" /> : <Star key={n} className="star-sm" />
                  ))}
                </div>
              </div>

              <p className="rev-content">"{rev.content}"</p>

              <div className="rev-item-footer">
                <span className="rev-loc"><GeoAltFill /> {rev.location}</span>
                <div className="rev-actions">
                  {(rev.created_by === user?.id) && (
                    <button onClick={() => handleEdit(rev)} className="btn-icon-edit"><PencilSquare /></button>
                  )}
                  {isSystemOwner && (
                    <>
                      <button 
                        onClick={() => handleApprove(rev.id, !rev.is_approved)} 
                        className={rev.is_approved ? "btn-icon-unapprove" : "btn-icon-approve"}
                        title={rev.is_approved ? "Unapprove" : "Approve"}
                      >
                        {rev.is_approved ? <XCircleFill /> : <CheckCircleFill />}
                      </button>
                    </>
                  )}
                  {(rev.created_by === user?.id || isSystemOwner) && (
                    <button onClick={() => handleDelete(rev.id)} className="btn-icon-del"><TrashFill /></button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
