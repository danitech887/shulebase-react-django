import React, { useEffect, useState, useCallback } from 'react';
import { Spinner, Container, Row, Col, Badge, Form, Modal } from 'react-bootstrap';
import api from '../../../api/api';
import { useMessage } from '../../../context/MessageContext';
import './TeachingProgress.css';

/* ── Tiny icon map ───────────────────────────────── */
const ICONS = {
  teacher:  '⬡',
  chart:    '◈',
  check:    '✓',
  clock:    '◷',
  alert:    '⚠',
  search:   '⌕',
  calendar: '▦',
};
const Ic = ({ n, style }) => (
  <span className="tp-icon" aria-hidden style={{ fontStyle: 'normal', lineHeight: 1, ...style }}>{ICONS[n] || ''}</span>
);

/* ── SVG bar chart thumbnail ─────────────────────── */
function MiniBar({ pct = 0 }) {
  const color =
    pct >= 80 ? 'var(--am-green)' :
    pct >= 50 ? 'var(--am-sky)'   :
    pct >= 25 ? 'var(--am-amber)' : 'var(--am-rose)';
  const barClass =
    pct >= 80 ? 'tp-bar-high'   :
    pct >= 50 ? 'tp-bar-mid'    :
    pct >= 25 ? 'tp-bar-low'    : 'tp-bar-danger';
  return { color, barClass };
}

/* ── Aggregate stats across all teachers ─────────── */
function calcStats(data) {
  let totalSubjects = 0, highCount = 0, midCount = 0, lowCount = 0;
  data.forEach(t => {
    t.subjects.forEach(s => {
      totalSubjects++;
      if (s.percent >= 80) highCount++;
      else if (s.percent >= 40) midCount++;
      else lowCount++;
    });
  });
  return { totalSubjects, highCount, midCount, lowCount };
}

