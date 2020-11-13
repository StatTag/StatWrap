/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import styles from './GeneralAction.css';

const generalAction = props => {
  const { data } = props;
  return <div className={styles.container}>{JSON.stringify(data.details)}</div>;
};

generalAction.propTypes = {
  data: PropTypes.object.isRequired
};

export default generalAction;
