import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@mui/styles';
import { Tooltip, CircularProgress } from '@mui/material';
import PortableWifiOffIcon from '@mui/icons-material/PortableWifiOff';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from './ProjectEntry.css';

const HtmlTooltip = withStyles((theme) => ({
  tooltip: {
    backgroundColor: '#f5f5f9',
    color: 'rgba(0, 0, 0, 0.87)',
    maxWidth: 1000,
    fontSize: theme.typography.pxToRem(12),
    border: '1px solid #dadde9',
  },
}))(Tooltip);

function projectEntry(props) {
  const [isTooltipOpen, setTooltipOpen] = useState(false);

  const iconClasses = [styles.favoriteIicon];
  if (!props.project.favorite) {
    iconClasses.push(styles.placeholder);
  }

  let statusIndicator = null;
  let statusMessage = null;
  if (props.project.isReconnecting) {
    statusIndicator = <CircularProgress size={16} className={styles.reconnectingIcon} />;
    statusMessage = <div className={styles.reconnecting}>Attempting to reconnect...</div>;
  } else if (props.project.loadError) {
    statusIndicator = <PortableWifiOffIcon className={styles.offlineIcon} fontSize="small" />;
    statusMessage = <div className={styles.offline}>{statusIndicator}Project is offline</div>;
  }

  const divClasses = [styles.container];
  if (props.selected) {
    divClasses.push(styles.selected);
  }

  let updateIcon = null;
  if (props.hasUpdate) {
    updateIcon = <FontAwesomeIcon className={styles.updateIcon} icon="bell" />;
  }

  return (
    <div onMouseEnter={() => setTooltipOpen(true)} onMouseLeave={() => setTooltipOpen(false)}>
      <HtmlTooltip
        arrow
        open={isTooltipOpen}
        disableInteractive
        enterDelay={500}
        title={
          <>
            <div className={styles.name}>{props.project.name}</div>
            {statusMessage}
            <div className={styles.tooltipPath}>{props.project.path}</div>
          </>
        }
      >
        <div className={divClasses.join(' ')} data-tid="container" onClick={props.onSelect}>
          <div className={styles.name}>
            <span>
              {props.project.name}
              {statusIndicator}
              {updateIcon}
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
    </div>
  );
}

projectEntry.propTypes = {
  selected: PropTypes.bool,
  hasUpdate: PropTypes.bool,
};

projectEntry.defaultProps = {
  selected: false,
  hasUpdate: false,
};

export default projectEntry;
