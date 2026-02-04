import React from 'react';
import { Menu, MenuItem, Divider } from '@mui/material';
import PropTypes from 'prop-types';
import Messages from '../../../constants/messages';
import Constants from '../../../constants/constants';

function projectListEntryMenu(props) {
  if (!props.project){
    return null;
  }
  const isPinned = props.project.favorite;
  const isPast = props.project.status === Constants.ProjectStatus.PAST;

  return (
    <Menu
      id="project-list-menu"
      anchorEl={props.anchorElement}
      keepMounted
      open={Boolean(props.anchorElement)}
      onClose={props.onClose}
    >
      {/* Pin/Unpin option */}
      <MenuItem
        onClick={() =>
          props.onMenuClick(Messages.TOGGLE_PROJECT_FAVORITE_REQUEST, props.project.id)
        }
      >
      {isPinned ? 'Unpin from Favorites' : 'Pin to Favorites'}
      </MenuItem>
      
      {/* Status toggle option - only for non-pinned projects */}
      {!isPinned && (
        <>
          <Divider />
          <MenuItem
            onClick={() =>
              props.onMenuClick(Messages.TOGGLE_PROJECT_STATUS_REQUEST, props.project.id)
            }
          >
            {isPast ? 'Mark as Active' : 'Mark as Past'}
          </MenuItem>
        </>
      )}
      
      <Divider />

      <MenuItem
        onClick={() =>
          props.onMenuClick(Messages.SHOW_ITEM_IN_FOLDER, props.project.path)
        }
        disabled={props.project.loadError}
      >
        Show in Folder
      </MenuItem>
      
      <Divider />
      
      {/* Remove option */}
      <MenuItem
        onClick={() =>
          props.onMenuClick(Messages.REMOVE_PROJECT_LIST_ENTRY_REQUEST, props.project.id)
        }
      >
        Remove project entry
      </MenuItem>
    </Menu>
  );
}

projectListEntryMenu.propTypes = {
  anchorElement: PropTypes.object,
  project: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onMenuClick: PropTypes.func.isRequired,
};

projectListEntryMenu.defaultProps = {
  anchorElement: null,
  project: null,
};

export default projectListEntryMenu;