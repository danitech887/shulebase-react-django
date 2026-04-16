import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, Row, Col, Card, Button, Table, 
  Form, Badge, Spinner, Stack 
} from 'react-bootstrap';
import api from '../../../../api/api'; 
import { useMessage } from '../../../../context/MessageContext';

export default function ClassAttendancePortal() {
  // 1. Data State
  const [data, setData] = useState({
    pupils: [],
    attendance_recorded: [], // Registration numbers already marked today
    attendance_records: [],  // Historical records
    term_choices: ["Term 1", "Term 2", "Term 3"],
    today: '',
    grade: '',
    stream: ''
  });

  // 2. UI & Form State
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [historyTerm, setHistoryTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statuses, setStatuses] = useState({}); // Stores { reg_no: "Present" }
  const [error, setError] = useState(null); 
  const { showMessage } = useMessage();

  // 3. Fetch Class Data on Mount
  const fetchClassData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null); 
      
      // GET -> /api/teacher-portal/attendance/
      const res = await api.get('teacher-portal/attendance/'); 
      
      if (res.data) {
        setData(res.data);

        // Initialize statuses for students NOT yet recorded today
        const initialStatuses = {};
        if (res.data.pupils && Array.isArray(res.data.pupils)) {
          res.data.pupils.forEach(p => {
            // Only add to 'statuses' if they haven't been marked yet
            if (!res.data.attendance_recorded.includes(p.registration_no)) {
              initialStatuses[p.registration_no] = "Present"; 
            }
          });
        }
        setStatuses(initialStatuses);
      }
    } catch (err) {
      console.error("Attendance Fetch Error:", err);
      setError(err.message);
      showMessage({ type: 'error', text: 'Failed to load class attendance data.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClassData();
  }, [fetchClassData]);

  // 4. Toggle Status (Present/Absent)
  const handleStatusToggle = (regNo) => {
    setStatuses(prev => ({
      ...prev,
      [regNo]: prev[regNo] === "Present" ? "Absent" : "Present"
    }));
  };

  // 5. Bulk Save Attendance (Fixed for 400 Bad Request)
  const handleSave = async () => {
    if (Object.keys(statuses).length === 0) {
      showMessage({ type: 'warning', text: 'Attendance for all students has already been recorded today.' });
      return;
    }

    setIsSaving(true);
    try {
      // The payload structure MUST match your AttendanceWriteSerializer
      const payload = {
        grade: data.grade,          // String from GET response
        stream: data.stream,        // String from GET response
        term_select: selectedTerm,  // Matches serializer field name
        statuses: statuses          // { "REG001": "Present", ... }
      };

      await api.post('teacher-portal/attendance/', payload);

      showMessage({ type: 'success', text: 'Attendance saved successfully!' });
      setStatuses({}); // Reset local changes
      fetchClassData(); // Re-fetch to lock the rows
    } catch (err) {
      console.error("Post Error Details:", err.response?.data);
      showMessage({ type: 'error', text: err.response?.data?.detail || 'Error saving attendance. Please check all fields.' });
    } finally {
      setIsSaving(false);
    }
  };

  // 6. Generate Attendance PDF for current grade/stream/term
  const handleGeneratePdf = async () => {
    try {
      showMessage({ type: 'info', text: 'Generating PDF, please wait...' });
      const params = {
        grade: data.grade,
        stream: data.stream,
        term: historyTerm || selectedTerm,
      };

      const res = await api.get('reports/print_attendance_sheet/', { params, responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeGrade = (params.grade || 'all').replace(/\s+/g, '_');
      const safeStream = (params.stream || 'all').replace(/\s+/g, '_');
      const safeTerm = (params.term || 'all').replace(/\s+/g, '_');
      a.download = `attendance_${safeGrade}_${safeStream}_${safeTerm}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showMessage({ type: 'success', text: 'PDF generated — download should start.' });
    } catch (err) {
      console.error('PDF Generation Error:', err);
      showMessage({ type: 'error', text: 'Failed to generate PDF.' });
    }
  };

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading class list...</p>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      {/* --- Header Section --- */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <h2 className="fw-bold mb-1">Daily Attendance</h2>
            <p className="text-muted mb-0">
              <Badge bg="dark" className="me-2">{data.grade || 'N/A'} {data.stream || ''}</Badge>
              Date: <strong>{data.today || '---'}</strong>
            </p>
          </div>
          
          <Stack direction="horizontal" gap={3}>
            <div style={{ width: '150px' }}>
              <Form.Label className="small fw-bold mb-1">ASSESSMENT TERM</Form.Label>
              <Form.Select 
                value={selectedTerm} 
                onChange={e => setSelectedTerm(e.target.value)}
              >
                {data.term_choices.map(t => <option key={t} value={t}>{t}</option>)}
              </Form.Select>
            </div>
            <Button 
              variant="success" 
              size="lg" 
              className="px-4 mt-auto"
              onClick={handleSave}
              disabled={isSaving || Object.keys(statuses).length === 0}
            >
              {isSaving ? "Saving..." : "Submit Attendance"}
            </Button>
          </Stack>
        </Card.Body>
      </Card>

      {/* Global message modal handles alerts now */}

      {/* --- Attendance Entry Table --- */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <Table responsive hover className="mb-0 align-middle">
          <thead className="bg-light text-uppercase small fw-bold">
            <tr>
              <th className="px-4 py-3">Reg No</th>
              <th className="py-3">Student Name</th>
              <th className="py-3 text-center">Status</th>
              <th className="py-3 text-end px-4">Toggle</th>
            </tr>
          </thead>
          <tbody>
            {data.pupils && data.pupils.map((pupil) => {
              const isAlreadyRecorded = data.attendance_recorded.includes(pupil.registration_no);

              return (
                <tr key={pupil.registration_no} className={isAlreadyRecorded ? "table-secondary text-muted" : ""}>
                  <td className="px-4 fw-bold">{pupil.registration_no}</td>
                  <td>{pupil.first_name} {pupil.last_name}</td>
                  <td className="text-center">
                    {isAlreadyRecorded ? (
                      <Badge bg="secondary" pill>Recorded Today</Badge>
                    ) : (
                      <Badge 
                        bg={statuses[pupil.registration_no] === "Present" ? "success" : "danger"}
                        pill
                        style={{ cursor: 'pointer', minWidth: '80px' }}
                        onClick={() => handleStatusToggle(pupil.registration_no)}
                      >
                        {statuses[pupil.registration_no]}
                      </Badge>
                    )}
                  </td>
                  <td className="text-end px-4">
                    {!isAlreadyRecorded && (
                      <Form.Check 
                        type="switch"
                        id={`switch-${pupil.registration_no}`}
                        checked={statuses[pupil.registration_no] === "Present"}
                        onChange={() => handleStatusToggle(pupil.registration_no)}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        
        {(!data.pupils || data.pupils.length === 0) && (
          <div className="text-center py-5">
            <p className="text-muted">No students found assigned to your class.</p>
          </div>
        )}
      </Card>

      {/* --- History Section --- */}
      <Card className="mt-4 border-0 shadow-sm">
        <Card.Header className="bg-white fw-bold py-3 border-0">Recent Records (History)</Card.Header>
        <Table responsive size="sm" className="mb-0 small">
          <thead>
            <tr className="text-muted border-bottom">
              <th className="px-4 py-2">Date</th>
              <th className="py-2">Reg No</th>
              <th className="py-2">Status</th>
              <th className="py-2">Term</th>
            </tr>
          </thead>
          <tbody>
            {data.attendance_records && data.attendance_records.slice(0, 10).map((record, index) => (
              <tr key={index}>
                <td className="px-4 py-2">{record.date_of_attendance}</td>
                <td className="py-2">{record.registration_no}</td>
                <td className="py-2">
                    <span className={record.status === 'Present' ? 'text-success fw-bold' : 'text-danger fw-bold'}>
                        {record.status}
                    </span>
                </td>
                <td className="py-2">{record.term}</td>
              </tr>
            ))}
            {(!data.attendance_records || data.attendance_records.length === 0) && (
                <tr><td colSpan="4" className="text-center py-3">No history found.</td></tr>
            )}
          </tbody>
        </Table>
      </Card>
    </Container>
  );
}