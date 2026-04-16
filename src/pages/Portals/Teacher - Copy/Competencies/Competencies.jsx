import React, { useEffect, useState, useCallback } from 'react';
import { 
  Container, Row, Col, Card, Button, Form, 
  Modal, Table, Spinner, Stack, Badge 
} from 'react-bootstrap';
import api from '../../../../api/api'; 
import { useMessage } from '../../../../context/MessageContext';

export default function Competencies() {
  const { showMessage } = useMessage();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // 1. Class Info & Metadata
  const [classInfo, setClassInfo] = useState({ grade: '', stream: '' });
  const [subjects, setSubjects] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [grades, setGrades] = useState([]);
  const [streams, setStreams] = useState([]);

  // 2. Modal & Active Selection State
  const [showModal, setShowModal] = useState(false);
  const [modalSubject, setModalSubject] = useState('');
  const [term, setTerm] = useState('Term 1');
  const [competency, setCompetency] = useState('Communication');
  const [modalGrade, setModalGrade] = useState('');
  const [modalStream, setModalStream] = useState('');
  
  // 3. Data Lists
  const [studentsList, setStudentsList] = useState([]);
  
  /** * THE FIX: assessments state is keyed by student.id
   * Structure: { "101": { level: "3", comment: "Good" }, "102": { level: "2", comment: "" } }
   */
  const [assessments, setAssessments] = useState({});

  const COMPETENCY_CHOICES = [
    'Communication', 'Collaboration', 'Critical Thinking', 
    'Creativity', 'Self-efficacy', 'Citizenship', 'Digital Literacy'
  ];

  const fetchStreams = useCallback((grade) => {
    if (!grade) {
      setStreams([]);
      return;
    }
    api.get(`streams/?grade=${encodeURIComponent(grade)}`)
      .then(res => setStreams(res.data.streams || []))
      .catch(err => console.error('Failed to load streams', err));
  }, []);

  // Fetch Teacher Class Info on Mount
  useEffect(() => {
    setLoading(true);

    api.get('grades/')
      .then(res => setGrades(res.data.grades || []))
      .catch(err => console.error('Failed to load grades', err));

    api.get('teacher-portal/strands/')
      .then(res => {
        if (res.data.strands && res.data.strands.length > 0) {
          const initialGrade = res.data.strands[0].grade;
          setClassInfo({
            grade: res.data.strands[0].grade,
            grade: initialGrade,
            stream: res.data.strands[0].stream
          });
          // collect available grades/streams for modal filters
          const g = Array.from(new Set(res.data.strands.map(x => x.grade).filter(Boolean)));
          const st = Array.from(new Set(res.data.strands.map(x => x.stream).filter(Boolean)));
          setGrades(g);
          setStreams(st);
          fetchStreams(initialGrade);
        }
        setSubjects(res.data.subjects || []);
      })
      .catch(() => showMessage({ type: 'error', text: 'Unable to load metadata.' }))
      .finally(() => setLoading(false));
  }, [showMessage]);
  }, [showMessage, fetchStreams]);

  // Load Students and their existing records
  const loadStudentsForCompetency = () => {
    const gradeToUse = modalGrade || classInfo.grade;
    const streamToUse = modalStream || classInfo.stream;
    if (!gradeToUse || !streamToUse) {
      showMessage({ type: 'warning', text: 'Please select Grade and Stream.' });
      return;
    }

    setLoading(true);
    const params = new URLSearchParams({ 
      grade: gradeToUse, 
      stream: streamToUse, 
      competency, 
      term, 
      year,
      subject: modalSubject 
    });

    api.get(`teacher-portal/learner-competencies/?${params.toString()}`)
      .then(res => {
        const students = res.data.students || [];
        const existing = res.data.existing_records || {};

        setStudentsList(students);

        // INITIALIZE: Create a fresh object keyed by registration_no for EVERY student
        const initialMap = {};
        students.forEach(s => {
          // backend keys use student PK (registration_no), so lookup by registration_no
          const rec = existing[s.registration_no] || {};
          initialMap[s.registration_no] = { 
            level: rec.level || '', 
            comment: rec.comment || '' 
          };
        });
        setAssessments(initialMap);
      })
      .catch(() => showMessage({ type: 'error', text: 'Failed to load pupils.' }))
      .finally(() => setLoading(false));
  };

  const openModalForSubject = (subj) => {
    setModalSubject(subj);
    // default modal grade/stream to the teacher's class info
    setModalGrade(classInfo.grade || '');
    setModalStream(classInfo.stream || '');
    setStudentsList([]);
    setAssessments({}); 
    setShowModal(true);
  };

  /**
   * THE FIX: Deep copy the state to ensure row independence
   */
  const handleAssessmentChange = (studentRegistrationNo, field, value) => {
    setAssessments(prev => {
      // deep-clone previous state to avoid any shared nested references
      // JSON methods are fine here because values are simple (strings)
      const newAssessments = JSON.parse(JSON.stringify(prev || {}));

      // ensure the student has an object entry
      if (!newAssessments[studentRegistrationNo]) newAssessments[studentRegistrationNo] = { level: '', comment: '' };

      // update only the specific field for the student
      newAssessments[studentRegistrationNo][field] = value;

      return newAssessments;
    });
  };

  const saveAssessments = () => {
    setSaving(true);
    const payload = {
      grade: modalGrade || classInfo.grade,
      stream: modalStream || classInfo.stream,
      subject: modalSubject,
      term,
      year,
      competency,
      assessments 
    };

    api.post('teacher-portal/learner-competencies/', payload)
      .then(res => {
        showMessage({ type: 'success', text: res.data.detail || 'Saved successfully.' });
        loadStudentsForCompetency(); 
      })
      .catch(() => showMessage({ type: 'error', text: 'Failed to save.' }))
      .finally(() => setSaving(false));
  };

  return (
    <Container fluid className="p-4 bg-light min-vh-100">
      <Card className="shadow-sm border-0 mb-4 py-2">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h3 className="fw-bold mb-1">Competency Assessment</h3>
              <Stack direction="horizontal" gap={2}>
                <Badge bg="primary">Grade {classInfo.grade || '...'}</Badge>
                <Badge bg="info">Stream {classInfo.stream || '...'}</Badge>
                <Badge bg="secondary" pill>{year} Academic Year</Badge>
              </Stack>
            </div>
            <div className="d-flex align-items-center">
              <Form className="d-flex align-items-center" onSubmit={e => e.preventDefault()}>
                <Form.Group className="me-2">
                  <Form.Label className="small text-muted mb-1">Grade</Form.Label>
                  <Form.Select
                    size="sm"
                    value={classInfo.grade || ''}
                    onChange={e => {
                      const g = e.target.value;
                      setClassInfo(prev => ({ ...prev, grade: g }));
                      setClassInfo(prev => ({ ...prev, grade: g, stream: '' }));
                      setModalGrade(g);
                      setModalStream('');
                      fetchStreams(g);
                    }}
                  >
                    <option value="">All Grades</option>
                    {grades.map(g => <option key={g} value={g}>{g}</option>)}
                  </Form.Select>
                </Form.Group>

                <Form.Group>
                  <Form.Label className="small text-muted mb-1">Stream</Form.Label>
                  <Form.Select
                    size="sm"
                    value={classInfo.stream || ''}
                    onChange={e => {
                      const s = e.target.value;
                      setClassInfo(prev => ({ ...prev, stream: s }));
                      setModalStream(s);
                    }}
                  >
                    <option value="">All Streams</option>
                    {streams.map(s => <option key={s} value={s}>{s}</option>)}
                  </Form.Select>
                </Form.Group>
              </Form>

              {loading && <Spinner animation="border" variant="primary" size="sm" className="ms-3" />}
            </div>
          </div>
        </Card.Body>
      </Card>

      <Row className="g-4">
        {subjects.map(sub => (
          <Col md={6} lg={4} key={sub}>
            <Card className="h-100 border-0 shadow-sm transition-all border-top border-primary border-4">
              <Card.Body className="d-flex flex-column p-4">
                <h5 className="fw-bold mb-3">{sub}</h5>
                <p className="text-muted small mb-4">Record behavioral competencies for {sub}.</p>
                <Button 
                  variant="primary" 
                  className="mt-auto fw-bold" 
                  onClick={() => openModalForSubject(sub)}
                >
                  Manage Competencies
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered scrollable>
        <Modal.Header closeButton className="bg-primary text-white border-0">
          <Modal.Title className="fw-bold">{modalSubject} — Assessment</Modal.Title>
        </Modal.Header>
        
        <Modal.Body className="bg-light p-4">
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body className="p-3">
              <Row className="g-3 align-items-end">
                <Col md={4}>
                  <Form.Label className="small fw-bold text-muted">Grade</Form.Label>
                  <Form.Select value={modalGrade || classInfo.grade} onChange={e => setModalGrade(e.target.value)}>
                  <Form.Select value={modalGrade || classInfo.grade} onChange={e => {
                    const g = e.target.value;
                    setModalGrade(g);
                    setModalStream('');
                    fetchStreams(g);
                  }}>
                    <option value="">Select Grade</option>
                    {grades.map(g => <option key={g} value={g}>{g}</option>)}
                  </Form.Select>
                </Col>
                <Col md={4}>
                  <Form.Label className="small fw-bold text-muted">Stream</Form.Label>
                  <Form.Select value={modalStream || classInfo.stream} onChange={e => setModalStream(e.target.value)}>
                    <option value="">Select Stream</option>
                    {streams.map(s => <option key={s} value={s}>{s}</option>)}
                  </Form.Select>
                </Col>
                <Col md={4} className="text-end">
                  <Form.Label className="small fw-bold text-muted d-block">&nbsp;</Form.Label>
                  <Button variant="dark" className="w-100 fw-bold" onClick={loadStudentsForCompetency} disabled={loading}>
                    {loading ? <Spinner size="sm" /> : "Load Students"}
                  </Button>
                </Col>
              </Row>
              <Row className="g-3 align-items-end mt-2">
                <Col md={4}>
                  <Form.Label className="small fw-bold text-muted">TERM</Form.Label>
                  <Form.Select value={term} onChange={e => setTerm(e.target.value)}>
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Term 3">Term 3</option>
                  </Form.Select>
                </Col>
                <Col md={5}>
                  <Form.Label className="small fw-bold text-muted">COMPETENCY AREA</Form.Label>
                  <Form.Select value={competency} onChange={e => setCompetency(e.target.value)}>
                    {COMPETENCY_CHOICES.map(c => <option key={c} value={c}>{c}</option>)}
                  </Form.Select>
                </Col>
                <Col md={3}>
                  {/* empty slot preserved for layout consistency (Load Students moved) */}
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <div className="bg-white rounded shadow-sm overflow-hidden">
            <Table responsive bordered hover className="mb-0">
              <thead className="table-dark small">
                <tr>
                  <th className="px-3">Reg No</th>
                  <th>Student Name</th>
                  <th style={{ width: '140px' }}>Level (1-4)</th>
                  <th>Remark</th>
                </tr>
              </thead>
              <tbody>
                {studentsList.length > 0 ? (
                  studentsList.map(s => (
                    <tr key={s.registration_no}>
                      <td className="px-3 fw-bold small text-primary">{s.registration_no}</td>
                      <td>{s.first_name} {s.surname}</td>
                      <td>
                        <Form.Select 
                          size="sm"
                          // BIND VALUE TO THE SPECIFIC STUDENT KEY (registration_no)
                          value={assessments[s.registration_no]?.level || ''}
                          onChange={e => handleAssessmentChange(s.registration_no, 'level', e.target.value)}
                        >
                          <option value="">-</option>
                          <option value="4">L4</option>
                          <option value="3">L3</option>
                          <option value="2">L2</option>
                          <option value="1">L1</option>
                        </Form.Select>
                      </td>
                      <td className="pe-3">
                        <Form.Control 
                          size="sm"
                          value={assessments[s.registration_no]?.comment || ''}
                          onChange={e => handleAssessmentChange(s.registration_no, 'comment', e.target.value)}
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center p-5 text-muted">No pupils loaded.</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Modal.Body>

        <Modal.Footer className="bg-white border-0 px-4 pb-4">
          <Button variant="link" className="text-decoration-none text-muted me-auto" onClick={() => setShowModal(false)}>Close</Button>
          <Button 
            variant="success" 
            className="px-5 fw-bold" 
            onClick={saveAssessments} 
            disabled={saving || studentsList.length === 0}
          >
            {saving ? "Saving..." : "Submit All"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}