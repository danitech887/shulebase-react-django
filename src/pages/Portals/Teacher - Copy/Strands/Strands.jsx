import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container, Row, Col, Card, Button, Table,
  Modal, Form, Badge, Spinner, Dropdown, ListGroup, Stack, Accordion
} from 'react-bootstrap';
import api from '../../../../api/api';
import { useMessage } from '../../../../context/MessageContext';

export default function TeacherStrandPortal() {
  const { showMessage } = useMessage();
  const [view, setView] = useState('list');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [dashboardData, setDashboardData] = useState({
    strands: [], subjects: [], grades: [], streams: []
  });

  const [activeSubStrand, setActiveSubStrand] = useState(null);
  const [selectedStrandId, setSelectedStrandId] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [isEditingSub, setIsEditingSub] = useState(false);

  const [formData, setFormData] = useState({ name: '', subject: '', grade: '', stream: '', description: '' });

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('teacher-portal/strands/');
      setDashboardData(res.data);
      setError(null);
    } catch (err) {
      setError('Failed to load strands.');
      showMessage({ type: 'error', text: 'Failed to load strands.' });
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  const subjectsGrouped = useMemo(() => {
    const groups = {};
    dashboardData.strands.forEach(strand => {
      if (!groups[strand.subject]) groups[strand.subject] = [];
      groups[strand.subject].push(strand);
    });
    return groups;
  }, [dashboardData.strands]);

  const handleCreateStrand = async (e) => {
    e.preventDefault();
    try {
      await api.post('teacher-portal/strands/', { ...formData, subject: selectedSubject });
      setShowStrandModal(false);
      setFormData({ name: '', subject: '', grade: '', stream: '', description: '' });
      fetchInitialData();
      showMessage({ type: 'success', text: 'Strand created.' });
    } catch (err) {
      console.error(err);
      showMessage({ type: 'error', text: 'Error creating strand.' });
    }
  };

  const handleSubStrandSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditingSub) {
        await api.put(`teacher-portal/sub-strands/${activeSubStrand.id}/`, {
          name: formData.name,
          description: formData.description
        });
        showMessage({ type: 'success', text: 'Topic updated.' });
      } else {
        const strand = dashboardData.strands.find(s => s.id === selectedStrandId);
        await api.post(`teacher-portal/strands/${selectedStrandId}/sub-strands/${strand.grade}/${strand.stream}/`, {
          name: formData.name,
          description: formData.description
        });
        showMessage({ type: 'success', text: 'Topic added.' });
      }
      setShowSubStrandModal(false);
      setIsEditingSub(false);
      setFormData({ name: '', description: '' });
      fetchInitialData();
    } catch (err) {
      console.error(err);
      showMessage({ type: 'error', text: 'Action failed.' });
    }
  };

  const handleSaveRecord = async () => {
    if (!activeSubStrand) return;
    setIsSavingRecord(true);
    try {
      await api.post(`teacher-portal/sub-strands/${activeSubStrand.id}/scores/${activeSubStrand.grade}/${activeSubStrand.stream}/`, {
        term: recordPayload.term,
        assessement_type: recordPayload.assessement_type,
        out_of: recordPayload.out_of,
        scores: recordData.scores,
        raw_marks: recordData.raws || {},
        levels: recordData.levels || {},
        remarks: recordData.remarks,
        remark: recordData.remarks
      });
      showMessage({ type: 'success', text: 'Scores saved' });
      setShowRecordModal(false);
      fetchInitialData();
    } catch (err) {
      console.error(err);
      showMessage({ type: 'error', text: 'Failed to save scores' });
    } finally { setIsSavingRecord(false); }
  };

  const performDeleteTarget = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'substrand') {
        await api.delete(`teacher-portal/sub-strands/${deleteTarget.id}/`);
      } else if (deleteTarget.type === 'strand') {
        await api.delete(`teacher-portal/strands/${deleteTarget.id}/`);
      }
      setShowConfirmDelete(false);
      fetchInitialData();
      setDeleteTarget(null);
      showMessage({ type: 'success', text: 'Deleted successfully' });
    } catch (err) {
      console.error(err);
      showMessage({ type: 'error', text: 'Delete failed' });
    }
  };

  const [showStrandModal, setShowStrandModal] = useState(false);
  const [showSubStrandModal, setShowSubStrandModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [recordPayload, setRecordPayload] = useState({ term: 'Term 1', assessement_type: 'Class Work', out_of: 100 });
  const [recordData, setRecordData] = useState({ students: [], scores: {}, remarks: {}, raws: {}, levels: {} });
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const getCBCLevel = useCallback((percentage) => {
    if (percentage === '' || percentage === null || percentage === undefined || Number.isNaN(Number(percentage))) return '';
    const p = Number(percentage);
    if (p >= 80) return 'Level 4';
    if (p >= 60) return 'Level 3';
    if (p >= 40) return 'Level 2';
    return 'Level 1';
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadRecord = async () => {
      if (!showRecordModal || !activeSubStrand) return;
      try {
        const res = await api.get(`teacher-portal/sub-strands/${activeSubStrand.id}/scores/${activeSubStrand.grade}/${activeSubStrand.stream}/?term=${recordPayload.term}`);
        if (cancelled) return;
        setRecordData({
          students: res.data.students || [],
          scores: res.data.scores || {},
          remarks: res.data.remarks || res.data.remark || {},
          raws: res.data.raw_marks || {},
          levels: res.data.levels || {}
        });
      } catch (err) {
        if (!cancelled) setRecordData({ students: [], scores: {}, remarks: {}, raws: {}, levels: {} });
      }
    };
    loadRecord();
    return () => { cancelled = true; };
  }, [showRecordModal, activeSubStrand, recordPayload.term]);

  useEffect(() => {
    if (!showRecordModal) return;
    const raws = recordData.raws || {};
    const newScores = { ...recordData.scores };
    const newLevels = { ...recordData.levels };
    Object.keys(raws).forEach(reg => {
      const raw = raws[reg];
      if (raw === '' || raw === null || recordPayload.out_of === 0) {
        newScores[reg] = '';
        newLevels[reg] = '';
      } else {
        const pct = Number(((raw / recordPayload.out_of) * 100).toFixed(2));
        newScores[reg] = pct;
        newLevels[reg] = getCBCLevel(pct);
      }
    });
    setRecordData(prev => ({ ...prev, scores: newScores, levels: newLevels }));
  }, [recordPayload.out_of, recordData.raws, showRecordModal, getCBCLevel]);

  if (loading && view === 'list') {
    return <Container className="text-center py-5"><Spinner animation="border" variant="primary" /><p className="mt-2">Loading...</p></Container>;
  }

  return (
    <div className="bg-light min-vh-100 py-4">
      {view === 'list' ? (
        <Container>
          <h2 className="fw-bold text-dark mb-4">Subject Management Portal</h2>
          <Row>
            {Object.keys(subjectsGrouped).length === 0 && (
              <Col className="text-center py-5"><p>No subjects assigned yet.</p></Col>
            )}

            {Object.keys(subjectsGrouped).map(subjectName => (
              <Col lg={6} key={subjectName} className="mb-4">
                <Card className="shadow-sm border-0 h-100">
                  <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center py-3">
                    <h5 className="mb-0 fw-bold">{subjectName}</h5>
                    <Button variant="light" size="sm" onClick={() => {
                      setSelectedSubject(subjectName);
                      setFormData({ ...formData, subject: subjectName });
                      setShowStrandModal(true);
                    }}>+ Add Strand</Button>
                  </Card.Header>
                  <Card.Body>
                    <Accordion flush>
                      {subjectsGrouped[subjectName].map((strand, index) => (
                        <Accordion.Item eventKey={index.toString()} key={strand.id}>
                          <Accordion.Header>
                            <div className="d-flex justify-content-between w-100 pe-3">
                              <span><strong>{strand.name}</strong></span>
                              <Badge bg="secondary" className="ms-2">{strand.grade} {strand.stream}</Badge>
                            </div>
                          </Accordion.Header>
                          <Accordion.Body>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <h6 className="text-muted mb-0 small uppercase">Topics</h6>
                              <Button variant="outline-success" size="sm" onClick={() => {
                                setSelectedStrandId(strand.id);
                                setIsEditingSub(false);
                                setFormData({ name: '', description: '' });
                                setShowSubStrandModal(true);
                              }}>+ Add Topic</Button>
                            </div>

                            <ListGroup variant="flush">
                              {strand.sub_strands?.map(sub => (
                                <ListGroup.Item key={sub.id} className="d-flex justify-content-between align-items-center px-0 bg-transparent border-bottom">
                                  <span className="text-truncate" style={{ maxWidth: '180px' }}>{sub.name}</span>
                                  <Stack direction="horizontal" gap={1}>
                                    <Button variant="outline-primary" size="sm" onClick={() => {
                                      setActiveSubStrand({ ...sub, grade: strand.grade, stream: strand.stream, subject: subjectName });
                                      setView('view-substrand');
                                    }}>View</Button>

                                    <Dropdown align="end">
                                      <Dropdown.Toggle variant="light" size="sm" className="border-0 bg-transparent" />
                                      <Dropdown.Menu>
                                        <Dropdown.Item onClick={() => {
                                          setActiveSubStrand({ ...sub, grade: strand.grade, stream: strand.stream });
                                          setRecordData({ students: [], scores: {}, remarks: {}, raws: {}, levels: {} });
                                          setShowRecordModal(true);
                                        }}>Record Scores</Dropdown.Item>
                                        <Dropdown.Item onClick={() => {
                                          setActiveSubStrand(sub);
                                          setIsEditingSub(true);
                                          setFormData({ name: sub.name, description: sub.description });
                                          setShowSubStrandModal(true);
                                        }}>Edit</Dropdown.Item>
                                        <Dropdown.Item onClick={() => {
                                          setActiveSubStrand({ ...sub, grade: strand.grade, stream: strand.stream });
                                          setShowReportModal(true);
                                        }}>Report</Dropdown.Item>
                                        <Dropdown.Divider />
                                        <Dropdown.Item onClick={() => {
                                          setDeleteTarget({ type: 'substrand', id: sub.id, name: sub.name, grade: strand.grade, stream: strand.stream });
                                          setShowConfirmDelete(true);
                                        }} className="text-danger">Delete</Dropdown.Item>
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
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      ) : view === 'scoring' ? (
        <SubStrandScoring subStrand={activeSubStrand} onBack={() => { setView('list'); fetchInitialData(); }} />
      ) : view === 'report' ? (
        <SubStrandReport subStrand={activeSubStrand} onBack={() => setView('list')} />
      ) : (
        <SubStrandDetailView subStrand={activeSubStrand} onBack={() => setView('list')} />
      )}

      {/* --- MODALS --- */}
      <Modal show={showStrandModal} onHide={() => setShowStrandModal(false)} centered>
        <Form onSubmit={handleCreateStrand}>
          <Modal.Header closeButton><Modal.Title>New Strand for {selectedSubject}</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3"><Form.Label>Strand Name</Form.Label><Form.Control required onChange={e => setFormData({ ...formData, name: e.target.value })} /></Form.Group>
            <Row>
              <Col>
                <Form.Group className="mb-3"><Form.Label>Grade</Form.Label>
                  <Form.Select required onChange={e => setFormData({ ...formData, grade: e.target.value })}>
                    <option value="">Select</option>{dashboardData.grades.map(g => <option key={g} value={g}>{g}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col>
                <Form.Group className="mb-3"><Form.Label>Stream</Form.Label>
                  <Form.Select required onChange={e => setFormData({ ...formData, stream: e.target.value })}>
                    <option value="">Select</option>{dashboardData.streams.map(st => <option key={st} value={st}>{st}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer><Button variant="primary" type="submit">Create Strand</Button></Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showSubStrandModal} onHide={() => setShowSubStrandModal(false)} centered>
        <Form onSubmit={handleSubStrandSubmit}>
          <Modal.Header closeButton><Modal.Title>{isEditingSub ? 'Edit Topic' : 'Add Topic'}</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3"><Form.Label>Title</Form.Label><Form.Control required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Description</Form.Label><Form.Control as="textarea" rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></Form.Group>
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
              <Col md={4}><Form.Group><Form.Label>Term</Form.Label><Form.Select value={recordPayload.term} onChange={e => setRecordPayload({ ...recordPayload, term: e.target.value })}><option>Term 1</option><option>Term 2</option><option>Term 3</option></Form.Select></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label>Assessment Type</Form.Label>
                <Form.Select value={recordPayload.assessement_type} onChange={e => setRecordPayload({ ...recordPayload, assessement_type: e.target.value })}>
                  <option>Class Work</option>
                  <option>Homework</option>
                  <option>Exam</option>
                  <option>SBA-Written</option>
                  <option>SBA-Project</option>
                  <option>SBA-Practical</option>
                </Form.Select>
              </Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label>Out Of</Form.Label><Form.Control type="number" value={recordPayload.out_of} onChange={e => setRecordPayload({ ...recordPayload, out_of: Number(e.target.value) })} /></Form.Group></Col>
            </Row>

            <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
              <Table responsive bordered hover>
                <thead className="table-dark">
                  <tr>
                    <th>Student</th>
                    <th style={{ width: '140px' }}>Raw Mark (/{recordPayload.out_of})</th>
                    <th style={{ width: '140px' }}>Percentage</th>
                    <th style={{ width: '120px' }}>Level</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {recordData.students.map(s => (
                    <tr key={s.registration_no}>
                      <td>{s.first_name} {s.last_name} <div className="text-muted small">{s.registration_no}</div></td>
                      <td>
                        <Form.Control type="number" min={0} max={recordPayload.out_of} value={recordData.raws?.[s.registration_no] ?? ''} onChange={e => {
                          const raw = e.target.value === '' ? '' : Number(e.target.value);
                          const reg = s.registration_no;
                          const newRaws = { ...recordData.raws, [reg]: raw };
                          const pct = (raw === '' || !recordPayload.out_of) ? '' : Number(((raw / recordPayload.out_of) * 100).toFixed(2));
                          const newScores = { ...recordData.scores, [reg]: pct };
                          const newLevels = { ...recordData.levels, [reg]: getCBCLevel(pct) };
                          setRecordData(prev => ({ ...prev, raws: newRaws, scores: newScores, levels: newLevels }));
                        }} />
                      </td>
                      <td>
                        <Form.Control type="number" value={recordData.scores?.[s.registration_no] ?? ''} disabled />
                      </td>
                      <td>
                        <Form.Select value={recordData.levels?.[s.registration_no] ?? ''} onChange={e => setRecordData(prev => ({ ...prev, levels: { ...prev.levels, [s.registration_no]: e.target.value } }))}>
                          <option value="">Select</option>
                          <option>Level 1</option>
                          <option>Level 2</option>
                          <option>Level 3</option>
                          <option>Level 4</option>
                        </Form.Select>
                      </td>
                      <td><Form.Control value={recordData.remarks[s.registration_no] || ''} onChange={e => setRecordData({ ...recordData, remarks: { ...recordData.remarks, [s.registration_no]: e.target.value } })} /></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRecordModal(false)}>Close</Button>
          <Button variant="success" onClick={handleSaveRecord} disabled={isSavingRecord}>{isSavingRecord ? 'Saving...' : 'Save Scores'}</Button>
        </Modal.Footer>
      </Modal>

      {/* Report Modal (simple wrapper) */}
      <Modal show={showReportModal} onHide={() => setShowReportModal(false)} size="lg" centered>
        <Modal.Header closeButton><Modal.Title>Report: {activeSubStrand?.name}</Modal.Title></Modal.Header>
        <Modal.Body>
          {activeSubStrand ? <SubStrandReport subStrand={activeSubStrand} onBack={() => setShowReportModal(false)} /> : <p>No data</p>}
        </Modal.Body>
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal show={showConfirmDelete} onHide={() => setShowConfirmDelete(false)} centered>
        <Modal.Header closeButton><Modal.Title>Confirm Delete</Modal.Title></Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.</p>
          {deleteTarget?.grade && <p className="small text-muted">Class: {deleteTarget.grade} - {deleteTarget.stream}</p>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmDelete(false)}>Cancel</Button>
          <Button variant="danger" onClick={performDeleteTarget}>Delete</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

// -----------------------------------------------------------------------------
// DETAIL VIEW
// -----------------------------------------------------------------------------
function SubStrandDetailView({ subStrand, onBack }) {
  return (
    <Container>
      <Button variant="link" onClick={onBack} className="text-decoration-none mb-3 p-0">← Back</Button>
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-primary text-white py-3"><h5 className="mb-0">{subStrand.name}</h5></Card.Header>
        <Card.Body>
          <p><strong>Subject:</strong> {subStrand.subject}</p>
          <p><strong>Class:</strong> {subStrand.grade} - {subStrand.stream}</p>
          <hr />
          <h6>Description:</h6>
          <p>{subStrand.description || 'No description provided.'}</p>
        </Card.Body>
      </Card>
    </Container>
  );
}

// -----------------------------------------------------------------------------
// SCORING & REPORT
// -----------------------------------------------------------------------------
function SubStrandScoring({ subStrand, onBack }) {
  const { showMessage } = useMessage();
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState('Term 1');
  const [data, setData] = useState({ students: [], scores: {}, remarks: {} });
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`teacher-portal/sub-strands/${subStrand.id}/scores/${subStrand.grade}/${subStrand.stream}/?term=${term}`);
      setData({ students: res.data.students || [], scores: res.data.scores || {}, remarks: res.data.remarks || res.data.remark || {} });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [subStrand, term]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleBulkSave = async () => {
    setIsSaving(true);
    try {
      await api.post(`teacher-portal/sub-strands/${subStrand.id}/scores/${subStrand.grade}/${subStrand.stream}/`, {
        term, scores: data.scores, remarks: data.remarks, remark: data.remarks
      });
      showMessage({ type: 'success', text: 'Scores recorded!' });
    } catch (err) { console.error(err); showMessage({ type: 'error', text: 'Failed to save.' }); } finally { setIsSaving(false); }
  };

  return (
    <Container>
      <Button variant="link" onClick={onBack} className="mb-3 p-0">← Back</Button>
      <Card className="mb-4 shadow-sm border-0">
        <Card.Body className="d-flex justify-content-between align-items-center">
          <div><h4 className="fw-bold mb-0">{subStrand.name}</h4><small>{subStrand.grade} - {subStrand.stream}</small></div>
          <div style={{ minWidth: '150px' }}><Form.Select value={term} onChange={(e) => setTerm(e.target.value)}><option>Term 1</option><option>Term 2</option><option>Term 3</option></Form.Select></div>
        </Card.Body>
      </Card>
      {loading ? <Spinner animation="border" /> : (
        <Table responsive hover bordered bg="white">
          <thead className="table-dark"><tr><th>Student</th><th style={{ width: '150px' }}>Score</th><th>Remarks</th></tr></thead>
          <tbody>
            {data.students.map(s => (
              <tr key={s.registration_no}>
                <td>{s.first_name} {s.last_name}</td>
                <td><Form.Control type="number" value={data.scores[s.registration_no] || ''} onChange={e => setData({ ...data, scores: { ...data.scores, [s.registration_no]: e.target.value } })} /></td>
                <td><Form.Control type="text" value={data.remarks[s.registration_no] || ''} onChange={e => setData({ ...data, remarks: { ...data.remarks, [s.registration_no]: e.target.value } })} /></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Button variant="success" onClick={handleBulkSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Record Scores'}</Button>
    </Container>
  );
}

function SubStrandReport({ subStrand, onBack }) {
  return (
    <Container>
      <Button variant="link" onClick={onBack} className="mb-3">← Back</Button>
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-primary text-white">Performance Report: {subStrand.name}</Card.Header>
        <Card.Body>
          <h5>Class Summary</h5>
          <p>Grade: {subStrand.grade} | Stream: {subStrand.stream}</p>
          <Table striped bordered>
            <thead><tr><th>Metric</th><th>Value</th></tr></thead>
            <tbody><tr><td>Status</td><td>Report Ready</td></tr></tbody>
          </Table>
          <Button variant="outline-primary" onClick={() => window.print()}>Print Report</Button>
        </Card.Body>
      </Card>
    </Container>
  );
}
