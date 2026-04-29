import React, { useState, useEffect, useContext } from 'react';
import { Row, Col, Card, Button, Badge, ProgressBar, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AttendanceChart from '../../components/charts/AttendanceChart';
import FeesChart from '../../components/charts/FeesChart';
import './Dashboard.css';

import students from '../../api/api';
import { SubscriptionContext } from '../../context/SubscriptionContext';

export default function AdminDashboard() {
  const [animate, setAnimate] = useState(false);
  const [stats, setStats] = useState([
    { title: 'Total Students', value: 0, icon: '🎓', color: 'primary', trend: '+12%' },
    { title: 'Total Teachers', value: 0, icon: '👩‍🏫', color: 'success', trend: '+3%' },
    { title: 'Attendance Rate', value: '0%', icon: '📊', color: 'info', trend: '+5%' },
    { title: 'Fees Collected', value: 'Ksh 0', icon: '💰', color: 'warning', trend: '+18%' },
  ]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gradesData, setGradesData] = useState({});
  const [currentTime, setCurrentTime] = useState(new Date());
  const [availableGrades, setAvailableGrades] = useState([]);
  const [availableStreams, setAvailableStreams] = useState([]);

  const [filters, setFilters] = useState({
    year: new Date().getFullYear().toString(),
    term: '',
    grade: '',
    stream: ''
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    setTimeout(() => setAnimate(true), 100);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setLoading(true);
    
    const activeFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== '')
    );
    const params = new URLSearchParams(activeFilters).toString();

    students.get(`dashboard/?${params}`)
      .then((res) => {
        const d = res.data;
        setData(d);
        setStats([
          { title: "Total Students", value: d.students ?? 0, icon: "🎓", color: "primary", trend: '+12%' },
          { title: "Total Teachers", value: d.teachers ?? 0, icon: "👩‍🏫", color: "success", trend: '+3%' },
          { title: "Attendance Rate", value: (d.attendance_percentage ?? 0) + "%", icon: "📊", color: "info", trend: '+5%' },
          { title: "Fees Collected", value: d.fee_paid ? 'Ksh ' + d.fee_paid.toLocaleString() : 'Ksh 0', icon: "💰", color: "warning", trend: '+18%' },
        ]);
        if (d.students_per_grade) setGradesData(d.students_per_grade);
        
        // Load grades and streams automatically from backend
        if (d.available_grades) setAvailableGrades(d.available_grades);
        if (d.available_streams) setAvailableStreams(d.available_streams);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filters]);

  const [recentActivities, setRecentActivities] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    students.get('dashboard/activities/')
      .then(res => setRecentActivities(res.data))
      .catch(err => {
        console.error('Failed to load recent activities', err);
        setRecentActivities([]);
      });
  }, []);

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now - past) / 1000);
    const intervals = { year: 31536000, month: 2592000, week: 604800, day: 86400, hour: 3600, minute: 60 };
    for (const [interval, seconds] of Object.entries(intervals)) {
      const count = Math.floor(diffInSeconds / seconds);
      if (count > 0) return `${count} ${interval}${count > 1 ? 's' : ''} ago`;
    }
    return 'just now';
  };

  const quickActions = [
    { label: 'Register Student', icon: '➕', href: '/students/register', color: 'primary', desc: 'Add new student' },
    { label: 'Attendance', icon: '✓', href: '/students/attendance', color: 'success', desc: 'Mark daily attendance' },
    { label: 'Academics', icon: '📈', href: '/students/academics', color: 'info', desc: 'View performance' },
    { label: 'Manage Fees', icon: '💵', href: '/students/fees', color: 'warning', desc: 'Track payments' },
  ];

  const colorMap = { primary: '#4f46e5', success: '#059669', info: '#0891b2', warning: '#d97706' };

  const formatTime = (date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (date) => date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const { pricing, setShowPricingModal } = useContext(SubscriptionContext);

  return (
    <div className={`db-root ${animate ? 'db-ready' : ''}`}>
      {/* Ambient background orbs */}
      <div className="db-orb db-orb-1" />
      <div className="db-orb db-orb-2" />
      <div className="db-orb db-orb-3" />

      {/* ── HEADER ── */}
      <header className="db-header" style={{ position: 'relative', zIndex: 999 }}>
        <div className="db-header-left">
          <div className="db-avatar">
            <span>A</span>
            <span className="db-avatar-ring" />
          </div>
          <div>
            <p className="db-greeting">Good morning,</p>
            <h1 className="db-title">Admin Dashboard</h1>
          </div>
        </div>
        <div className="db-header-right">
          <div className="db-clock">
            <span className="db-clock-time">{formatTime(currentTime)}</span>
            <span className="db-clock-date">{formatDate(currentTime)}</span>
          </div>

          <div className="db-notifications" style={{ position: 'relative' }}>
            <button 
              className="btn btn-light rounded-circle p-2 position-relative" 
              onClick={() => setShowNotifications(!showNotifications)}
              style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: '#f3f4f6' }}
            >
              <span role="img" aria-label="notifications">🔔</span>
              {recentActivities.length > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem' }}>
                  {recentActivities.length}
                </span>
              )}
            </button>
            
            {showNotifications && (
              <div 
                className="notifications-dropdown shadow" 
                style={{ 
                  position: 'absolute', right: 0, top: '120%', background: 'white', width: '350px', 
                  borderRadius: '12px', zIndex: 1000, maxHeight: '400px', overflowY: 'auto', border: '1px solid #e5e7eb',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}
              >
                <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold' }}>
                  Notifications
                </div>
                <div style={{ padding: '0.5rem 0'}}>
                  {recentActivities.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>No new notifications</div>
                  ) : (
                    recentActivities.map((act) => (
                      <div key={act.id} style={{ display: 'flex', gap: '12px', padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
                        <div style={{ fontSize: '1.2rem' }}>{act.icon}</div>
                        <div>
                          <div style={{ fontSize: '0.9rem', color: '#1f2937', textAlign: 'left' }}>{act.action}</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px', textAlign: 'left' }}>{formatTimeAgo(act.timestamp)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="db-pulse-dot" />
          <span className="db-live-label">Live</span>
        </div>
      </header>
      
      {pricing && !pricing.is_paid && (
        <section className="db-section mb-4" style={{ position: 'relative', zIndex: 10 }}>
          <div className={`trial-banner trial-banner--${pricing.payment_status === 'under_review' ? 'info' : (pricing.remaining_trial_days <= 2 ? 'danger' : 'info')}`}>
            <div className="trial-banner-glow" />
            <div className="trial-banner-content">
              <div className="trial-banner-icon-wrap">
                <span className="trial-banner-icon">
                  {pricing.payment_status === 'under_review' ? '🔍' : (pricing.remaining_trial_days <= 0 ? '⚠️' : '⏳')}
                </span>
              </div>
              <div className="trial-banner-body">
                <h4 className="trial-banner-title">
                  {pricing.payment_status === 'under_review' ? (
                    "Payment Under Review"
                  ) : (
                    pricing.remaining_trial_days <= 0 ? "Your Free Trial has Expired" : `${pricing.remaining_trial_days} Days Remaining in Free Trial`
                  )}
                </h4>
                <p className="trial-banner-text">
                  {pricing.payment_status === 'under_review' ? (
                    <>We've received your transaction code (<strong>{pricing.transaction_code}</strong>). Our team is currently verifying the payment. Thank you for your patience.</>
                  ) : (
                    <>
                      Your school is currently on the <strong>{pricing.plan_name} Plan</strong>. 
                      {pricing.remaining_trial_days <= 0 ? 
                        " Upgrade now to restore full access and ensure your data remains safe." : 
                        " Complete your subscription payment to avoid service interruption."
                      }
                    </>
                  )}
                </p>
              </div>
            </div>
            
            {pricing.payment_status === 'under_review' ? (
              <div className="d-flex align-items-center gap-3">
                <div className="trial-banner-review-badge">Processing</div>
                <button 
                  className="trial-banner-btn trial-banner-btn--secondary"
                  onClick={() => setShowPricingModal(true)}
                  style={{ border: 'none', cursor: 'pointer', padding: '0.6rem 1.2rem', fontSize: '0.8rem' }}
                >
                  Edit Submission
                </button>
              </div>
            ) : (
              <button 
                className="trial-banner-btn"
                onClick={() => setShowPricingModal(true)}
                style={{ border: 'none', cursor: 'pointer' }}
              >
                {pricing.remaining_trial_days <= 0 ? "Reactivate Account" : "Upgrade & Pay Now"}
              </button>
            )}
          </div>
        </section>
      )}

      {/* ── FILTERS ── */}
      <section className="db-section mb-4" style={{ position: 'relative', zIndex: 10 }}>
        <Row className="g-3">
          <Col xs={12} sm={6} md={3}>
            <Form.Select name="year" value={filters.year} onChange={handleFilterChange} data-bs-theme="dark" style={{ backgroundColor: 'var(--pd-surface, #131720)', color: 'var(--pd-text, #e8eaf0)', border: '1px solid var(--pd-border, rgba(255,255,255,0.1))' }}>
              <option value="">All Years</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </Form.Select>
          </Col>
          <Col xs={12} sm={6} md={3}>
            <Form.Select name="term" value={filters.term} onChange={handleFilterChange} data-bs-theme="dark" style={{ backgroundColor: 'var(--pd-surface, #131720)', color: 'var(--pd-text, #e8eaf0)', border: '1px solid var(--pd-border, rgba(255,255,255,0.1))' }}>
              <option value="">All Terms</option>
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </Form.Select>
          </Col>
          <Col xs={12} sm={6} md={3}>
            <Form.Select name="grade" value={filters.grade} onChange={handleFilterChange} data-bs-theme="dark" style={{ backgroundColor: 'var(--pd-surface, #131720)', color: 'var(--pd-text, #e8eaf0)', border: '1px solid var(--pd-border, rgba(255,255,255,0.1))' }}>
              <option value="">All Grades</option>
              {availableGrades.map((g, i) => (
                <option key={i} value={g}>{g}</option>
              ))}
            </Form.Select>
          </Col>
          <Col xs={12} sm={6} md={3}>
            <Form.Select name="stream" value={filters.stream} onChange={handleFilterChange} data-bs-theme="dark" style={{ backgroundColor: 'var(--pd-surface, #131720)', color: 'var(--pd-text, #e8eaf0)', border: '1px solid var(--pd-border, rgba(255,255,255,0.1))' }}>
              <option value="">All Streams</option>
              {availableStreams.map((s, i) => (
                <option key={i} value={s}>{s}</option>
              ))}
            </Form.Select>
          </Col>
        </Row>
      </section>

      {/* ── STATS ── */}
      <section className="db-section">
        <div className="db-section-label">
          <span className="db-section-pill">Key Metrics</span>
          <div className="db-section-line" />
        </div>
        <div className="db-stats-grid">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="db-stat-card db-skeleton" style={{ '--delay': `${i * 0.1}s` }}>
                  <div className="sk-line sk-short" />
                  <div className="sk-line sk-long" />
                </div>
              ))
            : stats.map((stat, i) => (
                <div key={i} className="db-stat-card" style={{ '--delay': `${i * 0.12}s`, '--accent': colorMap[stat.color] }}>
                  <div className="db-stat-top">
                    <span className="db-stat-label">{stat.title}</span>
                    <span className="db-stat-trend">{stat.trend} ↑</span>
                  </div>
                  <div className="db-stat-bottom">
                    <span className="db-stat-value">{stat.value}</span>
                    <span className="db-stat-icon">{stat.icon}</span>
                  </div>
                  <div className="db-stat-bar">
                    <div className="db-stat-bar-fill" />
                  </div>
                  <div className="db-stat-glow" />
                </div>
              ))}
        </div>
      </section>

      {/* ── QUICK ACTIONS ── */}
      <section className="db-section">
        <div className="db-section-label">
          <span className="db-section-pill">Quick Actions</span>
          <div className="db-section-line" />
        </div>
        <div className="db-actions-grid">
          {quickActions.map((action, i) => (
            <Link key={i} to={action.href} className="db-action-card" style={{ '--delay': `${i * 0.1}s`, '--accent': colorMap[action.color] }}>
              <div className="db-action-icon-wrap">
                <span className="db-action-icon">{action.icon}</span>
              </div>
              <div className="db-action-text">
                <span className="db-action-label">{action.label}</span>
                <span className="db-action-desc">{action.desc}</span>
              </div>
              <span className="db-action-arrow">→</span>
              <div className="db-action-shine" />
            </Link>
          ))}
        </div>
      </section>

      {/* ── ANALYZED FINANCIAL DATA ── */}
      <section className="db-section">
        <div className="db-section-label">
          <span className="db-section-pill">Financial Insights</span>
          <div className="db-section-line" />
        </div>
        <div className="db-financial-grid">
          <div className="db-finance-card">
             <div className="db-finance-main">
                <div className="db-finance-info">
                   <span className="db-finance-label">Collection Rate</span>
                   <h3 className="db-finance-value">{data?.fee_collection_rate || 0}%</h3>
                </div>
                <div className="db-finance-chart">
                   <svg width="60" height="60" viewBox="0 0 36 36">
                      <path className="db-circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className="db-circle-fill" strokeDasharray={`${data?.fee_collection_rate || 0}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                   </svg>
                </div>
             </div>
             <div className="db-finance-footer">
                <span>Expected: Ksh {data?.fee_expected?.toLocaleString() || 0}</span>
             </div>
          </div>

          <div className="db-finance-card">
             <div className="db-finance-main">
                <div className="db-finance-info">
                   <span className="db-finance-label">Gender Diversity</span>
                   <div className="d-flex gap-3 mt-1">
                      <div className="db-gender-stat">
                         <span className="db-gender-icon" style={{color:'#6366f1'}}>♂</span>
                         <span className="db-gender-count">{data?.gender_distribution?.Male || 0}</span>
                      </div>
                      <div className="db-gender-stat">
                         <span className="db-gender-icon" style={{color:'#ec4899'}}>♀</span>
                         <span className="db-gender-count">{data?.gender_distribution?.Female || 0}</span>
                      </div>
                   </div>
                </div>
             </div>
             <div className="db-finance-footer">
                <ProgressBar now={50} variant="indigo" style={{height:4, background:'rgba(255,255,255,0.05)'}} />
             </div>
          </div>
        </div>
      </section>

      {/* ── ANALYTICS ── */}
      <section className="db-section">
        <div className="db-section-label">
          <span className="db-section-pill">Analytics</span>
          <div className="db-section-line" />
        </div>
        <div className="db-charts-grid">
          <div className="db-chart-card">
            <div className="db-chart-header">
              <div>
                <span className="db-chart-title">Attendance Overview</span>
                <span className="db-chart-sub">Monthly trends</span>
              </div>
              <span className="db-chart-badge">📊</span>
            </div>
            <div className="db-chart-body">
              <AttendanceChart filters={filters} />
            </div>
          </div>
          <div className="db-chart-card">
            <div className="db-chart-header">
              <div>
                <span className="db-chart-title">Fees Collection</span>
                <span className="db-chart-sub">Revenue tracking</span>
              </div>
              <span className="db-chart-badge">💰</span>
            </div>
            <div className="db-chart-body">
              <FeesChart filters={filters} />
            </div>
          </div>
        </div>
      </section>

      {/* ── BOTTOM ROW ── */}
      <section className="db-section">
        <div className="db-bottom-grid">
          {/* Activities */}
          {/* <div className="db-activities-card">
            <div className="db-card-header">
              <span className="db-card-title">Recent Activities</span>
              <span className="db-card-count">{recentActivities.length} updates</span>
            </div>
            <div className="db-activities-list">
            {recentActivities.length === 0 ? (
              <p className="db-empty" style={{ padding: '1rem', color: '#6b7280' }}>No recent activities found.</p>
            ) : (
              recentActivities.map((act, i) => (
                <div key={act.id} className="db-activity-row" style={{ '--delay': `${i * 0.08}s` }}>
                  <div className="db-activity-dot" />
                  <div className="db-activity-icon">{act.icon}</div>
                  <div className="db-activity-info">
                    <span className="db-activity-action">{act.action}</span>
                    <span className="db-activity-time">{formatTimeAgo(act.timestamp)}</span>
                  </div>
                  <span className="db-activity-new">New</span>
                </div>
              ))
            )}
            </div>
          </div> */}

          {/* Right column */}
          <div className="db-right-col">
            {/* Class Distribution */}
            <div className="db-dist-card">
              <div className="db-card-header">
                <span className="db-card-title">Class Distribution</span>
                <span>🏫</span>
              </div>
              <div className="db-dist-list">
                {Object.keys(gradesData).length > 0
                  ? Object.entries(gradesData).map(([grade, count], i) => {
                      const max = Math.max(...Object.values(gradesData), 50);
                      const pct = (count / max) * 100;
                      return (
                        <div key={i} className="db-dist-item">
                          <div className="db-dist-meta">
                            <span className="db-dist-grade">{grade}</span>
                            <span className="db-dist-count">{count} students</span>
                          </div>
                          <div className="db-dist-track">
                            <div className="db-dist-fill" style={{ '--pct': `${pct}%`, '--delay': `${i * 0.1}s` }} />
                          </div>
                        </div>
                      );
                    })
                  : <p className="db-empty">No grade data available</p>}
              </div>
            </div>
            </div>
          <div className="db-right-col">

            {/* System Status */}
            <div className="db-status-card">
              <div className="db-card-header">
                <span className="db-card-title">System Status</span>
                <span className="db-all-green">All systems go</span>
              </div>
              {[
                { label: 'Server', status: 'Online' },
                { label: 'Database', status: 'Connected' },
                { label: 'Students API', status: 'Active' },
              ].map((item, i) => (
                <div key={i} className="db-status-row">
                  <div className="db-status-left">
                    <div className="db-status-indicator" />
                    <span className="db-status-label">{item.label}</span>
                  </div>
                  <span className="db-status-badge">{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}