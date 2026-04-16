import { useState, useEffect, useMemo } from "react";
import { Row, Col, Card, Badge, Spinner, Alert, Form } from 'react-bootstrap';
import api from '../../../../api/api';
import { useMessage } from '../../../../context/MessageContext';
import { PeopleFill, PersonXFill, CheckCircleFill, ClockHistory } from 'react-bootstrap-icons';
import '../../../../components/charts/Chart.css';

/**
 * TeacherDashboard
 * Fetches and displays stats for the logged-in teacher.
 */
export default function TeacherPortalDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTerm, setSelectedTerm] = useState("");
  const { showMessage } = useMessage();

  // Term options and attendance trend are derived safely so hooks run unconditionally
  const termOptions = ["", "Term 1", "Term 2", "Term 3"];
  const attendance_trend_safe = data?.attendance_trend || [];

  // Chart data derived from attendance_trend - kept as a hook and declared unconditionally
  const chartData = useMemo(() => {
    return attendance_trend_safe.map(item => ({
      label: new Date(item.date).toLocaleDateString(),
      rate: item.rate != null ? Math.round(item.rate) : 0,
    }));
  }, [attendance_trend_safe]);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async (term = "") => {
      try {
        setLoading(true);
        const url = term ? `teacher-portal/dashboard/?filter_term=${encodeURIComponent(term)}` : 'teacher-portal/dashboard/';
        const response = await api.get(url);
        if (isMounted) {
          setData(response.data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          const msg = err.response?.data?.message || err.message || 'Failed to fetch dashboard';
          setError(msg);
          showMessage({ type: 'error', text: msg });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDashboardData(selectedTerm);

    return () => { isMounted = false; };
  }, [selectedTerm]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <span className="ms-3">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  if (!data) return null;

  // Destructure with defaults to prevent crashes on missing keys
  const { 
    teacher = {}, 
    subjects = [], 
    present_today = 0, 
    absent_today = 0, 
    completed = 0, 
    ongoing = 0, 
    is_class_teacher = false,
    attendance_rate = null,
    total_students = 0,
    attendance_trend = [],
    attendance_by_term = {},
  } = data;


  const stats = [
    { label: "Present Today", value: present_today, icon: <PeopleFill />, color: "success" },
    { label: "Absent Today", value: absent_today, icon: <PersonXFill />, color: "danger" },
    { label: "Completed Topics", value: completed, icon: <CheckCircleFill />, color: "primary" },
    { label: "Ongoing Topics", value: ongoing, icon: <ClockHistory />, color: "warning" },
  ];

  return (
    <div className="teacher-dashboard p-4">
      {/* Header */}
      <header className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h1 className="h3">Welcome, {teacher.first_name || "Teacher"}!</h1>
          <p className="text-muted mb-0">
            Registration No: {teacher.registration_no || "N/A"}
          </p>
        </div>
        <div className="d-flex align-items-center gap-3">
          {is_class_teacher && <Badge bg="info">Class Teacher</Badge>}
          <Form.Select size="sm" value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)} style={{width:180}}>
            <option value="">All Terms</option>
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </Form.Select>
        </div>
      </header>

      {/* Stat Cards */}
      <Row>
        {stats.map((stat, index) => (
          <Col key={index} xs={12} md={6} lg={3} className="mb-4">
            <Card className={`border-start border-${stat.color} border-4 h-100 shadow-sm`}>
              <Card.Body className="d-flex align-items-center">
                <div className={`text-${stat.color} fs-2 me-3`}>
                  {stat.icon}
                </div>
                <div>
                  <div className="fs-6 text-muted text-uppercase fw-bold small">{stat.label}</div>
                  <div className="h4 mb-0 fw-bold">{stat.value ?? 0}</div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
        {/* Attendance rate / total students card */}
        <Col xs={12} md={6} lg={3} className="mb-4">
          <Card className={`border-start border-info border-4 h-100 shadow-sm`}>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="text-info fs-2 me-3"><PeopleFill /></div>
                <div>
                  <div className="fs-6 text-muted text-uppercase fw-bold small">Attendance Rate</div>
                  <div className="h4 mb-0 fw-bold">{attendance_rate != null ? `${attendance_rate.toFixed(1)}%` : 'N/A'}</div>
                  <div className="text-muted small">Total students: {total_students}</div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Subjects */}
      {subjects.length > 0 && (
        <Card className="mt-4">
          <Card.Header as="h5">Subjects Assigned</Card.Header>
          <Card.Body>
            <div className="d-flex flex-wrap gap-2">
              {subjects.map((subject, index) => (
                <Badge key={index} bg="secondary" className="p-2 fw-normal">
                  {subject}
                </Badge>
              ))}
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Attendance trend chart */}
      <Card className="mt-4">
        <Card.Header as="h5">Attendance Trend (last 14 days)</Card.Header>
        <Card.Body>
          {chartData.length === 0 ? (
            <div className="text-muted">No attendance trend data available.</div>
          ) : (
            <div className="chart-container">
              <div className="bar-chart w-100">
                {chartData.map((d, idx) => (
                  <div key={idx} className="bar-item" title={`${d.rate}% on ${d.label}`}>
                    <div className="bar bg-secondary" style={{height: `${d.rate}%`, background: 'linear-gradient(135deg,#22c1c3 0%, #0175c2 100%)'}}></div>
                    <div className="bar-label">{new Date(d.label).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}