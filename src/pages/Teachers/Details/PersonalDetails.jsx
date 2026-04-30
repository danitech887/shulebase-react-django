import React, { useEffect, useState } from 'react';
import api from '../../../api/api';
import { useMessage } from '../../../context/MessageContext';
import './PersonalDetails.css';

import { Card, Table, Spinner, Modal, Form, Row, Col } from 'react-bootstrap';

import { useNavigate } from 'react-router-dom';

export default function TeacherPersonalDetails() {
  const navigate = useNavigate();
  const { showMessage } = useMessage();
  const [teacherList, setTeacherList]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [searchQuery, setSearchQuery]   = useState('');

  // Add / edit modal
  const [showModal, setShowModal]             = useState(false);
  const [modalMode, setModalMode]             = useState('add');
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [formData, setFormData] = useState({
    registration_no: '', username: '', password: '',
    first_name: '', second_name: '', surname: '',
    gender: '', phone: '', email: '', address: '',
  });
  const [saving, setSaving] = useState(false);

  // Reg config modal
  const [showRegConfigModal, setShowRegConfigModal] = useState(false);
  const [regFormatInput, setRegFormatInput]         = useState('');
  const [currentRegFormat, setCurrentRegFormat]     = useState('');

  // Profile modal
  const [showProfile, setShowProfile]       = useState(false);
  const [profileData, setProfileData]       = useState({ personal: null, roles: [], attendance: [] });
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => { fetchTeachers(); fetchTeacherRegConfig(); }, []);

  const fetchTeacherRegConfig = async () => {
    try {
      const res = await api.get('teachers/config-reg-no/');
      setCurrentRegFormat(res.data?.current_format || '');
      setRegFormatInput(res.data?.current_format || '');
    } catch (err) { console.error('Failed to fetch teacher reg config:', err); }
  };

  const fetchNextTeacherRegNo = async () => {
    try {
      const res = await api.get('teachers/next-registration/');
      setFormData(prev => ({ ...prev, registration_no: res.data?.next_registration_number || '' }));
    } catch (err) {
      console.error('Failed to fetch next teacher reg no:', err);
      setFormData(prev => ({ ...prev, registration_no: '' }));
    }
  };

  const handleSaveTeacherRegConfig = async () => {
    if (!regFormatInput) return showMessage({ type: 'warning', text: 'Registration format cannot be empty.' });
    setSaving(true);
    try {
      const res = await api.post('teachers/config-reg-no/', { reg_format: regFormatInput });
      setCurrentRegFormat(res.data?.current_format || regFormatInput);
      showMessage({ type: 'success', text: 'Teacher registration format updated.' });
      setShowRegConfigModal(false);
      fetchNextTeacherRegNo();
    } catch { showMessage({ type: 'error', text: 'Failed to save registration format.' }); }
    finally { setSaving(false); }
  };

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const res = await api.get('teachers/');
      let data = res.data;
      if (data && typeof data === 'object' && !Array.isArray(data))
        data = data.results || data.teachers || data.data || [];
      setTeacherList(Array.isArray(data) ? data : []);
    } catch { showMessage({ type: 'error', text: 'Failed to load teachers.' }); }
    finally { setLoading(false); }
  };

  const openAdd = () => {
    setModalMode('add');
    setFormData({ registration_no: '', username: '', password: '', first_name: '', second_name: '', surname: '', gender: '', phone: '', email: '', address: '' });
    setShowModal(true);
    fetchNextTeacherRegNo();
  };

  const openEdit = (t) => {
    setModalMode('edit');
    setSelectedTeacher(t);
    setFormData({
      registration_no: t.registration_no,
      username: t.username || '', password: '',
      first_name: t.first_name || '', second_name: t.second_name || '', surname: t.surname || '',
      gender: t.gender || '', phone: t.phone || '', email: t.email || '', address: t.address || '',
    });
    setShowModal(true);
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (modalMode === 'add' && name === 'first_name') {
        updated.username = value.toLowerCase();
        updated.password = value.toLowerCase();
      }
      return updated;
    });
  };

  const handleSave = async () => {
    const reqAdd  = ['first_name','surname','gender','phone','address','username','password','email'];
    const reqEdit = ['first_name','surname','phone','address'];
    const required = modalMode === 'add' ? reqAdd : reqEdit;
    const missing = required.filter(f => !String(formData[f] || '').trim());
    if (missing.length > 0) return showMessage({ type: 'warning', text: 'Please fill: ' + missing.join(', ') });
    setSaving(true);
    try {
      if (modalMode === 'add') {
        await api.post('teachers/', formData);
        showMessage({ type: 'success', text: 'Teacher added.' });
      } else {
        await api.put(`teachers/${selectedTeacher.registration_no}/`, formData);
        showMessage({ type: 'success', text: 'Teacher updated.' });
      }
      setShowModal(false);
      fetchTeachers();
    } catch (err) {
      showMessage({ type: 'error', text: 'Save failed: ' + (err.response?.data?.error || err.message) });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t) => {
    if (!window.confirm(`Delete ${t.first_name} ${t.surname}?`)) return;
    try {
      await api.delete(`teachers/${t.registration_no}/`);
      showMessage({ type: 'success', text: 'Deleted.' });
      fetchTeachers();
    } catch { showMessage({ type: 'error', text: 'Delete failed.' }); }
  };

  const openProfile = async (t) => {
    setShowProfile(true);
    setProfileLoading(true);
    setProfileData({ personal: t, roles: [], attendance: [] });
    try {
      const [rolesRes, attRes] = await Promise.allSettled([
        api.get('teachers/roles/'),
        api.get('teachers/attendance/records/'),
      ]);
      const roles = rolesRes.status === 'fulfilled' ? (Array.isArray(rolesRes.value.data) ? rolesRes.value.data : []) : [];
      const atts  = attRes.status  === 'fulfilled' ? (Array.isArray(attRes.value.data)   ? attRes.value.data   : []) : [];
      setProfileData({
        personal:   t,
        roles:      roles.filter(r => r.registration_no === t.registration_no),
        attendance: atts.filter(a  => a.registration_no === t.registration_no),
      });
    } catch (err) { console.error(err); }
    finally { setProfileLoading(false); }
  };

  const statusClass = (s) => {
    if (s === 'Present') return 'pd-status-present';
    if (s === 'Absent')  return 'pd-status-absent';
    return 'pd-status-late';
  };

  const filtered = teacherList.filter(t => {
    if (!t) return false;
    const q = String(searchQuery || '').toLowerCase();
    if (!q) return true;
    return (
      String(t.first_name     || '').toLowerCase().includes(q) ||
      String(t.surname        || '').toLowerCase().includes(q) ||
      String(t.registration_no|| '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="pd-page">

      {/* ── Header card ── */}
      <Card className="pd-header-card">
        <Card.Body className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-3">
            <div className="pd-header-icon">👩‍🏫</div>
            <div>
              <h2 className="pd-title">Teacher Management</h2>
              <p className="pd-subtitle">Manage teacher records and roles</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="pd-btn-config" onClick={() => setShowRegConfigModal(true)}>
              ⚙️ Reg Config
            </button>
            <button className="pd-btn-add" onClick={openAdd}>
              + Add Teacher
            </button>
          </div>
        </Card.Body>
      </Card>

      {/* ── Table card ── */}
      <Card className="pd-table-card">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <div className="pd-search-wrap">
            <span>🔍</span>
            <Form.Control
              type="text"
              placeholder="Search name or reg no…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <span className="pd-count-label">{filtered.length} teachers</span>
        </Card.Header>

        <Card.Body className="p-0">
          {loading ? (
            <div className="pd-loading">
              <Spinner animation="border" size="sm" className="me-2" /> Loading teachers…
            </div>
          ) : (
            <Table responsive className="mb-0">
              <thead>
                <tr>
                  <th>Reg No.</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr className="pd-empty-row">
                    <td colSpan={5} className="text-center">No teachers found.</td>
                  </tr>
                ) : filtered.map(t => (
                  <tr key={t.registration_no}>
                    <td><span className="badge pd-badge-reg">{t.registration_no}</span></td>
                    <td className="pd-cell-name">{t.first_name} {t.surname}</td>
                    <td className="pd-cell-mono">{t.phone}</td>
                    <td className="pd-cell-muted">{t.email}</td>
                    <td>
                      <div className="pd-actions">
                        <button className="pd-btn-view"   onClick={() => openProfile(t) } title ="View Profile">👁️</button>
                        <button className="pd-btn-edit"   onClick={() => openEdit(t)} title ="Edit">✏️</button>
                        <button className="pd-btn-delete" onClick={() => handleDelete(t)} title ="Delete">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* ════════════════════════════════ Add / Edit Modal ════════════════════════════════
          className="teacher-modal" is REQUIRED —
          it scopes all dark overrides in CSS  */}
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        size="lg"
        backdrop="static"
        className="teacher-modal"
        data-bs-theme="dark"
      >
        <Modal.Header closeButton>
          <Modal.Title>{modalMode === 'add' ? 'Add Teacher' : 'Edit Teacher'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Registration Number</Form.Label>
                  <Form.Control name="registration_no" value={formData.registration_no} onChange={handleInput} disabled />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control type="email" name="email" value={formData.email} onChange={handleInput} placeholder="Email address" />
                </Form.Group>
              </Col>
            </Row>
            <Row className="mb-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>First Name</Form.Label>
                  <Form.Control name="first_name" value={formData.first_name} onChange={handleInput} placeholder="First name" />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Second Name <span className="text-muted" style={{ fontWeight: 400 }}>(optional)</span></Form.Label>
                  <Form.Control name="second_name" value={formData.second_name} onChange={handleInput} placeholder="Middle name" />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Surname</Form.Label>
                  <Form.Control name="surname" value={formData.surname} onChange={handleInput} placeholder="Surname" />
                </Form.Group>
              </Col>
            </Row>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Gender</Form.Label>
                  <Form.Select name="gender" value={formData.gender} onChange={handleInput}>
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Phone Number</Form.Label>
                  <Form.Control name="phone" value={formData.phone} onChange={handleInput} placeholder="Phone number" />
                </Form.Group>
              </Col>
            </Row>
            <Row className="mb-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Physical Address</Form.Label>
                  <Form.Control name="address" value={formData.address} onChange={handleInput} placeholder="Physical address" />
                </Form.Group>
              </Col>
            </Row>
            {modalMode === 'add' && (
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Login Username</Form.Label>
                    <Form.Control name="username" value={formData.username} onChange={handleInput} placeholder="Login username" />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Login Password</Form.Label>
                    <Form.Control type="password" name="password" value={formData.password} onChange={handleInput} placeholder="••••••••" />
                  </Form.Group>
                </Col>
              </Row>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary"   onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : (modalMode === 'add' ? 'Add Teacher' : 'Save Changes')}
          </button>
        </Modal.Footer>
      </Modal>

      {/* ══════════ Reg Config Modal ══════════ */}
      <Modal
        show={showRegConfigModal}
        onHide={() => setShowRegConfigModal(false)}
        backdrop="static"
        className="teacher-modal"
        data-bs-theme="dark"
      >
        <Modal.Header closeButton>
          <Modal.Title>Teacher Registration Format</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Current Format</Form.Label>
              <Form.Control value={currentRegFormat} readOnly disabled />
            </Form.Group>
            <Form.Group className="mb-0">
              <Form.Label>Set New Format</Form.Label>
              <Form.Control
                value={regFormatInput}
                onChange={e => setRegFormatInput(e.target.value)}
                placeholder="e.g. TCH-2026-"
              />
              <Form.Text className="text-muted mt-2 d-block">Avoid using '/' characters. The system appends a sequence number.</Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <button className="btn btn-secondary" onClick={() => setShowRegConfigModal(false)}>Cancel</button>
          <button className="btn btn-primary"   onClick={handleSaveTeacherRegConfig} disabled={saving}>
            {saving ? 'Saving...' : 'Save Format'}
          </button>
        </Modal.Footer>
      </Modal>

      {/* ══════════ Profile Modal ══════════ */}
      <Modal
        show={showProfile}
        onHide={() => setShowProfile(false)}
        size="lg"
        className="teacher-modal"
        data-bs-theme="dark"
      >
        <Modal.Header closeButton>
          <Modal.Title>Teacher Profile</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {profileLoading ? (
            <div className="text-center" style={{ padding: '3rem' }}>
              <Spinner animation="border" style={{ color: 'var(--pd-accent)', width: '1.6rem', height: '1.6rem' }} />
            </div>
          ) : (
            <>
              {/* Name + reg */}
              <div className="text-center mb-4 mt-2">
                <div className="mx-auto mb-3 d-flex align-items-center justify-content-center" style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: '#6366f1', color: '#ffffff', fontSize: '2rem', fontWeight: 'bold' }}>
                  {profileData.personal?.first_name?.charAt(0)}{profileData.personal?.surname?.charAt(0)}
                </div>
                <h4 className="pd-profile-name mb-1">
                  {profileData.personal?.first_name} {profileData.personal?.surname}
                </h4>
                <p className="pd-profile-reg text-muted mb-0">Reg No: {profileData.personal?.registration_no}</p>
              </div>

              {/* Contact row */}
              <Row className="mb-4">
                <Col sm={6}>
                  <div className="pd-profile-field p-3 rounded h-100" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                    <strong className="d-block mb-1 text-muted" style={{ fontSize: '0.85rem' }}>Phone</strong>
                    <span style={{ fontSize: '1.05rem' }}>{profileData.personal?.phone || '—'}</span>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="pd-profile-field p-3 rounded h-100" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                    <strong className="d-block mb-1 text-muted" style={{ fontSize: '0.85rem' }}>Email</strong>
                    <span style={{ fontSize: '1.05rem' }}>{profileData.personal?.email || '—'}</span>
                  </div>
                </Col>
              </Row>

              {/* Roles */}
              <p className="pd-section-title mb-3">Roles</p>
              {profileData.roles.length === 0 ? (
                <p className="pd-no-data text-muted mb-4">No roles assigned.</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '1.5rem' }}>
                  {profileData.roles.map((r, i) => (
                    <span key={i} className="pd-role-badge">
                      {r.type_of_teacher}
                      {r.grade   ? ` · ${r.grade}`  : ''}
                      {r.stream  ? ` ${r.stream}`    : ''}
                      {r.subject ? ` (${r.subject})` : ''}
                    </span>
                  ))}
                </div>
              )}

              {/* Attendance */}
              <p className="pd-section-title mb-3">Attendance Records</p>
              {profileData.attendance.length === 0 ? (
                <p className="pd-no-data text-muted mb-2">No attendance records.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover table-borderless align-middle pd-att-table mb-0">
                    <thead className="table-dark" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <tr>
                        <th>Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profileData.attendance.map((a, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td className="font-monospace">{a.date}</td>
                          <td><span className={statusClass(a.status)}>{a.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <button className="btn btn-secondary" onClick={() => setShowProfile(false)}>Close</button>
        </Modal.Footer>
      </Modal>

    </div>
  );
}