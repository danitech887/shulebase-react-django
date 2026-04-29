import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Spinner, Form, Stack, Modal } from 'react-bootstrap';
import api from '../../../../api/api';
import { useMessage } from '../../../../context/MessageContext';
import './Attendance.css';

export default function AttendancePortal() {
  const [data, setData] = useState({
    pupils: [], attendance_recorded: [], attendance_records: [],
    term_choices: ['Term 1', 'Term 2', 'Term 3'], today: '', grade: '', stream: ''
  });
  const [loading, setLoading]       = useState(true);
  const [isSaving, setIsSaving]     = useState(false);
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [statuses, setStatuses]     = useState({});
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportParams, setReportParams]       = useState({ type: 'daily', date: new Date().toISOString().split('T')[0], format: 'pdf' });
  const [filterGrade, setFilterGrade]   = useState('');
  const [filterStream, setFilterStream] = useState('');
  const { showMessage } = useMessage();

  const fetchClassData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('teacher-portal/attendance/', {
        params: { grade: filterGrade, stream: filterStream }
      });
      if (res.data) {
        setData(res.data);
        const init = {};
        (res.data.pupils || []).forEach(p => {
          if (!res.data.attendance_recorded.includes(p.registration_no))
            init[p.registration_no] = 'Present';
        });
        setStatuses(init);
      }
    } catch (err) {
      showMessage({ type: 'error', text: 'Failed to load class attendance data.' });
    } finally { setLoading(false); }
  }, [filterGrade, filterStream, showMessage]);

  useEffect(() => { fetchClassData(); }, [fetchClassData]);

  const handleStatusToggle = (regNo) => {
    setStatuses(prev => ({ ...prev, [regNo]: prev[regNo] === 'Present' ? 'Absent' : 'Present' }));
  };

  const handleSave = async () => {
    if (Object.keys(statuses).length === 0) {
      showMessage({ type: 'warning', text: 'Attendance for all students has already been recorded today.' });
      return;
    }
    setIsSaving(true);
    try {
      await api.post('teacher-portal/attendance/', {
        grade: data.grade, stream: data.stream,
        term_select: selectedTerm, statuses,
      });
      showMessage({ type: 'success', text: 'Attendance saved successfully!' });
      setStatuses({});
      fetchClassData();
    } catch (err) {
      showMessage({ type: 'error', text: err.response?.data?.detail || 'Error saving attendance.' });
    } finally { setIsSaving(false); }
  };

  const handleDownloadReport = async () => {
    try {
      const url = `teacher-portal/reports/attendance/?grade=${data.grade}&stream=${data.stream}&report_type=${reportParams.type}&date=${reportParams.date}&term=${selectedTerm}&format=${reportParams.format}&year=${new Date().getFullYear()}`;
      const response = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: reportParams.format === 'pdf' ? 'application/pdf' : 'text/csv' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `Attendance_${reportParams.type}_${data.grade}_${data.stream}.${reportParams.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowReportModal(false);
    } catch {
      showMessage({ type: 'error', text: 'Error generating attendance report.' });
    }
  };

  if (loading) return (
    <div className="t-page d-flex justify-content-center align-items-center" style={{ minHeight:'60vh' }}>
      <Spinner animation="border" className="t-spinner" />
    </div>
  );

  return (
    <div className="t-page">
      <Container>

        {/* ── Header card ── */}
        <div className="t-card card mb-3" style={{ position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,#6366f1,#818cf8,transparent)' }} />
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div>
                <h2 className="t-title">Daily Attendance</h2>
                <p className="t-subtitle">
                  <span className="badge t-badge-accent me-2">{data.grade || 'N/A'} {data.stream || ''}</span>
                  Date: <strong style={{ color:'var(--t-text)' }}>{data.today || '---'}</strong>
                </p>
              </div>
               <Stack direction="horizontal" gap={2}>
                <div style={{ width:120 }}>
                  <label className="t-label">Grade</label>
                  <select className="t-input t-select" value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
                    <option value="">Select Grade</option>
                    {data.grades?.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div style={{ width:120 }}>
                  <label className="t-label">Stream</label>
                  <select className="t-input t-select" value={filterStream} onChange={e => setFilterStream(e.target.value)}>
                    <option value="">Select Stream</option>
                    {data.streams?.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ width:130 }}>
                  <label className="t-label">Term</label>
                  <select className="t-input t-select" value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}>
                    {data.term_choices?.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <button
                  className="t-btn-outline-blue"
                  style={{ padding:'0.6rem 1rem', fontSize:'0.88rem' }}
                  onClick={() => setShowReportModal(true)}
                >
                  📊 Reports
                </button>
                <button
                  className="t-btn-primary"
                  style={{ padding:'0.6rem 1.4rem', fontSize:'0.88rem' }}
                  onClick={handleSave}
                  disabled={isSaving || Object.keys(statuses).length === 0}
                >
                  {isSaving ? 'Saving…' : 'Submit Attendance'}
                </button>
              </Stack>
            </div>
          </div>
        </div>

        {/* ── Attendance table ── */}
        <div className="t-card card overflow-hidden mb-3">
          <div style={{ overflowX:'auto' }}>
            <table className="t-table table mb-0">
              <thead>
                <tr>
                  <th className="px-4">Reg No</th>
                  <th>Student Name</th>
                  <th className="text-center">Status</th>
                  <th className="text-end px-4">Toggle</th>
                </tr>
              </thead>
              <tbody>
                {(data.pupils || []).map(pupil => {
                  const recorded = data.attendance_recorded.includes(pupil.registration_no);
                  return (
                    <tr key={pupil.registration_no} className={recorded ? 'att-recorded-row' : ''}>
                      <td className="px-4 t-mono">{pupil.registration_no}</td>
                      <td className="t-bold">{pupil.first_name} {pupil.last_name}</td>
                      <td className="text-center">
                        {recorded ? (
                          <span className="att-status-badge att-badge-recorded">Recorded</span>
                        ) : (
                          <span
                            className={`att-status-badge ${statuses[pupil.registration_no] === 'Present' ? 'att-badge-present' : 'att-badge-absent'}`}
                            onClick={() => handleStatusToggle(pupil.registration_no)}
                          >
                            {statuses[pupil.registration_no]}
                          </span>
                        )}
                      </td>
                      <td className="text-end px-4">
                        {!recorded && (
                          <Form.Check
                            type="switch"
                            id={`switch-${pupil.registration_no}`}
                            checked={statuses[pupil.registration_no] === 'Present'}
                            onChange={() => handleStatusToggle(pupil.registration_no)}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
                {(!data.pupils || data.pupils.length === 0) && (
                  <tr><td colSpan={4} className="text-center py-4 t-muted">No students found assigned to your class.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── History ── */}
        <div className="t-card card overflow-hidden">
          <div className="card-header">
            <span style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.09em' }}>Recent Records (History)</span>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table className="t-table table mb-0" style={{ fontSize:'0.82rem' }}>
              <thead>
                <tr>
                  <th className="px-4">Date</th>
                  <th>Reg No</th>
                  <th>Status</th>
                  <th>Term</th>
                </tr>
              </thead>
              <tbody>
                {(data.attendance_records || []).slice(0, 10).map((rec, i) => (
                  <tr key={i}>
                    <td className="px-4 t-mono">{rec.date_of_attendance}</td>
                    <td className="t-mono">{rec.registration_no}</td>
                    <td>
                      <span className={rec.status === 'Present' ? 'att-present' : 'att-absent'}>{rec.status}</span>
                    </td>
                    <td className="t-muted">{rec.term}</td>
                  </tr>
                ))}
                {(!data.attendance_records || data.attendance_records.length === 0) && (
                  <tr><td colSpan={4} className="text-center py-3 t-muted">No history found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

       </Container>

      <Modal show={showReportModal} onHide={() => setShowReportModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Grade Stream Attendance Records</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Report Type</Form.Label>
              <Form.Select value={reportParams.type} onChange={e => setReportParams({...reportParams, type:e.target.value})}>
                <option value="daily">Daily Attendance</option>
                <option value="weekly">Weekly Matrix (Mon-Fri)</option>
                <option value="termly">Termly Summary (P/A Counts)</option>
              </Form.Select>
            </Form.Group>
            
            {reportParams.type !== 'termly' && (
              <Form.Group className="mb-3">
                <Form.Label>{reportParams.type === 'daily' ? 'Select Date' : 'Select Week (Any day in week)'}</Form.Label>
                <Form.Control type="date" value={reportParams.date} onChange={e => setReportParams({...reportParams, date:e.target.value})} />
              </Form.Group>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Format</Form.Label>
              <Form.Select value={reportParams.format} onChange={e => setReportParams({...reportParams, format:e.target.value})}>
                <option value="pdf">PDF Document</option>
                <option value="csv">CSV Spreadsheet</option>
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <button className="t-btn-secondary" onClick={() => setShowReportModal(false)}>Cancel</button>
          <button className="t-btn-primary" onClick={handleDownloadReport}>Download Report</button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
