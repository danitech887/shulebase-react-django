import React, { useState, useEffect } from 'react';
import { Card } from 'react-bootstrap';

import students from '../../api/api';
import './Chart.css';

export default function AttendanceChart() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const response = await students.get('attendance/daily-summary/');
      const data = response.data.map(item => ({
        ...item,
        day: item.day || new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }),
        rate: Number(item.rate !== undefined ? item.rate : (item.total > 0 ? (item.present / item.total) * 100 : 0)),
        total: item.total || 0,
      }));
      setAttendanceData(data);
      console.log(data)
    } catch (err) {
      console.error('Error fetching attendance data:', err);
      // Use mock data on failure
      setAttendanceData([
        { day: 'Mon', rate: 95, total: 100 },
        { day: 'Tue', rate: 92, total: 100 },
        { day: 'Wed', rate: 98, total: 100 },
        { day: 'Thu', rate: 94, total: 100 },
        { day: 'Fri', rate: 96, total: 100 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chart-container">
      {loading ? (
        <div className="text-center">Loading...</div>
      ) : attendanceData.every(item => item.rate === 0 && item.total === 0) ? (
        <div className="text-center text-muted" style={{ padding: '2rem 0', fontSize: '0.9rem' }}>
          No attendance data available for the last 7 days.
        </div>
      ) : (
        <div className="line-chart-wrapper" style={{ padding: '1rem 1rem 0.5rem' }}>
          {(() => {
            const width = 600;
            const height = 200;
            const padding = 40;
            
            const pointsRate = attendanceData.map((d, i) => {
              const x = padding + (i * (width - padding * 2) / (attendanceData.length - 1));
              const y = height - padding - (((Number(d?.rate) || 0) / 100) * (height - padding * 2));
              return `${x},${y}`;
            }).join(' ');

            return (
              <div style={{ position: 'relative', height: '220px', marginBottom: '1rem' }}>
                <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="dashAttGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0891b2" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#0891b2" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                    const y = padding + pct * (height - padding * 2);
                    return (
                      <line key={idx} x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                    );
                  })}

                  <text x={12} y={height / 2} transform={`rotate(-90, 12, ${height / 2})`} style={{ fontSize: '0.65rem', fill: 'var(--att-text-muted, #6b7280)', textAnchor: 'middle', letterSpacing: '1px' }}>RATE (%)</text>
                  <path
                    d={`M ${padding},${height - padding} L ${pointsRate} L ${width - padding},${height - padding} Z`}
                    fill="url(#dashAttGrad)"
                  />

                  <polyline
                    fill="none"
                    stroke="#0891b2"
                    strokeWidth="3.5"
                    points={pointsRate}
                  />

                  {attendanceData.map((d, i) => {
                    const x = padding + (i * (width - padding * 2) / (attendanceData.length - 1));
                    const y = height - padding - (((Number(d?.rate) || 0) / 100) * (height - padding * 2));
                    return (
                      <circle key={i} cx={x} cy={y} r="4.5" fill="#0891b2" stroke="#ffffff" strokeWidth="1.5">
                        <title>{`Day: ${d.day}\nAttendance Rate: ${Number(d.rate || 0).toFixed(1)}%`}</title>
                      </circle>
                    );
                  })}
                </svg>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: `0 ${padding}px`, marginTop: '15px' }}>
                  {attendanceData.map((d, i) => (
                    <span key={i} style={{ fontSize: '0.75rem', color: 'var(--att-text-muted, #6b7280)', fontWeight: 600 }}>{d.day}</span>
                  ))}
                </div>
                
                <div style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--att-text-muted, #6b7280)', letterSpacing: '1px', marginTop: '10px' }}>
                  TIMELINE (DAYS)
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
