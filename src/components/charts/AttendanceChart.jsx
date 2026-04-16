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
        <div className="bar-chart">
          {attendanceData.map((item, index) => (
            <div key={index} className="bar-item">
              <div className="bar" style={{ height: `${Math.max(item.rate, 1)}%` }} title={`${(item.rate || 0).toFixed(1)}%`}></div>
              <div className="bar-label">{item.day}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
