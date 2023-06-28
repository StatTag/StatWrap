/* eslint-disable jsx-a11y/control-has-associated-label */
import React from 'react';
import PropTypes from 'prop-types';
import SearchHeader from './SearchHeader/SearchHeader';
import styles from './Search.css';

const Search = props => {
  const handleFilter = text => {
    console.log(text);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <SearchHeader title={props.title} onFilter={handleFilter} />
      </div>
    </div>
  );
};

Search.propTypes = {
  title: PropTypes.string
};

Search.defaultProps = {
  title: ''
};

export default Search;
