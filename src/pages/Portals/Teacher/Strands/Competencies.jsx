import React, { useEffect, useState, useCallback } from 'react';
import { Container, Row, Col, Modal, Form, Spinner, Stack, Button } from 'react-bootstrap';
import api from '../../../../api/api';
import { useMessage } from '../../../../context/MessageContext';
import './Competencies.css';

const COMPETENCY_CHOICES = [
  'Communication','Collaboration','Critical Thinking',
  'Creativity','Self-efficacy','Citizenship','Digital Literacy'
];

export default function Competencies() {
  const { showMessage } = useMessage();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [classInfo, setClassInfo] = useState({ grade:'', stream:'' });
  const [subjects, setSubjects]   = useState([]);
  const [strands, setStrands] = useState([]);
  const [year, setYear]           = useState(new Date().getFullYear());
  const [grades, setGrades]       = useState([]);
  const [streams, setStreams]      = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalSubject, setModalSubject] = useState('');
  const [term, setTerm]           = useState('Term 1');
  const [competency, setCompetency] = useState('Communication');
  const [modalGrade, setModalGrade]   = useState('');
  const [modalStream, setModalStream] = useState('');
  const [studentsList, setStudentsList] = useState([]);
  const [assessments, setAssessments]   = useState({});

  useEffect(() => {
    setLoading(true);
    api.get('teacher-portal/strands/')
      .then(res => {
        const s = res.data.strands || [];
        if (s.length) {
          setClassInfo({ grade: s[0].grade, stream: s[0].stream });
          setGrades(Array.from(new Set(s.map(x => x.grade).filter(Boolean))));
          setStreams(Array.from(new Set(s.map(x => x.stream).filter(Boolean))));
        }
        setStrands(s);
        setSubjects(res.data.subjects || []);
      })
      .catch(() => showMessage({ type:'error', text:'Unable to load metadata.' }))
      .finally(() => setLoading(false));
  }, [showMessage]);

  const subjectGradeMap = React.useMemo(() => {
    const m = {};
    (strands || []).forEach(s => {
      const key = s.subject || '';
      if (!m[key]) m[key] = new Set();
      if (s.grade) m[key].add(s.grade);
    });
    const out = {};
    Object.entries(m).forEach(([k, set]) => out[k] = Array.from(set));
    return out;
  }, [strands]);

  const subjectStreamMap = React.useMemo(() => {
    const m = {};
    (strands || []).forEach(s => {
      const key = s.subject || '';
      if (!m[key]) m[key] = new Set();
      if (s.stream) m[key].add(s.stream);
    });
    const out = {};
    Object.entries(m).forEach(([k, set]) => out[k] = Array.from(set));
    return out;
  }, [strands]);

  const modalGradesOptions = modalSubject ? (subjectGradeMap[modalSubject] || []) : grades;
  const modalStreamsOptions = modalSubject ? (subjectStreamMap[modalSubject] || []) : streams;

  const loadStudentsForCompetency = () => {
    const gradeToUse  = modalGrade  || classInfo.grade;
    const streamToUse = modalStream || classInfo.stream;
    if (!gradeToUse || !streamToUse) return showMessage({ type:'warning', text:'Please select Grade and Stream.' });
    setLoading(true);
    const params = new URLSearchParams({ grade:gradeToUse, stream:streamToUse, competency, term, year, subject:modalSubject });
    api.get(`teacher-portal/learner-competencies/?${params}`)
      .then(res => {
        const students = res.data.students || [];
        const existing = res.data.existing_records || {};
        setStudentsList(students);
        const map = {};
        students.forEach(s => {
          const rec = existing[s.registration_no] || {};
          map[s.registration_no] = { level: rec.level||'', comment: rec.comment||'' };
        });
        setAssessments(map);
      })
      .catch(() => showMessage({ type:'error', text:'Failed to load pupils.' }))
      .finally(() => setLoading(false));
  };

  const openModalForSubject = (subj) => {
    setModalSubject(subj);
    // Prefer grades/streams relevant to the selected subject
    const gList = subjectGradeMap[subj] || [];
    const sList = subjectStreamMap[subj] || [];
    setModalGrade((gList.length ? gList[0] : classInfo.grade) || '');
    setModalStream((sList.length ? sList[0] : classInfo.stream) || '');
    setStudentsList([]); setAssessments({});
    setShowModal(true);
  };

  const handleAssessmentChange = (reg, field, value) => {
    setAssessments(prev => {
      const next = JSON.parse(JSON.stringify(prev || {}));
      if (!next[reg]) next[reg] = { level:'', comment:'' };
      next[reg][field] = value;
      return next;
    });
  };

  const saveAssessments = () => {
    setSaving(true);
    api.post('teacher-portal/learner-competencies/', {
      grade: modalGrade||classInfo.grade, stream: modalStream||classInfo.stream,
      subject: modalSubject, term, year, competency, assessments
    })
      .then(res => { showMessage({ type:'success', text: res.data.detail||'Saved successfully.' }); loadStudentsForCompetency(); })
      .catch(() => showMessage({ type:'error', text:'Failed to save.' }))
      .finally(() => setSaving(false));
  };

  return (
    <div className="t-page">
      <Container fluid>

        {/* Header */}
        <div className="t-card card mb-4" style={{ position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,#6366f1,#818cf8,transparent)' }} />
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div>
                <h2 className="t-title">Competency Assessment</h2>
                <div className="d-flex gap-2 mt-1 flex-wrap">
                  <span className="badge t-badge-accent">Grade {classInfo.grade||'…'}</span>
                  <span className="badge t-badge-blue">Stream {classInfo.stream||'…'}</span>
                  <span className="badge t-badge-accent">{year} Academic Year</span>
                </div>
              </div>
              <div className="d-flex gap-2 flex-wrap">
                <div>
                  <label className="t-label">Grade</label>
                  <select className="t-input t-select" style={{ width:130 }} value={classInfo.grade||''}
                    onChange={e => { setClassInfo(p => ({...p,grade:e.target.value})); setModalGrade(e.target.value); }}>
                    <option value="">All Grades</option>
                    {grades.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="t-label">Stream</label>
                  <select className="t-input t-select" style={{ width:130 }} value={classInfo.stream||''}
                    onChange={e => { setClassInfo(p => ({...p,stream:e.target.value})); setModalStream(e.target.value); }}>
                    <option value="">All Streams</option>
                    {streams.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {loading && <Spinner animation="border" size="sm" className="t-spinner align-self-end" />}
              </div>
            </div>
          </div>
        </div>

        {/* Subject cards */}
        <Row className="g-4">
          {subjects.map(sub => (
            <Col md={6} lg={4} key={sub}>
              <div className="comp-subject-card card h-100">
                <div className="card-body d-flex flex-column p-4">
                  <p className="comp-subject-name">{sub}</p>
                  <p className="comp-subject-desc">Record behavioral competencies for {sub}.</p>
                  <button className="t-btn-primary mt-auto" onClick={() => openModalForSubject(sub)}>
                    Manage Competencies
                  </button>
                </div>
              </div>
            </Col>
          ))}
        </Row>

        {/* Modal */}
        <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered scrollable>
          <Modal.Header closeButton>
            <Modal.Title>{modalSubject} — Assessment</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {/* Filter card */}
            <div className="comp-filter-card card mb-4">
              <div className="card-body p-3">
                <Row className="g-3 align-items-end">
                  <Col md={4}>
                    <Form.Label className="t-label">Grade</Form.Label>
                    <Form.Select value={modalGrade||classInfo.grade} onChange={e => setModalGrade(e.target.value)}>
                      <option value="">Select Grade</option>
                      {modalGradesOptions.map(g => <option key={g} value={g}>{g}</option>)}
                    </Form.Select>
                  </Col>
                  <Col md={4}>
                    <Form.Label className="t-label">Stream</Form.Label>
                    <Form.Select value={modalStream||classInfo.stream} onChange={e => setModalStream(e.target.value)}>
                      <option value="">Select Stream</option>
                      {modalStreamsOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </Form.Select>
                  </Col>
                  <Col md={4} className="text-end">
                    <Form.Label className="t-label d-block">&nbsp;</Form.Label>
                    <Button variant="primary" className="w-100" onClick={loadStudentsForCompetency} disabled={loading}>
                      {loading ? <Spinner size="sm" /> : 'Load Students'}
                    </Button>
                  </Col>
                </Row>
                <Row className="g-3 mt-2">
                  <Col md={4}>
                    <Form.Label className="t-label">Term</Form.Label>
                    <Form.Select value={term} onChange={e => setTerm(e.target.value)}>
                      <option>Term 1</option><option>Term 2</option><option>Term 3</option>
                    </Form.Select>
                  </Col>
                  <Col md={5}>
                    <Form.Label className="t-label">Competency Area</Form.Label>
                    <Form.Select value={competency} onChange={e => setCompetency(e.target.value)}>
                      {COMPETENCY_CHOICES.map(c => <option key={c} value={c}>{c}</option>)}
                    </Form.Select>
                  </Col>
                </Row>
              </div>
            </div>

            {/* Table */}
            <div className="comp-table-wrap">
              <table className="t-table table mb-0">
                <thead>
                  <tr>
                    <th className="px-3">Reg No</th>
                    <th>Student Name</th>
                    <th style={{ width:140 }}>Level (1–4)</th>
                    <th>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsList.length > 0 ? studentsList.map(s => (
                    <tr key={s.registration_no}>
                      <td className="px-3 t-mono">{s.registration_no}</td>
                      <td className="t-bold">{s.first_name} {s.surname}</td>
                      <td>
                        <Form.Select size="sm" value={assessments[s.registration_no]?.level||''} onChange={e => handleAssessmentChange(s.registration_no,'level',e.target.value)}>
                          <option value="">-</option>
                          <option value="4">L4</option><option value="3">L3</option>
                          <option value="2">L2</option><option value="1">L1</option>
                        </Form.Select>
                      </td>
                      <td className="pe-3">
                        <Form.Control size="sm" value={assessments[s.registration_no]?.comment||''} onChange={e => handleAssessmentChange(s.registration_no,'comment',e.target.value)} />
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="text-center py-4 t-muted">No pupils loaded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="link" onClick={() => setShowModal(false)}>Close</Button>
            <Button variant="success" onClick={saveAssessments} disabled={saving||studentsList.length===0}>
              {saving ? 'Saving…' : 'Submit All'}
            </Button>
          </Modal.Footer>
        </Modal>

      </Container>
    </div>
  );
}
