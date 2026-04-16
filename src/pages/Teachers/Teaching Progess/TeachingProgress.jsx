import React, { useEffect, useState } from 'react';
import { Card, Table, Spinner } from 'react-bootstrap';
import api from '../../../api/api';
import { useMessage } from '../../../context/MessageContext';
import './TeachingProgress.css';

export default function TeachingProgress() {
  const { showMessage } = useMessage();
  const [progresses, setProgresses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchProgress(); }, []);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      // Attempt to call an API endpoint; backend may not expose this yet
      const res = await api.get('teachers/progress/');
      setProgresses(res.data || []);
    } catch (err) {
      // If backend endpoint missing, let the user know
      console.warn('teachers/progress/ failed', err);
      showMessage({ type: 'error', text: 'Teaching progress endpoint not available on backend.' });
      setProgresses([]);
    } finally { setLoading(false); }
  };

  return (
    <div className="tp-root">
      <Card>
        <Card.Header><strong>Teaching Progress</strong></Card.Header>
        <Card.Body>
          {loading ? <Spinner animation="border" /> : (
            progresses.length === 0 ? <p className="text-muted">No teaching progress data available.</p> : (
              <Table responsive striped>
                <thead><tr><th>Teacher</th><th>Subject</th><th>Topic</th><th>Status</th></tr></thead>
                <tbody>
                  {progresses.map((p, i) => (
                    <tr key={i}><td>{p.teacher_name}</td><td>{p.subject}</td><td>{p.topic}</td><td>{p.status}</td></tr>
                  ))}
                </tbody>
              </Table>
            )
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
