import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Container, Row, Col, Card, Button, Table, 
  Modal, Form, Badge, Spinner, ProgressBar, Stack 
} from 'react-bootstrap';
import api from '../../../../api/api'; 
import { useMessage } from '../../../../context/MessageContext';

export default function TeacherResourceManager() {
  const { showMessage } = useMessage();
  const [view, setView] = useState('list');
  const [resources, setResources] = useState([]);
  const [activeResource, setActiveResource] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: '', subject: '', grade: '', stream: '', 
    resource_type: 'video', url_or_file: '', term: 'Term 1'
  });

  // Extract unique assignments (Grades, Streams, Subjects) for the dropdowns
  const assignments = useMemo(() => {
    const map = { grades: new Set(), streams: {}, subjects: {} };
    resources.forEach(r => {
      map.grades.add(r.grade);
      if (!map.streams[r.grade]) map.streams[r.grade] = new Set();
      if (!map.subjects[r.grade]) map.subjects[r.grade] = new Set();
      map.streams[r.grade].add(r.stream);
      map.subjects[r.grade].add(r.subject);
    });
    return {
      grades: Array.from(map.grades).sort(),
      getStreams: (g) => Array.from(map.streams[g] || []),
      getSubjects: (g) => Array.from(map.subjects[g] || [])
    };
  }, [resources]);

  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('teacher-portal/resources/');
      setResources(res.data);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  // Logic: When Grade selection changes, reset/update stream and subject
  const handleGradeChange = (e) => {
    const selectedGrade = e.target.value;
    const availableStreams = assignments.getStreams(selectedGrade);
    const availableSubjects = assignments.getSubjects(selectedGrade);
    
    setFormData({
      ...formData,
      grade: selectedGrade,
      stream: availableStreams[0] || '',
      subject: availableSubjects[0] || ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`teacher-portal/resources/${activeResource.id}/`, formData);
      } else {
        await api.post('teacher-portal/resources/', formData);
      }
      setShowModal(false);
      fetchResources();
    } catch (err) { console.error(err); showMessage({ type: 'error', text: 'Failed to save resource.' }); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this resource?")) return;
    try {
      await api.delete(`teacher-portal/resources/${id}/`);
      fetchResources();
    } catch (err) { console.error(err); showMessage({ type: 'error', text: 'Delete failed.' }); }
  };

  if (loading && view === 'list') return <div className="text-center py-5"><Spinner animation="border" /></div>;

  return (
    <Container className="py-4">
      {view === 'list' ? (
        <>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="fw-bold">Learning Resources</h2>
            <Button variant="primary" onClick={() => { 
                setIsEditing(false); 
                setFormData({title: '', subject: '', grade: '', stream: '', resource_type: 'video', url_or_file: '', term: 'Term 1'}); 
                setShowModal(true); 
            }}>+ Add Resource</Button>
          </div>

          <Row>
            {resources.map(res => (
              <Col md={6} lg={4} key={res.id} className="mb-4">
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <Badge bg={res.resource_type === 'video' ? 'danger' : 'primary'}>
                        {res.resource_type.toUpperCase()}
                      </Badge>
                      <small className="text-muted">{res.grade}{res.stream} - {res.term}</small>
                    </div>
                    <Card.Title className="fw-bold">{res.title}</Card.Title>
                    <Card.Subtitle className="mb-3 text-muted">{res.subject}</Card.Subtitle>
                    
                    <Stack direction="horizontal" gap={2} className="mt-auto">
                      <Button variant="outline-success" size="sm" className="flex-grow-1" onClick={() => {
                        setActiveResource(res);
                        setView('progress');
                      }}>Progress</Button>
                      
                      <Button variant="outline-warning" size="sm" onClick={() => {
                        setActiveResource(res);
                        setIsEditing(true);
                        setFormData(res);
                        setShowModal(true);
                      }}>Edit</Button>
                      
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(res.id)}>Del</Button>
                    </Stack>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </>
      ) : (
        <ResourceProgressView resource={activeResource} onBack={() => setView('list')} />
      )}

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>{isEditing ? 'Edit' : 'Add'} Resource</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control 
                required 
                placeholder="Enter resource title"
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
              />
            </Form.Group>

            <Row>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label>Grade</Form.Label>
                        <Form.Select required value={formData.grade} onChange={handleGradeChange}>
                            <option value="">Select Grade</option>
                            {assignments.grades.map(g => <option key={g} value={g}>{g}</option>)}
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label>Stream</Form.Label>
                        <Form.Select 
                            required 
                            disabled={!formData.grade} 
                            value={formData.stream} 
                            onChange={e => setFormData({...formData, stream: e.target.value})}
                        >
                            <option value="">Select Stream</option>
                            {assignments.getStreams(formData.grade).map(s => <option key={s} value={s}>{s}</option>)}
                        </Form.Select>
                    </Form.Group>
                </Col>
            </Row>

            <Row>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label>Subject</Form.Label>
                        <Form.Select 
                            required 
                            disabled={!formData.grade}
                            value={formData.subject} 
                            onChange={e => setFormData({...formData, subject: e.target.value})}
                        >
                            <option value="">Select Subject</option>
                            {assignments.getSubjects(formData.grade).map(s => <option key={s} value={s}>{s}</option>)}
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label>Term</Form.Label>
                        <Form.Select 
                            value={formData.term} 
                            onChange={e => setFormData({...formData, term: e.target.value})}
                        >
                            <option value="Term 1">Term 1</option>
                            <option value="Term 2">Term 2</option>
                            <option value="Term 3">Term 3</option>
                        </Form.Select>
                    </Form.Group>
                </Col>
            </Row>

            <Row>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label>Resource Type</Form.Label>
                        <Form.Select 
                            value={formData.resource_type} 
                            onChange={e => setFormData({...formData, resource_type: e.target.value})}
                        >
                            <option value="video">Video</option>
                            <option value="book">e-Book</option>
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label>URL / YouTube ID</Form.Label>
                        <Form.Control 
                            required 
                            value={formData.url_or_file} 
                            onChange={e => setFormData({...formData, url_or_file: e.target.value})} 
                        />
                    </Form.Group>
                </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Save Resource</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}

// -----------------------------------------------------------------------------
// PROGRESS VIEW COMPONENT (Unchanged except formatting)
// -----------------------------------------------------------------------------

function ResourceProgressView({ resource, onBack }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ stats: {}, logs: [] });

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await api.get(`teacher-portal/resources/${resource.id}/progress/`);
        setData(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchProgress();
  }, [resource.id]);

  return (
    <div>
      <Button variant="link" onClick={onBack} className="mb-3 p-0 text-decoration-none">← Back to Resources</Button>
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <h3 className="fw-bold">{resource.title} Progress</h3>
          <p className="text-muted mb-0">Class: {resource.grade}{resource.stream} | Average Completion: {Math.round(data.stats.avg_progress || 0)}%</p>
        </Card.Body>
      </Card>

      {loading ? <Spinner animation="border" /> : (
        <Card className="border-0 shadow-sm">
          <Table responsive hover className="mb-0">
            <thead className="bg-light">
              <tr>
                <th>Student Name</th>
                <th>Reg No</th>
                <th style={{ width: '40%' }}>Progress</th>
                <th>Status</th>
                <th>Last Accessed</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.map(log => (
                <tr key={log.id}>
                  <td>{log.first_name} {log.last_name}</td>
                  <td>{log.registration_no}</td>
                  <td>
                    <ProgressBar 
                        now={log.progress} 
                        label={`${log.progress}%`} 
                        variant={log.completed ? "success" : "primary"} 
                        className="mt-1"
                        style={{ height: '20px' }}
                    />
                  </td>
                  <td>
                    {log.completed ? <Badge bg="success">Completed</Badge> : <Badge bg="warning">In Progress</Badge>}
                  </td>
                  <td>{new Date(log.watched_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}