import React, { useMemo, useState, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
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
  TextField,
  Snackbar,
  Alert,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { Add, SaveAlt, FileUpload, FileDownload, Settings } from '@mui/icons-material';
import ChecklistService from '../../services/checklist';
import GeneralUtil from '../../utils/general';
import ChecklistUtil from '../../utils/checklist';
import AssetUtil from '../../utils/asset';
import Constants from '../../constants/constants';
import { v4 as uuidv4 } from 'uuid';

// These functions are mapped using the statement type to the corresponding scan function
const scanFunctions = {
  Dependency: ChecklistUtil.findProjectLanguagesAndDependencies,
  Data: ChecklistUtil.findDataFiles,
  Entrypoint: ChecklistUtil.findEntryPointFiles,
  Documentation: ChecklistUtil.findDocumentationFiles,
};

/**
 * Refreshes built-in scan results without mutating checklist items.
 * @param {Array} checklistItems The current items, including newly imported items
 * @param {object} project The project whose assets are scanned
 * @returns {Array} Items with recognized automated scan results refreshed
 */
function scanChecklistItems(checklistItems, project) {
  if (!project || !project.assets) {
    return checklistItems;
  }
  return checklistItems.map((item) => {
    const scanKey = ChecklistUtil.getItemScanKey(item);
    return scanFunctions[scanKey]
      ? { ...item, scanResult: scanFunctions[scanKey](project.assets) } : item;
  });
}

function ReproChecklist({
  project = null,
  checklist = null,
  error = null,
  onUpdated = null,
  onAddedNote = null,
  onUpdatedNote = null,
  onDeletedNote = null,
  onSelectedAsset = null,
}) {
  const [openExportDialog, setOpenExportDialog] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [newChecklistStatement, setNewChecklistStatement] = useState('');
  const [newChecklistDescription, setNewChecklistDescription] = useState('');
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editStatement, setEditStatement] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [showUndoBanner, setShowUndoBanner] = useState(false);
  const undoTimerRef = useRef(null);
  const [importResultDialog, setImportResultDialog] = useState({
    open: false,
    title: '',
    message: '',
  });
  const [statementError, setStatementError] = useState('');
  const [manageMenu, setManageMenu] = useState(null);

  const sortedChecklist = useMemo(() => checklist
    ? ChecklistUtil.sortChecklist(error ? checklist : scanChecklistItems(checklist, project))
    : [], [checklist, project, error]);

  // Handles the update of checklist for changes in the checklist items
  const handleItemUpdate = (updatedItem, actionType, entityType, entityKey, title, description, details) => {
    const updatedChecklist = checklist.map((item) => {
      return item.id === updatedItem.id ? updatedItem : item;
      });
    onUpdated(project, updatedChecklist, actionType, entityType, entityKey, title, description, details);
  };

  // Handles the generation of the reproducibility checklist report in PDF format
  const handleReportGeneration = (exportNotes) => {
    const service = new ChecklistService();
    service.generateReport(sortedChecklist, 'Reproducibility_Checklist.pdf', exportNotes, project);
    setOpenExportDialog(false);
  };

  // Handles to save a custom chechlist iten
  const handleAddChecklistSave = () => {
    const statement = ChecklistUtil.sanitizeChecklistStatement(newChecklistStatement);
    if (!statement) {
      setStatementError('Checklist question cannot be empty.');
      return;
    }

    if (ChecklistUtil.isDuplicateChecklist(statement, checklist)) {
      setStatementError('A checklist item with this question already exists.');
      return;
    }

    setStatementError('');

    const newItem = {
      id: uuidv4(),
      order: checklist.length + 1,
      statement,
      description: ChecklistUtil.sanitizeChecklistDescription(newChecklistDescription),
      answer: false,
      scanKey: null,          // Custom items will not get a scan key
      scanResult: {},         // Always empty for custom items
      notes: [],
      assets: [],
      subChecklist: [],
      source: 'custom',
    };

    const updatedChecklist = ChecklistUtil.renumberChecklist([...sortedChecklist, newItem]);

    onUpdated(
      project,
      updatedChecklist,
      Constants.ActionType.CHECKLIST_UPDATED,
      Constants.EntityType.CHECKLIST,
      newItem.id,
      Constants.ActionType.CHECKLIST_UPDATED,
      `Added custom checklist item "${statement}"`,
      newItem,
    );

    setOpenAddDialog(false);
    setNewChecklistStatement('');
    setNewChecklistDescription('');

  };

  // Handles to delete a custom checklist item
  const handleDeleteChecklistItem = (id) => {
    const itemToDelete = checklist.find((item) => item.id === id);
    if (!itemToDelete) {
      console.warn(`Unable to delete checklist item "${id}": item not found.`);
      return;
    }

    setShowUndoBanner(false);

    setTimeout(() => {
      setPendingDelete({
      item: itemToDelete,
      originalChecklist: [...checklist],
    });
      setShowUndoBanner(true);
    },100);

    // Remove the item and renumber
    const updatedChecklist = ChecklistUtil.renumberChecklist(
      sortedChecklist.filter((item) => item.id !== id)
    );

    onUpdated(
      project,
      updatedChecklist,
      Constants.ActionType.CHECKLIST_UPDATED,
      Constants.EntityType.CHECKLIST,
      id,
      Constants.ActionType.CHECKLIST_UPDATED,
      `Deleted custom checklist item "${itemToDelete.statement}"`,
      itemToDelete,
    );

    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }

    undoTimerRef.current = setTimeout(() => {
      // After 10 seconds, clear the undo state - deletion is now permanent
      setPendingDelete(null);
      setShowUndoBanner(false);
      undoTimerRef.current = null;
    }, 10000);
  };

  const handleUndoDelete = () => {
    if (!pendingDelete) return;

    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }

    onUpdated(
      project,
      pendingDelete.originalChecklist,
      Constants.ActionType.CHECKLIST_UPDATED,
      Constants.EntityType.CHECKLIST,
      pendingDelete.item.id,
      Constants.ActionType.CHECKLIST_UPDATED,
      `Restored checklist item "${pendingDelete.item.statement}"`,
      pendingDelete.item,
    );

    setPendingDelete(null);
    setShowUndoBanner(false);
  }

  const handleCloseUndoBanner = () => {
    setShowUndoBanner(false);
    setPendingDelete(null);

    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  }

  // Hnadles to edit dialog for a custom item
  const handleEditChecklistItem = (item) => {
    setEditingItem(item);
    setEditStatement(item.statement);
    setEditDescription(item.description || '');
    setOpenEditDialog(true);
  };

  // Handles to save edits to a custom item
  const handleEditChecklistSave = () => {
    const sanitizedStatement = ChecklistUtil.sanitizeChecklistStatement(editStatement);

    if (!editingItem || !sanitizedStatement) {
      setStatementError('Checklist question cannot be empty.');
      return;
    }

    if (ChecklistUtil.isDuplicateChecklist(sanitizedStatement, checklist, editingItem.id)) {
      setStatementError('A checklist item with this question already exists.');
      return;
    }

    setStatementError('');

    const updatedItem = {
      ...editingItem,
      statement: sanitizedStatement,
      description: ChecklistUtil.sanitizeChecklistDescription(editDescription),
    };

    handleItemUpdate(
      updatedItem,
      Constants.ActionType.CHECKLIST_UPDATED,
      Constants.EntityType.CHECKLIST,
      updatedItem.id,
      Constants.ActionType.CHECKLIST_UPDATED,
      `Edited custom checklist item "${updatedItem.statement}"`,
      updatedItem,
    );

    setOpenEditDialog(false);
    setEditingItem(null);
    setEditStatement('');
    setEditDescription('');
  };

  // Handles Drag and Drop
  const handleDragStart = useCallback((index) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback((dropIndex) => {
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const nextChecklist = ChecklistUtil.sortChecklist(checklist);
    const [movedItem] = nextChecklist.splice(draggedIndex, 1);
    nextChecklist.splice(dropIndex, 0, movedItem);

    const renumbered = ChecklistUtil.renumberChecklist(nextChecklist);

    onUpdated(
      project,
      renumbered,
      Constants.ActionType.CHECKLIST_UPDATED,
      Constants.EntityType.CHECKLIST,
      movedItem.id,
      Constants.ActionType.CHECKLIST_UPDATED,
      `Moved checklist item "${movedItem.statement}"`,
      movedItem,
    );

    setDraggedIndex(null);
    setDragOverIndex(null);
    }, [draggedIndex, checklist, project, onUpdated]);

  const handleDragEnd = useCallback(() => {
      setDraggedIndex(null);
      setDragOverIndex(null);
    }, []);

  // Export checklist definitions without project-specific responses or documentation.
  const handleExportChecklist = () => {
    if (!checklist || checklist.length === 0) return;

    const exportData = ChecklistUtil.generateChecklistExport(checklist);
    const jsonString = JSON.stringify(exportData, null, 2);

    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'checklist_export.json';
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Import checklist JSON file
  const handleImportChecklist = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (event) => {
      const file = event.target.files[0];
      if (!file) {
        return;
      }

      if (file.size > Constants.CHECKLIST_IMPORT_MAX_FILE_SIZE) {
        setImportResultDialog({
          open: true,
          title: 'Import Failed',
          message: `The file is too large (${(file.size / 1024 / 1024).toFixed(2)} MB). `
                 + 'Maximum allowed size is 1 MB.',
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const jsonString = e.target.result;

        const result = ChecklistUtil.validateAndParseImport(jsonString, checklist);
        if (!result.valid) {
          setImportResultDialog({
            open: true,
            title: 'Import Failed',
            message: result.error,
          });
          return;
        }

        const newItems = result.items.map((item, index) => ({
          id: item.id,
          order: checklist.length + index + 1,
          statement: item.statement,
          description: item.description,
          answer: false,
          scanKey: item.scanKey,
          scanResult: {},
          notes: [],
          assets: [],
          subChecklist: [],
          source: item.source || Constants.ChecklistItemSource.CUSTOM,
        }));

        const updatedChecklist = scanChecklistItems(ChecklistUtil.renumberChecklist([
          ...ChecklistUtil.sortChecklist(checklist), ...newItems,
        ]), project);
        onUpdated(
          project,
          updatedChecklist,
          Constants.ActionType.CHECKLIST_UPDATED,
          Constants.EntityType.CHECKLIST,
          'import',
          Constants.ActionType.CHECKLIST_UPDATED,
          `Imported ${newItems.length} checklist item(s)`,
          { importedCount: newItems.length },
        );

        let message = `Successfully imported ${newItems.length} checklist item(s).`;
        if (result.skippedCount > 0) {
          message += ` ${result.skippedCount} item(s) were skipped (duplicates or invalid).`;
        }
        if (result.invalidReasons.length > 0) {
          message += ` ${result.invalidReasons.join(' ')}`;
        }

        setImportResultDialog({
          open: true,
          title: 'Import Successful',
          message,
        });
      };

      reader.onerror = () => {
        setImportResultDialog({
          open: true,
          title: 'Import Failed',
          message: 'Unable to read the file. Please check the file permissions and try again.',
        });
      };
      reader.readAsText(file);
    };
    input.click();
  };

  let content = <div className={styles.empty}>Checklist not configured.</div>;

  if (error) {
    content = <Error>There was an error loading the project checklist: {error}</Error>;
  } else if (sortedChecklist && sortedChecklist.length > 0) {
    content = (
      <div>
      <div className={styles.headerRow}>
        <Typography variant="h5" align="center" marginTop="10px">
          Reproducibility Checklist
        </Typography>
        <button
          className={styles.manageChecklistButton}
          onClick={(e) => setManageMenu(e.currentTarget)}
        >
          <Settings fontSize="small" />
          <span>Manage Checklist</span>
        </button>
        <Menu
          anchorEl={manageMenu}
          open={Boolean(manageMenu)}
          onClose={()=> setManageMenu(null)}
          autoFocus={false}
        >
          <MenuItem onClick={ () => {
            setManageMenu(null);
            setOpenAddDialog(true);
          }}>
            <ListItemIcon><Add fontSize="small" /></ListItemIcon>
            <ListItemText>Add Checklist Item</ListItemText>
          </MenuItem>
          <MenuItem onClick={ () => {
            setManageMenu(null);
            handleImportChecklist();
          }}>

            <ListItemIcon><FileDownload fontSize="small" /></ListItemIcon>
            <ListItemText>Import Checklist</ListItemText>
          </MenuItem>
          <MenuItem onClick={ () => {
            setManageMenu(null);
            handleExportChecklist();
          }}>
            <ListItemIcon><FileUpload fontSize="small" /></ListItemIcon>
            <ListItemText>Export Checklist</ListItemText>
          </MenuItem>
        </Menu>
      </div>
      <br />
        {sortedChecklist.map((item, index) => (
          <div
            key={item.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={() => handleDrop(index)}
            onDragEnd={handleDragEnd}
            className={`${styles.draggableItem} ${
              draggedIndex === index ? styles.dragging : ''
            } ${dragOverIndex === index ? styles.dragOver : ''}`}
          >
          <ChecklistItem
            item={item}
            displayNumber={index + 1}
            project={project}
            onUpdatedNote={onUpdatedNote}
            onDeletedNote={onDeletedNote}
            onAddedNote={onAddedNote}
            onItemUpdate={handleItemUpdate}
            onSelectedAsset={onSelectedAsset}
            onDeleteItem={handleDeleteChecklistItem}
            onEditItem={handleEditChecklistItem}
          />
          </div>
        ))}
        <br />
        <div className={styles.downloadContainer}>
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
        <Dialog
          open={openAddDialog}
          onClose={() => setOpenAddDialog(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle className={styles.addDialogTitle}>
            <Add fontSize="small" style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Add New Checklist Item
          </DialogTitle>
          <DialogContent className={styles.addDialogContent}>
            <div className={styles.addFormGroup}>
              <label className={styles.addFormLabel}>Checklist Question</label>
              <TextField
                autoFocus
                placeholder="Write any reproducibility checklist question"
                value={newChecklistStatement}
                onChange={(event) => {
                  setNewChecklistStatement(event.target.value);
                  setStatementError('');
                }}
                fullWidth
                variant="outlined"
                size="small"
                error={!!statementError}
                inputProps={{ maxLength: Constants.CHECKLIST_STATEMENT_MAX_LENGTH }}
                helperText={statementError ? statementError : `${newChecklistStatement.length}/${Constants.CHECKLIST_STATEMENT_MAX_LENGTH}`}
              />
            </div>
            <div className={styles.addFormGroup}>
              <label className={styles.addFormLabel}>Description (Optional)</label>
              <TextField
                placeholder="Describe the checklist item"
                value={newChecklistDescription}
                onChange={(event) => setNewChecklistDescription(event.target.value)}
                fullWidth
                multiline
                minRows={4}
                variant="outlined"
                size="small"
                inputProps={{ maxLength: Constants.CHECKLIST_DESCRIPTION_MAX_LENGTH }}
                helperText={`${newChecklistDescription.length}/${Constants.CHECKLIST_DESCRIPTION_MAX_LENGTH}`}
              />
            </div>
          </DialogContent>
          <DialogActions className={styles.addDialogActions}>
            <div>
              <button
                onClick={handleAddChecklistSave}
                className={styles.saveButton}
              >
                Save
              </button>
              <button
                onClick={() => {
                  setOpenAddDialog(false);
                  setNewChecklistStatement('');
                  setNewChecklistDescription('');
                  setStatementError('');
                }}
                className={styles.cancelDialogButton}
              >
                Cancel
              </button>
            </div>
          </DialogActions>
        </Dialog>

        <Dialog
          open={openEditDialog}
          onClose={() => setOpenEditDialog(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle className={styles.addDialogTitle}>Edit Checklist</DialogTitle>
          <DialogContent className={styles.addDialogContent}>
            <div className={styles.addFormGroup}>
              <label className={styles.addFormLabel}>Checklist Question</label>
              <TextField
                autoFocus
                value={editStatement}
                onChange={(event) => {
                  setEditStatement(event.target.value);
                  setStatementError('');
                }}
                fullWidth
                variant="outlined"
                size="small"
                error={!!statementError}
                helperText={statementError}
              />
            </div>
            <div className={styles.addFormGroup}>
              <label className={styles.addFormLabel}>Description (Optional)</label>
              <TextField
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                fullWidth
                multiline
                minRows={4}
                variant="outlined"
                size="small"
              />
            </div>
          </DialogContent>
          <DialogActions className={styles.addDialogActions}>
            <div>
              <button onClick={handleEditChecklistSave} className={styles.saveButton}>
                Save
              </button>
              <button
                onClick={() => { setOpenEditDialog(false); setEditingItem(null); setStatementError(''); }}
                className={styles.cancelDialogButton}
              >
                Cancel
              </button>
            </div>
          </DialogActions>
        </Dialog>

        <Dialog
          open={importResultDialog.open}
          onClose={() => setImportResultDialog({ open: false, title: '', message: '' })}
        >
          <DialogTitle className={styles.dialogTitle}>
             {importResultDialog.title}
          </DialogTitle>
          <DialogContent className={styles.dialogContent}>
            <DialogContentText>{importResultDialog.message}</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setImportResultDialog({ open: false, title: '', message: '' })}
              color="primary"
            >
              OK
            </Button>
          </DialogActions>
        </Dialog>
        <Snackbar
          key={pendingDelete ? pendingDelete.item.id : 'none'}
          open={showUndoBanner}
          autoHideDuration={10000}
          onClose={handleCloseUndoBanner}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            severity="warning"
            variant="filled"
            onClose={handleCloseUndoBanner}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={handleUndoDelete}
                style={{ fontWeight: 'bold', textDecoration: 'underline' }}
              >
                UNDO
              </Button>
            }
          >
            Your checklist item has been deleted
          </Alert>
        </Snackbar>
      </div>
    );
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

export default ReproChecklist;
