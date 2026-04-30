import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Card, Badge, Row, Col, Spinner, Stack } from 'react-bootstrap';
import './PersonalDetails.css';
import api from '../../../api/api';
import { useMessage } from '../../../context/MessageContext';
import { useGradesAndStreams } from '../../../hooks/useGradesAndStreams';

import { useNavigate } from 'react-router-dom';

export default function PersonalDetails() {
  const navigate = useNavigate();
  const [studentList, setStudentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { showMessage } = useMessage();
  // Profile modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileData, setProfileData] = useState({ personal: null, fees: [], attendance: [], leaves: [], academics: {} });
  const [profileTab, setProfileTab] = useState('personal');
  const [searchQuery, setSearchQuery] = useState('');
  const [animate, setAnimate] = useState(false);

  // New state for Registration Config
  const [showRegConfigModal, setShowRegConfigModal] = useState(false);
  const [regFormatInput, setRegFormatInput] = useState('');
  const [currentRegFormat, setCurrentRegFormat] = useState('');
  const [saving, setSaving] = useState(false);
  // Grade/Stream config modal
  const [showGradeStreamModal, setShowGradeStreamModal] = useState(false);
  const [gsRows, setGsRows] = useState([]);
  const [gsLoading, setGsLoading] = useState(false);
  const [gsSavingAll, setGsSavingAll] = useState(false);
  
  const fetchGradeStreams = async () => {
    try {
      const res = await api.get('gradestreams/');
      setGsRows(Array.isArray(res.data) ? res.data.map(g => ({ id: g.id, grade: g.grade, stream: g.stream })) : []);
    } catch (err) {
      showMessage({ type: 'error', text: 'Failed to load grade/stream config.' });
    }
  };
  const [newGsGrade, setNewGsGrade] = useState('');
  const [newGsStream, setNewGsStream] = useState('');

  const [formData, setFormData] = useState({
    registration_no: '', assessment_number: '', first_name: '', second_name: '', surname: '',
    gender: '', phone: '', email: '', address: '', grade: '', stream: '', date_of_birth: '',
    parent_name: '', class_teacher: '',
  });

  const [filterStream, setFilterStream] = useState('all');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterSort, setFilterSort] = useState('name_asc');
  const [filterGender, setFilterGender] = useState('all');
  const [filteredStudents, setFilteredStudents] = useState([]);

  const { grades, streams } = useGradesAndStreams(api, 
    showModal ? formData.grade : (filterGrade === 'all' ? '' : filterGrade)
  );

  useEffect(() => {
    setTimeout(() => setAnimate(true), 80);
    fetchStudents();
    fetchRegConfig(); // Fetch initial registration config
  }, []);

  useEffect(() => {
    let filtered = [...studentList];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        (s.first_name && s.first_name.toLowerCase().includes(q)) ||
        (s.surname && s.surname.toLowerCase().includes(q)) ||
        (s.registration_no && String(s.registration_no).toLowerCase().includes(q))
      );
    }
    if (filterGender !== 'all') filtered = filtered.filter(s => s.gender === filterGender);
    if (filterStream !== 'all') filtered = filtered.filter(s => s.stream === filterStream);
    if (filterGrade !== 'all') filtered = filtered.filter(s => s.grade === filterGrade);
    switch (filterSort) {
      case 'name_asc': filtered.sort((a, b) => a.first_name.localeCompare(b.first_name)); break;
      case 'name_desc': filtered.sort((a, b) => b.first_name.localeCompare(a.first_name)); break;
      case 'reg_asc': filtered.sort((a, b) => String(a.registration_no).localeCompare(String(b.registration_no))); break;
      case 'reg_desc': filtered.sort((a, b) => String(b.registration_no).localeCompare(String(a.registration_no))); break;
      default: break;
    }
    setFilteredStudents(filtered);
  }, [studentList, filterStream, filterGrade, filterSort, filterGender, searchQuery]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get('students/');
      setStudentList(response.data.students || []);
    } catch (err) {
      showMessage({ type: 'error', text: 'Failed to fetch students. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchRegConfig = async () => {
    try {
      const res = await api.get('students/next-registration/');
      setCurrentRegFormat(res.data?.current_format || '');
      setRegFormatInput(res.data?.current_format || ''); // Set input field to current format
    } catch (err) {
      console.error('Failed to fetch registration config:', err);
    }
  };

  const fetchNextRegNo = async () => {
    try {
      const res = await api.get('students/next-registration/'); // Use the new endpoint
      setFormData(prev => ({ ...prev, registration_no: res.data?.next_registration_number || '' }));
    } catch (err) {
      console.error('Failed to fetch next registration number:', err);
      setFormData(prev => ({ ...prev, registration_no: '' })); // Clear if error
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleAddStudent = () => {
    setModalMode('add');
    setFormData({ registration_no: '', assessment_number: '', first_name: '', second_name: '', surname: '', gender: '', phone: '', email: '', address: '', grade: '', stream: '', date_of_birth: '', parent_name: '', class_teacher: '' });
    setSelectedFile(null);
    setShowModal(true);
    fetchNextRegNo(); // Generate next reg no when adding a new student
  };

  const handleEditStudent = (student) => {
    setModalMode('edit');
    setSelectedStudent(student);
    setFormData({
      first_name: student.first_name, second_name: student.second_name || '',
      registration_no: student.registration_no, // Keep existing reg_no for edit
      assessment_number: student.assessment_number || '',
      surname: student.surname, gender: student.gender, phone: student.phone, email: student.email || '',
      address: student.address || '', grade: student.grade, stream: student.stream,
      date_of_birth: student.date_of_birth || '',
      parent_name: student.parent_name || '',
      class_teacher: student.class_teacher || '',
      profile_image: student.profile_image || null,
    });
    setSelectedFile(null);
    setShowModal(true);
  };

  const handleSaveStudent = async () => {
    const required = ['first_name','second_name','surname','gender','date_of_birth','grade','stream','phone','email','address','parent_name'];
    const missing = required.filter(f => !formData[f]);
    if (missing.length > 0) { alert(`Please fill in: ${missing.join(', ')}`); return; }

    setSaving(true);
    const data = new FormData();
    Object.keys(formData).forEach(key => {
      if (key === 'profile_image') return; // Skip existing URL
      if (formData[key] !== null && formData[key] !== undefined) {
        data.append(key, formData[key]);
      }
    });
    if (selectedFile) {
      data.append('profile_image', selectedFile);
    }

    try {
      if (modalMode === 'add') {
        await api.post('students/', data, { headers: { 'Content-Type': 'multipart/form-data' } });
        showMessage({ type: 'success', text: 'Student added successfully!' });
      } else {
        await api.patch(`students/${selectedStudent.registration_no}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
        showMessage({ type: 'success', text: 'Student updated successfully!' });
      }
      setShowModal(false);
      setSelectedFile(null);
      fetchStudents();
    } catch (err) {
      showMessage({ type: 'error', text: 'Failed to save student: ' + (err.response?.data?.error || err.message) });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (student) => { setDeleteTarget(student); setShowDeleteConfirm(true); };

  const handleConfirmDelete = async () => {
    setSaving(true);
    try {
      await api.delete(`students/${deleteTarget.registration_no}/`);
      setShowDeleteConfirm(false); setDeleteTarget(null);
      showMessage({ type: 'success', text: 'Student deleted successfully!' });
      fetchStudents();
    } catch (err) {
      alert("Failed to delete: " + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
      setShowDeleteConfirm(false); setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRegConfig = async () => {
    if (!regFormatInput) {
      alert('Registration format cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      const response = await api.post('students/config-reg-no/', { reg_format: regFormatInput });
      setCurrentRegFormat(response.data.current_format);
      showMessage({ type: 'success', text: 'Registration format updated successfully!' });
      setShowRegConfigModal(false);
      fetchNextRegNo(); // Update the next registration number based on new format
    } catch (err) {
      showMessage({ type: 'error', text: 'Failed to save registration format: ' + (err.response?.data?.error || err.message) });
    } finally {
      setSaving(false);
    }
  };

  // Profile modal handlers and data fetch
  const openProfileModal = (student) => {
    setShowProfileModal(true);
    setProfileData(prev => ({ ...prev, personal: student }));
    fetchProfileData(student.registration_no);
  };

  const closeProfileModal = () => {
    setShowProfileModal(false);
    setProfileData({ personal: null, fees: [], attendance: [], leaves: [], academics: {} });
  };

  const fetchProfileData = async (registration_no) => {
    setProfileLoading(true);
    const results = { personal: null, fees: [], attendance: [], leaves: [], academics: {} };
    try {
      // Parallel requests; endpoints may vary so handle gracefully
      const calls = [
        api.get(`students/${registration_no}/`),
        api.get(`fees/?registration_no=${registration_no}`),
        api.get(`leaves/?registration_no=${registration_no}`),
        api.get(`attendance/all/`, { params: { search: registration_no, limit: 200 } }),
        api.get(`academics/cbc/student/${registration_no}/strands/`).catch(() => null),
      ];
      const settled = await Promise.allSettled(calls);
      if (settled[0].status === 'fulfilled') {
        results.personal = settled[0].value.data;
      }
      if (settled[1].status === 'fulfilled') {
        const d = settled[1].value.data;
        results.fees = Array.isArray(d) ? d : (d.fees || d.records || []);
      }
      if (settled[2].status === 'fulfilled') {
        const d = settled[2].value.data;
        results.leaves = Array.isArray(d) ? d : (d.leaves || d.records || []);
      }
      if (settled[3].status === 'fulfilled') {
        const d = settled[3].value.data;
        results.attendance = Array.isArray(d) ? d : (d.records || d.attendance || []);
      }
      if (settled[4].status === 'fulfilled' && settled[4].value) {
        results.academics.strands = settled[4].value.data?.marks || [];
        try {
          const comp = await api.get(`academics/cbc/student/${registration_no}/competencies/`);
          results.academics.competencies = comp.data?.overall_competencies || [];
        } catch { results.academics.competencies = [] }
      }
    } catch (err) {
      console.error('Profile fetch error', err);
    } finally {
      setProfileData(prev => ({ ...prev, ...results }));
      setProfileLoading(false);
    }
  };

  const handlePrintIndividualFee = async (feeId) => {
    try {
      const r = await api.get(`fees/${feeId}/receipt/`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: `receipt_${feeId}.pdf`, style: 'display:none' });
      document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch { showMessage({ type: 'error', text: 'Failed to print receipt' }); }
  };

  const handlePrintIndividualLeave = async (leaveId) => {
    try {
      const r = await api.get(`leaves/${leaveId}/receipt/`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: `leave_pass_${leaveId}.pdf`, style: 'display:none' });
      document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch { showMessage({ type: 'error', text: 'Failed to print leave pass' }); }
  };

  const handlePrintIndividualAttendance = async (term) => {
    if (!profileData.personal?.registration_no) return;
    try {
      showMessage({ type: 'success', text: `Generating ${term} attendance sheet...` });
      const p = new URLSearchParams({ registration_no: profileData.personal.registration_no, term });
      const r = await api.get(`reports/print_attendance_sheet/?${p.toString()}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: `attendance_${profileData.personal.registration_no}.pdf`, style: 'display:none' });
      document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch { showMessage({ type: 'error', text: 'Failed to print attendance sheet' }); }
  };

  const handleResetPassword = async () => {
    if (!profileData.personal?.registration_no) return;
    if (!window.confirm(`Are you sure you want to reset the password for ${profileData.personal.first_name}? The password will be set back to their registration number.`)) return;
    try {
      setProfileLoading(true);
      await api.post(`students/${profileData.personal.registration_no}/reset_password/`);
      showMessage({ type: 'success', text: 'Password reset successful!' });
    } catch (err) {
      showMessage({ type: 'error', text: 'Failed to reset password: ' + (err.response?.data?.error || err.message) });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePrintIndividualReportForm = async (term) => {
    if (!profileData.personal?.registration_no) return;
    try {
      showMessage({ type: 'success', text: `Generating ${term} report form...` });
      const p = new URLSearchParams({ 
        registration_no: profileData.personal.registration_no, 
        term,
        year: new Date().getFullYear()
      });
      const r = await api.get(`reports/student-report-form/?${p.toString()}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const a = Object.assign(document.createElement('a'), { 
        href: url, 
        download: `report_form_${profileData.personal.registration_no}_${term}.pdf`, 
        style: 'display:none' 
      });
      document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch { showMessage({ type: 'error', text: 'Failed to print report form' }); }
  };

  const stats = [
    { label: 'Total Students', value: studentList.length, icon: '🎓', accent: '#6366f1' },
    { label: 'Active Grades', value: grades.length, icon: '🏫', accent: '#0891b2' },
    { label: 'Active Streams', value: streams.length, icon: '📊', accent: '#059669' },
    { label: 'Avg. per Grade', value: grades.length > 0 ? Math.round(studentList.length / grades.length) : 0, icon: '✅', accent: '#d97706' },
  ];

  const getInitials = (first, last) => `${(first||'')[0]||''}${(last||'')[0]||''}`.toUpperCase();

  return (
    <div className={`pd-root ${animate ? 'pd-ready' : ''}`}>
      {/* Ambient blobs */}
      <div className="pd-blob pd-blob-1" />
      <div className="pd-blob pd-blob-2" />

      {/* ── HEADER ── */}
      <header className="pd-header">
        <div className="pd-header-left">
          <div className="pd-header-icon">🎓</div>
          <div>
            <h1 className="pd-title">Student Management</h1>
            <p className="pd-subtitle">Manage student information, registrations, and records</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="pd-config-btn" onClick={() => setShowRegConfigModal(true)} title="Registration Config" disabled={loading}>
            <span className="pd-config-icon">⚙️</span>
            <span>Reg Config</span>
          </button>
          <button className="pd-config-btn" onClick={async () => {
            await fetchGradeStreams();
            setShowGradeStreamModal(true);
          }} title="Grade / Stream Config" disabled={loading}>
            <span className="pd-config-icon">🧭</span>
            <span>Grade Config</span>
          </button>
          <button className="pd-add-btn" onClick={() => navigate('/students/import')} disabled={loading} style={{ background: '#059669' }}>
            <span className="pd-add-icon">📥</span>
            <span>Import Students</span>
          </button>
          <button className="pd-add-btn" onClick={handleAddStudent} disabled={loading}>
            <span className="pd-add-icon">+</span>
            <span>Add New Student</span>
          </button>
        </div>
      </header>

      {/* Alerts */}
      {/* Global messages are displayed by the MessageContext modal */}

      {/* ── STATS ── */}
      <div className="pd-stats-row">
        {stats.map((s, i) => (
          <div key={i} className="pd-stat" style={{ '--acc': s.accent, '--delay': `${i * 0.1}s` }}>
            <div className="pd-stat-icon">{s.icon}</div>
            <div className="pd-stat-info">
              <span className="pd-stat-label">{s.label}</span>
              <span className="pd-stat-value">{s.value}</span>
            </div>
            <div className="pd-stat-line" />
          </div>
        ))}
      </div>

      {/* ── TABLE CARD ── */}
      <div className="pd-table-card">
        {/* Filter bar */}
        <div className="pd-filter-bar">
          <div className="pd-filter-left">
            <div className="pd-search-wrap">
              <span className="pd-search-icon">🔍</span>
              <input
                className="pd-search"
                type="text"
                placeholder="Search name or reg no..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <select className="pd-select" value={filterGender} onChange={e => setFilterGender(e.target.value)}>
              <option value="all">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            <select className="pd-select" value={filterGrade} onChange={e => { setFilterGrade(e.target.value); setFilterStream('all'); }}>
              <option value="all">All Grades</option>
              {grades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <select className="pd-select" value={filterStream} onChange={e => setFilterStream(e.target.value)} disabled={filterGrade === 'all'}>
              <option value="all">All Streams</option>
              {streams.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="pd-filter-right">
            <span className="pd-sort-label">Sort</span>
            <select className="pd-select" value={filterSort} onChange={e => setFilterSort(e.target.value)}>
              <option value="name_asc">Name A→Z</option>
              <option value="name_desc">Name Z→A</option>
              <option value="reg_asc">Reg No. ↑</option>
              <option value="reg_desc">Reg No. ↓</option>
            </select>
            <span className="pd-count">{filteredStudents.length} students</span>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="pd-loading">
            <div className="pd-spinner" />
            <span>Loading students…</span>
          </div>
        ) : (
          <div className="pd-table-wrap">
            <table className="pd-table">
              <thead>
                <tr>
                  <th>IDs</th>
                  <th>Student</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Grade</th>
                  <th>Stream</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length > 0 ? filteredStudents.map((student, i) => (
                  <tr key={student.registration_no} className="pd-row" style={{ '--ri': i }}>
                    <td>
                      <Stack gap={1}>
                        <span className="pd-reg-badge" title="Registration No.">{student.registration_no}</span>
                        {student.assessment_number && <span className="pd-grade-tag" style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)' }} title="Assessment No.">{student.assessment_number}</span>}
                      </Stack>
                    </td>
                    <td>
                      <div className="pd-student-cell">
                        {student.profile_image ? (
                          <img src={student.profile_image} alt="" className="pd-avatar" style={{ objectFit: 'cover' }} />
                        ) : (
                          <div className="pd-avatar">{getInitials(student.first_name, student.surname)}</div>
                        )}
                        <span className="pd-student-name">{student.first_name} {student.surname}</span>
                      </div>
                    </td>
                    <td className="pd-mono">{student.phone}</td>
                    <td className="pd-muted">{student.address || '—'}</td>
                    <td><span className="pd-grade-tag">{student.grade}</span></td>
                    <td><span className="pd-stream-tag">{student.stream}</span></td>
                    <td>
                      <div className="pd-actions">
                        <button className="pd-btn-view" onClick={() => openProfileModal(student)} title="View Profile">👁️</button>
                        <button className="pd-btn-edit" onClick={() => handleEditStudent(student)} title="Edit">✏️</button>
                        <button className="pd-btn-delete" onClick={() => handleDeleteClick(student)} title="Delete">🗑️</button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="7" className="pd-empty">
                      <span className="pd-empty-icon">📭</span>
                      <span>No students found. Add one to get started.</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── ADD / EDIT MODAL ── */}
      {showModal && (
        <div className="pd-overlay" onClick={() => setShowModal(false)}>
          <div className="pd-modal" onClick={e => e.stopPropagation()}>
            <div className="pd-modal-header">
              <div className="pd-modal-title">
                <span className="pd-modal-icon">{modalMode === 'add' ? '➕' : '✏️'}</span>
                <span>{modalMode === 'add' ? 'Add New Student' : 'Edit Student'}</span>
              </div>
              <button className="pd-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="pd-modal-body">
              <div className="pd-form-grid">
                <div className="pd-form-group">
                  <label className="pd-label">Registration Number</label>
                  <input className="pd-input pd-input-disabled" type="text"
                    value={formData.registration_no || selectedStudent?.registration_no || ''} disabled />
                </div>
                <div className="pd-form-group">
                  <label className="pd-label">Assessment Number (NEMIS/UPI)</label>
                  <input className="pd-input" type="text" name="assessment_number" value={formData.assessment_number}
                    onChange={handleInputChange} placeholder="e.g. ABC123XYZ" />
                </div>
                <div className="pd-form-group">
                  <label className="pd-label">First Name <span className="pd-req">*</span></label>
                  <input className="pd-input" type="text" name="first_name" value={formData.first_name}
                    onChange={handleInputChange} placeholder="First name" />
                </div>
                <div className="pd-form-group">
                  <label className="pd-label">Second Name <span className="pd-req">*</span></label>
                  <input className="pd-input" type="text" name="second_name" value={formData.second_name}
                    onChange={handleInputChange} placeholder="Second name" />
                </div>
                <div className="pd-form-group">
                  <label className="pd-label">Surname <span className="pd-req">*</span></label>
                  <input className="pd-input" type="text" name="surname" value={formData.surname}
                    onChange={handleInputChange} placeholder="Surname" />
                </div>
                <div className="pd-form-group">
                  <label className="pd-label">Gender <span className="pd-req">*</span></label>
                  <select className="pd-input" name="gender" value={formData.gender} onChange={handleInputChange}>
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="pd-form-group">
                  <label className="pd-label">Date of Birth <span className="pd-req">*</span></label>
                  <input className="pd-input" type="date" name="date_of_birth" value={formData.date_of_birth}
                    onChange={handleInputChange} />
                </div>
                <div className="pd-form-group">
                  <label className="pd-label">Phone Number <span className="pd-req">*</span></label>
                  <input className="pd-input" type="tel" name="phone" value={formData.phone}
                    onChange={handleInputChange} placeholder="Phone number" />
                </div>
                <div className="pd-form-group">
                  <label className="pd-label">Email Address <span className="pd-req">*</span></label>
                  <input className="pd-input" type="email" name="email" value={formData.email}
                    onChange={handleInputChange} placeholder="email@example.com" />
                </div>
                <div className="pd-form-group">
                  <label className="pd-label">Parent/Guardian Name <span className="pd-req">*</span></label>
                  <input className="pd-input" type="text" name="parent_name" value={formData.parent_name}
                    onChange={handleInputChange} placeholder="Parent/Guardian Name" />
                </div>
                <div className="pd-form-group pd-span-2">
                  <label className="pd-label">Address <span className="pd-req">*</span></label>
                  <input className="pd-input" type="text" name="address" value={formData.address}
                    onChange={handleInputChange} placeholder="Home address" />
                </div>
                <div className="pd-form-group">
                  <label className="pd-label">Grade <span className="pd-req">*</span></label>
                  <select className="pd-input" name="grade" value={formData.grade} onChange={handleInputChange}>
                    <option value="">Select grade</option>
                    {grades.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="pd-form-group">
                  <label className="pd-label">Stream <span className="pd-req">*</span></label>
                  <select className="pd-input" name="stream" value={formData.stream} onChange={handleInputChange} disabled={!formData.grade}>
                    <option value="">Select stream</option>
                    {streams.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="pd-form-group pd-span-2">
                  <label className="pd-label">Profile Image</label>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="pd-modal-thumb-preview">
                      {selectedFile ? (
                        <img src={URL.createObjectURL(selectedFile)} alt="Preview" className="pd-thumb-img" />
                      ) : formData.profile_image ? (
                        <img src={formData.profile_image} alt="Current" className="pd-thumb-img" />
                      ) : (
                        <div className="pd-thumb-placeholder">👤</div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <input className="pd-input" type="file" accept="image/*" onChange={handleFileChange} />
                      {selectedFile ? (
                        <div className="pd-help-text" style={{ color: 'var(--pd-green)' }}>Selected: {selectedFile.name}</div>
                      ) : formData.profile_image ? (
                        <div className="pd-help-text">Existing image loaded. Upload new to replace.</div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="pd-modal-footer">
              <button className="pd-btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="pd-btn-save" onClick={handleSaveStudent} disabled={saving}>
                {saving ? 'Saving...' : (modalMode === 'add' ? 'Add Student' : 'Update Student')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── STUDENT PROFILE MODAL ── */}
      {showProfileModal && (
        <div className="pd-overlay" onClick={closeProfileModal}>
          <div className="pd-modal pd-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="pd-modal-header">
              <div className="pd-modal-title">
                {profileData.personal?.profile_image ? (
                  <img src={profileData.personal.profile_image} className="pd-modal-thumb" alt="" />
                ) : (
                  <span className="pd-modal-icon">👤</span>
                )}
                <div>
                  <div className="pd-modal-main">{profileData.personal?.first_name} {profileData.personal?.surname}</div>
                  <div className="pd-modal-sub">{profileData.personal?.registration_no} {profileData.personal?.assessment_number && `• ${profileData.personal.assessment_number}`} • {profileData.personal?.grade} {profileData.personal?.stream}</div>
                </div>
              </div>
              <button className="pd-modal-close" onClick={closeProfileModal}>✕</button>
            </div>
            <div className="pd-modal-body">
              <div className="pd-profile-tabs">
                {['personal','fees','attendance','leaves','academics','account'].map(tab => (
                  <button key={tab} className={`pd-tab ${profileTab===tab? 'active':''}`} onClick={() => setProfileTab(tab)}>{tab.charAt(0).toUpperCase()+tab.slice(1)}</button>
                ))}
              </div>
              <div className="pd-profile-content">
                {profileLoading ? (
                  <div className="pd-loading"><div className="pd-spinner" /> Loading profile…</div>
                ) : (
                  <>
                    {profileTab === 'personal' && (
                      <div className="pd-profile-section">
                        <Row>
                          <Col md={4} className="pd-profile-pane">
                            <div className="pd-avatar-large">
                              {profileData.personal?.profile_image ? (
                                <img src={profileData.personal.profile_image} alt="Profile" className="pd-profile-img" />
                              ) : (
                                getInitials(profileData.personal?.first_name, profileData.personal?.surname)
                              )}
                            </div>
                            <h4>{profileData.personal?.first_name} {profileData.personal?.surname}</h4>
                            <p className="pd-muted">Reg No: {profileData.personal?.registration_no}</p>
                            <p className="pd-muted">Grade: {profileData.personal?.grade} • {profileData.personal?.stream}</p>
                            <p className="pd-muted">Phone: {profileData.personal?.phone || '—'}</p>
                            <p className="pd-muted">Address: {profileData.personal?.address || '—'}</p>
                          </Col>
                          <Col md={8} className="pd-profile-details">
                            <h5>Summary</h5>
                            <div className="pd-kv-grid">
                              <div><strong>First name</strong><div>{profileData.personal?.first_name}</div></div>
                              <div><strong>Second name</strong><div>{profileData.personal?.second_name}</div></div>
                              <div><strong>Surname</strong><div>{profileData.personal?.surname}</div></div>
                              <div><strong>Assessment Number</strong><div style={{ color: 'var(--amber)' }}>{profileData.personal?.assessment_number || 'N/A'}</div></div>
                              <div><strong>Gender</strong><div>{profileData.personal?.gender}</div></div>
                              <div><strong>Date of birth</strong><div>{profileData.personal?.date_of_birth}</div></div>
                              <div><strong>Class Teacher</strong><div>{profileData.personal?.class_teacher_name || 'N/A'}</div></div>
                            </div>
                          </Col>
                        </Row>
                      </div>
                    )}

                    {profileTab === 'fees' && (
                      <div className="pd-profile-section">
                        <h5>Fee Statements</h5>
                        {profileData.fees.length === 0 ? <p className="pd-muted">No fee records found.</p> : (
                          <div className="pd-table-wrap">
                            <table className="pd-table">
                              <thead><tr><th>Date</th><th>Amount</th><th>Mode</th><th>Term</th><th>Note</th><th>Action</th></tr></thead>
                              <tbody>
                                {profileData.fees.map((f, i) => (
                                  <tr key={i}>
                                    <td className="pd-mono">{f.date_of_payment || f.date}</td>
                                    <td className="pd-bold">Ksh {Number(f.amount||f.collected||0).toLocaleString()}</td>
                                    <td>{f.mode_of_payment||f.mode||'—'}</td>
                                    <td>{f.term||'—'}</td>
                                    <td>{f.note||f.remarks||''}</td>
                                    <td><button className="pd-icon-btn" onClick={() => handlePrintIndividualFee(f.id)} title="Print Receipt">🖨️</button></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {profileTab === 'attendance' && (
                      <div className="pd-profile-section">
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <h5>Attendance Statements</h5>
                          <div style={{display:'flex',gap:'0.5rem'}}>
                            <button className="pd-btn-view" onClick={() => handlePrintIndividualAttendance('Term 1')}>Print t1</button>
                            <button className="pd-btn-view" onClick={() => handlePrintIndividualAttendance('Term 2')}>Print t2</button>
                            <button className="pd-btn-view" onClick={() => handlePrintIndividualAttendance('Term 3')}>Print t3</button>
                          </div>
                        </div>
                        {profileData.attendance.length === 0 ? <p className="pd-muted">No attendance records.</p> : (
                          <div className="pd-table-wrap">
                            <table className="pd-table">
                              <thead><tr><th>Date</th><th>Status</th><th>Remarks</th></tr></thead>
                              <tbody>
                                {profileData.attendance.map((a, i) => (
                                  <tr key={i}><td className="pd-mono">{a.date}</td><td>{a.status || a.attendance_status || '—'}</td><td>{a.remarks || a.notes || ''}</td></tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {profileTab === 'leaves' && (
                      <div className="pd-profile-section">
                        <h5>Leave Statements</h5>
                        {profileData.leaves.length === 0 ? <p className="pd-muted">No leave records.</p> : (
                          <div className="pd-table-wrap">
                            <table className="pd-table">
                              <thead><tr><th>From</th><th>To</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
                              <tbody>
                                {profileData.leaves.map((l, i) => (
                                  <tr key={i}><td className="pd-mono">{l.startDate || l.from}</td><td className="pd-mono">{l.endDate || l.to}</td><td>{l.reason || l.type}</td><td>{l.status || '—'}</td><td><button className="pd-icon-btn" onClick={() => handlePrintIndividualLeave(l.id)} title="Print Leave Pass">🖨️</button></td></tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {profileTab === 'academics' && (
                      <div className="pd-profile-section">
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <h5>Academic Statements</h5>
                          <div style={{display:'flex',gap:'0.5rem'}}>
                            <button className="pd-btn-view" onClick={() => handlePrintIndividualReportForm('Term 1')}>Print Form T1</button>
                            <button className="pd-btn-view" onClick={() => handlePrintIndividualReportForm('Term 2')}>Print Form T2</button>
                            <button className="pd-btn-view" onClick={() => handlePrintIndividualReportForm('Term 3')}>Print Form T3</button>
                          </div>
                        </div>
                        {(!profileData.academics || (Array.isArray(profileData.academics.strands) && profileData.academics.strands.length===0)) ? (
                          <p className="pd-muted" style={{marginTop:'1rem'}}>No academic data available for this student.</p>
                        ) : (
                          <div style={{marginTop:'1.5rem'}}>
                            <h6>Recent Strands</h6>
                            <ul className="pd-list">
                              {(profileData.academics.strands || []).slice(0,10).map((s, i) => (
                                <li key={i} style={{display:'flex',justifyContent:'space-between'}}>
                                  <span>{s.sub_strand} ({s.subject})</span>
                                  <span style={{color:'var(--amber)'}}>{s.level_name}</span>
                                </li>
                              ))}
                            </ul>
                            {profileData.academics.competencies && profileData.academics.competencies.length > 0 && (
                              <div style={{marginTop:'1.5rem'}}>
                                <h6>Core Competencies</h6>
                                <ul className="pd-list small">
                                  {(profileData.academics.competencies || []).map((c, i) => (
                                    <li key={i} style={{display:'flex',justifyContent:'space-between'}}>
                                      <span>{c.competency}</span>
                                      <span style={{color:'#6ee7b7'}}>{c.level_name}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {profileTab === 'account' && (
                      <div className="pd-profile-section">
                        <h5>Account Settings</h5>
                        <div className="pd-kv-grid">
                          <div><strong>Username</strong><div>{profileData.personal?.registration_no}</div></div>
                          <div><strong>Email (Parent)</strong><div>{profileData.personal?.email || 'N/A'}</div></div>
                          <div><strong>Status</strong><div>Active</div></div>
                          <div><strong>Default Password</strong><div>{profileData.personal?.registration_no}</div></div>
                        </div>
                        <div style={{marginTop: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px'}}>
                          <h6>Security Actions</h6>
                          <p className="pd-muted">Resetting the password will set it back to the student's registration number.</p>
                          <button className="pd-btn-danger" onClick={handleResetPassword}>Reset Password to Default</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="pd-modal-footer">
              <button className="pd-btn-cancel" onClick={closeProfileModal}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ── */}
      {showDeleteConfirm && (
        <div className="pd-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="pd-modal pd-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="pd-modal-header pd-modal-header-danger">
              <div className="pd-modal-title">
                <span>🗑️</span><span>Delete Student</span>
              </div>
              <button className="pd-modal-close" onClick={() => setShowDeleteConfirm(false)}>✕</button>
            </div>
            <div className="pd-modal-body">
              <div className="pd-delete-warning">
                <div className="pd-delete-icon">⚠️</div>
                <p>Are you sure you want to delete <strong>{deleteTarget?.first_name} {deleteTarget?.surname}</strong>?</p>
                <p className="pd-delete-sub">This action cannot be undone.</p>
              </div>
            </div>
            <div className="pd-modal-footer">
              <button className="pd-btn-cancel" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="pd-btn-danger" onClick={handleConfirmDelete} disabled={saving}>
                {saving ? 'Deleting...' : 'Delete Student'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REGISTRATION CONFIG MODAL ── */}
      {showRegConfigModal && (
        <div className="pd-overlay" onClick={() => setShowRegConfigModal(false)}>
          <div className="pd-modal pd-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="pd-modal-header">
              <div className="pd-modal-title">
                <span className="pd-modal-icon">⚙️</span><span>Registration Configuration</span>
              </div>
              <button className="pd-modal-close" onClick={() => setShowRegConfigModal(false)}>✕</button>
            </div>
            <div className="pd-modal-body">
              <div className="pd-form-group">
                <label className="pd-label">Current Format:</label>
                <p className="pd-current-format">{currentRegFormat || 'Not set'}</p>
              </div>
              <div className="pd-form-group">
                <label className="pd-label">New Registration Format:</label>
                <input
                  className="pd-input"
                  type="text"
                  value={regFormatInput}
                  onChange={(e) => setRegFormatInput(e.target.value)}
                  placeholder="e.g., SB-"
                />
                <small className="pd-help-text">Use a prefix, e.g., "SB-". Numbers will be appended automatically.</small>
              </div>
            </div>
            <div className="pd-modal-footer">
              <button className="pd-btn-cancel" onClick={() => setShowRegConfigModal(false)}>Cancel</button>
              <button className="pd-btn-save" onClick={handleSaveRegConfig} disabled={saving}>
                {saving ? 'Saving...' : 'Save Format'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── GRADE / STREAM CONFIG MODAL ── */}
      {showGradeStreamModal && (
        <div className="pd-overlay" onClick={() => setShowGradeStreamModal(false)}>
          <div className="pd-modal pd-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="pd-modal-header">
              <div className="pd-modal-title">
                <span className="pd-modal-icon">🧭</span>
                <span>Grade & Stream Configuration</span>
              </div>
              <button className="pd-modal-close" onClick={() => setShowGradeStreamModal(false)}>✕</button>
            </div>
            <div className="pd-modal-body">
              <p className="pd-muted">Manage Grade & Stream entries used by students.</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                <input className="pd-input" placeholder="Grade" value={newGsGrade} onChange={e => setNewGsGrade(e.target.value)} />
                <input className="pd-input" placeholder="Stream" value={newGsStream} onChange={e => setNewGsStream(e.target.value)} />
                <button className="pd-btn-save" onClick={async () => {
                  if (!newGsGrade || !newGsStream) { showMessage({ type: 'error', text: 'Grade and stream are required.' }); return; }
                  try {
                    await api.post('gradestreams/', { grade: newGsGrade.trim(), stream: newGsStream.trim() });
                    showMessage({ type: 'success', text: 'Grade/Stream added.' });
                    setNewGsGrade(''); setNewGsStream('');
                    await fetchGradeStreams();
                  } catch (err) {
                    showMessage({ type: 'error', text: 'Failed to add grade/stream.' });
                  }
                }}>Add Grade-Stream</button>
              </div>
              <div className="pd-table-wrap">
                <table className="pd-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Grade</th>
                      <th>Stream</th>
                      <th style={{ width: 200 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gsRows.map((row, idx) => (
                      <tr key={row.id ?? `new-${idx}`}>
                        <td className="pd-mono">{row.id || 'new'}</td>
                        <td>
                          <input className="pd-input" value={row.grade || ''} onChange={e => {
                            const next = [...gsRows]; next[idx] = { ...next[idx], grade: e.target.value }; setGsRows(next);
                          }} />
                        </td>
                        <td>
                          <input className="pd-input" value={row.stream || ''} onChange={e => {
                            const next = [...gsRows]; next[idx] = { ...next[idx], stream: e.target.value }; setGsRows(next);
                          }} />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="pd-btn-save" onClick={async () => {
                              try {
                                if (row.id) {
                                  await api.put(`gradestreams/${row.id}/`, { grade: row.grade, stream: row.stream });
                                  showMessage({ type: 'success', text: `Updated id ${row.id}` });
                                } else {
                                  const res = await api.post('gradestreams/', { grade: row.grade, stream: row.stream });
                                  showMessage({ type: 'success', text: 'Created new grade/stream' });
                                }
                                await fetchGradeStreams();
                              } catch (err) {
                                showMessage({ type: 'error', text: 'Failed to save grade/stream.' });
                              }
                            }}>{row.id ? 'Update' : 'Create'}</button>

                            {row.id && (
                              <button className="pd-btn-delete" onClick={async () => {
                                if (!confirm('Delete this grade/stream?')) return;
                                try {
                                  await api.delete(`gradestreams/${row.id}/`);
                                  showMessage({ type: 'success', text: 'Deleted.' });
                                  await fetchGradeStreams();
                                } catch (err) { showMessage({ type: 'error', text: 'Delete failed.' }); }
                              }}>Delete</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={4} style={{ paddingTop: 8 }}>
                        <button className="pd-btn-save" onClick={() => setGsRows(prev => ([...prev, { id: null, grade: '', stream: '' }]))}>Add Row</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="pd-modal-footer">
              <button className="pd-btn-cancel" onClick={() => setShowGradeStreamModal(false)}>Close</button>
              <button className="pd-btn-save" onClick={async () => {
                setGsSavingAll(true);
                try {
                  // Bulk create/update
                  for (const r of gsRows) {
                    if (r.id) {
                      await api.put(`gradestreams/${r.id}/`, { grade: r.grade, stream: r.stream });
                    } else if (r.grade || r.stream) {
                      await api.post('gradestreams/', { grade: r.grade, stream: r.stream });
                    }
                  }
                  showMessage({ type: 'success', text: 'Saved grade/stream configuration.' });
                  await fetchGradeStreams();
                  setShowGradeStreamModal(false);
                } catch (err) {
                  showMessage({ type: 'error', text: 'Failed to save configuration.' });
                } finally { setGsSavingAll(false); }
              }}>{gsSavingAll ? 'Saving…' : 'Save All'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}