export default function AdminTeachingProgress() {
  const { showMessage } = useMessage();
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [term, setTerm]     = useState('Term 1');
  const [search, setSearch] = useState('');
  
  // Tracker Modal State
  const [showTrackerModal, setShowTrackerModal] = useState(false);
  const [trackerLoading, setTrackerLoading] = useState(false);
  const [curriculumStrands, setCurriculumStrands] = useState([]);
  const [records, setRecords] = useState([]);
  const [activeSubject, setActiveSubject] = useState(null);

  const fetchProgress = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`teachers/teaching-progress/?term=${term}`);
      setData(res.data || []);
    } catch {
      showMessage({ type: 'error', text: 'Failed to fetch teaching progress data.' });
    } finally {
      setLoading(false);
    }
  }, [term, showMessage]);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  const filtered = data.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.registration_no.toLowerCase().includes(search.toLowerCase())
  );

  const stats = calcStats(filtered);

  const openTracker = async (teacher, sub) => {
    setActiveSubject({ ...sub, teacherName: teacher.name, regNo: teacher.registration_no });
    setShowTrackerModal(true);
    setTrackerLoading(true);
    try {
      const res = await api.get(`teachers/teaching-progress/detail/`, {
        params: { 
          reg_no: teacher.registration_no,
          grade: sub.grade,
          subject: sub.subject,
          term: term
        }
      });
      setCurriculumStrands(res.data.curriculum_strands || []);
      setRecords(res.data.progresses || []);
    } catch (err) {
      showMessage({ type: 'error', text: 'Failed to fetch syllabus details.' });
    } finally {
      setTrackerLoading(false);
    }
  };

  /* ── Loader ──────────────────────────────────────── */
  if (loading && data.length === 0) return (
    <div className="t-page tp-admin-page">
      <div className="tp-loader-wrap">
        <div className="tp-spinner" />
        <span style={{ color: 'var(--am-text-3)', fontSize: '0.8rem' }}>Loading progress data…</span>
      </div>
    </div>
  );

  /* ════════════ RENDER ════════════════════════════ */
  return (
    <div className="t-page tp-admin-page">
      <Container fluid>

        {/* ── HEADER ────────────────────────────────── */}
        <div className="tp-admin-header mb-4">
          <Row className="align-items-center gy-3">
            <Col md={5}>
              <h2 className="tp-admin-title">
                Curriculum&nbsp;<span className="tp-title-accent">Coverage</span>&nbsp;Monitor
              </h2>
              <p className="tp-admin-subtitle">
                Teaching progress across all subjects, grades and streams
              </p>
            </Col>
            <Col md={7}>
              <div className="d-flex gap-2 justify-content-md-end align-items-center flex-wrap">

                {/* Summary chips */}
                {!loading && (
                  <div className="tp-summary-bar d-none d-lg-flex">
                    <div className="tp-summary-chip">
                      <span className="chip-dot" style={{ background: 'var(--am-green)' }} />
                      {stats.highCount} On Track
                    </div>
                    <div className="tp-summary-chip">
                      <span className="chip-dot" style={{ background: 'var(--am-amber)' }} />
                      {stats.midCount} In Progress
                    </div>
                    <div className="tp-summary-chip">
                      <span className="chip-dot" style={{ background: 'var(--am-rose)' }} />
                      {stats.lowCount} Behind
                    </div>
                  </div>
                )}

                <Form.Control
                  className="tp-admin-search"
                  placeholder="Search teacher…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <Form.Select
                  className="tp-admin-term-select"
                  value={term}
                  onChange={e => setTerm(e.target.value)}
                >
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                </Form.Select>
              </div>
            </Col>
          </Row>
        </div>

        {/* ── TEACHER CARDS ─────────────────────────── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div className="tp-spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : (
          <Row className="g-3">
            {filtered.length === 0 && (
              <Col xs={12}>
                <div className="tp-empty-monitor">
                  <Ic n="alert" style={{ fontSize: '2.5rem', opacity: 0.2, display: 'block', marginBottom: '1rem' }} />
                  <h3>No records found</h3>
                  <p>Try searching for a different teacher or check the selected term.</p>
                </div>
              </Col>
            )}

            {filtered.map((teacher, idx) => (
              <Col key={idx} xl={6} style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="tp-teacher-card">

                  {/* Card header: avatar + name + badge */}
                  <div className="tp-teacher-info">
                    <div className="tp-teacher-avatar">
                      {(teacher.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="tp-teacher-details">
                      <h4>{teacher.name}</h4>
                      <span className="tp-reg-no">{teacher.registration_no}</span>
                    </div>
                    <div className="ms-auto">
                      <Badge className="tp-badge-subjects">
                        {teacher.subjects.length} subject{teacher.subjects.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>

                  {/* Subject progress rows */}
                  <div className="tp-subject-list">
                    {teacher.subjects.length === 0 && (
                      <div className="tp-no-subjects">
                        No assigned subjects for this term.
                      </div>
                    )}

                    {teacher.subjects.map((sub, sIdx) => {
                      const pct = sub.percent ?? 0;
                      const { color, barClass } = MiniBar({ pct });
                      return (
                        <div key={sIdx} className="tp-subject-row">

                          {/* Subject name + grade */}
                          <div className="tp-sub-meta">
                            <strong title={sub.subject}>{sub.subject}</strong>
                            <small>Gr {sub.grade} · {sub.stream}</small>
                          </div>

                          {/* Progress bar + labels */}
                          <div className="tp-sub-progress">
                            <div className="tp-sub-progress-top">
                              <span className="tp-sub-topics">
                                {sub.completed_topics}/{sub.total_topics || '?'} topics
                              </span>
                              <span className="tp-sub-percent" style={{ color }}>
                                {pct}%
                              </span>
                            </div>
                            <div className="tp-progress-wrap">
                              <div
                                className={`tp-progress-bar ${barClass}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>

                          {/* Inspect Action */}
                          <div className="tp-sub-action">
                            <button 
                              className="tp-inspect-btn" 
                              title="Inspect Syllabus"
                              onClick={() => openTracker(teacher, sub)}
                            >
                              <Ic n="search" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              </Col>
            ))}
          </Row>
        )}

        {/* ── TRACKER MODAL (READ ONLY) ────────────────── */}
        <Modal 
          show={showTrackerModal} 
          onHide={() => setShowTrackerModal(false)}
          size="lg"
          centered
          className="tp-tracker-modal"
        >
          <Modal.Header closeButton className="border-0 pb-0">
            <Modal.Title className="fs-5 fw-bold">
              Syllabus Coverage: <span className="text-teal">{activeSubject?.subject}</span>
              <div className="text-muted small fw-normal mt-1">
                Teacher: {activeSubject?.teacherName} ({activeSubject?.grade} · {activeSubject?.stream})
              </div>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="pt-3">
            {trackerLoading ? (
              <div className="text-center py-5">
                <div className="tp-spinner mx-auto mb-2" />
                <div className="small text-muted">Fetching coverage details...</div>
              </div>
            ) : curriculumStrands.length === 0 ? (
              <div className="tp-empty-monitor py-4">
                <Ic n="alert" style={{ fontSize: '2rem', opacity: 0.2 }} />
                <p className="mt-2 mb-0">No curriculum rubric uploaded for this subject yet.</p>
              </div>
            ) : (
              <div className="tp-curriculum-checklist admin-view">
                {curriculumStrands.map((strand) => (
                  <div key={strand.id} className="tp-strand-group mb-3 border border-secondary border-opacity-10">
                    <div className="tp-strand-title-bar py-2 px-3 bg-secondary bg-opacity-10">
                      <h6 className="mb-0 small fw-bold text-teal">{strand.name}</h6>
                    </div>
                    <div className="tp-substrand-list">
                      {strand.sub_strands.map((sub) => {
                        const progress = records.find(r => r.topic === strand.name && r.sub_topic === sub.name);
                        const isDone = progress?.status === 'Completed';
                        return (
                          <div key={sub.id} className={`tp-substrand-item p-3 border-bottom d-flex align-items-center gap-3 ${isDone ? 'bg-success bg-opacity-5' : ''}`}>
                            <div className={`tp-status-indicator ${isDone ? 'done' : 'pending'}`}>
                              <Ic n={isDone ? 'check' : 'clock'} />
                            </div>
                            <div className="flex-grow-1">
                              <div className="fw-bold small">{sub.name}</div>
                              {sub.description && (
                                <div className="text-muted" style={{ fontSize: '0.75rem', whiteSpace: 'pre-line' }}>
                                  {sub.description}
                                </div>
                              )}
                            </div>
                            {isDone && (
                              <div className="text-end small">
                                <Badge bg="success" className="fw-normal">Completed</Badge>
                                <div className="text-muted" style={{ fontSize: '0.65rem' }}>{progress.date}</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Modal.Body>
        </Modal>

      </Container>
    </div>
  );
}