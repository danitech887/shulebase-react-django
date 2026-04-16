import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, Row, Col, Card, Button, Form, 
  Spinner, Alert, Badge, ListGroup, Stack 
} from 'react-bootstrap';
import api from '../../../../api/api'; 

export default function TeacherProfile() {
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Profile State
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_no: '',
    address: '',
    registration_no: '',
    date_of_registration: '',
    specialization: ''
  });

  // 1. Fetch Profile Data
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('teacher-portal/account/');
      setProfile(res.data.teacher);
    } catch (err) {
      setMessage({ type: 'danger', text: "Could not load profile information." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // 2. Handle Update (PUT)
  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      // Body matches your PUT logic (partial=True)
      const res = await api.put('teacher-portal/account/', profile);
      setProfile(res.data.teacher);
      setIsEditing(false);
      setMessage({ type: 'success', text: "Profile updated successfully!" });
    } catch (err) {
      setMessage({ type: 'danger', text: "Update failed. Please check your details." });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  if (loading) return <Container className="text-center py-5"><Spinner animation="border" /></Container>;

  return (
    <Container className="py-4">
      <Row className="justify-content-center">
        <Col lg={8}>
          
          {message && (
            <Alert variant={message.type} onClose={() => setMessage(null)} dismissible>
              {message.text}
            </Alert>
          )}

          <Card className="border-0 shadow-sm overflow-hidden">
            {/* Profile Header */}
            <div className="bg-primary p-4 text-white text-center">
              <div className="mb-3">
                <div 
                  className="rounded-circle bg-white text-primary d-inline-flex align-items-center justify-content-center fw-bold shadow" 
                  style={{ width: '80px', height: '80px', fontSize: '2rem' }}
                >
                  {profile.first_name?.charAt(0)}{profile.last_name?.charAt(0)}
                </div>
              </div>
              <h3 className="fw-bold mb-1">{profile.first_name} {profile.last_name}</h3>
              <p className="mb-0 opacity-75">Reg No: {profile.registration_no}</p>
            </div>

            <Card.Body className="p-4">
              <Form onSubmit={handleUpdate}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="fw-bold mb-0">Personal Information</h5>
                  {!isEditing ? (
                    <Button variant="outline-primary" size="sm" onClick={() => setIsEditing(true)}>
                      Edit Profile
                    </Button>
                  ) : (
                    <Stack direction="horizontal" gap={2}>
                      <Button variant="light" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                      <Button variant="primary" size="sm" type="submit" disabled={saving}>
                        {saving ? "Saving..." : "Save Changes"}
                      </Button>
                    </Stack>
                  )}
                </div>

                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small text-muted fw-bold">FIRST NAME</Form.Label>
                      <Form.Control 
                        name="first_name"
                        value={profile.first_name}
                        onChange={handleChange}
                        disabled={!isEditing}
                        plaintext={!isEditing}
                        className={!isEditing ? "fw-bold" : ""}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small text-muted fw-bold">LAST NAME</Form.Label>
                      <Form.Control 
                        name="last_name"
                        value={profile.last_name}
                        onChange={handleChange}
                        disabled={!isEditing}
                        plaintext={!isEditing}
                        className={!isEditing ? "fw-bold" : ""}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small text-muted fw-bold">EMAIL ADDRESS</Form.Label>
                      <Form.Control 
                        name="email"
                        type="email"
                        value={profile.email}
                        onChange={handleChange}
                        disabled={!isEditing}
                        plaintext={!isEditing}
                        className={!isEditing ? "fw-bold" : ""}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small text-muted fw-bold">PHONE NUMBER</Form.Label>
                      <Form.Control 
                        name="phone_no"
                        value={profile.phone_no}
                        onChange={handleChange}
                        disabled={!isEditing}
                        plaintext={!isEditing}
                        className={!isEditing ? "fw-bold" : ""}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={12}>
                    <Form.Group>
                      <Form.Label className="small text-muted fw-bold">RESIDENTIAL ADDRESS</Form.Label>
                      <Form.Control 
                        name="address"
                        as="textarea"
                        rows={2}
                        value={profile.address}
                        onChange={handleChange}
                        disabled={!isEditing}
                        plaintext={!isEditing}
                        className={!isEditing ? "fw-bold" : ""}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <hr className="my-4" />

                <h5 className="fw-bold mb-3">Academic Details</h5>
                <Row className="g-3">
                  <Col md={6}>
                    <div className="p-3 bg-light rounded">
                      <small className="text-muted d-block fw-bold text-uppercase" style={{ fontSize: '0.7rem' }}>Specialization</small>
                      <span className="fw-bold">{profile.specialization || "General Education"}</span>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="p-3 bg-light rounded">
                      <small className="text-muted d-block fw-bold text-uppercase" style={{ fontSize: '0.7rem' }}>Joined Date</small>
                      <span className="fw-bold">{new Date(profile.date_of_registration).toLocaleDateString()}</span>
                    </div>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}