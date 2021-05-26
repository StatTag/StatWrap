/* eslint-disable react/forbid-prop-types */
/* eslint-disable object-shorthand */
/* eslint-disable react/jsx-props-no-spreading */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Draggable from 'react-draggable';
import { Dialog, DialogActions, DialogTitle, Button, Paper } from '@material-ui/core';
import ArrowBackIcon from '@material-ui/icons/ArrowBackIos';
import ArrowForwardIcon from '@material-ui/icons/ArrowForwardIos';
import { ipcRenderer } from 'electron';
import Constants from '../../constants/constants';
import CreateProject from './CreateProject/CreateProject';
import SelectProjectTemplate from '../../components/SelectProjectTemplate/SelectProjectTemplate';
import ExistingDirectory from '../../components/ExistingDirectory/ExistingDirectory';
import NewDirectory from '../../components/NewDirectory/NewDirectory';
import CloneDirectory from './CloneDirectory/CloneDirectory';
import Error from '../../components/Error/Error';
import UserContext from '../../contexts/User';

import styles from './CreateProjectDialog.css';
import Messages from '../../constants/messages';

function PaperComponent(props) {
  return (
    <Draggable handle="#project-dialog-title" cancel={'[class*="MuiDialogContent-root"]'}>
      <Paper {...props} />
    </Draggable>
  );
}

class CreateProjectDialog extends Component {
  static validateProjectDirectory(step, directory, name) {
    const hasDirectory = directory && directory !== '';
    // We are ignoring name validation for existing directories, otherwise
    // we will apply the validation rules.
    const hasName = step === 'ExistingProjectDetails' ? true : name && name !== '';
    return hasDirectory && hasName;
  }

  constructor(props) {
    super(props);
    this.state = {
      step: 'SelectProjectType',
      selectedTemplate: null,
      project: {
        type: null,
        name: '',
        directory: ''
      },
      canProgress: false,
      errorMessage: null
    };

    this.handleSelectAddProject = this.handleSelectAddProject.bind(this);
    this.handleDirectoryChanged = this.handleDirectoryChanged.bind(this);
    this.handleNameChanged = this.handleNameChanged.bind(this);
    this.handleBack = this.handleBack.bind(this);
    this.handleNext = this.handleNext.bind(this);
    this.handleCreateProject = this.handleCreateProject.bind(this);
    this.handleSelectProjectTemplate = this.handleSelectProjectTemplate.bind(this);
    this.handleProjectCreated = this.handleProjectCreated.bind(this);
  }

  componentDidMount() {
    ipcRenderer.on(Messages.CREATE_PROJECT_RESPONSE, this.handleProjectCreated);
  }

  componentWillUnmount() {
    ipcRenderer.removeListener(Messages.CREATE_PROJECT_RESPONSE, this.handleProjectCreated);
  }

  static steps = [
    // This is the starting dialog that can take the user down one of three paths, represented
    // by states below:
    //  1. New Directory
    //  2. Existing Directory
    //  3. Clone Directory
    {
      step: 'SelectProjectType'
    },

    // Progression for New Project
    {
      step: 'SelectNewProjectTemplate',
      next: 'NewProjectDetails',
      prev: 'SelectProjectType'
    },
    {
      step: 'NewProjectDetails',
      next: 'Create',
      prev: 'SelectNewProjectTemplate'
    },

    // Progression for Existing Directory
    {
      step: 'ExistingProjectDetails',
      next: 'Create',
      prev: 'SelectProjectType'
    },

    // Progression for Clone Directory
    {
      step: 'CloneProjectDetails',
      next: 'SelectAssets',
      prev: 'SelectProjectType'
    },
    {
      step: 'SelectAssets',
      next: 'Create',
      prev: 'CloneProjectDetails'
    }
  ];

  handleSelectAddProject(type) {
    this.setState(prevState => ({
      project: {
        ...prevState.project,
        type: type
      }
    }));
    switch (type) {
      case Constants.ProjectType.NEW_PROJECT_TYPE:
        this.setState({ step: 'SelectNewProjectTemplate' });
        break;
      case Constants.ProjectType.EXISTING_PROJECT_TYPE:
        this.setState({ step: 'ExistingProjectDetails' });
        break;
      case Constants.ProjectType.CLONE_PROJECT_TYPE:
        this.setState({ step: 'CloneProjectDetails' });
        break;
      default:
        this.setState({ step: 'SelectProjectType' });
    }
  }

