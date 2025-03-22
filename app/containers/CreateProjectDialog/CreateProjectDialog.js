/* eslint-disable object-shorthand */
/* eslint-disable react/jsx-props-no-spreading */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Draggable from 'react-draggable';
import { Dialog, DialogActions, DialogTitle, Button, Paper } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardIos';
import { ipcRenderer } from 'electron';
import Constants from '../../constants/constants';
import CreateProject from './CreateProject/CreateProject';
import SelectProjectTemplate from '../../components/SelectProjectTemplate/SelectProjectTemplate';
import ExistingDirectory from '../../components/ExistingDirectory/ExistingDirectory';
import NewDirectory from '../../components/NewDirectory/NewDirectory';
import CloneDirectory from '../../components/CloneDirectory/CloneDirectory';
import Error from '../../components/Error/Error';
import UserContext from '../../contexts/User';
import ChecklistUtil from '../../utils/checklist';

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
        directory: '',
        sourceDirectory: '',    
        targetBaseDirectory: '', 
      },
      canProgress: false,
      errorMessage: null,
    }

    this.handleSelectAddProject = this.handleSelectAddProject.bind(this);
    this.handleDirectoryChanged = this.handleDirectoryChanged.bind(this);
    this.handleNameChanged = this.handleNameChanged.bind(this);
    this.handleBack = this.handleBack.bind(this);
    this.handleNext = this.handleNext.bind(this);
    this.handleCreateProject = this.handleCreateProject.bind(this);
    this.handleSelectProjectTemplate = this.handleSelectProjectTemplate.bind(this);
    this.handleProjectCreated = this.handleProjectCreated.bind(this);
    this.handleSourceDirectoryChanged = this.handleSourceDirectoryChanged.bind(this);
    this.handleTargetBaseDirectoryChanged = this.handleTargetBaseDirectoryChanged.bind(this);
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
      step: 'SelectProjectType',
    },

    // Progression for New Project
    {
      step: 'SelectNewProjectTemplate',
      next: 'NewProjectDetails',
      prev: 'SelectProjectType',
    },
    {
      step: 'NewProjectDetails',
      next: 'Create',
      prev: 'SelectNewProjectTemplate',
    },

    // Progression for Existing Directory
    {
      step: 'ExistingProjectDetails',
      next: 'Create',
      prev: 'SelectProjectType',
    },

    // Progression for Clone Directory
    {
      step: 'CloneProjectDetails',
      next: 'Create', 
      prev: 'SelectProjectType',
    },
  ];

  handleSourceDirectoryChanged(dir) {
    this.setState((prevState) => ({
      project: {
        ...prevState.project,
        sourceDirectory: dir,
      },
      canProgress: this.validateCloneDirectories(
        dir,
        prevState.project.targetBaseDirectory,
        prevState.project.name
      ),
    }));
  }
  
  handleTargetBaseDirectoryChanged(dir) {
    this.setState((prevState) => ({
      project: {
        ...prevState.project,
        targetBaseDirectory: dir,
      },
      canProgress: this.validateCloneDirectories(
        prevState.project.sourceDirectory,
        dir,
        prevState.project.name
      ),
    }));
  }
  
  validateCloneDirectories(sourceDir, targetBaseDir, name) {
    return sourceDir && sourceDir !== '' && 
           targetBaseDir && targetBaseDir !== '' && 
           name && name !== '';
  }

  handleSelectAddProject(type) {
    this.setState((prevState) => {
      const newProject = {
        ...prevState.project,
        type: type,
      };
      
      let newStep;
      let canProgress = false;
      
      switch (type) {
        case Constants.ProjectType.NEW_PROJECT_TYPE:
          newStep = 'SelectNewProjectTemplate';
          break;
        case Constants.ProjectType.EXISTING_PROJECT_TYPE:
          newStep = 'ExistingProjectDetails';
          break;
        case Constants.ProjectType.CLONE_PROJECT_TYPE:
          newStep = 'CloneProjectDetails';
          if (prevState.project.sourceDirectory && 
              prevState.project.targetBaseDirectory && 
              prevState.project.name) {
            canProgress = true;
          }
          break;
        default:
          newStep = 'SelectProjectType';
      }
      
      return { 
        project: newProject,
        step: newStep,
        canProgress: canProgress
      };
    });
  }
  handleBack() {
    const currentStep = this.state.step;
    const stepDetails = CreateProjectDialog.steps.find((x) => x.step === currentStep);
    this.setState({ step: stepDetails.prev, canProgress: false });
  }

  handleNext() {
    const currentStep = this.state.step;
    const stepDetails = CreateProjectDialog.steps.find((x) => x.step === currentStep);
    this.setState({ step: stepDetails.next, canProgress: false });
  }

  handleProjectCreated(sender, response) {
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
          this.context,
        );
        // Seed the project checklist with the null or falsey values
        const projectChecklist = ChecklistUtil.initializeChecklist();
        ipcRenderer.send(
          Messages.WRITE_PROJECT_CHECKLIST_REQUEST,
          response.project.path,
          projectChecklist,
        )
      }
      this.props.onClose(true);
    } else {
      this.setState({ errorMessage: response.errorMessage });
    }
  }

  handleCreateProject() {
    const { project, selectedTemplate } = this.state;
    
    // For clone projects, we need to set the directory to the final path
    if (project.type === Constants.ProjectType.CLONE_PROJECT_TYPE) {
      const cloneProject = {
        ...project,
        directory: `${project.targetBaseDirectory}/${project.name}`,
        template: selectedTemplate,
        isClone: true, 
      };
      ipcRenderer.send(Messages.CREATE_PROJECT_REQUEST, cloneProject);
    } else {
      // Handle normal projects as before
      const normalProject = {
        ...project,
        template: selectedTemplate,
      };
      ipcRenderer.send(Messages.CREATE_PROJECT_REQUEST, normalProject);
    }
  }

  handleSelectProjectTemplate(templateId, templateVersion) {
    this.setState({
      selectedTemplate: { id: templateId, version: templateVersion },
      canProgress: true,
    });
  }

  handleDirectoryChanged(dir) {
    this.setState((prevState) => ({
      project: {
        ...prevState.project,
        directory: dir,
      },
      canProgress: CreateProjectDialog.validateProjectDirectory(
        prevState.step,
        dir,
        prevState.project.name,
      ),
    }));
  }

  handleNameChanged(name) {
    this.setState((prevState) => {
      // Determine which validation method to use based on project type
      let canProgress;
      if (prevState.project.type === Constants.ProjectType.CLONE_PROJECT_TYPE) {
        canProgress = this.validateCloneDirectories(
          prevState.project.sourceDirectory,
          prevState.project.targetBaseDirectory,
          name
        );
      } else {
        canProgress = CreateProjectDialog.validateProjectDirectory(
          prevState.step,
          prevState.project.directory,
          name
        );
      }
      
      return {
        project: {
          ...prevState.project,
          name: name,
        },
        canProgress: canProgress,
      };
    });
  }
  render() {
    const currentStep = this.state.step;
    const stepDetails = CreateProjectDialog.steps.find((x) => x.step === currentStep);
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
      // In the CloneDirectory component render section for CloneProjectDetails:
      case 'CloneProjectDetails': {
        dialogTitle = 'Clone Project from Existing Directory';
        
        const canProgress = this.validateCloneDirectories(
          this.state.project.sourceDirectory,
          this.state.project.targetBaseDirectory,
          this.state.project.name
        );
        
        // Update state if needed
        if (this.state.canProgress !== canProgress) {
          this.setState({ canProgress });
        }
        
        displayComponent = (
          <CloneDirectory
            sourceDirectory={this.state.project.sourceDirectory}
            targetBaseDirectory={this.state.project.targetBaseDirectory}
            projectName={this.state.project.name}
            onSourceDirectoryChanged={this.handleSourceDirectoryChanged}
            onTargetBaseDirectoryChanged={this.handleTargetBaseDirectoryChanged}
            onProjectNameChanged={this.handleNameChanged}
          />
        );
        break;
      }
      case 'SelectAssets': {
        dialogTitle = 'Select Files to Include';
        displayComponent = (
          <div className={styles.selectAssetsContainer}>
            <p>Project will be cloned from: {this.state.project.sourceDirectory}</p>
            <p>New project will be created at: {this.state.project.targetBaseDirectory}/{this.state.project.name}</p>
            <p>Only the folder structure will be copied, not the files.</p>
          </div>
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
  open: PropTypes.bool,
};

CreateProjectDialog.defaultProps = {
  open: false,
};

CreateProjectDialog.contextType = UserContext;

export default CreateProjectDialog;
