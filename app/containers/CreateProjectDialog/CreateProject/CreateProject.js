import React from 'react';
import { List, ListItem, ListItemAvatar, ListItemText, Avatar } from '@mui/material';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import FolderIcon from '@mui/icons-material/Folder';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import PropTypes from 'prop-types';
import Constants from '../../../constants/constants';

export default function CreateProject(props) {
  return (
    <List>
      <ListItem button onClick={() => props.onSelect(Constants.ProjectType.NEW_PROJECT_TYPE)}>
        <ListItemAvatar>
          <Avatar>
            <NewReleasesIcon />
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary="New Project"
          secondary="Start a new project in a brand new directory"
        />
      </ListItem>
      <ListItem button onClick={() => props.onSelect(Constants.ProjectType.EXISTING_PROJECT_TYPE)}>
        <ListItemAvatar>
          <Avatar>
            <FolderIcon />
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary="Existing Directory"
          secondary="Associate a project with an existing directory"
        />
      </ListItem>
      <ListItem button onClick={() => props.onSelect(Constants.ProjectType.CLONE_PROJECT_TYPE)}>
        <ListItemAvatar>
          <Avatar>
            <FileCopyIcon />
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary="Clone Directory"
          secondary="Create a new project with the same structure as an existing directory"
        />
      </ListItem>
    </List>
  );
}

CreateProject.propTypes = {
  onSelect: PropTypes.func.isRequired,
};
