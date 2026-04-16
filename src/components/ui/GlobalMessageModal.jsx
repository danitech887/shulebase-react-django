import React from 'react';
import { Modal, Button } from 'react-bootstrap';

export default function GlobalMessageModal({ message = { open: false, type: 'info', text: '' }, onClose }) {
  const { open, type, text } = message || {};

  const variantTitle = type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Message';

  return (
    <Modal show={!!open} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>{variantTitle}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div style={{ whiteSpace: 'pre-wrap' }}>{text}</div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}
