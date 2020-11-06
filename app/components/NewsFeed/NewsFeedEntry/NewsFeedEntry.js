/* eslint-disable react/forbid-prop-types */
import React from 'react';
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';
import styles from './NewsFeedEntry.css';

const newsFeedEntry = props => {
  const { timestamp, message } = props;
  return (
    <div className={styles.container}>
      <div className={styles.timestamp}>{timestamp}</div>
      <div className={styles.message}>{message}</div>
    </div>
  );
};

newsFeedEntry.propTypes = {
  timestamp: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired
};

export default newsFeedEntry;
