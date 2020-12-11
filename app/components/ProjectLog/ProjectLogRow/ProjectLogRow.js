/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import GeneralAction from '../GeneralAction/GeneralAction';
import NoteAction from '../NoteAction/NoteAction';
import { ActionType } from '../../../constants/constants';
import styles from './ProjectLogRow.css';

const projectLogRow = props => {
  const { data } = props;
  let detail = null;
  if (data) {
    switch (data.type) {
      case ActionType.NOTE_ADDED:
      case ActionType.NOTE_UPDATED:
      case ActionType.NOTE_DELETED:
        detail = <NoteAction data={data} />;
        break;
      default:
        detail = <GeneralAction data={data} />;
    }
  }
  return <div className={styles.container}>{detail}</div>;
};

projectLogRow.propTypes = {
  data: PropTypes.object
};

projectLogRow.defaultProps = {
  data: null
};

export default projectLogRow;
