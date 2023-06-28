/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from './SearchHeader.css';

const searchHeader = props => {
  const [filterText, setFilterText] = useState('');
  const handleClear = () => {
    if (filterText) {
      setFilterText('');
    }
  };

  const handleFilter = text => {
    setFilterText(text.target.value);
    props.onFilter(text.target.value);
  };

  return (
    <div className={styles.container}>
      <div className={styles.searchHeader}>
        <span className={styles.searchTitle}>{props.title}</span>
        <input className={styles.searchBox} value={filterText} onChange={handleFilter} />
        <button type="button" className={styles.searchButton} onClick={handleClear}>
          <FontAwesomeIcon icon="times" size="sm" />
        </button>
      </div>
    </div>
  );
};

searchHeader.propTypes = {
  title: PropTypes.string,
  onFilter: PropTypes.func.isRequired
};

searchHeader.defaultProps = {
  title: ''
};

export default searchHeader;
