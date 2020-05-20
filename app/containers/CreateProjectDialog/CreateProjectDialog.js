/* eslint-disable react/forbid-prop-types */
/* eslint-disable object-shorthand */
/* eslint-disable react/jsx-props-no-spreading */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Draggable from 'react-draggable';
import {
  Dialog,
  DialogActions,
  DialogTitle,
  Button,
  Paper
} from '@material-ui/core';
import ArrowBackIcon from '@material-ui/icons/ArrowBackIos';
import Constants from '../../constants/constants';
import CreateProject from './CreateProject/CreateProject';
import NewDirectory from './NewDirectory/NewDirectory';
import ExistingDirectory from './ExistingDirectory/ExistingDirectory';
import CloneDirectory from './CloneDirectory/CloneDirectory';
import styles from './CreateProjectDialog.css';

function PaperComponent(props) {
  return (
    <Draggable
      handle="#project-dialog-title"
      cancel={'[class*="MuiDialogContent-root"]'}
    >
      <Paper {...props} />
    </Draggable>
  );
}

class CreateProjectDialog extends Component {
  constructor(props) {
    super(props);
    this.state = {
      step: 1,
      selectedTemplate: null,
      project: {
        type: null,
        name: '',
        directory: ''
      },
      canCreateProject: false
    };

    this.handleSelectAddProject = this.handleSelectAddProject.bind(this);
    this.handleDirectoryChanged = this.handleDirectoryChanged.bind(this);
    this.handleBack = this.handleBack.bind(this);
    this.handleCreateProject = this.handleCreateProject.bind(this);
    this.handleSelectProjectTemplate = this.handleSelectProjectTemplate.bind(this);
    this.handleFinalizeProjectTemplate = this.handleFinalizeProjectTemplate.bind(this);
  }

  handleSelectAddProject(type) {
    console.log(type);
    this.setState(prevState => ({
      project: {
        ...prevState.project,
        type: type
      }
    }));
    switch (type) {
      case Constants.ProjectType.NEW_PROJECT_TYPE:
        this.setState({ step: 2 });
        break;
      case Constants.ProjectType.EXISTING_PROJECT_TYPE:
        this.setState({ step: 3 });
        break;
      case Constants.ProjectType.CLONE_PROJECT_TYPE:
        this.setState({ step: 4 });
        break;
      default:
        this.setState({ step: 1 });
    }
  }

  handleBack() {
    this.setState({ step: 1 });
  }

  handleCreateProject() {
    console.log(this.state.project);
    this.props.onClose();
  }

  handleSelectProjectTemplate(template) {
    console.log(template);
    this.setState({ selectedTemplate: template });
  }

  handleFinalizeProjectTemplate(template) {
    console.log(template);
  }

  handleDirectoryChanged(dir) {
    const canCreateProject = (dir !== null && dir !== '');
    this.setState(prevState => ({
      project: {
        ...prevState.project,
        directory: dir
      },
      canCreateProject: canCreateProject
    }));
  }

  render() {
    let displayComponent = null;
    let dialogTitle = null;
    const createProject = this.state.canCreateProject ? (
      <Button color="primary" onClick={this.handleCreateProject}>
        Create Project
      </Button>
    ) : null;
    let backButton = (
      <Button
        onClick={this.handleBack}
        color="primary"
        className={styles.backButton}
      >
        <ArrowBackIcon />
        Back
      </Button>
    );
    switch (this.state.step) {
      case 2: {
        dialogTitle = 'Select Project Type';
        displayComponent = (
          <NewDirectory
            projectTemplates={this.props.projectTemplates}
            selectedTemplate={this.state.selectedTemplate}
            onSelectProjectTemplate={this.handleSelectProjectTemplate}
            onFinalizeProjectTemplate={this.handleFinalizeProjectTemplate}
          />
        );
        break;
      }
      case 3: {
        const projectDirectory = this.state.project.directory;
        dialogTitle = 'Create Project from Existing Directory';
        displayComponent = (
          <ExistingDirectory
            onDirectoryChanged={this.handleDirectoryChanged}
            directory={projectDirectory}
          />
        );
        break;
      }
      case 4: {
        const projectDirectory = this.state.project.directory;
        dialogTitle = 'Clone Project from Existing Directory';
        displayComponent = (
          <CloneDirectory
            onDirectoryChanged={this.handleDirectoryChanged}
            directory={projectDirectory}
          />
        );
        break;
      }
      default: {
        backButton = null;
        dialogTitle = 'Add Project';
        displayComponent = (
          <CreateProject onSelect={this.handleSelectAddProject} />
        );
      }
    }

    return (
      <Dialog
        onClose={this.props.onClose}
        aria-labelledby="project-dialog-title"
        PaperComponent={PaperComponent}
        open={this.props.open}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle classes={{ root: styles.title }} id="project-dialog-title">
          {backButton}
          {dialogTitle}
        </DialogTitle>
        {displayComponent}
        <DialogActions>
          {createProject}
          <Button color="primary" onClick={this.props.onClose}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
}

CreateProjectDialog.propTypes = {
  projectTemplates: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool
};

CreateProjectDialog.defaultProps = {
  open: false
};

export default CreateProjectDialog;
