/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import styles from './TagViewer.css';

const tagViewer = props => {
  const tagComponents =
    props.tags && props.tags.length > 0
      ? props.tags.map(t => (
          <div key={t} className={styles.tag}>
            {t}
          </div>
        ))
      : null;
  return <div className={styles.container}>{tagComponents}</div>;
};

tagViewer.propTypes = {
  tags: PropTypes.array.isRequired
};

export default tagViewer;
