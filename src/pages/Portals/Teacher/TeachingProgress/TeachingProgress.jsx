import React, { useState, useEffect, useCallback } from 'react';
import { Container, Modal, Form, Spinner, Button, Row, Col } from 'react-bootstrap';
import api from '../../../../api/api';
import { useMessage } from '../../../../context/MessageContext';
import './TeachingProgress.css';

/* ─── Icons ──────────────────────────────────── */
const icons = {
  plus:     '＋',
  edit:     '✎',
  trash:    '⌫',
  chart:    '◈',
  target:   '◎',
  clock:    '◷',
  check:    '✓',
  warn:     '⚠',
  calendar: '◼',
  book:     '◫',
};
const Ic = ({ n, style }) => (
  <span aria-hidden style={{ fontStyle: 'normal', lineHeight: 1, ...style }}>{icons[n] || ''}</span>
);

/* ─── Animated circular ring ─────────────────── */
function RingChart({ pct = 0, size = 52, stroke = 3.5, color = 'var(--c-teal)' }) {
  const r = (50 - stroke) / 2 + 25 - stroke / 2; // inside 100-unit viewBox
  const circ = 2 * Math.PI * r;
  const dash  = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke * 2} />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke={color}
        strokeWidth={stroke * 2}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1.1s cubic-bezier(0.4,0,0.2,1)' }}
      />
    </svg>
  );
}

