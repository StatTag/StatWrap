/* eslint-disable jsx-a11y/interactive-supports-focus */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable react/no-children-prop */
/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from './ProjectUpdateSummary.css';
import ProjectUtil from '../../../utils/project';

function projectUpdateSummary(props) {
  const { updates } = props;
  let control = null;
  // We only want to display content if the user has looked at the
  // project before (not a "first view"), and there is something
  // new (not "up to date").
  if (updates && !updates.upToDate && !updates.firstView) {
    const haveHas = updates.log.length === 1 ? 'has' : 'have';
    control = (
      <span>
        <b>Project Updates:</b> There {haveHas} been{' '}
        <a className={styles.link} onClick={props.onClickLink} role="link">
          {ProjectUtil.getProjectUpdatesSummary(updates)}
        </a>{' '}
        since you last viewed this project.
      </span>
    );
  }
  return (
    <div className={control ? styles.normal : styles.empty}>
      <FontAwesomeIcon icon="bell" size="sm" />
      {control}
    </div>
  );
}

projectUpdateSummary.propTypes = {
  updates: PropTypes.object,
  onClickLink: PropTypes.func.isRequired,
};

projectUpdateSummary.defaultProps = {
  updates: null,
};

export default projectUpdateSummary;