  handleBack() {
    const currentStep = this.state.step;
    const stepDetails = CreateProjectDialog.steps.find(x => x.step === currentStep);
    this.setState({ step: stepDetails.prev, canProgress: false });
  }

  handleNext() {
    const currentStep = this.state.step;
    const stepDetails = CreateProjectDialog.steps.find(x => x.step === currentStep);
    this.setState({ step: stepDetails.next, canProgress: false });
  }

  handleProjectCreated(sender, response) {
    console.log(response);
    if (response && !response.error) {
      // If the user connected to an existing project, and there was already a StatWrap config entry
      // we aren't going to log anything else since the project is assumed to already be created.
      if (!response.statWrapConfigExisted) {
        ipcRenderer.send(
          Messages.WRITE_PROJECT_LOG_REQUEST,
          response.project.path,
          Constants.ActionType.PROJECT_CREATED,
          Constants.ActionType.PROJECT_CREATED,
          `${this.context} created project ${response.project.name}`,
          response.project,
          'info',
          this.context
        );
      }
      this.props.onClose(true);
    } else {
      this.setState({ errorMessage: response.errorMessage });
    }
  }

  handleCreateProject() {
    const project = {
      ...this.state.project,
      template: this.state.selectedTemplate
    };
    console.log(project);
    ipcRenderer.send(Messages.CREATE_PROJECT_REQUEST, project);
  }

  handleSelectProjectTemplate(templateId, templateVersion) {
    console.log(`${templateId} - ${templateVersion}`);
    this.setState({
      selectedTemplate: { id: templateId, version: templateVersion },
      canProgress: true
    });
  }

  handleDirectoryChanged(dir) {
    this.setState(prevState => ({
      project: {
        ...prevState.project,
        directory: dir
      },
      canProgress: CreateProjectDialog.validateProjectDirectory(
        prevState.step,
        dir,
        prevState.project.name
      )
    }));
  }

  handleNameChanged(name) {
    this.setState(prevState => ({
      project: {
        ...prevState.project,
        name: name
      },
      canProgress: CreateProjectDialog.validateProjectDirectory(
        prevState.step,
        prevState.project.directory,
        name
      )
    }));
  }

  render() {
    const currentStep = this.state.step;
    const stepDetails = CreateProjectDialog.steps.find(x => x.step === currentStep);
    const hasNextStep = stepDetails.next !== null && stepDetails.next !== undefined;
    let displayComponent = null;
    let dialogTitle = null;
    let progressButton = null;
    if (hasNextStep) {
      progressButton =
        stepDetails.next === 'Create' ? (
          <Button
            color="primary"
            disabled={!this.state.canProgress}
            onClick={this.handleCreateProject}
          >
            Create Project
            <ArrowForwardIcon />
          </Button>
        ) : (
          <Button color="primary" disabled={!this.state.canProgress} onClick={this.handleNext}>
            Next
            <ArrowForwardIcon />
          </Button>
        );
    }
    let backButton = (
      <Button onClick={this.handleBack} color="primary" className={styles.backButton}>
        <ArrowBackIcon />
        Back
      </Button>
    );
    switch (this.state.step) {
      case 'SelectNewProjectTemplate': {
        dialogTitle = 'Select Project Type';
        displayComponent = (
          <SelectProjectTemplate
            projectTemplates={this.props.projectTemplates}
            selectedTemplate={this.state.selectedTemplate}
            onSelectProjectTemplate={this.handleSelectProjectTemplate}
            onFinalizeProjectTemplate={this.handleFinalizeProjectTemplate}
          />
        );
        break;
      }
      case 'NewProjectDetails': {
        const projectDirectory = this.state.project.directory;
        dialogTitle = 'About Your New Project';
        displayComponent = (
          <NewDirectory
            onDirectoryChanged={this.handleDirectoryChanged}
            onNameChanged={this.handleNameChanged}
            directory={projectDirectory}
            name={this.state.project.name}
          />
        );
        break;
      }
      case 'ExistingProjectDetails': {
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
      case 'CloneProjectDetails': {
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
      case 'SelectAssets': {
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
        displayComponent = <CreateProject onSelect={this.handleSelectAddProject} />;
      }
    }

    let error = null;
    if (this.state.errorMessage) {
      error = <Error style={{ marginTop: '15px' }}>{this.state.errorMessage}</Error>;
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
          {dialogTitle}
        </DialogTitle>
        {displayComponent}
        {error}
        <DialogActions>
          {backButton}
          {progressButton}
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

CreateProjectDialog.contextType = UserContext;

export default CreateProjectDialog;
