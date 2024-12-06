import React from 'react';
import PropTypes from 'prop-types';
import styles from './GeneralAction.css';

const formatValue = (value) => {
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  return Array.isArray(value) ? value.join(', ') : value;
};

const generateRow = (key, value) => {
  return (
    <div key={key} className={styles.row}>
      <span className={styles.label}>{key}:</span> {formatValue(value)}
    </div>
  );
};

function generalAction(props) {
  const { data } = props;

  // If the data or the underlying details aren't set, we are unable to render the
  // action details so provide a placeholder message.
  if (data === null || data === undefined || data.details === null || data.details === undefined) {
    return <div>No data</div>
  }
  const rows = Object.keys(data.details).map((k) => generateRow(k, data.details[k]));
  return <div className={styles.container}>{rows}</div>;
}

generalAction.propTypes = {
  data: PropTypes.object.isRequired,
};

export default generalAction;
