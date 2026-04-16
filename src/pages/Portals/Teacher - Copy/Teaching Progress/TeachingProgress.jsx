import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, Card, Table, Button, Modal, 
  Form, ProgressBar, Badge, Spinner, Alert, Stack, Row, Col
} from 'react-bootstrap';
import api from '../../../../api/api'; 
import { useMessage } from '../../../../context/MessageContext';

// Compute a simple progress percentage for display based on available fields.
// Rules:
// - If status is 'Completed' or date_finished exists => 100
// - If status is 'Ongoing' => 50
// - Otherwise => 0
const computeProgressPercentage = (p) => {
  try {
    if (!p) return 0;
    if (p.status === 'Completed') return 100;
    if (p.date_finished) return 100;
    if (p.status === 'Ongoing') return 50;
    return 0;
  } catch (e) { return 0; }
}

export default function TeachingProgressManager() {
  const { showMessage } = useMessage();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [choices, setChoices] = useState({ grade_choices: [], stream_choices: [], subject_choices: [] });
  const [newData, setNewData] = useState({
    grade: '',
    stream: '',
    subject: '',
    topic: '',
    sub_topic: '',
    no_of_topics: '',
    status: 'Ongoing',
    date_of_teaching: '',
    date_finished: ''
  });

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeRecord, setActiveRecord] = useState(null);
  const [updateData, setUpdateData] = useState({
    topic: '',
    sub_topic: '',
    no_of_topics: '',
    status: 'Ongoing',
    date_of_teaching: '',
    date_finished: '',
    subject: ''
  });

  // 1. Fetch all progress records
  const fetchProgress = useCallback(async () => {
    try {
      setLoading(true);
      // Assumes your List view is at 'teacher-portal/teaching-progress/'
      const res = await api.get('teacher-portal/teaching-progress/');
      // Backend returns: { progresses: [...], grade_choices: ..., ... }
      let payload = [];
      if (res.data) {
        if (Array.isArray(res.data)) payload = res.data;
        else if (Array.isArray(res.data.progresses)) payload = res.data.progresses;
        else if (Array.isArray(res.data.results)) payload = res.data.results;
        else if (Array.isArray(res.data.data)) payload = res.data.data;
      }

      // Capture choices when provided by the backend
      if (res.data && typeof res.data === 'object') {
        setChoices({
          grade_choices: res.data.grade_choices || [],
          stream_choices: res.data.stream_choices || [],
          subject_choices: res.data.subject_choices || [],
        });
      }

      // Ensure payload is an array and add a computed progress_percentage for UI
      payload = (payload || []).map((p) => ({
        ...p,
        progress_percentage: computeProgressPercentage(p),
      }));
      setRecords(payload);
      setError(null);
    } catch (err) {
      setError("Failed to load teaching progress records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // 2. Handle Update (PUT)
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      // Only send model fields that exist on the backend
      const payload = {
        topic: updateData.topic,
        sub_topic: updateData.sub_topic,
        no_of_topics: updateData.no_of_topics,
        status: updateData.status,
        date_of_teaching: updateData.date_of_teaching || null,
        date_finished: updateData.date_finished || null,
        subject: updateData.subject,
      };
      const res = await api.put(`teacher-portal/teaching-progress/${activeRecord.id}/`, payload);
      // Merge and recompute progress_percentage
      setRecords(records.map(r => r.id === activeRecord.id ? {...res.data, progress_percentage: computeProgressPercentage(res.data)} : r));
      setShowEditModal(false);
    } catch (err) {
      console.error(err);
      showMessage({ type: 'error', text: 'Error updating progress. Please check your inputs.' });
    }
  };

  // 4. Handle Create (POST)
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        grade: newData.grade,
        stream: newData.stream,
        subject: newData.subject,
        topic: newData.topic,
        sub_topic: newData.sub_topic,
        no_of_topics: newData.no_of_topics || null,
        status: newData.status,
        date_of_teaching: newData.date_of_teaching || null,
        date_finished: newData.date_finished || null,
      };
      const res = await api.post('teacher-portal/teaching-progress/', payload);
      // Prepend new record and compute progress
      const created = { ...res.data, progress_percentage: computeProgressPercentage(res.data) };
      setRecords([created, ...records]);
      setShowAddModal(false);
      // reset form
      setNewData({ grade: '', stream: '', subject: '', topic: '', sub_topic: '', no_of_topics: '', status: 'Ongoing', date_of_teaching: '', date_finished: '' });
      showMessage({ type: 'success', text: 'Teaching progress added.' });
    } catch (err) {
      console.error(err);
      showMessage({ type: 'error', text: 'Failed to add progress. Check inputs.' });
    }
  };

  // 3. Handle Delete
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this progress record?")) return;
    
    try {
      await api.delete(`teacher-portal/teaching-progress/${id}/`);
      setRecords(records.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
      showMessage({ type: 'error', text: 'Failed to delete the record.' });
    }
  };

  // Open Modal and Pre-fill data
  const openEditModal = (record) => {
    setActiveRecord(record);
    setUpdateData({
      topic: record.topic,
      sub_topic: record.sub_topic || '',
      no_of_topics: record.no_of_topics || '',
      status: record.status || 'Ongoing',
      date_of_teaching: record.date_of_teaching || '',
      date_finished: record.date_finished || '',
      subject: record.subject || ''
    });
    setShowEditModal(true);
  };

  if (loading) return <Container className="text-center py-5"><Spinner animation="border" /></Container>;

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">Teaching Progress Tracker</h2>
        <div className="d-flex align-items-center gap-2">
          <Badge bg="primary">{records.length} Total Topics</Badge>
          <Button variant="success" onClick={() => setShowAddModal(true)}>Add Progress</Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="border-0 shadow-sm overflow-hidden">
        <Table responsive hover className="mb-0 align-middle">
          <thead className="bg-light">
            <tr>
              <th className="px-4 py-3">Topic / Lesson</th>
              <th className="py-3" style={{ width: '25%' }}>Progress</th>
              <th className="py-3">Status</th>
              <th className="py-3 text-end px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id}>
                <td className="px-4">
                  <div className="fw-bold">{record.topic}</div>
                  <small className="text-muted">{record.subject} - Grade {record.grade}</small>
                </td>
                <td>
                  <div className="d-flex align-items-center">
                    <ProgressBar 
                      now={record.progress_percentage} 
                      variant={record.progress_percentage === 100 ? "success" : "primary"} 
                      className="flex-grow-1 me-2"
                      style={{ height: '8px' }}
                    />
                    <small className="fw-bold">{record.progress_percentage}%</small>
                  </div>
                </td>
                <td>
                  <Badge bg={record.status === 'Completed' ? 'success' : 'warning'}>
                    {record.status}
                  </Badge>
                </td>
                <td className="text-end px-4">
                  <Stack direction="horizontal" gap={2} className="justify-content-end">
                    <Button 
                      variant="outline-primary" 
                      size="sm" 
                      onClick={() => openEditModal(record)}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="outline-danger" 
                      size="sm" 
                      onClick={() => handleDelete(record.id)}
                    >
                      Delete
                    </Button>
                  </Stack>
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center py-5 text-muted">
                  No progress records found.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>

      {/* Edit Progress Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Form onSubmit={handleUpdate}>
          <Modal.Header closeButton>
            <Modal.Title>Update Teaching Progress</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Topic</Form.Label>
              <Form.Control 
                type="text" 
                value={updateData.topic} 
                onChange={(e) => setUpdateData({...updateData, topic: e.target.value})}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Sub-topic</Form.Label>
              <Form.Control
                type="text"
                value={updateData.sub_topic}
                onChange={(e) => setUpdateData({...updateData, sub_topic: e.target.value})}
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">No. of Topics</Form.Label>
                  <Form.Control 
                    type="number" 
                    min="0" 
                    value={updateData.no_of_topics} 
                    onChange={(e) => setUpdateData({...updateData, no_of_topics: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Status</Form.Label>
                  <Form.Select 
                    value={updateData.status} 
                    onChange={(e) => setUpdateData({...updateData, status: e.target.value})}
                  >
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                    <option value="Not Started">Not Started</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Date of Teaching</Form.Label>
                  <Form.Control 
                    type="datetime-local" 
                    value={updateData.date_of_teaching || ''}
                    onChange={(e) => setUpdateData({...updateData, date_of_teaching: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Date Finished</Form.Label>
                  <Form.Control 
                    type="date" 
                    value={updateData.date_finished || ''}
                    onChange={(e) => setUpdateData({...updateData, date_finished: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Subject</Form.Label>
              <Form.Control 
                type="text"
                value={updateData.subject}
                onChange={(e) => setUpdateData({...updateData, subject: e.target.value})}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Save Changes</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Add Progress Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
        <Form onSubmit={handleCreate}>
          <Modal.Header closeButton>
            <Modal.Title>Add Teaching Progress</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Grade</Form.Label>
                  <Form.Select value={newData.grade} onChange={(e) => setNewData({...newData, grade: e.target.value})} required>
                    <option value="">Select grade</option>
                    {choices.grade_choices.map(g => <option key={g} value={g}>{g}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Stream</Form.Label>
                  <Form.Select value={newData.stream} onChange={(e) => setNewData({...newData, stream: e.target.value})} required>
                    <option value="">Select stream</option>
                    {choices.stream_choices.map(s => <option key={s} value={s}>{s}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Subject</Form.Label>
              <Form.Select value={newData.subject} onChange={(e) => setNewData({...newData, subject: e.target.value})} required>
                <option value="">Select subject</option>
                {choices.subject_choices.map(s => <option key={s} value={s}>{s}</option>)}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Topic</Form.Label>
              <Form.Control type="text" value={newData.topic} onChange={(e) => setNewData({...newData, topic: e.target.value})} required />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Sub-topic</Form.Label>
              <Form.Control type="text" value={newData.sub_topic} onChange={(e) => setNewData({...newData, sub_topic: e.target.value})} />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">No. of Topics</Form.Label>
                  <Form.Control type="number" min="0" value={newData.no_of_topics} onChange={(e) => setNewData({...newData, no_of_topics: e.target.value})} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Status</Form.Label>
                  <Form.Select value={newData.status} onChange={(e) => setNewData({...newData, status: e.target.value})}>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                    <option value="Not Started">Not Started</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Date of Teaching</Form.Label>
                  <Form.Control type="datetime-local" value={newData.date_of_teaching || ''} onChange={(e) => setNewData({...newData, date_of_teaching: e.target.value})} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Date Finished</Form.Label>
                  <Form.Control type="date" value={newData.date_finished || ''} onChange={(e) => setNewData({...newData, date_finished: e.target.value})} />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button variant="success" type="submit">Add Progress</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}