export default function TeachingProgressManager() {
  const { showMessage } = useMessage();
  const [records, setRecords]           = useState([]);
  const [subjectStats, setSubjectStats] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [term, setTerm]                 = useState('Term 1');
  const [filterGrade, setFilterGrade]   = useState('');
  const [filterStream, setFilterStream] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [curriculumStrands, setCurriculumStrands] = useState([]);
  const [showTrackerModal, setShowTrackerModal] = useState(false);
  const [activeStat, setActiveStat] = useState(null);

  const [showAddModal, setShowAddModal]       = useState(false);
  const [showEditModal, setShowEditModal]     = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);

  const [activeRecord, setActiveRecord] = useState(null);
  const [choices, setChoices] = useState({ grade_choices: [], stream_choices: [], subject_choices: [], term_choices: [] });

  const [isExtracting, setIsExtracting] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [extractedProgress, setExtractedProgress] = useState([]);
  const [uploadSubject, setUploadSubject] = useState('');
  const [uploadGrade, setUploadGrade] = useState('');
  const [uploadStream, setUploadStream] = useState('');

  const emptyNew = { grade: '', stream: '', subject: '', topic: '', sub_topic: '', status: 'Ongoing', date_of_teaching: '', date_finished: '' };
  const [newData, setNewData]       = useState(emptyNew);
  const [updateData, setUpdateData] = useState({});
  const [targetData, setTargetData] = useState({ grade: '', stream: '', subject: '', total_topics: 0 });

  /* ── Fetch ──────────────────────────────────── */
  const fetchProgress = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`teacher-portal/teaching-progress/`, {
        params: { term, grade: filterGrade, stream: filterStream, subject: filterSubject }
      });
      if (res.data) {
        setRecords(res.data.progresses || []);
        setCurriculumStrands(res.data.curriculum_strands || []);
        setSubjectStats(res.data.subject_stats || []);
        setChoices({
          grade_choices:   res.data.grade_choices   || [],
          stream_choices:  res.data.stream_choices  || [],
          subject_choices: res.data.subject_choices || [],
          term_choices:    res.data.term_choices    || ['Term 1', 'Term 2', 'Term 3'],
        });
        
        if (!filterGrade && res.data.grade_choices?.length > 0) {
          setFilterGrade(res.data.grade_choices[0]);
        }
        if (!filterStream && res.data.stream_choices?.length > 0) {
          setFilterStream(res.data.stream_choices[0]);
        }
        if (!filterSubject && res.data.subject_choices?.length > 0) {
          setFilterSubject(res.data.subject_choices[0]);
        }
      }
    } catch { showMessage({ type: 'error', text: 'Failed to load teaching progress.' }); }
    finally { setLoading(false); }
  }, [term, filterGrade, filterStream, filterSubject, showMessage]);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  /* ── Handlers ────────────────────────────────── */
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...newData, term, year: new Date().getFullYear() };
      if (!payload.date_of_teaching) delete payload.date_of_teaching;
      if (!payload.date_finished)    delete payload.date_finished;
      await api.post('teacher-portal/teaching-progress/', payload);
      fetchProgress(); setShowAddModal(false); setNewData(emptyNew);
      showMessage({ type: 'success', text: 'Teaching progress added.' });
    } catch (err) { console.error(err.response?.data); showMessage({ type: 'error', text: 'Failed to add progress.' }); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        topic: updateData.topic, sub_topic: updateData.sub_topic,
        status: updateData.status, subject: updateData.subject, term,
        date_of_teaching: updateData.date_of_teaching || null,
        date_finished:    updateData.date_finished    || null,
      };
      await api.put(`teacher-portal/teaching-progress/${activeRecord.id}/`, payload);
      fetchProgress(); setShowEditModal(false);
      showMessage({ type: 'success', text: 'Progress updated.' });
    } catch { showMessage({ type: 'error', text: 'Error updating progress.' }); }
  };

  const handleSetTarget = async (e) => {
    e.preventDefault();
    try {
      await api.post('teacher-portal/teaching-progress/', { ...targetData, is_target: true, term, year: new Date().getFullYear() });
      fetchProgress(); setShowTargetModal(false);
      showMessage({ type: 'success', text: 'Topic target updated.' });
    } catch { showMessage({ type: 'error', text: 'Failed to set target.' }); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this progress record?')) return;
    try { await api.delete(`teacher-portal/teaching-progress/${id}/`); fetchProgress(); showMessage({ type: 'info', text: 'Record deleted.' }); }
    catch { showMessage({ type: 'error', text: 'Failed to delete.' }); }
  };

  const handleProgressExtract = async (e) => {
    const file = e.target.files[0];
    if (!file || !uploadSubject) return;

    setIsExtracting(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('subject', uploadSubject);

    try {
      const res = await api.post('teacher-portal/teaching-progress/extract-progress/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setExtractedProgress(res.data.extracted_data || []);
      showMessage({ type: 'success', text: 'Progress data extracted!' });
    } catch (err) {
      console.error(err);
      showMessage({ type: 'error', text: 'Failed to extract progress. Please try again.' });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveExtractedProgress = async () => {
    if (!uploadGrade || !uploadStream || !uploadSubject) {
      showMessage({ type: 'warn', text: 'Please select Grade, Stream and Subject first.' });
      return;
    }
    
    try {
      await api.post('teacher-portal/teaching-progress/bulk-create/', {
        progresses: extractedProgress,
        subject: uploadSubject,
        grade: uploadGrade,
        stream: uploadStream,
        term,
        year: new Date().getFullYear()
      });
      showMessage({ type: 'success', text: 'Progress entries saved successfully!' });
      setShowUploadModal(false);
      setExtractedProgress([]);
      fetchProgress();
    } catch (err) {
      showMessage({ type: 'error', text: 'Failed to save progress entries.' });
    }
  };

  const openEdit   = (rec)  => { setActiveRecord(rec); setUpdateData({ ...rec }); setShowEditModal(true); };
  const openTarget = (stat) => { setTargetData({ grade: stat.grade, stream: stat.stream, subject: stat.subject, total_topics: stat.total_topics }); setShowTargetModal(true); };

  const openTracker = (stat) => {
    setFilterGrade(stat.grade);
    setFilterStream(stat.stream);
    setFilterSubject(stat.subject);
    setActiveStat(stat);
    setShowTrackerModal(true);
  };

  /* ── Ring color by pct ───────────────────────── */
  const ringColor = (pct) =>
    pct >= 80 ? 'var(--c-green)' :
    pct >= 50 ? 'var(--c-teal)'  :
    pct >= 25 ? 'var(--c-gold)'  : 'var(--c-rose)';

  /* ── Loader ──────────────────────────────────── */
  if (loading && records.length === 0) return (
    <div className="tp-root t-page tp-loader-wrap">
      <div className="tp-spinner" />
      <span style={{ color: 'var(--c-text-3)', fontSize: '0.8rem' }}>Loading progress…</span>
    </div>
  );

  /* ════════════════ RENDER ════════════════════ */
  return (
    <div className="tp-root t-page">
      <Container>

        {/* ── HEADER ────────────────────────────── */}
        <div className="tp-header-glass mb-4">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div>
              <h2 className="tp-title">
                Teaching&nbsp;<span className="tp-title-accent">Progress</span>
              </h2>
              <p className="tp-subtitle">Track curriculum delivery and topic completion per term</p>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <select className="tp-term-select form-select" style={{ width: 120 }} value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
                <option value="">All Grades</option>
                {choices.grade_choices.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <select className="tp-term-select form-select" style={{ width: 120 }} value={filterStream} onChange={e => setFilterStream(e.target.value)}>
                <option value="">All Streams</option>
                {choices.stream_choices.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select className="tp-term-select form-select" style={{ width: 140 }} value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
                {choices.subject_choices.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                className="tp-term-select form-select"
                value={term}
                onChange={e => setTerm(e.target.value)}
              >
                {(choices.term_choices.length ? choices.term_choices : ['Term 1', 'Term 2', 'Term 3'])
                  .map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button className="tp-btn-ghost-sm border" onClick={() => setShowUploadModal(true)} title="Extract from Record of Work">
                <Ic n="book" /> AI Upload
              </button>
              <button className="tp-btn-add" onClick={() => setShowAddModal(true)}>
                <Ic n="plus" /> Add Entry
              </button>
            </div>
          </div>
        </div>

        {/* ── STAT CARDS ────────────────────────── */}
        <Row className="mb-4 g-3">
          {subjectStats.length === 0 && (
            <Col>
              <div className="tp-empty-analytics">
                <Ic n="warn" style={{ opacity: 0.4, fontSize: '1.4rem', display: 'block', marginBottom: '0.5rem' }} />
                No subject assignments found for this term.
              </div>
            </Col>
          )}
          {subjectStats.map((stat, idx) => (
            <Col key={idx} md={4} style={{ animationDelay: `${idx * 0.07}s` }}>
              <div className="tp-stat-card-premium" style={{ animationDelay: `${idx * 0.08}s` }}>

                {/* Card top row */}
                <div className="tp-card-header">
                  <span className="tp-subject-tag">{stat.subject}</span>
                  <span className="tp-grade-tag">{stat.grade} {stat.stream}</span>
                </div>

                {/* Progress body */}
                <div className="tp-card-body">
                  <div className="d-flex align-items-center justify-content-between gap-3">
                    {/* Number display */}
                    <div>
                      <div className="tp-progress-label">
                        <span className="tp-big-num">{stat.completed_topics}</span>
                        <span className="tp-slash">/</span>
                        <span className="tp-total-num">{stat.total_topics || '?'}</span>
                        <span className="tp-topics-label">topics</span>
                      </div>
                      <div style={{ marginTop: '0.5rem' }}>
                        <span className="tp-percent-badge">{stat.percent ?? 0}%</span>
                      </div>
                    </div>
                    {/* Ring */}
                    <RingChart pct={stat.percent ?? 0} size={58} color={ringColor(stat.percent ?? 0)} />
                  </div>

                  <div className="tp-progress-wrap">
                    <div className="tp-progress-bar" style={{ width: `${stat.percent ?? 0}%` }} />
                  </div>
                </div>

                {/* Footer */}
                <div className="tp-card-footer">
                  <button type="button" className="tp-btn-ghost-sm" onClick={() => openTracker(stat)}>
                    <Ic n="check" /> Update Progress
                  </button>
                  <button type="button" className="tp-btn-ghost-sm" onClick={() => openTarget(stat)}>
                    <Ic n="target" /> Set Target
                  </button>
                </div>
              </div>
            </Col>
          ))}
        </Row>

        {/* ── SECTION LABEL ─────────────────────── */}
        <div className="tp-section-header mb-3">
          <h4><Ic n="calendar" style={{ marginRight: 6, color: 'var(--c-teal)', opacity: 0.7 }} />Recent Entries</h4>
          <div className="tp-section-line" />
          <span style={{ color: 'var(--c-text-3)', fontSize: '0.73rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {records.length} record{records.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── LOGS TABLE ───────────────────────── */}
        <div className="tp-table-container">
            {/* ... rest of the existing table ... */}
          <table className="tp-modern-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Subject · Class</th>
                <th>Topic</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 && (
                <tr className="tp-empty-row">
                  <td colSpan={5}>
                    <span className="tp-empty-icon">◫</span>
                    No records found for this term.
                  </td>
                </tr>
              )}
              {records.map((rec, ri) => {
                const d = rec.date_of_teaching ? new Date(rec.date_of_teaching) : null;
                const statusKey = (rec.status || '').toLowerCase();
                return (
                  <tr key={rec.id} style={{ animationDelay: `${ri * 0.03}s` }}>

                    {/* Date */}
                    <td>
                      {d ? (
                        <div className="tp-date-box">
                          <span className="tp-date-d">{d.getDate()}</span>
                          <span className="tp-date-m">{d.toLocaleString('default', { month: 'short' })}</span>
                        </div>
                      ) : (
                        <div className="tp-date-box" style={{ opacity: 0.35 }}>
                          <span className="tp-date-d">—</span>
                        </div>
                      )}
                    </td>

                    {/* Subject */}
                    <td>
                      <div className="tp-subject-info">
                        <strong>{rec.subject}</strong>
                        <small>{rec.grade} {rec.stream}</small>
                      </div>
                    </td>

                    {/* Topic */}
                    <td>
                      <div className="tp-topic-main">{rec.topic}</div>
                      {rec.sub_topic && <div className="tp-subtopic">{rec.sub_topic}</div>}
                    </td>

                    {/* Status */}
                    <td>
                      <span className={`tp-status-pill ${statusKey}`}>
                        <span className="tp-status-dot" />
                        {rec.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="text-end">
                      <button className="tp-action-btn edit"   onClick={() => openEdit(rec)}    title="Edit">   <Ic n="edit"  /></button>
                      <button className="tp-action-btn delete" onClick={() => handleDelete(rec.id)} title="Delete"><Ic n="trash" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </Container>

      {/* ════════════ ADD ENTRY MODAL ════════════ */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered className="tp-modal">
        <Form onSubmit={handleCreate}>
          <Modal.Header closeButton>
            <Modal.Title>New Teaching Entry</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Grade</Form.Label>
                  <Form.Select required value={newData.grade} onChange={e => setNewData({ ...newData, grade: e.target.value })}>
                    <option value="">Select grade</option>
                    {choices.grade_choices.map(g => <option key={g} value={g}>{g}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Stream</Form.Label>
                  <Form.Select required value={newData.stream} onChange={e => setNewData({ ...newData, stream: e.target.value })}>
                    <option value="">Select stream</option>
                    {choices.stream_choices.map(s => <option key={s} value={s}>{s}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Subject</Form.Label>
              <Form.Select required value={newData.subject} onChange={e => setNewData({ ...newData, subject: e.target.value })}>
                <option value="">Select subject</option>
                {choices.subject_choices.map(s => <option key={s} value={s}>{s}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Topic Name</Form.Label>
              <Form.Control required placeholder="e.g. Addition of Integers" value={newData.topic} onChange={e => setNewData({ ...newData, topic: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Sub-topic <span style={{ color: 'var(--c-text-3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></Form.Label>
              <Form.Control placeholder="e.g. Carrying forward" value={newData.sub_topic} onChange={e => setNewData({ ...newData, sub_topic: e.target.value })} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Status</Form.Label>
              <Form.Select value={newData.status} onChange={e => setNewData({ ...newData, status: e.target.value })}>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <button className="tp-btn-submit" type="submit"><Ic n="check" /> Record Progress</button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ════════════ SET TARGET MODAL ══════════ */}
      <Modal show={showTargetModal} onHide={() => setShowTargetModal(false)} centered className="tp-modal">
        <Form onSubmit={handleSetTarget}>
          <Modal.Header closeButton>
            <Modal.Title>Set Topic Target</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="tp-target-info mb-3">
              <strong>{targetData.subject}</strong> &nbsp;—&nbsp; Grade {targetData.grade} {targetData.stream}
            </div>
            <Form.Group>
              <Form.Label>Total Topics in {term}</Form.Label>
              <Form.Control
                type="number" required min="1"
                value={targetData.total_topics}
                onChange={e => setTargetData({ ...targetData, total_topics: e.target.value })}
              />
              <Form.Text>Used to calculate your completion percentage.</Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowTargetModal(false)}>Cancel</Button>
            <button className="tp-btn-target" type="submit"><Ic n="target" /> Update Target</button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ════════════ EDIT ENTRY MODAL ══════════ */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered className="tp-modal">
        <Form onSubmit={handleUpdate}>
          <Modal.Header closeButton>
            <Modal.Title>Edit Entry</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Topic</Form.Label>
              <Form.Control required value={updateData.topic || ''} onChange={e => setUpdateData({ ...updateData, topic: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Sub-topic</Form.Label>
              <Form.Control value={updateData.sub_topic || ''} onChange={e => setUpdateData({ ...updateData, sub_topic: e.target.value })} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Status</Form.Label>
              <Form.Select value={updateData.status || 'Ongoing'} onChange={e => setUpdateData({ ...updateData, status: e.target.value })}>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <button className="tp-btn-submit" type="submit"><Ic n="check" /> Update Entry</button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ════════════ AI UPLOAD MODAL ══════════ */}
      <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)} size="lg" centered className="tp-modal">
        <Modal.Header closeButton>
          <Modal.Title>AI Progress Identification</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="small text-muted mb-4">
            Upload your Record of Work or Lesson Plan. The AI will identify topics, sub-topics, and dates.
          </p>
          
          <Row className="mb-3 g-2">
            <Col md={4}>
              <Form.Select size="sm" value={uploadGrade} onChange={e => setUploadGrade(e.target.value)}>
                <option value="">Select Grade</option>
                {choices.grade_choices.map(g => <option key={g} value={g}>{g}</option>)}
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Select size="sm" value={uploadStream} onChange={e => setUploadStream(e.target.value)}>
                <option value="">Select Stream</option>
                {choices.stream_choices.map(s => <option key={s} value={s}>{s}</option>)}
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Select size="sm" value={uploadSubject} onChange={e => setUploadSubject(e.target.value)}>
                <option value="">Select Subject</option>
                {choices.subject_choices.map(s => <option key={s} value={s}>{s}</option>)}
              </Form.Select>
            </Col>
          </Row>

          <div className="tp-upload-zone mb-3">
            <input 
              type="file" 
              id="progress-file" 
              hidden 
              onChange={handleProgressExtract}
              disabled={isExtracting || !uploadSubject}
            />
            <label htmlFor="progress-file" className={`tp-upload-label ${(!uploadSubject || isExtracting) ? 'disabled' : ''}`}>
              {isExtracting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Analyzing document...
                </>
              ) : (
                <>
                  <Ic n="plus" style={{ fontSize: '1.2rem' }} />
                  <span>{uploadSubject ? `Upload ${uploadSubject} Record` : 'Select Subject First'}</span>
                </>
              )}
            </label>
          </div>

          {extractedProgress.length > 0 && (
            <div className="tp-extracted-table-wrap">
              <h6 className="mb-3 small fw-bold text-teal">Identified Progress ({extractedProgress.length})</h6>
              <table className="table table-sm table-borderless small tp-extracted-table">
                <thead>
                  <tr className="text-muted" style={{ fontSize: '0.7rem' }}>
                    <th>TOPIC</th>
                    <th>SUB-TOPIC</th>
                    <th>DATE</th>
                    <th>STATUS</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {extractedProgress.map((p, idx) => (
                    <tr key={idx} className="border-bottom border-secondary border-opacity-10">
                      <td>
                        <Form.Control 
                          size="sm" 
                          value={p.topic} 
                          onChange={e => {
                            const newList = [...extractedProgress];
                            newList[idx].topic = e.target.value;
                            setExtractedProgress(newList);
                          }}
                        />
                      </td>
                      <td>
                        <Form.Control 
                          size="sm" 
                          value={p.sub_topic} 
                          onChange={e => {
                            const newList = [...extractedProgress];
                            newList[idx].sub_topic = e.target.value;
                            setExtractedProgress(newList);
                          }}
                        />
                      </td>
                      <td>
                        <Form.Control 
                          size="sm" 
                          type="date"
                          value={p.date_of_teaching || ''} 
                          onChange={e => {
                            const newList = [...extractedProgress];
                            newList[idx].date_of_teaching = e.target.value;
                            setExtractedProgress(newList);
                          }}
                        />
                      </td>
                      <td>
                        <Form.Select 
                          size="sm"
                          value={p.status}
                          onChange={e => {
                            const newList = [...extractedProgress];
                            newList[idx].status = e.target.value;
                            setExtractedProgress(newList);
                          }}
                        >
                          <option value="Completed">Completed</option>
                          <option value="Ongoing">Ongoing</option>
                        </Form.Select>
                      </td>
                      <td>
                        <button 
                          className="btn btn-sm text-danger"
                          onClick={() => {
                            const newList = [...extractedProgress];
                            newList.splice(idx, 1);
                            setExtractedProgress(newList);
                          }}
                        >
                          &times;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUploadModal(false)}>Cancel</Button>
          <button 
            className="tp-btn-submit" 
            disabled={extractedProgress.length === 0}
            onClick={handleSaveExtractedProgress}
          >
            Confirm & Save Records
          </button>
        </Modal.Footer>
      </Modal>

      {/* ════════════ CURRICULUM TRACKER MODAL ══════════ */}
      <Modal show={showTrackerModal} onHide={() => setShowTrackerModal(false)} size="lg" centered className="tp-modal">
        <Modal.Header closeButton>
          <Modal.Title>
            Update Progress: <span className="text-teal">{filterSubject}</span>
            <small className="d-block text-muted" style={{ fontSize: '0.7rem' }}>{filterGrade} {filterStream} · {term}</small>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          <div className="tp-curriculum-tracker p-3" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {curriculumStrands.length === 0 && (
              <div className="tp-empty-analytics p-5">
                <Ic n="warn" style={{ fontSize: '2rem' }} />
                <p className="mt-2">No syllabus strands found for this subject.</p>
              </div>
            )}
            {curriculumStrands.map((strand) => (
              <div key={strand.id} className="tp-strand-group mb-3">
                <div className="tp-strand-title-bar py-2 px-3">
                  <h6 className="mb-0 small fw-bold text-teal">{strand.name}</h6>
                </div>
                <div className="tp-substrand-list">
                  {strand.sub_strands.map((sub) => {
                    const progress = records.find(r => r.topic === strand.name && r.sub_topic === sub.name);
                    return (
                      <div key={sub.id} className="tp-substrand-row py-2 px-3 d-flex align-items-center justify-content-between">
                        <div className="tp-ss-info">
                          <span className="tp-ss-name small fw-medium">{sub.name}</span>
                        </div>
                        <div className="tp-ss-actions d-flex gap-2">
                          <Form.Control 
                            type="date" size="sm" className="tp-date-input border-0 py-0" style={{ width: 110, fontSize: '0.7rem' }}
                            value={progress?.date_of_teaching?.split('T')[0] || ''}
                            onChange={async (e) => {
                              try {
                                await api.post('teacher-portal/teaching-progress/', {
                                  grade: filterGrade, stream: filterStream, subject: filterSubject,
                                  topic: strand.name, sub_topic: sub.name, date_of_teaching: e.target.value,
                                  status: progress?.status || 'Ongoing', term, year: new Date().getFullYear()
                                });
                                fetchProgress();
                              } catch (err) { showMessage({ type: 'error', text: 'Update failed.' }); }
                            }}
                          />
                          <Form.Select 
                            size="sm" className={`tp-status-select border-0 py-0 ${progress?.status?.toLowerCase() || 'not-started'}`}
                            style={{ width: 100, fontSize: '0.7rem' }}
                            value={progress?.status || 'Not Started'}
                            onChange={async (e) => {
                                try {
                                    await api.post('teacher-portal/teaching-progress/', {
                                      grade: filterGrade, stream: filterStream, subject: filterSubject,
                                      topic: strand.name, sub_topic: sub.name, status: e.target.value,
                                      date_of_teaching: progress?.date_of_teaching || new Date().toISOString().split('T')[0],
                                      term, year: new Date().getFullYear()
                                    });
                                    fetchProgress();
                                  } catch (err) { showMessage({ type: 'error', text: 'Update failed.' }); }
                            }}
                          >
                            <option value="Not Started">Not Started</option>
                            <option value="Ongoing">Ongoing</option>
                            <option value="Completed">Completed</option>
                          </Form.Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" size="sm" onClick={() => setShowTrackerModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>

    </div>
  );
}