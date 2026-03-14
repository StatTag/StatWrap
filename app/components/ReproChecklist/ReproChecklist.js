import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { dialog } from '@electron/remote';
import styles from './ReproChecklist.css';
import ChecklistItem from './ChecklistItem/ChecklistItem';
import Error from '../Error/Error';
import {
  Typography,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { SaveAlt, FileUpload, FileDownload } from '@mui/icons-material';
import ChecklistService from '../../services/checklist';
import GeneralUtil from '../../utils/general';
import ChecklistUtil from '../../utils/checklist';
import AssetUtil from '../../utils/asset';
import Constants from '../../constants/constants';

// These functions are mapped using the statement type to the corresponding scan function
const scanFunctions = {
  Dependency: ChecklistUtil.findProjectLanguagesAndDependencies,
  Data: ChecklistUtil.findDataFiles,
  Entrypoint: ChecklistUtil.findEntryPointFiles,
  Documentation: ChecklistUtil.findDocumentationFiles,
};

function ReproChecklist(props) {
  const {
    project,
    checklist,
    error,
    onUpdated,
    onAddedNote,
    onUpdatedNote,
    onDeletedNote,
    onSelectedAsset,
  } = props;
  const [openExportDialog, setOpenExportDialog] = useState(false);
  const [templateError, setTemplateError] = useState(null);
  const [templateMessage, setTemplateMessage] = useState(null);

  // this useEffect hook is here to load the scan results for all the checklist statements
  useEffect(() => {
    if (project && checklist && !error) {
      if (project.assets) {
        // scan the project assets for each checklist statement
        Constants.CHECKLIST.forEach((statement, index) => {
          // if used here as there might be a statement that doesn't have a corresponding scan function
          if (scanFunctions[statement[0]]) {
            const scanResult = scanFunctions[statement[0]](project.assets);
            checklist[index].scanResult = scanResult;
          }
        });
      }
    }
  }, [project]);

  // Handles the update of checklist for changes in the checklist items
  const handleItemUpdate = (updatedItem, actionType, entityType, entityKey, title, description, details) => {
    const updatedChecklist = checklist.map((item) =>
      item.id === updatedItem.id ? updatedItem : item,
    );
    onUpdated(project, updatedChecklist, actionType, entityType, entityKey, title, description, details);
  };

  // Handles the generation of the reproducibility checklist report in PDF format
  const handleReportGeneration = (exportNotes) => {
    const service = new ChecklistService();
    service.generateReport(checklist, 'Reproducibility_Checklist.pdf', exportNotes, project);
    setOpenExportDialog(false);
  };

  const clearTemplateFeedback = () => {
    setTemplateError(null);
    setTemplateMessage(null);
  };

  const handleExportTemplate = async () => {
    clearTemplateFeedback();

    try {
      const result = await dialog.showSaveDialog({
        title: 'Export reproducibility checklist template',
        defaultPath: 'Reproducibility_Checklist_Template.json',
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
      });

      if (result.canceled || !result.filePath) {
        return;
      }

      const service = new ChecklistService();
      service.exportTemplate(checklist, result.filePath);
      setTemplateMessage(`Checklist template exported to ${result.filePath}`);
    } catch (err) {
      setTemplateError(`There was an error exporting the checklist template: ${err.message || err}`);
    }
  };

  const handleImportTemplate = async () => {
    clearTemplateFeedback();

    try {
      const result = await dialog.showOpenDialog({
        title: 'Import reproducibility checklist template',
        properties: ['openFile'],
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return;
      }

      const service = new ChecklistService();
      const template = service.loadTemplate(result.filePaths[0]);
      const updatedChecklist = service.applyTemplate(checklist, template);
      onUpdated(
        project,
        updatedChecklist,
        Constants.ActionType.CHECKLIST_UPDATED,
        Constants.EntityType.CHECKLIST,
        'template',
        'Checklist Template Imported',
        `Imported reproducibility checklist template from ${result.filePaths[0]}`,
        { filePath: result.filePaths[0] },
      );
      setTemplateMessage(`Checklist template imported from ${result.filePaths[0]}`);
    } catch (err) {
      setTemplateError(`There was an error importing the checklist template: ${err.message || err}`);
    }
  };

  let content = <div className={styles.empty}>Checklist not configured.</div>;

  if (checklist && checklist.length > 0) {
    content = (
      <div>
        <Typography variant="h5" align="center" marginTop="10px">
          Reproducibility Checklist
        </Typography>
        <br />
        {templateError ? <Error>{templateError}</Error> : null}
        {templateMessage ? <Typography className={styles.templateMessage}>{templateMessage}</Typography> : null}
        {checklist.map((item) => (
          <ChecklistItem
            key={item.id}
            item={item}
            project={project}
            onUpdatedNote={onUpdatedNote}
            onDeletedNote={onDeletedNote}
            onAddedNote={onAddedNote}
            onItemUpdate={handleItemUpdate}
            onSelectedAsset={onSelectedAsset}
          />
        ))}
        <br />
        <div className={styles.actionsContainer}>
          <button onClick={handleImportTemplate} className={styles.secondaryButton}>
            <div className={styles.buttonContent}>
              <span className={styles.buttonText}>Import Template</span>
              <FileUpload />
            </div>
          </button>
          <button onClick={handleExportTemplate} className={styles.secondaryButton}>
            <div className={styles.buttonContent}>
              <span className={styles.buttonText}>Export Template</span>
              <FileDownload />
            </div>
          </button>
          <button onClick={() => setOpenExportDialog(true)} className={styles.downloadButton}>
            <div className={styles.buttonContent}>
              <span className={styles.buttonText}>Report</span>
              <SaveAlt />
            </div>
          </button>
        </div>

        <Dialog open={openExportDialog} onClose={() => setOpenExportDialog(false)}>
          <DialogTitle className={styles.dialogTitle}>Export Report</DialogTitle>
          <DialogContent className={styles.dialogContent}>
            <DialogContentText>
              Do you want to include the checklist notes in the exported reproducibility checklist?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            {/* selective export of notes */}
            <Button onClick={() => handleReportGeneration(true)} color="primary">
              Yes
            </Button>
            <Button onClick={() => handleReportGeneration(false)} color="primary" autoFocus>
              No
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    );
  } else if (error) {
    content = <Error>There was an error loading the project checklist: {error}</Error>;
  }

  return <div>{content}</div>;
}

ReproChecklist.propTypes = {
  project: PropTypes.object.isRequired,
  checklist: PropTypes.arrayOf(PropTypes.object),
  error: PropTypes.string,
  onUpdated: PropTypes.func.isRequired,
  onAddedNote: PropTypes.func.isRequired,
  onUpdatedNote: PropTypes.func.isRequired,
  onDeletedNote: PropTypes.func.isRequired,
  onSelectedAsset: PropTypes.func.isRequired,
};

ReproChecklist.defaultProps = {
  project: null,
  checklist: null,
  error: null,
  onUpdated: null,
  onAddedNote: null,
  onUpdatedNote: null,
  onDeletedNote: null,
  onSelectedAsset: null,
};

export default ReproChecklist;
