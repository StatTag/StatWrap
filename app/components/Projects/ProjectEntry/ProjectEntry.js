/* eslint-disable react/destructuring-assignment */
/* eslint-disable react/prop-types */
import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import { Tooltip } from '@material-ui/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from './ProjectEntry.css';

const HtmlTooltip = withStyles(theme => ({
  tooltip: {
    backgroundColor: '#f5f5f9',
    color: 'rgba(0, 0, 0, 0.87)',
    maxWidth: 1000,
    fontSize: theme.typography.pxToRem(12),
    border: '1px solid #dadde9'
  }
}))(Tooltip);

const projectEntry = props => {
  const iconClasses = [styles.icon];
  if (!props.project.favorite) {
    iconClasses.push(styles.placeholder);
  }

  return (
    <HtmlTooltip
      arrow
      enterDelay={500}
      title={
        <>
          <div className={styles.name}>{props.project.name}</div>
          <div className={styles.tooltipPath}>{props.project.path}</div>
        </>
      }
    >
      <div className={styles.container} data-tid="container">
        <div className={styles.name}>
          <span>
            <FontAwesomeIcon
              className={iconClasses.join(' ')}
              icon="thumbtack"
              size="xs"
              onClick={props.onFavoriteClick}
            />
            {props.project.name}
          </span>
        </div>
        <div className={styles.path}>{props.project.path}</div>
      </div>
    </HtmlTooltip>
  );
};

export default projectEntry;
