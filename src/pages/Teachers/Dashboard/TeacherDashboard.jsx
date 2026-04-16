import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Spinner } from 'react-bootstrap';
import api from '../../../api/api';
import { useMessage } from '../../../context/MessageContext';
import './TeacherDashboard.css';

export default function TeacherDashboard() {
  const { showMessage } = useMessage();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total_teachers: 0, present_today: 0, absent_today: 0 });
  const [monthlyAttendance, setMonthlyAttendance] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, monthlyRes] = await Promise.all([
        api.get('teachers/stats/'),
        api.get('teachers/attendance/monthly/'),
      ]);
      setStats(statsRes.data || { total_teachers: 0, present_today: 0, absent_today: 0 });
      setMonthlyAttendance(monthlyRes.data || []);
    } catch (err) {
      showMessage({ type: 'error', text: 'Failed to load teacher dashboard data.' });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const attendanceRate =
    stats.total_teachers > 0
      ? ((stats.present_today / stats.total_teachers) * 100).toFixed(1)
      : '0.0';

  const statCards = [
    { title: 'Total Teachers',  value: stats.total_teachers, icon: '👨‍🏫', colorClass: 'card-primary' },
    { title: 'Present Today',   value: stats.present_today,  icon: '✅',   colorClass: 'card-success' },
    { title: 'Absent Today',    value: stats.absent_today,   icon: '❌',   colorClass: 'card-danger'  },
    { title: 'Attendance Rate', value: `${attendanceRate}%`, icon: '📊',   colorClass: 'card-info'    },
  ];

  return (
    <div className="teacher-dashboard-container">

      {/* ── Page Header ── */}
      <div className="dashboard-header">
        <h2>Teachers Dashboard</h2>
        <p>Monitor teacher statistics and attendance</p>
      </div>

      {/* ── Stat Cards ── */}
      <Row className="mb-4 g-3">
        {loading
          ? Array.from({ length: 4 }).map((_, idx) => (
              <Col key={idx} xs={12} sm={6} lg={3}>
                <Card className="stat-card">
                  <Card.Body className="d-flex align-items-center justify-content-center" style={{ minHeight: 90 }}>
                    <Spinner animation="border" size="sm" />
                  </Card.Body>
                </Card>
              </Col>
            ))
          : statCards.map((stat, idx) => (
              <Col key={idx} xs={12} sm={6} lg={3}>
                <Card className={`stat-card ${stat.colorClass}`}>
                  <Card.Body className="d-flex justify-content-between align-items-start">
                    <div>
                      <p className="text-muted small mb-1">{stat.title}</p>
                      <h3 className="stat-value mb-0">{stat.value}</h3>
                    </div>
                    <div className="stat-icon">{stat.icon}</div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
      </Row>

      {/* ── Chart ── */}
      <Row>
        <Col xs={12}>
          <Card className="chart-card">
            <Card.Header>
              <Card.Title>📈 Monthly Attendance Trend</Card.Title>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="d-flex align-items-center justify-content-center" style={{ height: 260 }}>
                  <Spinner animation="border" style={{ color: 'var(--td-accent)' }} />
                </div>
              ) : monthlyAttendance.length === 0 ? (
                <div
                  className="d-flex align-items-center justify-content-center"
                  style={{ height: 260, color: 'var(--td-text-muted)', fontSize: '0.85rem' }}
                >
                  No attendance data available
                </div>
              ) : (
                <div className="chart-placeholder">
                  <div className="chart-bars">
                    {monthlyAttendance.map((data, idx) => (
                      <div key={idx} className="bar-group">
                        <div className="bar-container">
                          <div
                            className="bar attendance"
                            style={{ height: `${data.rate}%` }}
                            title={`${data.month}: ${data.rate}%`}
                          />
                        </div>
                        <span className="bar-label">{data.month}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

    </div>
  );
}