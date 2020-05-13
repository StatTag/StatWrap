import React, { Component } from 'react';
import { List, ListItem, ListItemText } from '@material-ui/core';
import styles from './NewDirectory.css';

class NewDirectory extends Component {
  render() {
    let projectTypeList = null;
    if (this.props.projectTypes !== null) {
      projectTypeList = this.props.projectTypes.map(type =>
        <ListItem button key={type.id}>
          <ListItemText primary={type.name} secondary={type.description} />
        </ListItem>
      );
    }
    return (
      <div className={styles.container} data-tid="container">
        <List>
          {projectTypeList}
        </List>
      </div>
    );
  }
}

export default NewDirectory;
