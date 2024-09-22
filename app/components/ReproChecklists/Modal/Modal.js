import React from 'react';
import PropTypes from 'prop-types';
import styles from './Modal.css';
import { Modal } from '@mui/material';

function AttachModal(props) {
  const { isOpen, onClose, onSubmit, title, component } = props;
  return (
    <Modal
          open={isOpen}
          onClose={onClose}
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
          className={styles.modal}
    >
      <form onSubmit={onSubmit} className={styles.form}>
          <div className={styles.header}>
            <h3>Attach {title}</h3>
          </div>
          {component}
          <div className={styles.title}>
            <label htmlFor="title">Title:</label>
            <input type="text" id="title" name="title"/>
          </div>
          <div className={styles.description}>
            <label htmlFor="description">Description:</label>
            <textarea id="description" name="description" />
          </div>
          <div className={styles.submit}>
            <button type="submit" className={styles.submitButton}>Submit</button>
          </div>
        </form>
    </Modal>
  );
}

AttachModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  component: PropTypes.element.isRequired,
};

export default AttachModal;
