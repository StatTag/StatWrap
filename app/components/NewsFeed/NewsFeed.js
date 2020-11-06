/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import NewsFeedEntry from './NewsFeedEntry/NewsFeedEntry';
import GeneralUtil from '../../utils/general';
import styles from './NewsFeed.css';

const newsFeed = props => {
  const { feed } = props;
  let contents = <div className={styles.empty}>There are no actions or notifications to show</div>;
  if (feed) {
    contents = feed.map(f => (
      <NewsFeedEntry timestamp={GeneralUtil.formatDateTime(f.timestamp)} message={f.message} />
    ));
  }
  return <div className={styles.container}>{contents}</div>;
};

newsFeed.propTypes = {
  project: PropTypes.object.isRequired,
  feed: PropTypes.arrayOf(PropTypes.string)
};

newsFeed.defaultProps = {
  feed: null
};

export default newsFeed;
