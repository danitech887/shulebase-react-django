import React, { useState, useEffect } from 'react';

import api from '../../api/api';
import './Chart.css';

export default function FeesChart() {
  const [feesData, setFeesData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeesData();
  }, []);

  const fetchFeesData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/fees/monthly/');
      const data = response.data || {};
      const monthly = data.monthly || data.monthly_collections || data.monthlyData || data.monthlyCollections;

      if (Array.isArray(monthly) && monthly.length > 0) {
        const normalized = monthly.map((m) => ({
          month: m.month || m.name || m.label || '',
          collected: Number(m.collected || m.collected_amount || m.amount || 0),
          target: Number(m.target || m.goal || 0),
        }));
        setFeesData(normalized);
      } else {
        // Trigger catch block to use mock data if no valid data found
        throw new Error("No valid monthly data found");
      }
    } catch (err) {
      console.warn('Fetching fees data failed, using mock data:', err.message);
      // Use mock data on failure
      setFeesData([
        { month: 'Jul', collected: 500000 },
        { month: 'Aug', collected: 650000 },
        { month: 'Sep', collected: 580000 },
        { month: 'Oct', collected: 720000 },
        { month: 'Nov', collected: 680000 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const maxCollected = Math.max(1, ...feesData.map(d => Number(d.collected) || 0));
  const denom = feesData.length > 1 ? feesData.length - 1 : 1;

  return (
    <div className="chart-container" style={{ padding: '1rem' }}>
      <h6 style={{ marginBottom: '1.5rem', color: '#6c757d' }}>Fees Collection Trends</h6>
      {loading ? (
        <div className="text-center">Loading...</div>
      ) : (
        <div style={{ position: 'relative', height: '200px', display: 'flex' }}>
          {/* Y-Axis Labels */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between', 
            color: '#6c757d', 
            fontSize: '0.75rem',
            marginRight: '10px',
            paddingBottom: '20px' 
          }}>
            <span>{(maxCollected / 1000).toFixed(0)}k</span>
            <span>{(maxCollected / 2000).toFixed(0)}k</span>
            <span>0</span>
          </div>

          {/* Chart Area */}
          <div style={{ flex: 1, position: 'relative' }}>
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
              {/* Grid Lines */}
              <line x1="0" y1="0" x2="100" y2="0" stroke="#e9ecef" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <line x1="0" y1="50" x2="100" y2="50" stroke="#e9ecef" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <line x1="0" y1="100" x2="100" y2="100" stroke="#e9ecef" strokeWidth="1" vectorEffect="non-scaling-stroke" />

              <polyline
                fill="none"
                stroke="#667eea"
                strokeWidth="3"
                vectorEffect="non-scaling-stroke"
                points={feesData
                  .map((d, i) => {
                    const x = (i / denom) * 100;
                    const y = 100 - ((Number(d.collected) || 0) / maxCollected) * 100;
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />
            </svg>

            {/* Data Points & X-Axis Labels */}
            {feesData.map((d, i) => {
              const x = (i / denom) * 100;
              const y = 100 - ((Number(d.collected) || 0) / maxCollected) * 100;
              return (
                <div key={i} style={{ position: 'absolute', left: `${x}%`, top: 0, bottom: 0, width: 0 }}>
                  {/* Dot */}
                  <div
                    style={{
                      position: 'absolute',
                      top: `${y}%`,
                      left: '0',
                      transform: 'translate(-50%, -50%)',
                      width: '10px',
                      height: '10px',
                      backgroundColor: '#fff',
                      border: '2px solid #667eea',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      zIndex: 10
                    }}
                    title={`Month: ${d.month}\nCollected: ${d.collected.toLocaleString()}`}
                  />
                  {/* Label */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-25px',
                      left: '0',
                      transform: 'translateX(-50%)',
                      fontSize: '0.75rem',
                      color: '#6c757d'
                    }}
                  >
                    {d.month}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
