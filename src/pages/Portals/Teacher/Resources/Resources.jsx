import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Row, Col, Modal, Form, Spinner, Stack, Button, ProgressBar } from 'react-bootstrap';
import api from '../../../../api/api';
import { useMessage } from '../../../../context/MessageContext';
import './Resources.css';

export default function TeacherResourceManager() {
  const { showMessage } = useMessage();
  const [view, setView]         = useState('list');
  const [resources, setResources] = useState([]);
  const [activeResource, setActiveResource] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ title:'', subject:'', grade:'', stream:'', resource_type:'video', url_or_file:'', term:'Term 1' });
  const [choices, setChoices] = useState({ grades: [], streams: [], subjects: [] });

  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('teacher-portal/resources/');
      setResources(res.data.resources);
      setChoices({
        grades: res.data.grades || [],
        streams: res.data.streams || [],
        subjects: res.data.subjects || [],
      });
    } catch (err) {
      console.error(err);
      showMessage({ type: 'error', text: 'Failed to load resources.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchResources(); }, [fetchResources]);
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) await api.put(`teacher-portal/resources/${activeResource.id}/`, formData);
      else           await api.post('teacher-portal/resources/', formData);
      setShowModal(false); fetchResources();
    } catch (err) { showMessage({ type:'error', text:'Failed to save resource.' }); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this resource?')) return;
    try { await api.delete(`teacher-portal/resources/${id}/`); fetchResources(); }
    catch { showMessage({ type:'error', text:'Delete failed.' }); }
  };


  if (loading && view==='list') return (
    <div className="t-page d-flex justify-content-center align-items-center" style={{ minHeight:'60vh' }}>
      <Spinner animation="border" className="t-spinner" />
    </div>
  );

  return (
    <div className="t-page">
      <Container>
        {view === 'list' ? (
          <>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="t-title">Learning Resources</h2>
              <button className="t-btn-primary" onClick={() => {
                setIsEditing(false);
                setFormData({ title:'', subject:'', grade:'', stream:'', resource_type:'video', url_or_file:'', term:'Term 1' });
                setShowModal(true);
              }}>+ Add Resource</button>
            </div>

            <Row className="g-4">
              {resources.map(res => (
                <Col md={6} lg={4} key={res.id}>
                  <div className="res-card card">
                    <div className="card-body d-flex flex-column">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <span className={`res-type-badge res-type-${res.resource_type}`}>{res.resource_type.toUpperCase()}</span>
                        <small className="t-muted">{res.grade}{res.stream} — {res.term}</small>
                      </div>
                      
                      <p className="t-bold mb-1" style={{ fontSize:'0.95rem' }}>{res.title}</p>
                      <p className="t-muted" style={{ fontSize:'0.82rem', flex:1 }}>{res.subject}</p>
                      <Stack direction="horizontal" gap={2} className="mt-2">
                        <button className="t-btn-outline-blue" style={{ flex:1 }} onClick={() => { setActiveResource(res); setView('progress'); }}>Progress</button>
                        <button className="t-btn-outline-yellow" onClick={() => { setActiveResource(res); setIsEditing(true); setFormData(res); setShowModal(true); }}>Edit</button>
                        <button className="t-btn-danger" onClick={() => handleDelete(res.id)}>Del</button>
                      </Stack>
                    </div>
                  </div>
                </Col>
              ))}
              {resources.length === 0 && (
                <Col><p className="t-muted text-center py-5">No resources yet. Add one!</p></Col>
              )}
            </Row>
          </>
        ) : (
          <ResourceProgressView resource={activeResource} onBack={() => setView('list')} />
        )}

        {/* Modal */}
        <Modal show={showModal} onHide={() => setShowModal(false)} centered>
          <Form onSubmit={handleSubmit}>
            <Modal.Header closeButton>
              <Modal.Title>{isEditing ? 'Edit' : 'Add'} Resource</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label>Title</Form.Label>
                <Form.Control required placeholder="Enter resource title" value={formData.title} onChange={e => setFormData({...formData,title:e.target.value})} />
              </Form.Group>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Grade</Form.Label>
                    <Form.Select required value={formData.grade} onChange={e => setFormData({ ...formData, grade: e.target.value })}>
                      <option value="">Select Grade</option>
                      {choices.grades.map(g => <option key={g} value={g}>{g}</option>)}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Stream</Form.Label>
                    <Form.Select required value={formData.stream} onChange={e => setFormData({...formData,stream:e.target.value})}>
                      <option value="">Select Stream</option>
                      {choices.streams.map(s => <option key={s} value={s}>{s}</option>)}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Subject</Form.Label>
                    <Form.Select required value={formData.subject} onChange={e => setFormData({...formData,subject:e.target.value})}>
                      <option value="">Select Subject</option>
                      {choices.subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Term</Form.Label>
                    <Form.Select value={formData.term} onChange={e => setFormData({...formData,term:e.target.value})}>
                      <option>Term 1</option><option>Term 2</option><option>Term 3</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Resource Type</Form.Label>
                    <Form.Select value={formData.resource_type} onChange={e => setFormData({...formData,resource_type:e.target.value})}>
                      <option value="video">Video</option>
                      <option value="book">e-Book</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>URL / YouTube ID</Form.Label>
                    <Form.Control required value={formData.url_or_file} onChange={e => setFormData({...formData,url_or_file:e.target.value})} />
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
    </div>
  );
}

function ResourceProgressView({ resource, onBack }) {
  const [loading, setLoading] = useState(true);
  const [data, setData]       = useState({ stats:{}, logs:[] });

  useEffect(() => {
    api.get(`teacher-portal/resources/${resource.id}/progress/`)
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [resource.id]);

  return (
    <div>
      <button className="t-btn-secondary mb-3" onClick={onBack}>← Back to Resources</button>
      <div className="t-card card mb-4">
        <div className="card-body">
          <h3 className="t-title">{resource.title} Progress</h3>
          <p className="t-muted">Class: {resource.grade}{resource.stream} | Avg Completion: {Math.round(data.stats.avg_progress||0)}%</p>
        </div>
      </div>
      {loading ? <Spinner animation="border" className="t-spinner" /> : (
        <div className="t-card card overflow-hidden">
          <div style={{ overflowX:'auto' }}>
            <table className="t-table table mb-0">
              <thead>
                <tr>
                  <th>Student Name</th><th>Reg No</th>
                  <th style={{ width:'35%' }}>Progress</th>
                  <th>Status</th><th>Last Accessed</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map(log => (
                  <tr key={log.id}>
                    <td className="t-bold">{log.first_name} {log.last_name}</td>
                    <td className="t-mono">{log.registration_no}</td>
                    <td>
                      <ProgressBar now={log.progress} label={`${log.progress}%`}
                        variant={log.completed?'success':'primary'}
                        className="res-progress-bar" />
                    </td>
                    <td>
                      <span className={`badge ${log.completed ? 't-badge-green' : 't-badge-yellow'}`}>
                        {log.completed ? 'Completed' : 'In Progress'}
                      </span>
                    </td>
                    <td className="t-mono">{new Date(log.watched_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
