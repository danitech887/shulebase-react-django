import React, { useEffect, useState, useCallback } from 'react';
import api from '../../../api/api';
import { useMessage } from '../../../context/MessageContext';
import './Roles.css';

export default function TeacherRoles() {
  const { showMessage } = useMessage();
  const [roles, setRoles] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [animate, setAnimate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [grades, setGrades] = useState([]);
  const [streamsByGrade, setStreamsByGrade] = useState({});

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [modalMode, setModalMode] = useState('add');
  const [selectedRole, setSelectedRole] = useState(null);
  const [learningAreas, setLearningAreas] = useState([]);
  const [editingLA, setEditingLA] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [learningAreaData, setLearningAreaData] = useState({
    name: '',
    grade_level: 'Lower Primary',
    category: 'Languages'
  });

  const [formData, setFormData] = useState({
    registration_no: '',
    type_of_teacher: 'Class Teacher',
    grade: '',
    stream: '',
    subjects: []
  });

  const safeGet = useCallback((url) => api.get(url).catch(err => {
    if (err.response && err.response.status === 404) {
      return { data: [] };
    }
    return { data: [] };
  }), []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, teachersRes, streamsRes, gradesRes, learningAreasFallbackRes] = await Promise.all([
        safeGet('teachers/roles/'),
        safeGet('teachers/'),
        safeGet('streams/'),
        safeGet('grades/'),
        safeGet('teachers/roles/?is_learning_area=true')
      ]);

      setRoles(Array.isArray(rolesRes.data) ? rolesRes.data.filter(r => r.id) : []);

      // Try dedicated learning-areas endpoint first (handled below as fallback), but keep roles fallback ready
      let learningAreasData = [];
      // We'll attempt to fetch dedicated endpoint separately (some deployments expose teachers/learning-areas/)
      try {
        const laRes = await safeGet('teachers/learning-areas/');
        if (Array.isArray(laRes.data) && laRes.data.length > 0) learningAreasData = laRes.data;
      } catch (e) {
        // ignore
      }
      // If dedicated endpoint empty, use fallback from roles query
      if (learningAreasData.length === 0 && Array.isArray(learningAreasFallbackRes.data)) {
        learningAreasData = learningAreasFallbackRes.data.map(r => ({ id: r.id, name: r.name, grade_level: r.grade_level || '', category: r.category || '' }));
      }
      setLearningAreas(Array.isArray(learningAreasData) ? learningAreasData : []);

      let fetchedStreams = {};
      let fetchedGrades = [];
      // If streams endpoint provides mapping or grades, use them; otherwise use grades endpoint
      if (streamsRes.data?.streams_by_grade) {
        fetchedStreams = streamsRes.data.streams_by_grade;
        fetchedGrades = streamsRes.data.grades || Object.keys(fetchedStreams);
      } else {
        fetchedStreams = { 'all': streamsRes.data?.streams || [] };
        fetchedGrades = gradesRes.data?.grades || [];
      }
      setGrades(fetchedGrades);
      setStreamsByGrade(fetchedStreams);

      let fetchedTeachers = teachersRes.data;
      if (fetchedTeachers && typeof fetchedTeachers === 'object' && !Array.isArray(fetchedTeachers)) {
        fetchedTeachers = fetchedTeachers.results || fetchedTeachers.teachers || fetchedTeachers.data || [];
      }
      setTeachers(Array.isArray(fetchedTeachers) ? fetchedTeachers : []);
    } catch (err) {
      showMessage({ type: 'error', text: 'Failed to load roles data.' });
    } finally {
      setLoading(false);
    }
  }, [showMessage, safeGet]);

  useEffect(() => {
    setTimeout(() => setAnimate(true), 80);
    fetchData();
  }, [fetchData]);

  const openAdd = () => {
    setModalMode('add');
    setFormData({ registration_no: '', type_of_teacher: 'Class Teacher', grade: '', stream: '', subjects: [] });
    setTeacherSearch('');
    setShowModal(true);
  };
  const openConfigModal = () => {
    setLearningAreaData({ name: '', grade_level: 'Lower Primary', category: 'Languages' });
    setEditingLA(null);
    setShowConfigModal(true);
  };

  const handleConfigInput = (e) => {
    setLearningAreaData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleConfigSave = async () => {
    setSaving(true);
    try {
      const payload = { ...learningAreaData, is_learning_area: true };
      if (editingLA) {
        await api.put(`teachers/roles/${editingLA.id}/`, payload);
        showMessage({ type: 'success', text: 'Learning Area updated successfully.' });
      } else {
        await api.post('teachers/roles/', payload);
        showMessage({ type: 'success', text: 'Learning Area configured successfully.' });
      }
      setEditingLA(null);
      setLearningAreaData({ name: '', grade_level: 'Lower Primary', category: 'Languages' });
      fetchData(); 
    } catch (err) {
      showMessage({ type: 'error', text: 'Failed to configure Learning Area: ' + (err.response?.data?.error || err.message) });
    } finally {
      setSaving(false);
    }
  };

  const handleEditLA = (la) => {
    setEditingLA(la);
    setLearningAreaData({
      name: la.name,
      grade_level: la.grade_level,
      category: la.category
    });
  };

  const handleDeleteLA = async (laId) => {
    if (!window.confirm("Are you sure you want to delete this Learning Area?")) return;
    try {
      await api.delete(`teachers/roles/${laId}/?is_learning_area=true`);
      showMessage({ type: 'success', text: 'Learning Area deleted.' });
      fetchData();
    } catch (err) {
      showMessage({ type: 'error', text: 'Failed to delete Learning Area.' });
    }
  };

  const openEdit = (role) => {
    setModalMode('edit');
    setSelectedRole(role);
    setFormData({
      registration_no: role.registration_no || '',
      type_of_teacher: role.type_of_teacher || 'Class Teacher',
      grade: role.grade || '',
      stream: role.stream || '',
      subjects: role.subject ? role.subject.split(',').map(s => s.trim()).filter(Boolean) : []
    });
    setTeacherSearch('');
    setShowModal(true);
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'grade') { next.subjects = []; next.stream = ''; }
      return next;
    });
    // When a teacher is selected, clear the search to collapse the listbox
    if (name === 'registration_no' && value) {
      setTeacherSearch('');
    }
  };

  const handleSave = async () => {
    if (formData.type_of_teacher === 'Class Teacher') {
      const isAlreadyClassTeacher = roles.some(r => 
        r.registration_no === formData.registration_no && 
        r.type_of_teacher === 'Class Teacher' && 
        r.id !== selectedRole?.id
      );
      if (isAlreadyClassTeacher) {
        showMessage({ type: 'error', text: 'This teacher is already assigned as a Class Teacher to another class.' });
        return;
      }
    }

    setSaving(true);
    try {
      const payload = { ...formData, subject: formData.subjects.join(', ') };
      if (modalMode === 'add') {
        await api.post('teachers/roles/', payload);
        showMessage({ type: 'success', text: 'Teacher role added successfully.' });
      } else {
        await api.put(`teachers/roles/${selectedRole.id}/`, payload);
        showMessage({ type: 'success', text: 'Teacher role updated successfully.' });
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      showMessage({ type: 'error', text: 'Save failed: ' + (err.response?.data?.error || err.message) });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (role) => { setDeleteTarget(role); setShowDeleteModal(true); };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`teachers/roles/${deleteTarget.id}/`);
      showMessage({ type: 'success', text: 'Teacher role removed.' });
      setShowDeleteModal(false); setDeleteTarget(null);
      fetchData();
    } catch {
      showMessage({ type: 'error', text: 'Delete failed.' });
    } finally {
      setDeleting(false);
    }
  };

  const filtered = roles.filter(r => {
    if (!r) return false;
    const q = String(searchQuery || '').toLowerCase();
    if (!q) return true;
    return String(r.teacher_name || '').toLowerCase().includes(q) ||
           String(r.registration_no || '').toLowerCase().includes(q) ||
           String(r.type_of_teacher || '').toLowerCase().includes(q);
  });

  const isClassTeacherAssigned = (grade, stream,subject) =>
    roles.some(r => r.type_of_teacher === 'Class Teacher' && r.grade === grade && r.stream === stream &&
      r.subject && r.subject.split(',').map(s => s.trim()).includes(subject) && r.id !== selectedRole?.id);

  const isSubjectAssigned = (grade, stream, subject) => {
    if (!stream) return false;
    return roles.some(r =>
      (r.type_of_teacher === 'Subject Teacher' || r.type_of_teacher === 'Class Teacher') && 
      r.grade === grade && r.stream === stream &&
      r.subject && r.subject.split(',').map(s => s.trim()).includes(subject) && r.id !== selectedRole?.id
    );
  };

  const getSubjectsForGrade = (grade) => {
    if (!grade) return [];
    const g = grade.trim().toLowerCase();

    // Load subjects dynamically if they have been created via the Learning Area configuration
    if (learningAreas && learningAreas.length > 0) {
      if (g.includes('pp') || g.includes('grade 1') || g.includes('grade 2') || g.includes('grade 3')) {
        return learningAreas.filter(la => la.grade_level === 'Lower Primary').map(la => la.name);
      }
      if (g.includes('grade 4') || g.includes('grade 5') || g.includes('grade 6')) {
        return learningAreas.filter(la => la.grade_level === 'Upper Primary').map(la => la.name);
      }
      if (g.includes('grade 7') || g.includes('grade 8') || g.includes('grade 9')) {
        return learningAreas.filter(la => la.grade_level === 'Junior Secondary').map(la => la.name);
      }
    }

    return [];
  };

  const filteredModalTeachers = teachers.filter(t =>
    `${t.first_name} ${t.surname} ${t.registration_no}`.toLowerCase().includes(teacherSearch.toLowerCase())
  );

  const getRoleTypeColor = (type) =>
    type === 'Class Teacher'
      ? { color: '#6ee7b7', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' }
      : { color: '#a5b4fc', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.25)' };

  const getInitials = (name = '') => name.split(' ').map(w => w[0] || '').slice(0, 2).join('').toUpperCase();

  return (
    <div className={`tr-root ${animate ? 'tr-ready' : ''}`}>
      <div className="tr-blob tr-blob-1" />
      <div className="tr-blob tr-blob-2" />

      {/* ── HEADER ── */}
      <header className="tr-header">
        <div className="tr-header-left">
          <div className="tr-header-icon">🎭</div>
          <div>
            <h1 className="tr-title">Teacher Roles</h1>
            <p className="tr-subtitle">Manage roles and assignments for teachers</p>
          </div>
        </div>
        <button className='tr-btn-primary' onClick={openConfigModal}>
          <span>/</span>Learning Area Config
        </button>
        <button className="tr-btn-primary" onClick={openAdd}>
          <span>+</span> Add Role
        </button>
      </header>

      {/* ── TABLE CARD ── */}
      <div className="tr-card">
        {/* Search bar + count */}
        <div className="tr-card-toolbar">
          <div className="tr-search-wrap">
            <span className="tr-search-icon">🔍</span>
            <input
              className="tr-search"
              type="text"
              placeholder="Search by name, reg no, or role type..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <span className="tr-count">{filtered.length} roles</span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="tr-loading">
            <div className="tr-spinner" /><span>Loading roles…</span>
          </div>
        ) : (
          <div className="tr-table-wrap">
            <table className="tr-table">
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Reg No.</th>
                  <th>Role Type</th>
                  <th>Grade &amp; Stream</th>
                  <th>Subjects</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="6" className="tr-empty-cell">No roles found.</td></tr>
                ) : filtered.map((r, i) => {
                  const roleStyle = getRoleTypeColor(r.type_of_teacher);
                  return (
                    <tr key={r.id} className="tr-row" style={{ '--ri': i }}>
                      <td>
                        <div className="tr-teacher-cell">
                          <div className="tr-avatar">{getInitials(r.teacher_name)}</div>
                          <span className="tr-teacher-name">{r.teacher_name}</span>
                        </div>
                      </td>
                      <td><span className="tr-reg-badge">{r.registration_no}</span></td>
                      <td>
                        <span className="tr-role-chip" style={{ color: roleStyle.color, background: roleStyle.bg, borderColor: roleStyle.border }}>
                          {r.type_of_teacher}
                        </span>
                      </td>
                      <td>
                        {r.grade
                          ? <span className="tr-grade-chip">{r.grade}{r.stream ? ` · ${r.stream}` : ''}</span>
                          : <span className="tr-muted">—</span>}
                      </td>
                      <td className="tr-muted tr-subject-cell">{r.subject || '—'}</td>
                      <td>
                        <div className="tr-actions">
                          <button className="tr-btn-edit" onClick={() => openEdit(r)} title="Edit">✏️</button>
                          <button className="tr-btn-delete" onClick={() => confirmDelete(r)} title="Delete">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════ ADD / EDIT MODAL ══════════ */}
      {showModal && (
        <div className="tr-overlay" onClick={() => setShowModal(false)}>
          <div className="tr-modal" onClick={e => e.stopPropagation()}>
            <div className="tr-modal-header">
              <div className="tr-modal-title">
                <span>{modalMode === 'add' ? '➕' : '✏️'}</span>
                {modalMode === 'add' ? 'Assign New Role' : 'Edit Role'}
              </div>
              <button className="tr-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="tr-modal-body">
              {/* Teacher selector */}
              <div className="tr-form-group tr-span-2">
                <label className="tr-label">Teacher</label>
                {modalMode === 'add' && (
                  <div className="tr-search-wrap tr-search-sm">
                    <span className="tr-search-icon">🔍</span>
                    <input
                      className="tr-search"
                      type="text"
                      placeholder="Search by name or reg no..."
                      value={teacherSearch}
                      onChange={e => setTeacherSearch(e.target.value)}
                    />
                  </div>
                )}
                <select
                  className={`tr-input ${modalMode === 'edit' ? 'tr-input-disabled' : ''}`}
                  name="registration_no"
                  value={formData.registration_no}
                  onChange={handleInput}
                  disabled={modalMode === 'edit'}
                  size={modalMode === 'add' && teacherSearch ? 5 : 1}
                >
                  <option value="">— Select Teacher —</option>
                  {filteredModalTeachers.map(t => (
                    <option key={t.registration_no} value={t.registration_no}>
                      {t.first_name} {t.surname} ({t.registration_no})
                    </option>
                  ))}
                </select>
              </div>

              {/* Role type */}
              <div className="tr-form-group tr-span-2">
                <label className="tr-label">Role Type</label>
                <select className="tr-input" name="type_of_teacher" value={formData.type_of_teacher} onChange={handleInput}>
                  <option value="Class Teacher">Class Teacher</option>
                  <option value="Subject Teacher">Subject Teacher</option>
                </select>
              </div>

              {/* Grade + Stream */}
              <div className="tr-form-group">
                <label className="tr-label">Grade</label>
                <select className="tr-input" name="grade" value={formData.grade} onChange={handleInput}>
                  <option value="">— Select Grade —</option>
                  {grades.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div className="tr-form-group">
                <label className="tr-label">Stream</label>
                <select className="tr-input" name="stream" value={formData.stream} onChange={handleInput} disabled={!formData.grade}>
                  <option value="">— Select Stream —</option>
                  {(streamsByGrade[formData.grade] || streamsByGrade['all'] || []).map(s => {
                    
                    const assigned = formData.type_of_teacher === 'Class Teacher' && isClassTeacherAssigned(formData.grade, s);
                    return (
                      <option key={s} value={s} disabled={assigned}>
                        {s}{assigned ? ' (Assigned)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Subjects (Always show if grade selected) */}
              {formData.grade && (
                <div className="tr-form-group tr-span-2">
                  <label className="tr-label">Subjects for {formData.grade}</label>
                  <div className="tr-subjects-grid">
                    {getSubjectsForGrade(formData.grade).length === 0 ? (
                      <span className="tr-muted">No subjects found for this grade.</span>
                    ) : getSubjectsForGrade(formData.grade).map(sub => {
                      const assigned = isSubjectAssigned(formData.grade, formData.stream, sub);
                      const checked = formData.subjects.includes(sub);
                      return (
                        <label
                          key={sub}
                          className={`tr-subject-chip-label ${checked ? 'tr-subject-checked' : ''} ${assigned ? 'tr-subject-disabled' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={assigned || !formData.stream}
                            onChange={(e) => {
                              setFormData(prev => ({
                                ...prev,
                                subjects: e.target.checked
                                  ? [...prev.subjects, sub]
                                  : prev.subjects.filter(s => s !== sub)
                              }));
                            }}
                          />
                          <span>{sub}{assigned ? ' ·  taken' : ''}</span>
                        </label>
                      );
                    })}
                  </div>
                  {!formData.stream && (
                    <p className="tr-hint">Select a stream first to enable subject selection.</p>
                  )}
                </div>
              )}
            </div>

            <div className="tr-modal-footer">
              <button className="tr-btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="tr-btn-save" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : (modalMode === 'add' ? 'Assign Role' : 'Update Role')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ DELETE CONFIRM MODAL ══════════ */}
      {showDeleteModal && deleteTarget && (
        <div className="tr-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="tr-modal tr-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="tr-modal-header tr-modal-header-danger">
              <div className="tr-modal-title"><span>🗑️</span> Remove Role</div>
              <button className="tr-modal-close" onClick={() => setShowDeleteModal(false)}>✕</button>
            </div>
            <div className="tr-modal-body">
              <div className="tr-delete-warning">
                <div className="tr-delete-icon">⚠️</div>
                <p>Remove the <strong>{deleteTarget.type_of_teacher}</strong> role for <strong>{deleteTarget.teacher_name}</strong>?</p>
                <p className="tr-delete-sub">This action cannot be undone.</p>
              </div>
            </div>
            <div className="tr-modal-footer">
              <button className="tr-btn-cancel" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="tr-btn-danger" onClick={handleDelete} disabled={deleting}>{deleting ? 'Removing...' : 'Remove Role'}</button>
            </div>
          </div>
        </div>
      )}

      {/* =========== LEARNING AREA CONFIG MODAL */}
      {showConfigModal && (
        <div className="tr-overlay" onClick={() => setShowConfigModal(false)}>
          <div className="tr-modal" onClick={e => e.stopPropagation()}>
            <div className="tr-modal-header">
              <div className="tr-modal-title">
                <span>{editingLA ? '✏️' : '⚙️'}</span>
                {editingLA ? 'Edit Learning Area' : 'Configure Learning Area'}
              </div>
              <button className="tr-modal-close" onClick={() => setShowConfigModal(false)}>✕</button>
            </div>
            
            <div className="tr-modal-body tr-config-modal-body">
              <div className="tr-form-section tr-span-2">
                <div className="tr-config-form-grid">
                  <div className="tr-form-group tr-span-2">
                    <label className="tr-label">Name</label>
                    <input
                      className="tr-input"
                      name="name" 
                      type="text"
                      value={learningAreaData.name}
                      onChange={handleConfigInput}
                      placeholder="e.g. Environmental Activities"
                    />
                  </div>
                  <div className="tr-form-group">
                    <label className="tr-label">Grade Level</label>
                    <select className="tr-input" name="grade_level" value={learningAreaData.grade_level} onChange={handleConfigInput}>
                      <option value="Lower Primary">Lower Primary</option>
                      <option value="Upper Primary">Upper Primary</option>
                      <option value="Junior Secondary">Junior Secondary</option>
                    </select>
                  </div>
                  <div className="tr-form-group">
                    <label className="tr-label">Category</label>
                    <select className="tr-input" name="category" value={learningAreaData.category} onChange={handleConfigInput}>
                      <option value="Languages">Languages</option>
                      <option value="STEM">STEM</option>
                      <option value="Humanities">Humanities</option>
                      <option value="Creative Arts">Creative Arts</option>
                      <option value="Life Skills">Life Skills</option>
                    </select>
                  </div>
                </div>

                <div className="tr-config-actions mt-3">
                  <button className="tr-btn-save w-100" onClick={handleConfigSave} disabled={saving}>
                    {saving ? 'Saving...' : (editingLA ? 'Update Learning Area' : 'Add Learning Area')}
                  </button>
                  {editingLA && (
                    <button className="tr-btn-cancel w-100 mt-2" onClick={() => { setEditingLA(null); setLearningAreaData({ name: '', grade_level: 'Lower Primary', category: 'Languages' }); }}>
                      Cancel Edit
                    </button>
                  )}
                </div>
              </div>

              <div className="tr-la-list tr-span-2">
                <div className="tr-la-list-header">
                  <h3>Existing Learning Areas</h3>
                  <span className="tr-count">{learningAreas.length}</span>
                </div>
                
                {learningAreas.length === 0 ? (
                  <div className="tr-empty-state">
                    <p className="tr-muted">No learning areas configured yet.</p>
                  </div>
                ) : (
                  <div className="tr-la-table-wrapper">
                    <table className="tr-la-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Grade Level</th>
                          <th>Category</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {learningAreas.map(la => (
                          <tr key={la.id}>
                            <td className="fw-bold">{la.name}</td>
                            <td><span className="tr-grade-chip">{la.grade_level}</span></td>
                            <td><span className="tr-role-chip" style={{ fontSize: '0.65rem' }}>{la.category}</span></td>
                            <td>
                              <div className="tr-actions justify-content-end">
                                <button className="tr-btn-edit" onClick={() => handleEditLA(la)} title="Edit">✏️</button>
                                <button className="tr-btn-delete" onClick={() => handleDeleteLA(la.id)} title="Delete">🗑️</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="tr-modal-footer">
              <button className="tr-btn-cancel" onClick={() => setShowConfigModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}