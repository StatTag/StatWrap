/* eslint-disable react/prop-types */
import React from 'react';
import ErrorIcon from '@mui/icons-material/Error';
import styles from './Error.css';

const error = (props) => {
  return (
    <div style={props.style} className={[styles.container, (props.size && props.size === 'sm' ? styles.sm : "")].join(' ')}>
      <ErrorIcon className={[styles.icon, (props.size && props.size === 'sm' ? styles.sm : "")].join(' ')} />
      <div className={styles.message}>{props.children}</div>
    </div>
  );
};

export default error;
