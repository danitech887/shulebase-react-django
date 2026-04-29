import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../../../api/api';
import { useMessage } from '../../../context/MessageContext';
import './TeacherDashboard.css';

export default function TeacherDashboard() {
  const { showMessage } = useMessage();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total_teachers: 0, present_today: 0, absent_today: 0 });
  const [monthlyAttendance, setMonthlyAttendance] = useState([]);
  const [hoveredPoint, setHoveredPoint] = useState(null);

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

      {/* ── Quick Actions ── */}
      <div className="quick-actions-row mb-4">
        <Link to="/teachers/details" className="action-btn">
          <span className="action-icon">📝</span>
          <span className="action-label">Manage Details</span>
        </Link>
        <Link to="/teachers/attendance" className="action-btn">
          <span className="action-icon">📅</span>
          <span className="action-label">Attendance</span>
        </Link>
        <Link to="/teachers/roles" className="action-btn">
          <span className="action-icon">🔑</span>
          <span className="action-label">Role Management</span>
        </Link>
        <Link to="/teachers/leave" className="action-btn">
          <span className="action-icon">✉️</span>
          <span className="action-label">Leave Management</span>
        </Link>
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
                (() => {
                  const svgWidth = 600;
                  const svgHeight = 220;
                  const paddingX = 50;
                  const paddingY = 30;

                  const points = monthlyAttendance.map((d, idx) => {
                    const x = monthlyAttendance.length > 1 
                      ? paddingX + (idx / (monthlyAttendance.length - 1)) * (svgWidth - 2 * paddingX)
                      : svgWidth / 2;
                    const rate = Number(d?.rate) || 0;
                    const y = svgHeight - paddingY - (rate / 100) * (svgHeight - 2 * paddingY);
                    return { x, y, month: d.month, rate };
                  });

                  const pathD = points.length > 0 
                    ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}` 
                    : '';

                  return (
                    <div style={{ position: 'relative', width: '100%', height: svgHeight }}>
                      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                        {/* Y Axis Labels */}
                        {[0, 25, 50, 75, 100].map((val) => {
                          const y = svgHeight - paddingY - (val / 100) * (svgHeight - 2 * paddingY);
                          return (
                            <g key={val}>
                              <line x1={paddingX} y1={y} x2={svgWidth - paddingX} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
                              <text x={paddingX - 10} y={y + 4} textAnchor="end" fontSize="10" fill="var(--td-text-muted, #6b7280)">{val}%</text>
                            </g>
                          );
                        })}

                        {/* X Axis Labels */}
                        {points.map((p, i) => (
                          <text key={i} x={p.x} y={svgHeight - paddingY + 18} textAnchor="middle" fontSize="11" fill="var(--td-text-muted, #6b7280)">{p.month}</text>
                        ))}

                        {/* Line */}
                        {pathD && (
                          <path d={pathD} fill="none" stroke="var(--td-accent, #6366f1)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        )}

                        {/* Points & Interactive Hover */}
                        {points.map((p, i) => (
                          <g key={i}>
                            <circle 
                              cx={p.x} cy={p.y} r={hoveredPoint && hoveredPoint.index === i ? 6 : 4} 
                              fill="var(--td-accent, #6366f1)" stroke="#ffffff" strokeWidth="2" 
                              style={{ cursor: 'pointer', transition: 'r 0.2s' }} 
                              onMouseEnter={() => setHoveredPoint({ ...p, index: i })}
                              onMouseLeave={() => setHoveredPoint(null)}
                            />
                            
                            {hoveredPoint && hoveredPoint.index === i && (
                              <g>
                                <rect 
                                  x={p.x - 40} y={p.y - 35} width="80" height="25" rx="4" 
                                  fill="#1f2535" stroke="var(--td-accent, #6366f1)" strokeWidth="1" 
                                />
                                <text x={p.x} y={p.y - 18} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#e8eaf0">{p.rate}%</text>
                              </g>
                            )}
                          </g>
                        ))}
                      </svg>
                    </div>
                  );
                })()
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

    </div>
  );
}