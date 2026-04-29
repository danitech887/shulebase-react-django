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
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalSubject, setModalSubject] = useState('');
  const [term, setTerm]           = useState('Term 1');
  const [competency, setCompetency] = useState('Communication');
  const [modalGrade, setModalGrade]   = useState('');
  const [modalStream, setModalStream] = useState('');
  const [studentsList, setStudentsList] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [assessments, setAssessments]   = useState({});

  useEffect(() => {
    setLoading(true);
    api.get('teacher-portal/strands/')
      .then(res => {
        const s = res.data.strands || [];
        const assigned = res.data.assigned_subjects || [];
        
        // Only show grades/streams that the teacher is CURRENTLY assigned to
        const allGrades = Array.from(new Set(assigned.map(x => x.grade).filter(Boolean))).sort();
        const allStreams = Array.from(new Set(assigned.map(x => x.stream).filter(Boolean))).sort();

        setGrades(allGrades);
        setStreams(allStreams);
        setStrands(s);
        setAssignedSubjects(assigned);
        setSubjects(res.data.subjects || []);

        if (allGrades.length && allStreams.length) {
          setClassInfo({ grade: allGrades[0], stream: allStreams[0] });
        }
      })
      .catch(() => showMessage({ type:'error', text:'Unable to load metadata.' }))
      .finally(() => setLoading(false));
  }, [showMessage]);

  const subjectGradeMap = React.useMemo(() => {
    const m = {};
    (assignedSubjects || []).forEach(s => {
      const key = s.subject || '';
      if (!m[key]) m[key] = new Set();
      if (s.grade) m[key].add(s.grade);
    });
    const out = {};
    Object.entries(m).forEach(([k, set]) => out[k] = Array.from(set));
    return out;
  }, [assignedSubjects]);

  const subjectStreamMap = React.useMemo(() => {
    const m = {};
    (assignedSubjects || []).forEach(s => {
      const key = s.subject || '';
      if (!m[key]) m[key] = new Set();
      if (s.stream) m[key].add(s.stream);
    });
    const out = {};
    Object.entries(m).forEach(([k, set]) => out[k] = Array.from(set));
    return out;
  }, [assignedSubjects]);

  const modalGradesOptions = modalSubject ? (subjectGradeMap[modalSubject] || []) : grades;
  const modalStreamsOptions = modalSubject ? (subjectStreamMap[modalSubject] || []) : streams;

  const filteredSubjects = React.useMemo(() => {
    return subjects.filter(sub => {
      const matchGrade = !classInfo.grade || (subjectGradeMap[sub] || []).includes(classInfo.grade);
      const matchStream = !classInfo.stream || (subjectStreamMap[sub] || []).includes(classInfo.stream);
      return matchGrade && matchStream;
    });
  }, [subjects, classInfo, subjectGradeMap, subjectStreamMap]);

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
    // Prefer globally selected filters if they match this subject, else fallback to first available
    const gList = subjectGradeMap[subj] || [];
    const sList = subjectStreamMap[subj] || [];
    
    const initialGrade = (classInfo.grade && gList.includes(classInfo.grade)) ? classInfo.grade : (gList[0] || '');
    const initialStream = (classInfo.stream && sList.includes(classInfo.stream)) ? classInfo.stream : (sList[0] || '');
    
    setModalGrade(initialGrade);
    setModalStream(initialStream);
    setStudentsList([]); setAssessments({}); setStudentSearch('');
    setShowModal(true);
  };

  const getRemarkFromLevel = (lvl, comp) => {
    const details = {
      'Communication': {
        '4': 'Excellent. Expresses ideas clearly, listens attentively, and speaks confidently.',
        '3': 'Very Good. Demonstrates clear communication and actively participates in discussions.',
        '2': 'Good. Able to communicate thoughts but sometimes requires guidance.',
        '1': 'Fair. Needs encouragement to express ideas and listen to others.'
      },
      'Collaboration': {
        '4': 'Excellent. Outstanding teamwork, supports peers, and actively drives group goals.',
        '3': 'Very Good. Cooperates well in groups and shares responsibilities effectively.',
        '2': 'Good. Works with others but occasionally needs prompts to collaborate.',
        '1': 'Fair. Tends to work in isolation and requires encouragement to team up.'
      },
      'Critical Thinking': {
        '4': 'Excellent. Solves complex problems independently and evaluates situations deeply.',
        '3': 'Very Good. Asks thoughtful questions and applies logic to solve tasks.',
        '2': 'Good. Shows basic reasoning skills but needs support with complex tasks.',
        '1': 'Fair. Struggles to approach problems independently.'
      },
      'Creativity': {
        '4': 'Excellent. Highly imaginative, generates unique ideas, and explores novel designs.',
        '3': 'Very Good. Shows creative approaches and participates actively in arts.',
        '2': 'Good. Follows standard routines but occasionally shows unique outputs.',
        '1': 'Fair. Requires strong guidance to show imaginative skills.'
      },
      'Self-efficacy': {
        '4': 'Excellent. Highly confident, sets goals, and takes full responsibility for learning.',
        '3': 'Very Good. Believes in own abilities and stays focused on assigned work.',
        '2': 'Good. Completes tasks but relies on external assurance frequently.',
        '1': 'Fair. Needs continuous motivation and self-confidence reinforcement.'
      },
      'Citizenship': {
        '4': 'Excellent. Demonstrates high respect, follows rules perfectly, and cares for the environment.',
        '3': 'Very Good. Respectful to others and shows positive civic awareness.',
        '2': 'Good. Understands rules but needs reminders to uphold them regularly.',
        '1': 'Fair. Requires guidance to interact constructively with community norms.'
      },
      'Digital Literacy': {
        '4': 'Excellent. Navigates software easily, explores tools safely, and learns fast.',
        '3': 'Very Good. Operates devices confidently and adheres to safety instructions.',
        '2': 'Good. Basic ability to use devices but gets stuck easily.',
        '1': 'Fair. Requires absolute step-by-step guidance to handle computing tools.'
      }
    };

    if (details[comp] && details[comp][lvl]) {
      return details[comp][lvl];
    }

    if (lvl === '4') return "Excellent";
    if (lvl === '3') return "Very Good";
    if (lvl === '2') return "Good";
    if (lvl === '1') return "Fair";
    return "";
  };

  const handleAssessmentChange = (reg, field, value) => {
    setAssessments(prev => {
      const next = JSON.parse(JSON.stringify(prev || {}));
      if (!next[reg]) next[reg] = { level:'', comment:'' };
      next[reg][field] = value;
      
      // Auto-remark when level changes
      if (field === 'level') {
        next[reg].comment = getRemarkFromLevel(value, competency);
      }
      
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
          {filteredSubjects.length === 0 && !loading && (
            <Col xs={12}>
              <div className="text-center py-5 t-muted card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <p className="mb-0">No subjects found for the selected filters.</p>
              </div>
            </Col>
          )}
          {filteredSubjects.map(sub => (
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
                  <Col md={3}>
                    <Form.Label className="t-label">Grade</Form.Label>
                    <Form.Select value={modalGrade||classInfo.grade} onChange={e => setModalGrade(e.target.value)}>
                      <option value="">Select Grade</option>
                      {modalGradesOptions.map(g => <option key={g} value={g}>{g}</option>)}
                    </Form.Select>
                  </Col>
                  <Col md={3}>
                    <Form.Label className="t-label">Stream</Form.Label>
                    <Form.Select value={modalStream||classInfo.stream} onChange={e => setModalStream(e.target.value)}>
                      <option value="">Select Stream</option>
                      {modalStreamsOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </Form.Select>
                  </Col>
                  <Col md={3}>
                    <Form.Label className="t-label">Search Student</Form.Label>
                    <Form.Control 
                      placeholder="Name or Reg No..." 
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                    />
                  </Col>
                  <Col md={3} className="text-end">
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
                  {studentsList.filter(s => {
                    const q = studentSearch.toLowerCase();
                    return !q || s.registration_no.toLowerCase().includes(q) || 
                           s.first_name.toLowerCase().includes(q) || 
                           s.surname.toLowerCase().includes(q);
                  }).length > 0 ? studentsList.filter(s => {
                    const q = studentSearch.toLowerCase();
                    return !q || s.registration_no.toLowerCase().includes(q) || 
                           s.first_name.toLowerCase().includes(q) || 
                           s.surname.toLowerCase().includes(q);
                  }).map(s => (
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
