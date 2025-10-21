import React, { useState, useEffect, useContext } from 'react';
import { ipcRenderer } from 'electron';
import {
  TextField,
  Paper,
  Typography,
  Box,
  IconButton,
  Collapse,
  Button,
  Alert
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  SettingsOutlined,
  InfoOutlined,
  RefreshOutlined,
  DeleteOutlined,
  DownloadOutlined,
  SaveOutlined,
  UploadFileOutlined,
} from '@mui/icons-material';
import SettingsContext from '../../../contexts/Settings';
import Messages from '../../../constants/messages';
import styles from './SearchSettings.css';

/**
 * Utility function to set the max indexable file size from the user settings
 * into the representation needed by this component for display purposes.
 *
 * @param {object} settings The user searchSettings
 */
function getIndexFilterFromCurrentSettings(settings) {
  return {
    maxFileSize: settings ? settings.maxIndexableFileSize : 100 * 1024,
    maxFileSizeMB: settings ? (settings.maxIndexableFileSize/(1024*1024)) : 0.1,
  };
}

const searchSettings = (props) => {
  const { searchSettings } = useContext(SettingsContext);

  const [showIndexManagement, setShowIndexManagement] = useState(true);
  const [indexFileInfo, setIndexFileInfo] = useState({ exists: false, path: null, size: 0 });
  // maxFileSize (bytes): This is the raw value needed by the backend logic.
  // maxFileSizeMB (megabytes): This is the display value for the user interface.
  const [indexingFilters, setIndexingFilters] = useState(
    getIndexFilterFromCurrentSettings(searchSettings));
  const [showIndexingConfig, setShowIndexingConfig] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [indexingStatus, setIndexingStatus] = useState({
    inProgress: false,
    projectId: null,
    queueLength: 0,
  });

  useEffect(() => {
    // Trigger the request to get the search index information once we have the list of
    // projects and search settings available (both are needed to initialize the index).
    if (props.projects && searchSettings) {
      ipcRenderer.send(Messages.SEARCH_INDEX_STATUS_REQUEST, props.projects, searchSettings);
    } else {
      console.log('Defering index status request until all configuration data is available');
    }
  }, [searchSettings, props.projects]);

  useEffect(() => {
    const handleSearchIndexStatusResponse = async (event, response) => {
      setIsInitializing(false);
      if (response.error) {
        setIndexFileInfo({exists: true, path: response.errorMessage, size: 0});
      } else {
        setIndexFileInfo(response.info);
      }
    };

    const handleSearchReindexResponse = (event, response) => {
      setIsInitializing(false);
      if (response.error) {
        setIndexFileInfo({exists: true, path: response.errorMessage, size: 0});
      } else {
        setIndexFileInfo(response.info);
      }
    };

    const handleSearchIndexDeleteResponse = (event, response) => {
      setIsInitializing(false);
      try {
        if (response.error) {
          alert(response.errorMessage);
        } else {
          setIndexFileInfo({ exists: false, path: null, size: 0 });
          console.log('Search: Index deleted successfully, ready for reinitialization');
          alert('Index file deleted successfully. Click "Reindex" to create a new index.');
        }
      } catch (error) {
        console.error('Search: Error deleting index:', error);
        alert('Error deleting index: ' + error.message);
      }
    };

    ipcRenderer.on(Messages.SEARCH_INDEX_STATUS_RESPONSE, handleSearchIndexStatusResponse);
    ipcRenderer.on(Messages.SEARCH_INDEX_REINDEX_RESPONSE, handleSearchReindexResponse);
    ipcRenderer.on(Messages.SEARCH_INDEX_DELETE_RESPONSE, handleSearchIndexDeleteResponse);

    return () => {
      ipcRenderer.removeListener(
        Messages.SEARCH_INDEX_STATUS_RESPONSE,
        handleSearchIndexStatusResponse,
      );
      ipcRenderer.removeListener(Messages.SEARCH_INDEX_REINDEX_RESPONSE, handleSearchReindexResponse);
      ipcRenderer.removeListener(Messages.SEARCH_INDEX_DELETE_RESPONSE, handleSearchIndexDeleteResponse);
    };
  }, []);

  const handleExportIndex = () => {
    try {
      const exportData = SearchService.exportIndex();
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `statwrap-search-index-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
    } catch (error) {
      console.error('Search: Error exporting index:', error);
    }
  };

  const handleImportIndex = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result);
        SearchService.importIndex(importData);
        updateSearchStats();
        updateIndexFileInfo();
        setIsInitializing(false);
        console.log('Search: Successfully imported search index');
        alert('Index imported successfully!');
      } catch (error) {
        console.error('Search: Error importing index:', error);
        alert('Error importing index: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteIndex = async () => {
    if (
      window.confirm(
        'Are you sure you want to delete the index file? This will require a complete reindex.',
      )
    ) {setIsInitializing(true);
      ipcRenderer.send(Messages.SEARCH_INDEX_DELETE_REQUEST);
    }
  };

  /**
   * Event handler when the user indicates they want to reindex.
   */
  const handleSearchReindex = () => {
    setIndexingFilters(getIndexFilterFromCurrentSettings(searchSettings));
    console.log('Search: Reindexing with current settings: ', searchSettings);
    ipcRenderer.send(Messages.SEARCH_INDEX_REINDEX_REQUEST, searchSettings);
    setIsInitializing(true);
  }

  const handleSearchReindexWithFileSize = () => {
    const updatedSearchSettings = {maxIndexableFileSize: indexingFilters.maxFileSize};
    console.log('Search: Reindexing with updated settings: ', updatedSearchSettings);
    ipcRenderer.send(Messages.SEARCH_UPDATE_SETTINGS_REQUEST, updatedSearchSettings);
    ipcRenderer.send(Messages.SEARCH_INDEX_REINDEX_REQUEST, updatedSearchSettings);
    setIsInitializing(true);
  };

  return (
    <div className={styles.container}>
      <Box mb={2}>
        <Paper variant="outlined" sx={{ backgroundColor: 'background.default' }}>
          <Box
            sx={{
              p: 2,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            onClick={() => setShowIndexingConfig(!showIndexingConfig)}
          >
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SettingsOutlined />
              Search Configuration
            </Typography>
            <IconButton size="small">
              {showIndexingConfig ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>

          <Collapse in={showIndexingConfig}>
            {/* Index Management Panels */}
            <Box sx={{ px: 2, pb: 2 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Manage the search index.
                </Typography>
              </Box>

              <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                <Button
                  startIcon={<RefreshOutlined />}
                  onClick={handleSearchReindex}
                  variant="outlined"
                  size="small"
                  disabled={isInitializing || indexingStatus.inProgress}
                >
                  Full Reindex
                </Button>

                <Button
                  startIcon={<DeleteOutlined />}
                  onClick={handleDeleteIndex}
                  variant="outlined"
                  size="small"
                  color="error"
                  disabled={isInitializing || indexingStatus.inProgress}
                >
                  Delete Index
                </Button>

                <Button
                  startIcon={<DownloadOutlined />}
                  onClick={handleExportIndex}
                  variant="outlined"
                  size="small"
                  disabled={isInitializing}
                >
                  Export
                </Button>

                <Button
                  startIcon={<UploadFileOutlined />}
                  component="label"
                  variant="outlined"
                  size="small"
                  disabled={isInitializing}
                >
                  Import
                  <input type="file" hidden accept=".json" onChange={handleImportIndex} />
                </Button>
              </Box>

              {indexFileInfo.exists && (
                <Box>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Index file: {indexFileInfo.sizeKB ? indexFileInfo.sizeKB.toFixed(2) : ""}KB at {indexFileInfo.path}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Last modified: {new Date(indexFileInfo.lastModified).toLocaleString()}
                  </Typography>
                </Box>
              )}
            </Box>

            <Box sx={{ px: 2, pb: 2 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Configure which files to index based on size. Only files smaller than the
                  specified limit will be indexed for search.
                </Typography>
              </Box>

              <Box sx={{ minWidth: 300, maxWidth: 600 }}>
                <Box display="flex" alignItems="center" gap={2} mb={1} flexWrap="wrap">
                  <Typography variant="caption" sx={{ minWidth: 200 }}>
                    Maximum File Size to Index:{' '}
                    {indexingFilters.maxFileSizeMB >= 1
                      ? `${indexingFilters.maxFileSizeMB} MB`
                      : `${Math.round(indexingFilters.maxFileSizeMB * 1024)} KB`}
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<SettingsOutlined />}
                    onClick={handleSearchReindexWithFileSize}
                    disabled={isInitializing || indexingStatus.inProgress}
                    color="primary"
                  >
                    Reindex with{' '}
                    {indexingFilters.maxFileSizeMB >= 1
                      ? `${indexingFilters.maxFileSizeMB}MB`
                      : `${Math.round(indexingFilters.maxFileSizeMB * 1024)}KB`}{' '}
                    Limit
                  </Button>
                </Box>

                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <TextField
                    size="small"
                    label="Size in KB"
                    type="number"
                    value={Math.round(indexingFilters.maxFileSizeMB * 1024)}
                    onChange={(e) => {
                      const kbValue = parseInt(e.target.value) || 1;
                      const mbValue = Math.max(0.001, kbValue / 1024);
                      setIndexingFilters((prev) => ({
                        ...prev,
                        maxFileSizeMB: mbValue,
                        maxFileSize: mbValue * 1024 * 1024,
                      }));
                    }}
                    inputProps={{
                      min: 0,
                      max: 102400,
                      step: 1,
                    }}
                    sx={{ width: 200 }}
                    disabled={isInitializing || indexingStatus.inProgress}
                  />
                  <Typography variant="caption" color="textSecondary">
                    (1 KB - 100 MB)
                  </Typography>
                </Box>

                <Box mt={1} display="flex" gap={1} flexWrap="wrap" alignItems="center">
                  <Typography variant="caption" color="textSecondary">
                    Quick presets:
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() =>
                      setIndexingFilters((prev) => ({
                        ...prev,
                        maxFileSizeMB: 0.005,
                        maxFileSize: 0.005 * 1024 * 1024,
                      }))
                    }
                    disabled={isInitializing || indexingStatus.inProgress}
                  >
                    5KB
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() =>
                      setIndexingFilters((prev) => ({
                        ...prev,
                        maxFileSizeMB: 0.01,
                        maxFileSize: 0.01 * 1024 * 1024,
                      }))
                    }
                    disabled={isInitializing || indexingStatus.inProgress}
                  >
                    10KB
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() =>
                      setIndexingFilters((prev) => ({
                        ...prev,
                        maxFileSizeMB: 0.1,
                        maxFileSize: 0.1 * 1024 * 1024,
                      }))
                    }
                    disabled={isInitializing || indexingStatus.inProgress}
                  >
                    100KB (Default)
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() =>
                      setIndexingFilters((prev) => ({
                        ...prev,
                        maxFileSizeMB: 1,
                        maxFileSize: 1 * 1024 * 1024,
                      }))
                    }
                    disabled={isInitializing || indexingStatus.inProgress}
                  >
                    1MB
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() =>
                      setIndexingFilters((prev) => ({
                        ...prev,
                        maxFileSizeMB: 10,
                        maxFileSize: 10 * 1024 * 1024,
                      }))
                    }
                    disabled={isInitializing || indexingStatus.inProgress}
                  >
                    10MB
                  </Button>
                </Box>
              </Box>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  <strong>Note:</strong> Index is automatically saved and loaded. Changes to file
                  size require reindexing to take effect.
                </Typography>
              </Alert>
            </Box>
          </Collapse>
        </Paper>
      </Box>
    </div>
  );
};

export default searchSettings;
