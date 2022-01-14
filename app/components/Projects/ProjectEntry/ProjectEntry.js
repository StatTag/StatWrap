/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable react/destructuring-assignment */
import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@mui/styles';
import { Tooltip } from '@mui/material';
import PortableWifiOffIcon from '@mui/icons-material/PortableWifiOff';
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
  const iconClasses = [styles.favoriteIicon];
  if (!props.project.favorite) {
    iconClasses.push(styles.placeholder);
  }

  let offlineIndicator = null;
  let offlineMessage = null;
  if (props.project.loadError) {
    offlineIndicator = <PortableWifiOffIcon className={styles.offlineIcon} fontSize="small" />;
    offlineMessage = <div className={styles.offline}>{offlineIndicator}Project is offline</div>;
  }

  const divClasses = [styles.container];
  if (props.selected) {
    divClasses.push(styles.selected);
  }

  return (
    <HtmlTooltip
      arrow
      enterDelay={500}
      title={
        <>
          <div className={styles.name}>{props.project.name}</div>
          {offlineMessage}
          <div className={styles.tooltipPath}>{props.project.path}</div>
        </>
      }
    >
      <div className={divClasses.join(' ')} data-tid="container" onClick={props.onSelect}>
        <div className={styles.name}>
          <span>
            {props.project.name}
            {offlineIndicator}
          </span>
        </div>
        <div className={styles.path}>{props.project.path}</div>
        <FontAwesomeIcon
          className={iconClasses.join(' ')}
          icon="thumbtack"
          size="xs"
          onClick={props.onFavoriteClick}
        />
        <FontAwesomeIcon
          className={[styles.placeholder, styles.menuIcon].join(' ')}
          icon="ellipsis-h"
          size="xs"
          onClick={props.onMenuClick}
        />
      </div>
    </HtmlTooltip>
  );
};

projectEntry.propTypes = {
  selected: PropTypes.bool
};

projectEntry.defaultProps = {
  selected: false
};

export default projectEntry;
