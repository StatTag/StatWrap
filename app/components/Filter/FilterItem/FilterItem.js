/* eslint-disable jsx-a11y/label-has-associated-control */
import React from 'react';
import PropTypes from 'prop-types';
import styles from './FilterItem.css';

const filterItem = props => {
  const { disabled, checked, onChecked, category, filter, label } = props;

  const handleChange = () => {
    if (onChecked) {
      onChecked(category, filter, !checked);
    }
  };

  return (
    <label className={styles.container}>
      <input
        className={styles.filterCheck}
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
      />{' '}
      {label}
    </label>
  );
};

filterItem.propTypes = {
  disabled: PropTypes.bool,
  checked: PropTypes.bool.isRequired,
  onChecked: PropTypes.func,
  category: PropTypes.string.isRequired,
  filter: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired
};

filterItem.defaultProps = {
  disabled: false,
  onChecked: null
};

export default filterItem;
