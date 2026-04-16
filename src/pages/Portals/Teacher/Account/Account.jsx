import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Spinner, Stack } from 'react-bootstrap';
import api from '../../../../api/api';
import './Account.css';

export default function TeacherProfile() {
  const [loading, setLoading]   = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [message, setMessage]   = useState(null);

  const [profile, setProfile] = useState({
    first_name: '', last_name: '', email: '', phone_no: '',
    address: '', registration_no: '', date_of_registration: '', specialization: ''
  });

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('teacher-portal/account/');
      setProfile(res.data.teacher);
    } catch {
      setMessage({ type: 'danger', text: 'Could not load profile information.' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true); setMessage(null);
    try {
      const res = await api.put('teacher-portal/account/', profile);
      setProfile(res.data.teacher);
      setIsEditing(false);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch {
      setMessage({ type: 'danger', text: 'Update failed. Please check your details.' });
    } finally { setSaving(false); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const initials = `${profile.first_name?.charAt(0) || ''}${profile.surname?.charAt(0) || ''}`;

  if (loading) return (
    <div className="t-page d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <Spinner animation="border" className="t-spinner" />
    </div>
  );

  return (
    <div className="t-page">
      <Container>
        <Row className="justify-content-center">
          <Col lg={8}>

            {message && (
              <div className={`alert alert-${message.type} alert-dismissible mb-3`}>
                {message.text}
                <button type="button" className="btn-close" onClick={() => setMessage(null)} />
              </div>
            )}

            <div className="t-card card overflow-hidden mb-0" style={{ position:'relative' }}>
              <div className="t-card-accent" style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,#6366f1,#818cf8,transparent)' }} />

              {/* Header band */}
              <div className="acct-header-band">
                <div className="acct-avatar">{initials}</div>
                <h3>{profile.first_name} {profile.surname}</h3>
                <p>Reg No: {profile.registration_no}</p>
              </div>

              <div className="card-body" style={{ padding:'1.5rem' }}>
                <form onSubmit={handleUpdate}>
                  {/* Section header */}
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <p className="acct-section-title mb-0" style={{ flex:1 }}>Personal Information</p>
                    {!isEditing ? (
                      <button type="button" className="t-btn-secondary" onClick={() => setIsEditing(true)}>
                        ✏️ Edit Profile
                      </button>
                    ) : (
                      <Stack direction="horizontal" gap={2}>
                        <button type="button" className="t-btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                        <button type="submit" className="t-btn-primary" disabled={saving}>
                          {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                      </Stack>
                    )}
                  </div>

                  <Row className="g-3 mb-4">
                    {[
                      { label:'First Name',          name:'first_name',  type:'text'  },
                      { label:'Second Name',         name:'second_name', type:'text'  },
                      { label:'Last Name',           name:'surname',   type:'text'  },
                      { label:'Email Address',       name:'email',       type:'email' },
                      { label:'Phone Number',        name:'phone',    type:'text'  },
                    ].map(f => (
                      <Col md={6} key={f.name}>
                        <label className="t-label">{f.label}</label>
                        {isEditing ? (
                          <input
                            className="t-input"
                            type={f.type}
                            name={f.name}
                            value={profile[f.name] || ''}
                            onChange={handleChange}
                          />
                        ) : (
                          <p className="t-bold mb-0" style={{ color:'var(--t-text)', fontSize:'0.88rem' }}>{profile[f.name] || '—'}</p>
                        )}
                      </Col>
                    ))}
                    <Col md={12}>
                      <label className="t-label">Residential Address</label>
                      {isEditing ? (
                        <textarea
                          className="t-textarea t-input"
                          name="address"
                          rows={2}
                          value={profile.address || ''}
                          onChange={handleChange}
                        />
                      ) : (
                        <p className="t-bold mb-0" style={{ color:'var(--t-text)', fontSize:'0.88rem' }}>{profile.address || '—'}</p>
                      )}
                    </Col>
                  </Row>

                  <div className="t-divider" />

                  <p className="acct-section-title">Academic Details</p>
                  <Row className="g-3">
                    <Col md={6}>
                      <div className="acct-info-box">
                        <small>Specialization</small>
                        <span>{profile.specialization || 'General Education'}</span>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="acct-info-box">
                        <small>Joined Date</small>
                        <span>{profile.date_of_registration ? new Date(profile.date_of_registration).toLocaleDateString() : '—'}</span>
                      </div>
                    </Col>
                  </Row>
                </form>
              </div>
            </div>

          </Col>
        </Row>
      </Container>
    </div>
  );
}
