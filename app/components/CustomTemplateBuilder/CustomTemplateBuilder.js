import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, TextField, IconButton } from '@mui/material';
import DriveFolderUploadIcon from '@mui/icons-material/DriveFolderUpload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import ProjectTemplatePreview from '../ProjectTemplatePreview/ProjectTemplatePreview';
import Error from '../Error/Error';
import Messages from '../../constants/messages';
import styles from './CustomTemplateBuilder.css';
import { ipcRenderer } from 'electron';

/**
 * Keep only the items whose path is in checkedPaths.
 * Folders are kept if they are checked OR have checked descendants.
 */
function filterContentsByPaths(contents, checkedPaths) {
  if (!contents) return [];
  const filtered = [];
  contents.forEach((item) => {
    if (item.type === 'folder') {
      if (checkedPaths.includes(item.path)) {
        const filteredChildren = filterContentsByPaths(item.contents, checkedPaths);
        filtered.push({ ...item, contents: filteredChildren });
      }
    } else {
      if (checkedPaths.includes(item.path)) {
        filtered.push(item);
      }
    }
  });
  return filtered;
}

/**
 * Recursively collect all paths from template contents
 */
function collectAllPaths(contents) {
  const paths = [];
  if (contents) {
    contents.forEach((item) => {
      paths.push(item.path);
      if (item.type === 'folder' && item.contents) {
        paths.push(...collectAllPaths(item.contents));
      }
    });
  }
  return paths;
}

class CustomTemplateBuilder extends Component {
    constructor(props) {
        super(props);
        const initial = props.initialTemplate;

        this.state = {
            templateName: initial ? initial.name : '',
            description: initial ? initial.description : '',
            importedTemplate: initial ? initial : null,
            importError: null,
            isScanning: false,
            checkedPaths: initial ? collectAllPaths(initial.contents) : [],
        };
    }

    updateTemplateReady = () => {
        const { importedTemplate, templateName, description, checkedPaths, importError } = this.state;
        if (importedTemplate && this.props.onTemplateReady) {
            const filteredContents = filterContentsByPaths(
                importedTemplate.contents,
                checkedPaths,
            );
            this.props.onTemplateReady({
                ...importedTemplate,
                name: templateName || importedTemplate.name,
                description: description || importedTemplate.description,
                contents: filteredContents,
            });
        }
        if (this.props.onValidationChange) {
            this.props.onValidationChange(
                templateName.trim() !== '' &&
                importedTemplate !== null &&
                !importError &&
                checkedPaths.length > 0,
            );
        }
    };

    handleNameChange = (e) => {
        const templateName = e.target.value;
        this.setState({ templateName }, () => {
            this.updateTemplateReady();
        });
    };

    handleDesChange = (e) => {
        const description = e.target.value;
        this.setState({ description }, () => {
            this.updateTemplateReady();
        });
    };

    handleCheckedChange = (checkedPaths) => {
        this.setState({ checkedPaths }, () => {
            this.updateTemplateReady();
        });
    };

    handleUploadingExistingFolder = () => {
        this.setState({
            isScanning: true,
            importError: null
        });

        ipcRenderer.once(Messages.IMPORT_TEMPLATE_FOLDER_RESPONSE, (event,response) => {
            if(response.canceled){
                this.setState({ isScanning: false });
                return;
            }

            if(response.error){
                this.setState({
                    isScanning: false,
                    importError: response.errorMessage,
                    importedTemplate: null,
                    checkedPaths: [],
                });

                if (this.props.onValidationChange) {
                    this.props.onValidationChange(false);
                }
                return;
            }
            
            this.setState(
                {
                    isScanning: false,
                    importedTemplate: response.template,
                    templateName: response.template.name,
                    description: response.template.description,
                    importError: null,
                },
                () => {
                    this.updateTemplateReady();
                },
            );
        });
        ipcRenderer.send(Messages.IMPORT_TEMPLATE_FOLDER_REQUEST); 
    }

    handleImportExistingTemplate = () => {
        this.setState({
            isScanning: true,
            importError: null
        })

        ipcRenderer.once(Messages.IMPORT_TEMPLATE_ZIP_RESPONSE, (event, response) =>{
            if(response.canceled){
                this.setState({
                    isScanning: false
                });
                return;
            }

            if(response.error){
                this.setState({
                    isScanning: false,
                    importError: response.errorMessage,
                    importedTemplate: null,
                    checkedPaths: [],
                });

                if (this.props.onValidationChange) {
                    this.props.onValidationChange(false);
                }
                return;
            }

            this.setState(
                {
                    isScanning: false,
                    importedTemplate: response.template,
                    templateName: response.template.name,
                    description: response.template.description,
                    importError: null,
                },
                () => {
                    this.updateTemplateReady();
                },
            );
        });
        ipcRenderer.send(Messages.IMPORT_TEMPLATE_ZIP_REQUEST); 
    };

    render() {
        return (
            <div className={styles.container}>
                <div className={styles.leftColumn}>
                    <div className={styles.header}>Template Actions:</div>
                    <Button
                        variant="contained"
                        className={styles.actionButton}
                        style={{ backgroundColor: '#c1ade1', color: 'white' }}
                        onClick={this.handleUploadingExistingFolder}
                    >
                        <span className={styles.actionText}>
                            <span className={styles.actionTitleRow}>
                                <DriveFolderUploadIcon className={styles.actionIcon} />
                                <strong>
                                    Upload Existing Folder
                                </strong>
                            </span>
                        </span>
                    </Button>
                    <Button
                        variant="contained"
                        className={styles.actionButton}
                        style={{ backgroundColor: '#c1ade1', color: 'white' }}
                        onClick={this.handleImportExistingTemplate}
                    >
                        <span className={styles.actionText}>
                            <span className={styles.actionTitleRow}>
                                <FileUploadIcon className={styles.actionIcon} />
                                <strong>Import an existing template</strong>
                            </span>
                        </span>
                    </Button>
                    <div className={styles.inputGroup}>
                        <div className={styles.header}>Template Name</div>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="My Research Template name"
                            value={this.state.templateName}
                            onChange={this.handleNameChange}
                            variant="outlined"
                            className={styles.textField}
                            multiline
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <div className={styles.header}>Description</div>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Describe the template"
                            value={this.state.description}
                            onChange={this.handleDesChange}
                            variant="outlined"
                            className={styles.textField}
                            multiline
                            minRows={4}
                            maxRows={10}
                        />
                    </div>
                    {this.state.importError ? (
                        <Error style={{ marginTop: '12px' }}>{this.state.importError}</Error>
                    ) : null}
                </div>
                <div className={styles.rightColumn}>
                    <div className={styles.header}>Template Preview:</div>
                    <ProjectTemplatePreview 
                        template={this.state.importedTemplate}
                        selectable={true}
                        onCheckedChange={this.handleCheckedChange} />
                </div>
            </div>
        )
    }
}

CustomTemplateBuilder.propTypes = {
    onValidationChange: PropTypes.func,
    onTemplateReady: PropTypes.func,
};

export default CustomTemplateBuilder;