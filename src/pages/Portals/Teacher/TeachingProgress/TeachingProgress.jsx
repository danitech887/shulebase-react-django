import React, { useState, useEffect, useCallback } from 'react';
import { Container, Modal, Form, Spinner, Stack, Button, Row, Col } from 'react-bootstrap';
import api from '../../../../api/api';
import { useMessage } from '../../../../context/MessageContext';
import './TeachingProgress.css';

const computeProgress = (p) => {
  if (!p) return 0;
  if (p.status==='Completed'||p.date_finished) return 100;
  if (p.status==='Ongoing') return 50;
  return 0;
};

export default function TeachingProgressManager() {
  const { showMessage } = useMessage();
  const [records, setRecords]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [showAddModal, setShowAddModal]   = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeRecord, setActiveRecord]   = useState(null);
  const [choices, setChoices] = useState({ grade_choices:[], stream_choices:[], subject_choices:[] });

  const emptyNew = { grade:'', stream:'', subject:'', topic:'', sub_topic:'', no_of_topics:'', status:'Ongoing', date_of_teaching:'', date_finished:'' };
  const emptyEdit = { topic:'', sub_topic:'', no_of_topics:'', status:'Ongoing', date_of_teaching:'', date_finished:'', subject:'' };
  const [newData,    setNewData]    = useState(emptyNew);
  const [updateData, setUpdateData] = useState(emptyEdit);

  const fetchProgress = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('teacher-portal/teaching-progress/');
      let payload = [];
      if (res.data) {
        if (Array.isArray(res.data)) payload = res.data;
        else if (Array.isArray(res.data.progresses)) payload = res.data.progresses;
        else if (Array.isArray(res.data.results))    payload = res.data.results;
        else if (Array.isArray(res.data.data))        payload = res.data.data;
      }
      if (res.data && typeof res.data === 'object') {
        setChoices({ grade_choices:res.data.grade_choices||[], stream_choices:res.data.stream_choices||[], subject_choices:res.data.subject_choices||[] });
      }
      setRecords((payload||[]).map(p => ({...p, progress_percentage:computeProgress(p)})));
      setError(null);
    } catch { setError('Failed to load teaching progress records.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`teacher-portal/teaching-progress/${activeRecord.id}/`, { topic:updateData.topic, sub_topic:updateData.sub_topic, no_of_topics:updateData.no_of_topics, status:updateData.status, date_of_teaching:updateData.date_of_teaching||null, date_finished:updateData.date_finished||null, subject:updateData.subject });
      setRecords(records.map(r => r.id===activeRecord.id ? {...res.data,progress_percentage:computeProgress(res.data)} : r));
      setShowEditModal(false);
    } catch { showMessage({type:'error',text:'Error updating progress.'}); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('teacher-portal/teaching-progress/', { grade:newData.grade, stream:newData.stream, subject:newData.subject, topic:newData.topic, sub_topic:newData.sub_topic, no_of_topics:newData.no_of_topics||null, status:newData.status, date_of_teaching:newData.date_of_teaching||null, date_finished:newData.date_finished||null });
      setRecords([{...res.data,progress_percentage:computeProgress(res.data)}, ...records]);
      setShowAddModal(false); setNewData(emptyNew);
      showMessage({type:'success',text:'Teaching progress added.'});
    } catch { showMessage({type:'error',text:'Failed to add progress.'}); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this progress record?')) return;
    try { await api.delete(`teacher-portal/teaching-progress/${id}/`); setRecords(records.filter(r => r.id!==id)); }
    catch { showMessage({type:'error',text:'Failed to delete.'}); }
  };

  const openEdit = (rec) => {
    setActiveRecord(rec);
    setUpdateData({ topic:rec.topic, sub_topic:rec.sub_topic||'', no_of_topics:rec.no_of_topics||'', status:rec.status||'Ongoing', date_of_teaching:rec.date_of_teaching||'', date_finished:rec.date_finished||'', subject:rec.subject||'' });
    setShowEditModal(true);
  };

  const statusClass = (s) => {
    if (s==='Completed')   return 'tp-status-completed';
    if (s==='Ongoing')     return 'tp-status-ongoing';
    return 'tp-status-notstarted';
  };

  if (loading) return (
    <div className="t-page d-flex justify-content-center align-items-center" style={{ minHeight:'60vh' }}>
      <Spinner animation="border" className="t-spinner" />
    </div>
  );

  return (
    <div className="t-page">
      <Container>

        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
          <div>
            <h2 className="t-title">Teaching Progress Tracker</h2>
            <p className="t-subtitle">{records.length} total topics tracked</p>
          </div>
          <div className="d-flex gap-2 align-items-center">
            <span className="badge t-badge-accent">{records.length} Topics</span>
            <button className="t-btn-primary" onClick={() => setShowAddModal(true)}>+ Add Progress</button>
          </div>
        </div>

        {error && <div className="alert alert-danger mb-3">{error}</div>}

        {/* Table card */}
        <div className="t-card card overflow-hidden">
          <div style={{ overflowX:'auto' }}>
            <table className="t-table table mb-0">
              <thead>
                <tr>
                  <th className="px-4">Topic / Lesson</th>
                  <th style={{ width:'28%' }}>Progress</th>
                  <th>Status</th>
                  <th className="text-end px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map(rec => (
                  <tr key={rec.id}>
                    <td className="px-4">
                      <div className="t-bold">{rec.topic}</div>
                      <small className="t-muted">{rec.subject} — Grade {rec.grade}</small>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="tp-progress flex-grow-1" style={{ height:8 }}>
                          <div className={`tp-progress-bar ${rec.progress_percentage===100?'tp-progress-bar-done':'tp-progress-bar-going'}`} style={{ width:`${rec.progress_percentage}%` }} />
                        </div>
                        <small className="t-bold" style={{ color:'var(--t-text)', whiteSpace:'nowrap' }}>{rec.progress_percentage}%</small>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${statusClass(rec.status)}`}>{rec.status}</span>
                    </td>
                    <td className="text-end px-4">
                      <Stack direction="horizontal" gap={2} className="justify-content-end">
                        <button className="t-btn-outline-blue" onClick={() => openEdit(rec)}>Edit</button>
                        <button className="t-btn-danger" onClick={() => handleDelete(rec.id)}>Delete</button>
                      </Stack>
                    </td>
                  </tr>
                ))}
                {records.length===0 && (
                  <tr><td colSpan={4} className="text-center py-5 t-muted">No progress records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Modal */}
        <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
          <Form onSubmit={handleUpdate}>
            <Modal.Header closeButton><Modal.Title>Update Teaching Progress</Modal.Title></Modal.Header>
            <Modal.Body>
              <Form.Group className="mb-3"><Form.Label>Topic</Form.Label><Form.Control required value={updateData.topic} onChange={e => setUpdateData({...updateData,topic:e.target.value})} /></Form.Group>
              <Form.Group className="mb-3"><Form.Label>Sub-topic</Form.Label><Form.Control value={updateData.sub_topic} onChange={e => setUpdateData({...updateData,sub_topic:e.target.value})} /></Form.Group>
              <Row>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>No. of Topics</Form.Label><Form.Control type="number" min="0" value={updateData.no_of_topics} onChange={e => setUpdateData({...updateData,no_of_topics:e.target.value})} /></Form.Group></Col>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>Status</Form.Label><Form.Select value={updateData.status} onChange={e => setUpdateData({...updateData,status:e.target.value})}><option value="Ongoing">Ongoing</option><option value="Completed">Completed</option><option value="Not Started">Not Started</option></Form.Select></Form.Group></Col>
              </Row>
              <Row>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>Date of Teaching</Form.Label><Form.Control type="datetime-local" value={updateData.date_of_teaching||''} onChange={e => setUpdateData({...updateData,date_of_teaching:e.target.value})} /></Form.Group></Col>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>Date Finished</Form.Label><Form.Control type="date" value={updateData.date_finished||''} onChange={e => setUpdateData({...updateData,date_finished:e.target.value})} /></Form.Group></Col>
              </Row>
              <Form.Group className="mb-3"><Form.Label>Subject</Form.Label><Form.Control value={updateData.subject} onChange={e => setUpdateData({...updateData,subject:e.target.value})} /></Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="light" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit">Save Changes</Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* Add Modal */}
        <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
          <Form onSubmit={handleCreate}>
            <Modal.Header closeButton><Modal.Title>Add Teaching Progress</Modal.Title></Modal.Header>
            <Modal.Body>
              <Row>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>Grade</Form.Label><Form.Select required value={newData.grade} onChange={e => setNewData({...newData,grade:e.target.value})}><option value="">Select grade</option>{choices.grade_choices.map(g=><option key={g} value={g}>{g}</option>)}</Form.Select></Form.Group></Col>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>Stream</Form.Label><Form.Select required value={newData.stream} onChange={e => setNewData({...newData,stream:e.target.value})}><option value="">Select stream</option>{choices.stream_choices.map(s=><option key={s} value={s}>{s}</option>)}</Form.Select></Form.Group></Col>
              </Row>
              <Form.Group className="mb-3"><Form.Label>Subject</Form.Label><Form.Select required value={newData.subject} onChange={e => setNewData({...newData,subject:e.target.value})}><option value="">Select subject</option>{choices.subject_choices.map(s=><option key={s} value={s}>{s}</option>)}</Form.Select></Form.Group>
              <Form.Group className="mb-3"><Form.Label>Topic</Form.Label><Form.Control required value={newData.topic} onChange={e => setNewData({...newData,topic:e.target.value})} /></Form.Group>
              <Form.Group className="mb-3"><Form.Label>Sub-topic</Form.Label><Form.Control value={newData.sub_topic} onChange={e => setNewData({...newData,sub_topic:e.target.value})} /></Form.Group>
              <Row>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>No. of Topics</Form.Label><Form.Control type="number" min="0" value={newData.no_of_topics} onChange={e => setNewData({...newData,no_of_topics:e.target.value})} /></Form.Group></Col>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>Status</Form.Label><Form.Select value={newData.status} onChange={e => setNewData({...newData,status:e.target.value})}><option value="Ongoing">Ongoing</option><option value="Completed">Completed</option><option value="Not Started">Not Started</option></Form.Select></Form.Group></Col>
              </Row>
              <Row>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>Date of Teaching</Form.Label><Form.Control type="datetime-local" value={newData.date_of_teaching||''} onChange={e => setNewData({...newData,date_of_teaching:e.target.value})} /></Form.Group></Col>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>Date Finished</Form.Label><Form.Control type="date" value={newData.date_finished||''} onChange={e => setNewData({...newData,date_finished:e.target.value})} /></Form.Group></Col>
              </Row>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="light" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button variant="success" type="submit">Add Progress</Button>
            </Modal.Footer>
          </Form>
        </Modal>

      </Container>
    </div>
  );
}
