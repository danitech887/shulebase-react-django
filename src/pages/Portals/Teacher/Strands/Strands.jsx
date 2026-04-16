import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container, Row, Col, Modal, Form, Spinner,
  Stack, Button, Dropdown, ListGroup, Accordion
} from 'react-bootstrap';
import api from '../../../../api/api';
import { useMessage } from '../../../../context/MessageContext';
import './Strands.css';

 
export default function TeacherStrandPortal() {
  const { showMessage } = useMessage();
  const [view, setView]     = useState('list');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({ strands:[], subjects:[], grades:[], streams:[] });
  const [activeSubStrand, setActiveSubStrand] = useState(null);
  const [selectedStrandId, setSelectedStrandId] = useState(null);
  const [selectedSubject, setSelectedSubject]   = useState('');
  const [isEditingSub, setIsEditingSub]         = useState(false);
  const [isEditingStrand, setIsEditingStrand]   = useState(false);
  const [formData, setFormData] = useState({ name:'', subject:'', grade:'', stream:'', description:'' });
  const [showStrandModal, setShowStrandModal]     = useState(false);
  const [showSubStrandModal, setShowSubStrandModal] = useState(false);
  const [showRecordModal, setShowRecordModal]     = useState(false);
  const [showReportModal, setShowReportModal]     = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [recordPayload, setRecordPayload] = useState({ term:'Term 1', assessement_type:'Class Work', out_of:100 });
  const [recordData, setRecordData] = useState({ students:[], scores:{}, remarks:{}, raws:{}, levels:{} });
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [deleteTarget, setDeleteTarget]     = useState(null);
  const [showSummativeModal, setShowSummativeModal] = useState(false);
  const [summativePayload, setSummativePayload] = useState({ grade:'', stream:'', learning_area_id:'', term:'Term 1', exam_type:'Opener', year: new Date().getFullYear() });
  const [summativeData, setSummativeData] = useState({ students:[], marks:{}, subjects:[] });
  const [isSavingSummative, setIsSavingSummative] = useState(false);
  const [isLoadingSummative, setIsLoadingSummative] = useState(false);


  const fetchInitialData = useCallback(async () => {
    try { setLoading(true); const res = await api.get('teacher-portal/strands/'); setDashboardData(res.data); }
    catch { showMessage({ type:'error', text:'Failed to load strands.' }); }
    finally { setLoading(false); }
  }, [showMessage]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  const subjectsGrouped = useMemo(() => {
    const g = {};
    // Ensure all assigned subjects appear even if there are no strands yet
    (dashboardData.subjects || []).forEach(sub => { g[sub] = []; });
    (dashboardData.strands || []).forEach(s => {
      const key = s.subject || 'Unspecified';
      if (!g[key]) g[key] = [];
      g[key].push(s);
    });
    return g;
  }, [dashboardData.strands, dashboardData.subjects]);

  const getCBCLevel = useCallback((pct) => {
    if (pct===''||pct==null||isNaN(Number(pct))) return '';
    const p = Number(pct);
    if (p>=80) return 'Level 4'; if (p>=60) return 'Level 3'; if (p>=40) return 'Level 2'; return 'Level 1';
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!showRecordModal || !activeSubStrand) return;
      try {
        const res = await api.get(`teacher-portal/sub-strands/${activeSubStrand.id}/scores/${activeSubStrand.grade}/${activeSubStrand.stream}/?term=${recordPayload.term}`);
        if (!cancelled) setRecordData({ students:res.data.students||[], scores:res.data.scores||{}, remarks:res.data.remarks||res.data.remark||{}, raws:res.data.raw_marks||{}, levels:res.data.levels||{} });
      } catch { if (!cancelled) setRecordData({ students:[], scores:{}, remarks:{}, raws:{}, levels:{} }); }
    };
    load();
    return () => { cancelled = true; };
  }, [showRecordModal, activeSubStrand, recordPayload.term]);

  useEffect(() => {
    if (!showRecordModal) return;
    const raws = recordData.raws||{};
    const newScores={...recordData.scores}; const newLevels={...recordData.levels};
    Object.keys(raws).forEach(reg => {
      const raw=raws[reg];
      if (raw===''||raw==null||recordPayload.out_of===0) { newScores[reg]=''; newLevels[reg]=''; }
      else { const p=Number(((raw/recordPayload.out_of)*100).toFixed(2)); newScores[reg]=p; newLevels[reg]=getCBCLevel(p); }
    });
    setRecordData(prev => ({...prev, scores:newScores, levels:newLevels}));
  }, [recordPayload.out_of, recordData.raws, showRecordModal, getCBCLevel]);

  useEffect(() => {
    if (!showSummativeModal || !summativePayload.grade || !summativePayload.stream) return;
    const fetchSummativeData = async () => {
      setIsLoadingSummative(true);
      try {
        const res = await api.get(`teacher-portal/learning-area-marks/?grade=${summativePayload.grade}&stream=${summativePayload.stream}&learning_area_id=${summativePayload.learning_area_id}&term=${summativePayload.term}&exam_type=${summativePayload.exam_type}&year=${summativePayload.year}`);
        setSummativeData({
          subjects: res.data.subjects || [],
          students: res.data.students || [],
          marks: res.data.marks || {}
        });
      } catch { setSummativeData(prev => ({ ...prev, students: [], marks: {} })); }
      finally { setIsLoadingSummative(false); }
    };
    fetchSummativeData();
  }, [showSummativeModal, summativePayload.grade, summativePayload.stream, summativePayload.learning_area_id, summativePayload.term, summativePayload.exam_type, summativePayload.year]);


  const handleCreateStrand = async (e) => {
    e.preventDefault();
    try {
      if (isEditingStrand && selectedStrandId) {
        await api.put(`teacher-portal/strands/${selectedStrandId}/`, {...formData, subject:selectedSubject});
        showMessage({type:'success',text:'Strand updated.'});
      } else {
        await api.post('teacher-portal/strands/', {...formData,subject:selectedSubject});
        showMessage({type:'success',text:'Strand created.'});
      }
      setShowStrandModal(false);
      setIsEditingStrand(false);
      setSelectedStrandId(null);
      setFormData({name:'',subject:'',grade:'',stream:'',description:''});
      fetchInitialData();
    } catch {
      showMessage({type:'error',text:isEditingStrand ? 'Error updating strand.' : 'Error creating strand.'});
    }
  };

  const handleSubStrandSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditingSub) { await api.put(`teacher-portal/sub-strands/${activeSubStrand.id}/`,{name:formData.name,description:formData.description}); showMessage({type:'success',text:'Topic updated.'}); }
      else { const strand=dashboardData.strands.find(s=>s.id===selectedStrandId); await api.post(`teacher-portal/strands/${selectedStrandId}/sub-strands/${strand.grade}/${strand.stream}/`,{name:formData.name,description:formData.description}); showMessage({type:'success',text:'Topic added.'}); }
      setShowSubStrandModal(false); setIsEditingSub(false); setFormData({name:'',description:''}); fetchInitialData();
    } catch { showMessage({type:'error',text:'Action failed.'}); }
  };

  const handleSaveRecord = async () => {
    if (!activeSubStrand) return;
    setIsSavingRecord(true);
    try {
      await api.post(`teacher-portal/sub-strands/${activeSubStrand.id}/scores/${activeSubStrand.grade}/${activeSubStrand.stream}/`,{term:recordPayload.term,assessement_type:recordPayload.assessement_type,out_of:recordPayload.out_of,scores:recordData.scores,raw_marks:recordData.raws||{},levels:recordData.levels||{},remarks:recordData.remarks,remark:recordData.remarks});
      showMessage({type:'success',text:'Scores saved'}); setShowRecordModal(false); fetchInitialData();
    } catch { showMessage({type:'error',text:'Failed to save scores'}); }
    finally { setIsSavingRecord(false); }
  };

  const performDeleteTarget = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type==='substrand') await api.delete(`teacher-portal/sub-strands/${deleteTarget.id}/`);
      else await api.delete(`teacher-portal/strands/${deleteTarget.id}/`);
      setShowConfirmDelete(false); setDeleteTarget(null); fetchInitialData(); showMessage({type:'success',text:'Deleted successfully'});
    } catch { showMessage({type:'error',text:'Delete failed'}); }
  };

  const handleDownloadSubjectReport = async (subjectName, format) => {
    try {
      // Find a strand for this subject to get grade/stream if possible, 
      // otherwise use the first one from dashboardData or prompt (simplifying to use first assigned)
      const strand = dashboardData.strands.find(s => s.subject === subjectName);
      if (!strand) {
        showMessage({ type: 'warning', text: 'No grade/stream associated with this subject yet.' });
        return;
      }
      const url = `teacher-portal/reports/subject-aggregated/?subject=${encodeURIComponent(subjectName)}&grade=${encodeURIComponent(strand.grade)}&stream=${encodeURIComponent(strand.stream)}&format=${format}`;
      const response = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: format === 'pdf' ? 'application/pdf' : 'text/csv' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `Subject_Performance_${subjectName}_${strand.grade}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      showMessage({ type: 'error', text: 'Error generating report.' });
    }
  };

  if (loading && view==='list') return (
    <div className="t-page d-flex justify-content-center align-items-center" style={{ minHeight:'60vh' }}>
      <Spinner animation="border" className="t-spinner" /><p className="ms-3 t-muted">Loading…</p>
    </div>
  );

  return (
    <div className="t-page">
      {view==='list' ? (
        <Container>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="t-title mb-0">Subject Management Portal</h2>
            <button className="t-btn-primary" onClick={() => setShowSummativeModal(true)}>Record Summative Marks</button>
          </div>

          <Row>
            {Object.keys(subjectsGrouped).length===0 && <Col className="text-center py-5"><p className="t-muted">No subjects assigned yet.</p></Col>}
            {Object.keys(subjectsGrouped).map(subjectName => (
              <Col lg={6} key={subjectName} className="mb-4">
                <div className="t-card card h-100">
                  <div className="str-card-header d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 fw-bold" style={{ color:'var(--t-text)' }}>{subjectName}</h5>
                    <Stack direction="horizontal" gap={2}>
                      <Dropdown align="end">
                        <Dropdown.Toggle variant="light" size="sm" className="t-btn-outline-blue" style={{ fontSize:'0.72rem' }}>
                          📊 Reports
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item onClick={() => handleDownloadSubjectReport(subjectName, 'pdf')}>Download PDF Summary</Dropdown.Item>
                          <Dropdown.Item onClick={() => handleDownloadSubjectReport(subjectName, 'csv')}>Download CSV Data</Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                      <button className="t-btn-secondary" style={{ fontSize:'0.75rem',padding:'0.3rem 0.7rem' }} onClick={() => { setSelectedSubject(subjectName); setFormData({...formData,subject:subjectName}); setShowStrandModal(true); }}>+ Add Strand</button>
                    </Stack>
                  </div>
                  <div className="card-body">
                    <Accordion flush>
                      {subjectsGrouped[subjectName].map((strand,i) => (
                        <Accordion.Item eventKey={i.toString()} key={strand.id}>
                          <Accordion.Header>
                            <div className="d-flex justify-content-between w-100 pe-3 align-items-center">
                              <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                                <span><strong>{strand.name}</strong></span>
                                <span className="badge t-badge-accent ms-2">{strand.grade} {strand.stream}</span>
                              </div>
                              <div>
                                <Dropdown align="end">
                                  <Dropdown.Toggle variant="light" size="sm" className="border-0" style={{ background:'var(--t-surface-2)',color:'var(--t-text-muted)' }} />
                                  <Dropdown.Menu>
                                    <Dropdown.Item onClick={() => {
                                      // Edit strand
                                      setSelectedStrandId(strand.id);
                                      setSelectedSubject(strand.subject || subjectName);
                                      setFormData({ name: strand.name, subject: strand.subject, grade: strand.grade, stream: strand.stream, description: strand.description });
                                      setIsEditingStrand(true);
                                      setShowStrandModal(true);
                                    }}>Edit Strand</Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item className="text-danger" onClick={() => { setDeleteTarget({ type: 'strand', id: strand.id, name: strand.name }); setShowConfirmDelete(true); }}>Delete Strand</Dropdown.Item>
                                  </Dropdown.Menu>
                                </Dropdown>
                              </div>
                            </div>
                          </Accordion.Header>
                          <Accordion.Body>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <span style={{ fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--t-text-muted)' }}>Topics</span>
                              <button className="t-btn-outline-blue" style={{ fontSize:'0.73rem' }} onClick={() => { setSelectedStrandId(strand.id); setIsEditingSub(false); setFormData({name:'',description:''}); setShowSubStrandModal(true); }}>+ Add Topic</button>
                            </div>
                            <ListGroup variant="flush">
                              {strand.sub_strands?.map(sub => (
                                <ListGroup.Item key={sub.id} className="d-flex justify-content-between align-items-center px-0">
                                  <span className="t-bold" style={{ maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:'0.85rem' }}>{sub.name}</span>
                                  <Stack direction="horizontal" gap={1}>
                                    <button className="t-btn-outline-blue" style={{ fontSize:'0.7rem' }} onClick={() => { setActiveSubStrand({...sub,grade:strand.grade,stream:strand.stream,subject:subjectName}); setView('view-substrand'); }}>View</button>
                                    <Dropdown align="end">
                                      <Dropdown.Toggle variant="light" size="sm" className="border-0" style={{ background:'var(--t-surface-2)',color:'var(--t-text-muted)' }} />
                                      <Dropdown.Menu>
                                        <Dropdown.Item onClick={() => { setActiveSubStrand({...sub,grade:strand.grade,stream:strand.stream}); setRecordData({students:[],scores:{},remarks:{},raws:{},levels:{}}); setShowRecordModal(true); }}>Record Scores</Dropdown.Item>
                                        <Dropdown.Item onClick={() => { setActiveSubStrand(sub); setIsEditingSub(true); setFormData({name:sub.name,description:sub.description}); setShowSubStrandModal(true); }}>Edit</Dropdown.Item>
                                        <Dropdown.Item onClick={() => { setActiveSubStrand({...sub,grade:strand.grade,stream:strand.stream}); setShowReportModal(true); }}>Report</Dropdown.Item>
                                        <Dropdown.Divider />
                                        <Dropdown.Item className="text-danger" onClick={() => { setDeleteTarget({type:'substrand',id:sub.id,name:sub.name,grade:strand.grade,stream:strand.stream}); setShowConfirmDelete(true); }}>Delete</Dropdown.Item>
                                      </Dropdown.Menu>
                                    </Dropdown>
                                  </Stack>
                                </ListGroup.Item>
                              ))}
                            </ListGroup>
                          </Accordion.Body>
                        </Accordion.Item>
                      ))}
                    </Accordion>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      ) : view==='view-substrand' ? (
        <Container><SubStrandDetailView subStrand={activeSubStrand} onBack={() => setView('list')} /></Container>
      ) : view==='scoring' ? (
        <SubStrandScoring subStrand={activeSubStrand} onBack={() => { setView('list'); fetchInitialData(); }} />
      ) : (
        <SubStrandReport subStrand={activeSubStrand} onBack={() => setView('list')} />
      )}

      {/* Strand Modal */}
      <Modal show={showStrandModal} onHide={() => { setShowStrandModal(false); setIsEditingStrand(false); setSelectedStrandId(null); }} centered>
        <Form onSubmit={handleCreateStrand}>
          <Modal.Header closeButton>
            <Modal.Title>{isEditingStrand ? `Edit Strand for ${selectedSubject}` : `New Strand for ${selectedSubject}`}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3"><Form.Label>Strand Name</Form.Label><Form.Control required onChange={e => setFormData({...formData,name:e.target.value})} /></Form.Group>
            <Row>
              <Col><Form.Group className="mb-3"><Form.Label>Grade</Form.Label><Form.Select required onChange={e => setFormData({...formData,grade:e.target.value})}><option value="">Select</option>{dashboardData.grades.map(g=><option key={g} value={g}>{g}</option>)}</Form.Select></Form.Group></Col>
              <Col><Form.Group className="mb-3"><Form.Label>Stream</Form.Label><Form.Select required onChange={e => setFormData({...formData,stream:e.target.value})}><option value="">Select</option>{dashboardData.streams.map(s=><option key={s} value={s}>{s}</option>)}</Form.Select></Form.Group></Col>
            </Row>
          </Modal.Body>
          <Modal.Footer><Button variant="primary" type="submit">{isEditingStrand ? 'Save Changes' : 'Create Strand'}</Button></Modal.Footer>
        </Form>
      </Modal>

      {/* Sub-strand Modal */}
      <Modal show={showSubStrandModal} onHide={() => setShowSubStrandModal(false)} centered>
        <Form onSubmit={handleSubStrandSubmit}>
          <Modal.Header closeButton><Modal.Title>{isEditingSub?'Edit Topic':'Add Topic'}</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3"><Form.Label>Title</Form.Label><Form.Control required value={formData.name} onChange={e => setFormData({...formData,name:e.target.value})} /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Description</Form.Label><Form.Control as="textarea" rows={3} value={formData.description} onChange={e => setFormData({...formData,description:e.target.value})} /></Form.Group>
          </Modal.Body>
          <Modal.Footer><Button variant="primary" type="submit">Save Changes</Button></Modal.Footer>
        </Form>
      </Modal>

      {/* Record Scores Modal */}
      <Modal show={showRecordModal} onHide={() => setShowRecordModal(false)} size="lg" centered>
        <Modal.Header closeButton><Modal.Title>Record Scores: {activeSubStrand?.name}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Row className="mb-3">
              <Col md={4}><Form.Group><Form.Label>Term</Form.Label><Form.Select value={recordPayload.term} onChange={e => setRecordPayload({...recordPayload,term:e.target.value})}><option>Term 1</option><option>Term 2</option><option>Term 3</option></Form.Select></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label>Assessment Type</Form.Label><Form.Select value={recordPayload.assessement_type} onChange={e => setRecordPayload({...recordPayload,assessement_type:e.target.value})}><option>Class Work</option><option>Homework</option><option>Exam</option><option>SBA-Written</option><option>SBA-Project</option><option>SBA-Practical</option></Form.Select></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label>Out Of</Form.Label><Form.Control type="number" value={recordPayload.out_of} onChange={e => setRecordPayload({...recordPayload,out_of:Number(e.target.value)})} /></Form.Group></Col>
            </Row>
            <div style={{ maxHeight:'50vh',overflowY:'auto' }}>
              <table className="t-table table">
                <thead><tr><th>Student</th><th style={{width:140}}>Raw (/{recordPayload.out_of})</th><th style={{width:120}}>%</th><th style={{width:120}}>Level</th><th>Remarks</th></tr></thead>
                <tbody>
                  {recordData.students.map(s => (
                    <tr key={s.registration_no}>
                      <td>{s.first_name} {s.last_name}<div className="t-mono">{s.registration_no}</div></td>
                      <td><Form.Control type="number" min={0} max={recordPayload.out_of} value={recordData.raws?.[s.registration_no]??''} onChange={e => {
                        const raw=e.target.value===''?'':Number(e.target.value); const reg=s.registration_no;
                        const pct=(raw===''||!recordPayload.out_of)?'':Number(((raw/recordPayload.out_of)*100).toFixed(2));
                        setRecordData(prev => ({...prev,raws:{...prev.raws,[reg]:raw},scores:{...prev.scores,[reg]:pct},levels:{...prev.levels,[reg]:getCBCLevel(pct)}}));
                      }} /></td>
                      <td><Form.Control type="number" value={recordData.scores?.[s.registration_no]??''} disabled /></td>
                      <td><Form.Select value={recordData.levels?.[s.registration_no]??''} onChange={e => setRecordData(p=>({...p,levels:{...p.levels,[s.registration_no]:e.target.value}}))}><option value="">Select</option><option>Level 1</option><option>Level 2</option><option>Level 3</option><option>Level 4</option></Form.Select></td>
                      <td><Form.Control value={recordData.remarks[s.registration_no]||''} onChange={e => setRecordData({...recordData,remarks:{...recordData.remarks,[s.registration_no]:e.target.value}})} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRecordModal(false)}>Close</Button>
          <Button variant="success" onClick={handleSaveRecord} disabled={isSavingRecord}>{isSavingRecord?'Saving…':'Save Scores'}</Button>
        </Modal.Footer>
      </Modal>

      {/* Report Modal */}
      <Modal show={showReportModal} onHide={() => setShowReportModal(false)} size="lg" centered>
        <Modal.Header closeButton><Modal.Title>Report: {activeSubStrand?.name}</Modal.Title></Modal.Header>
        <Modal.Body>{activeSubStrand ? <SubStrandReport subStrand={activeSubStrand} onBack={() => setShowReportModal(false)} /> : <p className="t-muted">No data</p>}</Modal.Body>
      </Modal>

      {/* Confirm Delete */}
      <Modal show={showConfirmDelete} onHide={() => setShowConfirmDelete(false)} centered>
        <Modal.Header closeButton><Modal.Title>Confirm Delete</Modal.Title></Modal.Header>
        <Modal.Body>
          <p style={{ color:'var(--t-text)' }}>Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</p>
          {deleteTarget?.grade && <p className="t-muted" style={{ fontSize:'0.8rem' }}>Class: {deleteTarget.grade} — {deleteTarget.stream}</p>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmDelete(false)}>Cancel</Button>
          <Button variant="danger" onClick={performDeleteTarget}>Delete</Button>
        </Modal.Footer>
      </Modal>

      {/* Summative Marks Modal */}
      <Modal show={showSummativeModal} onHide={() => { setShowSummativeModal(false); setSummativePayload({ grade:'', stream:'', learning_area_id:'', term:'Term 1', exam_type:'Opener', year: new Date().getFullYear() }); setSummativeData({ students:[], marks:{}, subjects:[] }); }} size="lg" centered>
        <Modal.Header closeButton><Modal.Title>Summative Assessment Records</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Row className="mb-3">
              <Col md={3}><Form.Group><Form.Label>Grade</Form.Label><Form.Select value={summativePayload.grade} onChange={e => setSummativePayload({...summativePayload, grade:e.target.value, learning_area_id:''})}><option value="">Select</option>{dashboardData.grades.map(g=><option key={g} value={g}>{g}</option>)}</Form.Select></Form.Group></Col>
              <Col md={3}><Form.Group><Form.Label>Stream</Form.Label><Form.Select value={summativePayload.stream} onChange={e => setSummativePayload({...summativePayload, stream:e.target.value, learning_area_id:''})}><option value="">Select</option>{dashboardData.streams.map(s=><option key={s} value={s}>{s}</option>)}</Form.Select></Form.Group></Col>
              <Col md={3}><Form.Group><Form.Label>Subject</Form.Label><Form.Select value={summativePayload.learning_area_id} onChange={e => setSummativePayload({...summativePayload, learning_area_id:e.target.value})} disabled={!summativePayload.grade || !summativePayload.stream}><option value="">Select</option>{summativeData.subjects.map(sub=>(<option key={sub.id} value={sub.id}>{sub.name}</option>))}</Form.Select></Form.Group></Col>
              <Col md={3}><Form.Group><Form.Label>Term</Form.Label><Form.Select value={summativePayload.term} onChange={e => setSummativePayload({...summativePayload, term:e.target.value})}><option>Term 1</option><option>Term 2</option><option>Term 3</option></Form.Select></Form.Group></Col>
            </Row>
            <Row className="mb-4">
               <Col md={6}><Form.Group><Form.Label>Exam Type</Form.Label><Form.Select value={summativePayload.exam_type} onChange={e => setSummativePayload({...summativePayload, exam_type:e.target.value})}><option>Opener</option><option>Mid Term</option><option>End Term</option></Form.Select></Form.Group></Col>
               <Col md={6}><Form.Group><Form.Label>Year</Form.Label><Form.Control type="number" value={summativePayload.year} onChange={e => setSummativePayload({...summativePayload, year:e.target.value})} /></Form.Group></Col>
            </Row>

            {isLoadingSummative ? <div className="text-center py-4"><Spinner animation="border" /></div> : (
              <div style={{ maxHeight:'45vh', overflowY:'auto' }}>
                <table className="t-table table">
                  <thead><tr><th>Student</th><th style={{width:120}}>Marks(0-100)</th><th>Remarks</th></tr></thead>
                  <tbody>
                    {summativeData.students.length === 0 && <tr><td colSpan="3" className="text-center py-4 t-muted">No students found or selection incomplete.</td></tr>}
                    {summativeData.students.map(s => {
                      const entry = summativeData.marks[s.registration_no] || {};
                      return (
                        <tr key={s.registration_no}>
                          <td>{s.first_name} {s.surname} <div className="t-mono" style={{fontSize:'0.7rem'}}>{s.registration_no}</div></td>
                          <td>
                            <Form.Control 
                              type="number" min={0} max={100} 
                              value={entry.marks ?? ''} 
                              onChange={e => setSummativeData(prev => ({
                                ...prev, 
                                marks: { ...prev.marks, [s.registration_no]: { ...entry, marks: e.target.value } } 
                              }))} 
                            />
                          </td>
                          <td>
                            <Form.Control 
                              type="text" placeholder="Remarks..." 
                              value={entry.remark ?? ''} 
                              onChange={e => setSummativeData(prev => ({
                                ...prev, 
                                marks: { ...prev.marks, [s.registration_no]: { ...entry, remark: e.target.value } } 
                              }))} 
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSummativeModal(false)}>Close</Button>
          <Button variant="success" onClick={async () => {
            setIsSavingSummative(true);
            try {
              await api.post('teacher-portal/learning-area-marks/', { ...summativePayload, marks: summativeData.marks });
              showMessage({ type:'success', text:'Summative marks saved.' });
              setShowSummativeModal(false);
            } catch { showMessage({ type:'error', text:'Failed to save marks.' }); }
            finally { setIsSavingSummative(false); }
          }} disabled={isSavingSummative || summativeData.students.length === 0}>{isSavingSummative ? 'Saving...' : 'Save All Marks'}</Button>
        </Modal.Footer>
      </Modal>

    </div>
  );
}

function SubStrandDetailView({ subStrand, onBack }) {
  return (
    <div>
      <button className="t-btn-secondary mb-3" onClick={onBack}>← Back</button>
      <div className="t-card card str-detail-card">
        <div className="str-card-header"><h5 className="mb-0">{subStrand.name}</h5></div>
        <div className="card-body">
          <p><strong style={{ color:'var(--t-text-muted)',fontSize:'0.7rem',textTransform:'uppercase',letterSpacing:'0.07em' }}>Subject</strong><br />{subStrand.subject}</p>
          <p><strong style={{ color:'var(--t-text-muted)',fontSize:'0.7rem',textTransform:'uppercase',letterSpacing:'0.07em' }}>Class</strong><br />{subStrand.grade} — {subStrand.stream}</p>
          <div className="t-divider" />
          <strong style={{ color:'var(--t-text-muted)',fontSize:'0.7rem',textTransform:'uppercase',letterSpacing:'0.07em' }}>Description</strong>
          <p className="mt-1">{subStrand.description || 'No description provided.'}</p>
        </div>
      </div>
    </div>
  );
}

function SubStrandScoring({ subStrand, onBack }) {
  const { showMessage } = useMessage();
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState('Term 1');
  const [data, setData] = useState({ students:[], scores:{}, remarks:{} });
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get(`teacher-portal/sub-strands/${subStrand.id}/scores/${subStrand.grade}/${subStrand.stream}/?term=${term}`); setData({ students:res.data.students||[], scores:res.data.scores||{}, remarks:res.data.remarks||res.data.remark||{} }); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [subStrand, term]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleBulkSave = async () => {
    setIsSaving(true);
    try {
      // normalize scores to numbers and compute levels if not provided
      const scoresPayload = {};
      const levelsPayload = {};
      Object.entries(data.scores || {}).forEach(([reg, val]) => {
        if (val === null || val === undefined || val === '') return;
        const n = Number(val);
        if (Number.isNaN(n)) return;
        scoresPayload[reg] = n;
        let lv = 1;
        if (n >= 80) lv = 4;
        else if (n >= 60) lv = 3;
        else if (n >= 40) lv = 2;
        levelsPayload[reg] = lv;
      });

      await api.post(
        `teacher-portal/sub-strands/${subStrand.id}/scores/${subStrand.grade}/${subStrand.stream}/`,
        { term, scores: scoresPayload, remarks: data.remarks, remark: data.remarks, levels: levelsPayload }
      );
      showMessage({ type: 'success', text: 'Scores recorded!' });
    } catch {
      showMessage({ type: 'error', text: 'Failed to save.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Container>
      <button className="t-btn-secondary mb-3" onClick={onBack}>← Back</button>
      <div className="t-card card mb-4">
        <div className="card-body d-flex justify-content-between align-items-center">
          <div><h4 className="t-bold mb-0" style={{ color:'var(--t-text)' }}>{subStrand.name}</h4><small className="t-muted">{subStrand.grade} — {subStrand.stream}</small></div>
          <select className="t-input t-select" style={{ width:150 }} value={term} onChange={e => setTerm(e.target.value)}><option>Term 1</option><option>Term 2</option><option>Term 3</option></select>
        </div>
      </div>
      {loading ? <Spinner animation="border" className="t-spinner" /> : (
        <div className="t-card card overflow-hidden">
          <table className="t-table table mb-0">
            <thead><tr><th>Student</th><th style={{width:150}}>Score</th><th>Remarks</th></tr></thead>
            <tbody>
              {data.students.map(s => (
                <tr key={s.registration_no}>
                  <td className="t-bold">{s.first_name} {s.last_name}</td>
                  <td><Form.Control type="number" value={data.scores[s.registration_no]||''} onChange={e => setData({...data,scores:{...data.scores,[s.registration_no]:e.target.value}})} /></td>
                  <td><Form.Control value={data.remarks[s.registration_no]||''} onChange={e => setData({...data,remarks:{...data.remarks,[s.registration_no]:e.target.value}})} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button className="t-btn-primary mt-3" onClick={handleBulkSave} disabled={isSaving}>{isSaving?'Saving…':'Record Scores'}</button>
    </Container>
  );
}

function SubStrandReport({ subStrand, onBack }) {
  return (
    <Container>
      {onBack && <button className="t-btn-secondary mb-3" onClick={onBack}>← Back</button>}
      <div className="t-card card str-detail-card">
        <div className="str-card-header"><h5 className="mb-0">Performance Report: {subStrand.name}</h5></div>
        <div className="card-body">
          <p className="t-muted">Grade: {subStrand.grade} | Stream: {subStrand.stream}</p>
          <table className="t-table table">
            <thead><tr><th>Metric</th><th>Value</th></tr></thead>
            <tbody><tr><td>Status</td><td>Report Ready</td></tr></tbody>
          </table>
          <button className="t-btn-secondary" onClick={() => window.print()}>🖨 Print Report</button>
        </div>
      </div>
    </Container>
  );
}
