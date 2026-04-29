import React, { useState, useEffect } from 'react';
import { Spinner, Row, Col, Modal } from 'react-bootstrap';
import api from '../../../../api/api';
import { useMessage } from '../../../../context/MessageContext';
import './Academics.css';

const TERMS = ['Term 1', 'Term 2', 'Term 3'];

const CBC_LABELS = {
  EE:  { label: 'Exceeding Expectations',   color: '#4ade80' },
  ME:  { label: 'Meeting Expectations',     color: '#a5b4fc' },
  AE:  { label: 'Approaching Expectations', color: '#fbbf24' },
  BE:  { label: 'Below Expectations',       color: '#f87171' },
  'N/A':{ label: 'No Data',                color: '#6b7280' },
};

function CbcBadge({ rating = 'N/A' }) {
  const key = CBC_LABELS[rating] ? rating : 'N/A';
  return (
    <span className={`sp-pill cbc-${key}`} style={{ fontFamily: 'DM Mono, monospace' }}>
      {key}
    </span>
  );
}

function extractYoutubeId(url) {
  if (!url) return null;
  // Handle various YouTube URL formats
  const patterns = [
    /(?:v=|\/|embed\/|youtu.be\/|v\/|watch\?v=|&v=)([0-9A-Za-z_-]{11})/,
    /^([0-9A-Za-z_-]{11})$/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export default function StudentPortalAcademics() {
  const { showMessage } = useMessage();

  // ── Data state ──
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [selectedTerm, setSelectedTerm]   = useState('Term 1');
  const [selectedYear, setSelectedYear]   = useState(String(new Date().getFullYear()));
  const [activeTab, setActiveTab]         = useState('subjects');
  const [resourcesList, setResourcesList] = useState([]);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [reportTypeModalOpen, setReportTypeModalOpen] = useState(false);

  // ── Subject detail modal ──
  const [modalOpen, setModalOpen]           = useState(false);
  const [modalSubject, setModalSubject]     = useState(null);
  const [modalLoading, setModalLoading]     = useState(false);
  const [modalStrands, setModalStrands]     = useState([]);
  const [modalCompetencies, setModalCompetencies] = useState([]);
  const [modalView, setModalView]           = useState('strands'); // 'strands' | 'competencies'

  // ── Video / notes modal ──
  const [resourceModalOpen, setResourceModalOpen] = useState(false);
  const [selectedResource, setSelectedResource]   = useState(null);
  const [resourceNote, setResourceNote]           = useState('');
  const [noteLoading, setNoteLoading]             = useState(false);
  const [savingNote, setSavingNote]               = useState(false);

  // ── All notes modal ──
  const [allNotesModalOpen, setAllNotesModalOpen] = useState(false);
  const [allNotes, setAllNotes] = useState([]);
  const [allNotesLoading, setAllNotesLoading] = useState(false);

  // ── Fetch academics ──
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.get(`student-portal/academics/?term=${selectedTerm}&year=${selectedYear}`);
        setData(res.data);
      } catch { showMessage({ type: 'error', text: 'Failed to load academic records.' }); }
      finally { setLoading(false); }
    })();
  }, [selectedTerm, selectedYear]);

  // ── Fetch resources separately ──
  useEffect(() => {
    if (!data) return;
    const embedded = Array.isArray(data.resources) ? data.resources : [];
    (async () => {
      try {
        const rres = await api.get(`student-portal/resources/?term=${selectedTerm}&year=${selectedYear}`);
        const fetched = Array.isArray(rres.data) ? rres.data : rres.data.results || [];
        const map = new Map();
        [...fetched, ...embedded].forEach(r => { if (r && (r.id || r.title)) map.set(r.id ?? r.title, r); });
        setResourcesList(Array.from(map.values()));
      } catch {
        setResourcesList(embedded);
      }
    })();
  }, [selectedTerm, selectedYear, data]);

  // ── Open subject detail modal ──
  async function openSubjectModal(subject, view = 'strands') {
    setModalSubject(subject);
    setModalView(view);
    setModalOpen(true);
    setModalLoading(true);
    setModalStrands([]);
    setModalCompetencies([]);
    try {
      // Strands
      try {
        const sres = await api.get(
          `student-portal/strands/?subject=${encodeURIComponent(subject.subject)}&term=${encodeURIComponent(selectedTerm)}&year=${encodeURIComponent(selectedYear)}`
        );
        setModalStrands(Array.isArray(sres.data.strands) ? sres.data.strands : sres.data.strands || []);
      } catch {
        try {
          const sres2 = await api.get(`teacher-portal/strands/?subject=${encodeURIComponent(subject.subject)}`);
          setModalStrands(Array.isArray(sres2.data) ? sres2.data : sres2.data.results || []);
        } catch { setModalStrands([]); }
      }

      // Competencies
      if (view === 'competencies') {
        const embedded = Array.isArray(data?.competencies)
          ? data.competencies.filter(c => (c.subject || '').toLowerCase() === (subject.subject || '').toLowerCase())
          : [];
        if (embedded.length) {
          setModalCompetencies(embedded);
        } else {
          try {
            const cres = await api.get(
              `student-portal/academics/competencies/?subject=${encodeURIComponent(subject.subject)}&term=${encodeURIComponent(selectedTerm)}&year=${encodeURIComponent(selectedYear)}`
            );
            const list = Array.isArray(cres.data.competencies)
              ? cres.data.competencies
              : (Array.isArray(cres.data) ? cres.data : cres.data.results || []);
            setModalCompetencies(list);
          } catch { setModalCompetencies([]); }
        }
      }
    } catch { showMessage({ type: 'error', text: 'Failed to load details.' }); }
    finally { setModalLoading(false); }
  }

  function closeModal() {
    setModalOpen(false);
    setModalSubject(null);
    setModalStrands([]);
    setModalCompetencies([]);
  }

  // ── All notes modal functions ──
  async function handleOpenAllNotes() {
    setAllNotesLoading(true);
    setAllNotesModalOpen(true);
    try {
      const res = await api.get('student-portal/notes/');
      setAllNotes(Array.isArray(res.data) ? res.data : []);
    } catch {
      showMessage({ type: 'error', text: 'Failed to load your notes.' });
      setAllNotes([]);
    } finally {
      setAllNotesLoading(false);
    }
  }

  function closeAllNotesModal() {
    setAllNotesModalOpen(false);
    setAllNotes([]);
  }

  // ── Open resource (video modal or external link) ──
  async function handleOpenResource(resource) {
    try { await api.get(`student-portal/resources/${resource.id}/track/`); } catch { /* non-critical */ }

    const rtype = resource.type || resource.resource_type;
    showMessage({ type: 'info', text: `Opening ${rtype === 'video' ? 'video' : 'resource'}: "${resource.title || resource.url_or_file}"` });
    const youtubeId = extractYoutubeId(resource.url_or_file);
    console.log('Opening resource:', resource, 'Detected type:', rtype, 'YouTube ID:', youtubeId);

    if (rtype === 'video' && youtubeId) {
      setSelectedResource(resource);
      setResourceModalOpen(true);
      setNoteLoading(true);
      try {
        const res = await api.get(`student-portal/resources/${resource.id}/note/`);
        setResourceNote(res.data.content || '');
      } catch { setResourceNote(''); }
      finally { setNoteLoading(false); }
    } else if (resource.url_or_file) {
      window.open(resource.url_or_file, '_blank');
    } else {
      showMessage({ type: 'error', text: `This resource does not have a valid URL.${youtubeId}` });
    }
  }

  function closeResourceModal() {
    setResourceModalOpen(false);
    setSelectedResource(null);
    setResourceNote('');
  }

  async function handleSaveNote() {
    if (!selectedResource) return;
    setSavingNote(true);
    try {
      const formData = new FormData();
      formData.append('note_content', resourceNote);
      await api.post(`student-portal/resources/${selectedResource.id}/note/`, formData);
      showMessage({ type: 'success', text: 'Note saved successfully!' });
    } catch { showMessage({ type: 'error', text: 'Failed to save note.' }); }
    finally { setSavingNote(false); }
  }

  async function handleDownloadReport(type = 'cba') {
    setDownloadingReport(true);
    setReportTypeModalOpen(false);
    try {
      const endpoint = type === 'summative' 
        ? `academics/summative-individual-report/`
        : `student-portal/academics/report-form/`;
        
      const response = await api.get(
        `${endpoint}?term=${encodeURIComponent(selectedTerm)}&year=${encodeURIComponent(selectedYear)}`,
        { responseType: 'blob' }
      );
      const url  = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', `${type === 'summative' ? 'Summative' : 'CBA'}-Report-${selectedTerm.replace(' ','-')}-${selectedYear}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      showMessage({ type: 'success', text: 'Report form download started.' });
    } catch { showMessage({ type: 'error', text: 'Failed to download report form.' }); }
    finally { setDownloadingReport(false); }
  }

  // ── Loading state ──
  if (loading) return (
    <div className="sp-page d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <Spinner animation="border" className="sp-spinner" />
    </div>
  );

  const {
    overall_mean_score = 0,
    overall_mean_level = 0,
    overall_rating = 'N/A',
    overall_remark = '',
    subjects = [],
    competencies = [],
    year_choices = []
  } = data || {};

  const overallRating = overall_rating;
  const overallInfo   = CBC_LABELS[overallRating] || CBC_LABELS['N/A'];
  console.log('Academics data:', data);
  // ─────────────────────────────────────────────────────────
  return (
    <div className="sp-page">

      {/* ══════════ SUBJECT DETAIL MODAL ══════════ */}
      <Modal show={modalOpen} onHide={closeModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {modalSubject?.subject || 'Details'}
            {modalView === 'competencies' ? ' — Competencies' : ' — Strands & Topics'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalLoading ? (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" className="sp-spinner" />
            </div>
          ) : (
            <>
              {/* ── Strands view ── */}
              {modalView === 'strands' && (
                modalStrands.length === 0 ? (
                  <div className="acad-empty">No strand data available for this subject.</div>
                ) : (
                  <>
                    <div className="acad-modal-section-label">Strands &amp; Sub-strands</div>
                    {modalStrands.map((st, idx) => (
                      <div key={idx} className="acad-strand-block">
                        <div className="acad-strand-name">{st.name || st.title || st.strand || `Strand ${idx + 1}`}</div>
                        {st.sub_strands && st.sub_strands.length > 0 && (
                          <div style={{ marginTop: '0.35rem' }}>
                            {st.sub_strands.map((ss, si) => (
                              <div key={ss.id || si} className="acad-substrand-row">
                                <div>
                                  <span className="acad-substrand-name">{ss.name}</span>
                                  <span className="acad-substrand-parent">({st.name || st.title})</span>
                                </div>
                                <div className="acad-substrand-meta">
                                  <span className="acad-substrand-score">
                                    {ss.score != null ? `${ss.score}%` : '—'}
                                  </span>
                                  <span className="acad-substrand-level">
                                    {ss.level ? `L${ss.level}` : '—'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )
              )}

              {/* ── Competencies view ── */}
              {modalView === 'competencies' && (
                modalCompetencies.length === 0 ? (
                  <div className="acad-empty">No competency data available for this subject.</div>
                ) : (
                  <>
                    <div className="acad-modal-section-label">Competencies</div>
                    {modalCompetencies.map((c, i) => (
                      <div key={i} className="acad-comp-row">
                        <span className="acad-comp-name">{c.name || c.competency}</span>
                        <span className="acad-comp-value">{c.level || c.rating || '—'}</span>
                      </div>
                    ))}
                  </>
                )
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <button className="sp-btn-secondary" onClick={closeModal}>Close</button>
        </Modal.Footer>
      </Modal>

      {/* ══════════ ALL NOTES MODAL ══════════ */}
      <Modal show={allNotesModalOpen} onHide={closeAllNotesModal} centered size="lg" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>My Learning Notes</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {allNotesLoading ? (
            <div className="d-flex justify-content-center py-5"><Spinner className="sp-spinner" /></div>
          ) : allNotes.length === 0 ? (
            <div className="acad-empty">You haven't saved any notes yet.</div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {allNotes.map(note => (
                <div key={note.id} className="sp-card sp-card-body" style={{ background: 'var(--sp-surface-3)' }}>
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div>
                      <div className="sp-resource-title mb-1">{note.resource.title}</div>
                      <div className="sp-resource-type text-capitalize">{note.resource.type}</div>
                    </div>
                    <button
                      className="sp-resource-open-btn"
                      onClick={() => {
                        closeAllNotesModal();
                        setTimeout(() => handleOpenResource(note.resource), 150);
                      }}
                    >
                      ▶ Open Resource
                    </button>
                  </div>
                  <hr className="my-2" style={{ borderColor: 'var(--sp-border)' }} />
                  <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', color: 'var(--sp-text-dim)', maxHeight: 200, overflowY: 'auto' }}>
                    {note.content}
                  </p>
                  <div className="text-end sp-text-muted mt-1" style={{ fontSize: '0.7rem' }}>
                    Last updated: {new Date(note.updated_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* ══════════ VIDEO / NOTES MODAL ══════════ */}
      <Modal show={resourceModalOpen} onHide={closeResourceModal} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>{selectedResource?.title || 'Resource'}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '1.25rem' }}>
          {selectedResource && (
            <div className="video-modal-body">
              {/* Player column */}
              <div className="video-col-player">
                <div className="video-frame-wrap ratio ratio-16x9">
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYoutubeId(selectedResource.url_or_file)}?modestbranding=1&rel=0`}
                    title={selectedResource.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                {/* Fallback for restricted videos */}
                <div className="mt-3 text-center">
                  <p className="sp-text-muted small mb-2">Can't see the video? Some videos restrict playback on third-party sites.</p>
                  <button 
                    className="sp-btn-secondary w-100" 
                    onClick={() => window.open(`https://www.youtube.com/watch?v=${extractYoutubeId(selectedResource.url_or_file)}`, '_blank')}
                  >
                    📺 Watch directly on YouTube
                  </button>
                </div>
                {/* Resource meta below player */}
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--sp-text-muted)' }}>
                    {selectedResource.type || selectedResource.resource_type || 'video'}
                  </span>
                  {selectedResource.subject && (
                    <span className="sp-pill sp-pill-accent" style={{ fontSize: '0.66rem' }}>{selectedResource.subject}</span>
                  )}
                </div>
              </div>

              {/* Notes column */}
              <div className="video-col-notes">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="video-modal-notes-label m-0">📝 My Notes</span>
                  <button className="sp-btn-secondary" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }} onClick={handleOpenAllNotes}>
                    View All Notes
                  </button>
                </div>
                {noteLoading ? (
                  <div className="d-flex justify-content-center align-items-center flex-grow-1" style={{ minHeight: 200 }}>
                    <Spinner animation="border" className="sp-spinner" />
                  </div>
                ) : (
                  <textarea
                    className="video-notes-area"
                    value={resourceNote}
                    onChange={e => setResourceNote(e.target.value)}
                    placeholder="Write down your thoughts and key points here…"
                    style={{ flex: 1 }}
                  />
                )}
                <button className="video-save-btn" onClick={handleSaveNote} disabled={savingNote || noteLoading}>
                  {savingNote
                    ? <><Spinner as="span" size="sm" animation="border" className="me-1" /> Saving…</>
                    : '💾 Save Note'
                  }
                </button>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* ══════════ PAGE HEADER ══════════ */}
      <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-2">
        <div>
          <h2 className="sp-title">Academic Performance</h2>
          <p className="sp-subtitle">CBC performance across all subjects and competencies</p>
        </div>
        <div className="d-flex gap-2 flex-wrap align-items-end">
          <div>
            <label className="sp-label">Term</label>
            <select className="sp-select" style={{ width: 130 }} value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}>
              {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="sp-label">Year</label>
            <select className="sp-select" style={{ width: 110 }} value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
              {(year_choices.length ? year_choices : [selectedYear]).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button className="sp-download-btn" onClick={() => setReportTypeModalOpen(true)} disabled={downloadingReport}>
            {downloadingReport
              ? <><Spinner as="span" size="sm" animation="border" className="me-1" /> Downloading…</>
              : '⬇️ Report'
            }
          </button>
        </div>
      </div>

      {/* ══════════ REPORT TYPE SELECTION MODAL ══════════ */}
      <Modal show={reportTypeModalOpen} onHide={() => setReportTypeModalOpen(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Select Report Format</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4 text-center">
          <p className="mb-4 text-muted">Please choose which report format you would like to generate for {selectedTerm}.</p>
          <div className="d-grid gap-3">
             <button 
                className="sp-btn-primary py-3" 
                onClick={() => handleDownloadReport('cba')}
                style={{ fontSize: '1rem' }}
             >
                📋 CBA Format (Competency Assessment)
             </button>
             <button 
                className="sp-btn-accent py-3" 
                onClick={() => handleDownloadReport('summative')}
                style={{ fontSize: '1rem', background: '#d97706', border: 'none', color: '#fff' }}
             >
                📈 Summative Format (Marks Average)
             </button>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button className="sp-btn-secondary" onClick={() => setReportTypeModalOpen(false)}>Cancel</button>
        </Modal.Footer>
      </Modal>

      {/* ══════════ OVERALL CARD ══════════ */}
      <div className="sp-card sp-card-accent mb-4">
        <div className="sp-card-body d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div className="d-flex align-items-center gap-4">
            <div style={{
              width:72, height:72, borderRadius:'50%',
              background:`${overallInfo.color}22`,
              border:`3px solid ${overallInfo.color}`,
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
            }}>
              <span style={{ fontSize:'1.4rem', fontWeight:800, color:overallInfo.color }}>{overallRating}</span>
            </div>
            <div>
              <div style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.09em', color:'var(--sp-text-muted)' }}>
                Overall Performance
              </div>
              <div style={{ fontSize:'1.3rem', fontWeight:800, color:overallInfo.color }}>{overallInfo.label}</div>
              <div style={{ fontSize:'0.78rem', color:'var(--sp-text-muted)' }}>
                Mean Level: <strong style={{ color:'var(--sp-text)', fontFamily:'DM Mono,monospace' }}>{Number(overall_mean_level).toFixed(2)}</strong>
                <span className="ms-3">Mean Score: <strong style={{ color:'var(--sp-text)', fontFamily:'DM Mono,monospace' }}>{Number(overall_mean_score).toFixed(1)}%</strong></span>
              </div>
            </div>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            {Object.entries(CBC_LABELS).filter(([k]) => k !== 'N/A').map(([key, val]) => (
              <div key={key} style={{
                padding:'0.4rem 0.75rem', background:`${val.color}15`,
                border:`1px solid ${val.color}33`, borderRadius:'var(--sp-radius-xs)',
                textAlign:'center', minWidth:85,
              }}>
                <div style={{ fontSize:'0.72rem', fontWeight:800, color:val.color }}>{key}</div>
                <div style={{ fontSize:'0.6rem', color:'var(--sp-text-muted)', whiteSpace:'nowrap' }}>{val.label.split(' ')[0]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════ TEACHER REMARKS ══════════ */}
      {(data?.class_teacher_comment || data?.headteacher_comment) && (
        <div className="sp-card mb-4" style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
          <div className="sp-card-body d-flex flex-column gap-3">
            {data?.class_teacher_comment && (
              <div>
                <h6 style={{ fontSize: '0.8rem', color: 'var(--sp-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>Class Teacher's Remark</h6>
                <p style={{ fontSize: '0.95rem', color: 'var(--sp-text)', margin: 0, fontStyle: 'italic' }}>"{data.class_teacher_comment}"</p>
              </div>
            )}
            {data?.headteacher_comment && (
              <div>
                <h6 style={{ fontSize: '0.8rem', color: 'var(--sp-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>Headteacher's Remark</h6>
                <p style={{ fontSize: '0.95rem', color: 'var(--sp-text)', margin: 0, fontStyle: 'italic' }}>"{data.headteacher_comment}"</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════ TABS ══════════ */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--sp-border)', marginBottom:'1.25rem' }}>
        {[
          { key:'subjects',     icon:'📚', label:`Subjects (${subjects.length})`        },
          { key:'competencies', icon:'🧩', label:`Competencies (${competencies.length})` },
          { key:'resources',    icon:'🎬', label:`Resources (${resourcesList.length})`   },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            background:'none', border:'none',
            borderBottom:`2px solid ${activeTab===t.key ? 'var(--sp-accent)' : 'transparent'}`,
            padding:'0.65rem 1.25rem', marginBottom:-1,
            fontFamily:'inherit', fontSize:'0.83rem', fontWeight:600,
            color: activeTab===t.key ? '#a5b4fc' : 'var(--sp-text-muted)',
            cursor:'pointer', display:'flex', alignItems:'center', gap:'0.4rem',
            transition:'color 0.2s',
          }}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ══════════ SUBJECTS TAB ══════════ */}
      {activeTab === 'subjects' && (
        subjects.length === 0
          ? <div className="sp-card sp-card-body sp-muted text-center py-5">No subject data for {selectedTerm}.</div>
          : (
            <Row className="g-3">
              {subjects.map((s, i) => {
                const info  = CBC_LABELS[s.rating] || CBC_LABELS['N/A'];
                const score = Number(s.score || 0).toFixed(1);
                return (
                  <Col xs={12} sm={6} lg={4} key={i}>
                    <div className="subj-card">
                      <div className="subj-name">{s.subject}</div>
                      <div className="subj-teacher">👤 {s.teacher || 'N/A'}</div>
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <span className="subj-score" style={{ color:info.color }}>L{Number(s.level || 0).toFixed(1)}</span>
                        <CbcBadge rating={s.rating} />
                      </div>
                      <div className="sp-progress-track" style={{ height:4 }}>
                        <div className="sp-progress-fill" style={{ width:`${Math.min(100,(Number(s.level || 0)/4)*100)}%`, background:info.color }} />
                      </div>
                      <div style={{ fontSize:'0.67rem', color:'var(--sp-text-dim)', marginTop:'0.25rem', marginBottom:'0.25rem' }}>{info.label}</div>
                      <div style={{ fontSize:'0.67rem', color:'var(--sp-text-muted)', marginBottom:'0.85rem' }}>Percentage: <strong>{Number(s.score || 0).toFixed(1)}%</strong></div>
                      <div className="d-flex gap-2">
                        <button className="sp-btn-secondary" style={{ flex:1, fontSize:'0.75rem', padding:'0.35rem 0.5rem' }} onClick={() => openSubjectModal(s,'strands')}>
                          📖 Strands
                        </button>
                        <button className="sp-btn-primary" style={{ flex:1, fontSize:'0.75rem', padding:'0.35rem 0.5rem' }} onClick={() => openSubjectModal(s,'competencies')}>
                          🧩 Competencies
                        </button>
                      </div>
                    </div>
                  </Col>
                );
              })}
            </Row>
          )
      )}

      {/* ══════════ COMPETENCIES TAB ══════════ */}
      {activeTab === 'competencies' && (
        <div className="sp-card">
          <div className="sp-card-header">
            <span className="sp-card-header-title">Core Competencies</span>
          </div>
          <div className="sp-card-body">
            {competencies.length === 0
              ? <p className="sp-muted text-center py-3">No competency records for {selectedTerm}.</p>
              : competencies.map((c, i) => {
                  const info = CBC_LABELS[c.rating] || CBC_LABELS['N/A'];
                  return (
                    <div key={i} className="comp-row">
                      <div>
                        <div className="comp-name">{c.competency}</div>
                        {c.comment && <div className="comp-comment">"{c.comment}"</div>}
                      </div>
                      <div className="d-flex align-items-center gap-2" style={{ flexShrink:0 }}>
                        <span className="sp-mono">{c.level || '—'}</span>
                        <CbcBadge rating={c.rating} />
                      </div>
                    </div>
                  );
                })
            }
          </div>
        </div>
      )}

      {/* ══════════ RESOURCES TAB ══════════ */}
      {activeTab === 'resources' && (
        <div className="sp-card">
          <div className="sp-card-header">
            <span className="sp-card-header-title">Learning Resources</span>
            <span className="sp-mono">{resourcesList.length} items</span>
          </div>
          <div className="sp-card-body">
            {resourcesList.length === 0
              ? <p className="sp-muted text-center py-3">No resources available for {selectedTerm}.</p>
              : (
                <div className="sp-resource-list">
                  {resourcesList.map((r, i) => {
                    const rtype = r.type || r.resource_type || 'book';
                    return (
                      <div key={r.id || i} className="sp-resource-card">
                        <div className="sp-resource-icon">{rtype === 'video' ? '🎬' : '📖'}</div>
                        <div className="sp-resource-details">
                          <div className="sp-resource-title">{r.title}</div>
                          <div className="sp-resource-type">{rtype}</div>
                        </div>
                        <button className="sp-resource-open-btn" onClick={() => handleOpenResource(r)}>
                          ▶ Open
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            }
          </div>
        </div>
      )}

    </div>
  );
}