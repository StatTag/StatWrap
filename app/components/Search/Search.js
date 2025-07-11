import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TextField,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  IconButton,
  Collapse,
  Button,
  Chip,
  Badge,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Divider,
  Switch,
  FormControlLabel,
  Slider,
  Alert
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Search as SearchIcon,
  ExpandMore,
  ExpandLess,
  PersonOutline,
  FolderOutlined,
  InsertDriveFileOutlined,
  Description,
  SettingsOutlined,
  NoteOutlined,
  FolderOpenOutlined,
  TrendingUpOutlined,
  FilterListOutlined,
  ClearOutlined,
  SaveOutlined,
  UploadFileOutlined,
  DownloadOutlined,
  TuneOutlined,
  SearchOutlined,
  AutoAwesomeOutlined,
  SpeedOutlined,
  MemoryOutlined
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { ipcRenderer } from 'electron';
import routes from '../../constants/routes.json';
import SearchService from '../../services/SearchService';
import SearchConfig from '../../constants/search-config';
import Messages from '../../constants/messages';

const SafeMessages = Messages && Object.keys(Messages).length > 0 ? Messages : FALLBACK_MESSAGES;

const SearchContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  margin: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  height: 'calc(100vh - 100px)'
}));

const SearchHeader = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2)
}));

const SearchFilters = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(2),
  flexWrap: 'wrap',
  alignItems: 'center'
}));

const SearchResults = styled(Box)({
  flexGrow: 1,
  overflow: 'auto'
});

const ResultItem = styled(ListItem)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  '&:hover': {
    backgroundColor: theme.palette.action.hover
  }
}));

const HighlightedText = styled('span')(({ theme }) => ({
  backgroundColor: theme.palette.warning.light,
  fontWeight: 'bold',
  padding: '0 2px',
  borderRadius: 2
}));

const AdvancedSearchPanel = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  padding: theme.spacing(2),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default
}));

const PerformancePanel = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
  padding: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.grey[50]
}));

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`search-tabpanel-${index}`}
      aria-labelledby={`search-tab-${index}`}
      style={{ height: '100%', overflow: 'auto' }}
      {...other}
    >
      {value === index && (
        <Box p={1} style={{ height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
};

function Search() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState({
    projects: [],
    people: [],
    assets: [],
    files: [],
    folders: [],
    notes: [],
    all: []
  });
  const [activeTab, setActiveTab] = useState(0);
  const [expandedItems, setExpandedItems] = useState({});
  const [isInitializing, setIsInitializing] = useState(true);
  const [indexingStatus, setIndexingStatus] = useState({
    inProgress: false,
    projectId: null,
    queueLength: 0
  });
  const [searchFilters, setSearchFilters] = useState({
    type: 'all',
    project: 'all',
    dateRange: 'all',
    fileType: 'all',
    sizeRange: [0, 100]
  });
  const [searchHistory, setSearchHistory] = useState([]);
  const [searchStats, setSearchStats] = useState(null);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchMode, setSearchMode] = useState('basic');
  const [showPerformanceMetrics, setShowPerformanceMetrics] = useState(false);
  const [lastSearchTime, setLastSearchTime] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchInputRef = useRef(null);

  useEffect(() => {
    console.log('Search: Starting initialization');

    // Force enable after 3 seconds no matter what
    // const forceEnableTimer = setTimeout(() => {
    //   console.log('Search: Force enabling interface');
    //   setIsInitializing(false);
    // }, 3000); // to enable 

    // Request project list
    ipcRenderer.send(SafeMessages.LOAD_PROJECT_LIST_REQUEST);

    // Handle response
    const handleProjectResponse = async (event, response) => {
      console.log('Search: Got project response, initializing service');

      try {
        if (response.projects) {
          await SearchService.initialize(response.projects);
          response.projects.forEach(project => {
            SearchService.queueProjectForContentIndexing(project);
          });
        }
      } catch (error) {
        console.error('Init error:', error);
      }

      // Always enable interface
      console.log('Search: Enabling interface');
      setIsInitializing(false);
      // clearTimeout(forceEnableTimer);
    };

    ipcRenderer.once(SafeMessages.LOAD_PROJECT_LIST_RESPONSE, handleProjectResponse);

    // Set up other listeners
    const handleIndexProjectResponse = (event, response) => {
      setIndexingStatus(response.status);
    };

    const handleIndexAllResponse = (event, response) => {
      setIndexingStatus(response.status);
    };

    const handleSearchStatusResponse = (event, response) => {
      setIndexingStatus(response.status);
    };

    ipcRenderer.on(SafeMessages.ENHANCED_SEARCH_INDEX_PROJECT_RESPONSE, handleIndexProjectResponse);
    ipcRenderer.on(SafeMessages.ENHANCED_SEARCH_INDEX_ALL_RESPONSE, handleIndexAllResponse);
    ipcRenderer.on(SafeMessages.ENHANCED_SEARCH_STATUS_RESPONSE, handleSearchStatusResponse);

    // Status check interval
    const statusInterval = setInterval(() => {
      ipcRenderer.send(SafeMessages.ENHANCED_SEARCH_STATUS_REQUEST);
      updateSearchStats();
    }, 5000);

    // Keyboard shortcuts
    const handleKeyDown = (event) => {
      if (SearchConfig.ui && SearchConfig.ui.enableKeyboardShortcuts) {
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
          event.preventDefault();
          searchInputRef.current?.focus();
        } else if (event.key === 'Escape' && searchTerm) {
          handleClearSearch();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      // clearTimeout(forceEnableTimer);
      ipcRenderer.removeListener(SafeMessages.ENHANCED_SEARCH_INDEX_PROJECT_RESPONSE, handleIndexProjectResponse);
      ipcRenderer.removeListener(SafeMessages.ENHANCED_SEARCH_INDEX_ALL_RESPONSE, handleIndexAllResponse);
      ipcRenderer.removeListener(SafeMessages.ENHANCED_SEARCH_STATUS_RESPONSE, handleSearchStatusResponse);
      clearInterval(statusInterval);
      document.removeEventListener('keydown', handleKeyDown);
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  }, []);

  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (isInitializing && SearchService) {
        console.log('Checking if service is ready...');
        console.log('Service isInitialized:', SearchService.isInitialized);
        console.log('Document store size:', SearchService.documentStore?.size || 0);

        // If service is initialized, stop showing initializing state
        if (SearchService.isInitialized) {
          console.log('Service is ready! Stopping initialization...');
          setIsInitializing(false);
        }
      }
    }, 2000); // Checking every 2 seconds

    return () => clearInterval(checkInterval);
  }, [isInitializing]);

  const updateSearchStats = useCallback(() => {
    try {
      if (SearchService && SearchService.getSearchStats) {
        const stats = SearchService.getSearchStats();
        setSearchStats(stats);
      }
    } catch (error) {
      console.error('Error updating search stats:', error);
    }
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const performSearch = useCallback((query) => {
    if (!query.trim()) {
      setSearchResults({
        projects: [],
        people: [],
        assets: [],
        files: [],
        folders: [],
        notes: [],
        all: []
      });
      return;
    }

    console.log('Search: Performing search for', query);
    setIsSearching(true);
    const searchStartTime = Date.now();

    try {
      let results;

      const searchOptions = {
        type: searchFilters.type !== 'all' ? searchFilters.type : undefined,
        projectId: searchFilters.project !== 'all' ? searchFilters.project : undefined,
        maxResults: SearchConfig.search ? SearchConfig.search.maxResults : 1000
      };

      // Choose search method based on mode
      switch (searchMode) {
        case 'advanced':
          results = SearchService.advancedSearch ?
            SearchService.advancedSearch(query, searchOptions) :
            SearchService.search(query, searchOptions);
          break;
        case 'operators':
          results = SearchService.advancedSearch ?
            SearchService.advancedSearch(query, searchOptions) :
            SearchService.search(query, searchOptions);
          break;
        default:
          results = SearchService.search(query, searchOptions);
      }

      console.log('Search: Search results', results);

      const filteredResults = applyFilters(results);
      setSearchResults(filteredResults);

      const searchTime = Date.now() - searchStartTime;
      setLastSearchTime(searchTime);

      // Add to search history
      if (query.trim() && !searchHistory.includes(query.trim())) {
        const historySize = SearchConfig.ui ? SearchConfig.ui.searchHistorySize : 15;
        setSearchHistory(prev => [query.trim(), ...prev].slice(0, historySize));
      }

    } catch (error) {
      console.error('Search: Search error', error);
      setSearchResults({
        projects: [],
        people: [],
        assets: [],
        files: [],
        folders: [],
        notes: [],
        all: []
      });
    }

    setIsSearching(false);
  }, [searchFilters, searchHistory, searchMode]);

  const handleSearch = () => {
  if (searchTerm.trim()) {
    performSearch(searchTerm);
    setShowSuggestions(false);
  }
};

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    // Clear any existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Get suggestions but don't perform search
    if (SearchConfig.ui && SearchConfig.ui.enableSuggestions && value.length >= 2) {
      try {
        const newSuggestions = SearchService.getSuggestions ?
          SearchService.getSuggestions(value) : [];
        setSuggestions(newSuggestions);
        setShowSuggestions(newSuggestions.length > 0);
      } catch (error) {
        console.error('Error getting suggestions:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    // Clear results if search term is empty
    if (!value.trim()) {
      setSearchResults({
        projects: [],
        people: [],
        assets: [],
        files: [],
        folders: [],
        notes: [],
        all: []
      });
    }
};


  const handleSearchKeyUp = (e) => {
      if (e.key === 'Enter') {
        if (searchTimeout) clearTimeout(searchTimeout);
        if (searchTerm.trim()) {
          performSearch(searchTerm);
        }
        setShowSuggestions(false);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    };

  const applyFilters = (results) => {
    let filtered = { ...results };

    // Apply type filter
    if (searchFilters.type !== 'all') {
      Object.keys(filtered).forEach(key => {
        if (key !== 'all' && key !== searchFilters.type) {
          filtered[key] = [];
        }
      });
      filtered.all = filtered.all.filter(result => result.type === searchFilters.type);
    }

    // Apply project filter
    if (searchFilters.project !== 'all') {
      Object.keys(filtered).forEach(key => {
        filtered[key] = filtered[key].filter(result =>
          result.item && result.item.projectId === searchFilters.project
        );
      });
    }

    // Apply file type filter
    if (searchFilters.fileType !== 'all') {
      Object.keys(filtered).forEach(key => {
        filtered[key] = filtered[key].filter(result => {
          if (result.type === 'file' && result.item.extension) {
            return result.item.extension === searchFilters.fileType;
          }
          return result.type !== 'file';
        });
      });
    }

    return filtered;
  };

  const handleToggleExpand = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleReindexAll = async () => {
    console.log('Search: Reindexing all projects');

    try {
      await SearchService.reindexAll();

      if (SafeMessages.ENHANCED_SEARCH_INDEX_ALL_REQUEST) {
        ipcRenderer.send(SafeMessages.ENHANCED_SEARCH_INDEX_ALL_REQUEST);
      }

      updateSearchStats();
    } catch (error) {
      console.error('Search: Error during reindex:', error);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchResults({
      projects: [],
      people: [],
      assets: [],
      files: [],
      folders: [],
      notes: [],
      all: []
    });
    setSuggestions([]);
    setShowSuggestions(false);
    if (searchTimeout) clearTimeout(searchTimeout);
  };

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
        console.log('Search: Successfully imported search index');
      } catch (error) {
        console.error('Search: Error importing index:', error);
      }
    };
    reader.readAsText(file);
  };

  const highlightText = (text, query) => {
    if (!query || !text || typeof text !== 'string') return text;

    try {
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const parts = text.split(regex);

      return parts.map((part, index) =>
        regex.test(part) ?
          <HighlightedText key={index}>{part}</HighlightedText> :
          part
      );
    } catch (error) {
      console.error('Error highlighting text:', error);
      return text;
    }
  };

  const totalResults = searchResults.all.length;
  const availableProjects = searchStats?.documentsByType && SearchService.projectsData ?
    SearchService.projectsData : [];

  // Get unique file extensions for filter
  const availableFileTypes = React.useMemo(() => {
    const extensions = new Set();
    searchResults.files.forEach(result => {
      if (result.item.extension) {
        extensions.add(result.item.extension);
      }
    });
    return Array.from(extensions);
  }, [searchResults.files]);

  return (
    <SearchContainer elevation={2}>
      <SearchHeader>
        <Typography variant="h5" gutterBottom>
          Fuse.js Enhanced Search
          {SearchConfig.ui && SearchConfig.ui.showRelevanceScores && (
            <Chip size="small" label="Debug Mode" color="warning" sx={{ ml: 1 }} />
          )}
        </Typography>

        {/* Debug info for development */}
        {process.env.NODE_ENV === 'development' && (
          <Box sx={{ p: 1, mb: 1, backgroundColor: '#ffffcc', border: '1px solid #ccc' }}>
            <Typography variant="caption">
              DEBUG: isInitializing={String(isInitializing)} |
              Service.isInitialized={String(SearchService?.isInitialized)} |
              DocumentCount={SearchService?.documentStore?.size || 0}
            </Typography>
          </Box>
        )}

        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Box position="relative" flexGrow={1}>
            <Autocomplete
              freeSolo
              disabled={isInitializing}
              options={showSuggestions ? suggestions : searchHistory}
              value={searchTerm}
              onInputChange={(event, newValue) => {
                setSearchTerm(newValue || '');
              }}
              onClose={() => setShowSuggestions(false)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  inputRef={searchInputRef}
                  fullWidth
                  variant="outlined"
                  placeholder="Search for projects, files, people, notes... (Press Enter or click search button)"
                  disabled={isInitializing}
                  onKeyUp={handleSearchKeyUp}
                  onChange={handleSearchChange}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <Box display="flex" alignItems="center">
                        {searchTerm && !isInitializing && (
                          <IconButton size="small" onClick={handleClearSearch}>
                            <ClearOutlined />
                          </IconButton>
                        )}
                        <IconButton
                          onClick={handleSearch}
                          disabled={!searchTerm.trim() || isSearching || isInitializing}
                          color="primary" 
                        >
                          {isSearching ? <CircularProgress size={24} /> : <SearchIcon />}
                        </IconButton>
                      </Box>
                    )
                  }}
                />
              )}
            />
          </Box>

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Mode</InputLabel>
            <Select
              value={searchMode}
              label="Mode"
              disabled={isInitializing}
              onChange={(e) => setSearchMode(e.target.value)}
            >
              <MenuItem value="basic">Basic</MenuItem>
              <MenuItem value="advanced">Advanced</MenuItem>
              <MenuItem value="operators">Operators</MenuItem>
            </Select>
          </FormControl>

          <Button
            startIcon={<SettingsOutlined />}
            onClick={handleReindexAll}
            variant="outlined"
            disabled={isInitializing || indexingStatus.inProgress}
          >
            Reindex
          </Button>

          {/* Emergency enable button for development */}
          {process.env.NODE_ENV === 'development' && (
            <Button
              color="error"
              variant="contained"
              onClick={() => {
                console.log('EMERGENCY: Forcing initialization to complete');
                setIsInitializing(false);
              }}
              style={{ backgroundColor: '#ff4444', color: 'white', marginLeft: '8px' }}
            >
              ENABLE NOW
            </Button>
          )}

          <IconButton
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            color={showAdvancedSearch ? "primary" : "default"}
            disabled={isInitializing}
          >
            <TuneOutlined />
          </IconButton>
        </Box>

        {/* Search Mode Help */}
        {searchMode !== 'basic' && !isInitializing && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {searchMode === 'operators' && (
              <>
                <strong>Search Operators:</strong> Use !term (exclude), "exact phrase",
                | for OR operations (e.g., python | javascript)
              </>
            )}
            {searchMode === 'advanced' && (
              <>
                <strong>Advanced Search:</strong> Enhanced relevance scoring with fuzzy matching and extended search syntax
              </>
            )}
          </Alert>
        )}

        {/* Advanced Search Panel */}
        <Collapse in={showAdvancedSearch}>
          <AdvancedSearchPanel>
            <Typography variant="h6" gutterBottom>
              Advanced Filters
            </Typography>

            <SearchFilters>
              <FilterListOutlined color="action" />

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Type</InputLabel>
                <Select
                  value={searchFilters.type}
                  label="Type"
                  disabled={isInitializing}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, type: e.target.value }))}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="projects">Projects</MenuItem>
                  <MenuItem value="files">Files</MenuItem>
                  <MenuItem value="folders">Folders</MenuItem>
                  <MenuItem value="people">People</MenuItem>
                  <MenuItem value="assets">Assets</MenuItem>
                  <MenuItem value="notes">Notes</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Project</InputLabel>
                <Select
                  value={searchFilters.project}
                  label="Project"
                  disabled={isInitializing}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, project: e.target.value }))}
                >
                  <MenuItem value="all">All Projects</MenuItem>
                  {availableProjects.map(project => (
                    <MenuItem key={project.id} value={project.id}>
                      {project.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {availableFileTypes.length > 0 && (
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>File Type</InputLabel>
                  <Select
                    value={searchFilters.fileType}
                    label="File Type"
                    disabled={isInitializing}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, fileType: e.target.value }))}
                  >
                    <MenuItem value="all">All Types</MenuItem>
                    {availableFileTypes.map(ext => (
                      <MenuItem key={ext} value={ext}>
                        {ext}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <Box sx={{ minWidth: 200 }}>
                <Typography variant="caption" gutterBottom display="block">
                  File Size (MB): {searchFilters.sizeRange[0]} - {searchFilters.sizeRange[1]}
                </Typography>
                <Slider
                  size="small"
                  value={searchFilters.sizeRange}
                  disabled={isInitializing}
                  onChange={(e, newValue) => setSearchFilters(prev => ({ ...prev, sizeRange: newValue }))}
                  valueLabelDisplay="auto"
                  min={0}
                  max={100}
                />
              </Box>
            </SearchFilters>

            <Box mt={2} display="flex" gap={1} flexWrap="wrap">
              <FormControlLabel
                control={
                  <Switch
                    checked={showPerformanceMetrics}
                    onChange={(e) => setShowPerformanceMetrics(e.target.checked)}
                    size="small"
                    disabled={isInitializing}
                  />
                }
                label="Show Performance"
              />

              <Button
                size="small"
                startIcon={<DownloadOutlined />}
                onClick={handleExportIndex}
                variant="outlined"
                disabled={isInitializing}
              >
                Export Index
              </Button>

              <Button
                size="small"
                startIcon={<UploadFileOutlined />}
                component="label"
                variant="outlined"
                disabled={isInitializing}
              >
                Import Index
                <input
                  type="file"
                  hidden
                  accept=".json"
                  onChange={handleImportIndex}
                />
              </Button>
            </Box>
          </AdvancedSearchPanel>
        </Collapse>

        {/* Performance Metrics */}
        {showPerformanceMetrics && searchStats && !isInitializing && (
          <PerformancePanel>
            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
              <Box display="flex" alignItems="center" gap={0.5}>
                <SpeedOutlined fontSize="small" />
                <Typography variant="caption">
                  Last Search: {lastSearchTime}ms
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={0.5}>
                <MemoryOutlined fontSize="small" />
                <Typography variant="caption">
                  Cache: {searchStats.cacheStats?.size || 0}/{searchStats.cacheStats?.maxSize || 0}
                </Typography>
              </Box>
              {searchStats.performance && (
                <>
                  <Typography variant="caption">
                    Avg Search: {Math.round(searchStats.performance.averageSearchTime)}ms
                  </Typography>
                  <Typography variant="caption">
                    Total Searches: {searchStats.performance.totalSearches}
                  </Typography>
                </>
              )}
            </Box>
          </PerformancePanel>
        )}

        {/* Status indicators */}
        {isInitializing && (
          <Box display="flex" alignItems="center" mt={1}>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            <Typography variant="body2">
              Initializing search service...
            </Typography>
          </Box>
        )}

        {indexingStatus.inProgress && !isInitializing && (
          <Box display="flex" alignItems="center" mt={1}>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            <Typography variant="body2">
              Indexing in progress... {indexingStatus.queueLength} projects in queue
            </Typography>
          </Box>
        )}

        {searchStats && !isInitializing && (
          <Box display="flex" alignItems="center" gap={2} mt={1}>
            <Tooltip title={`Total: ${searchStats.totalDocuments} documents indexed`}>
              <Chip
                icon={<TrendingUpOutlined />}
                label={`${searchStats.totalDocuments} docs`}
                size="small"
                variant="outlined"
              />
            </Tooltip>

            {searchStats.indexedProjects !== undefined && (
              <Chip
                label={`${searchStats.indexedProjects}/${availableProjects.length} projects indexed`}
                size="small"
                variant="outlined"
                color={searchStats.indexedProjects === availableProjects.length ? "success" : "default"}
              />
            )}

            {searchStats.contentIndexedFiles !== undefined && (
              <Chip
                label={`${searchStats.contentIndexedFiles} files with content`}
                size="small"
                variant="outlined"
                color={searchStats.contentIndexedFiles > 0 ? "success" : "warning"}
              />
            )}
          </Box>
        )}
      </SearchHeader>

      {!isInitializing && searchTerm && (
        <Box mt={2} mb={1}>
          <Typography variant="body2">
            {isSearching ? 'Searching...' :
              totalResults > 0 ? `Found ${totalResults} results for "${searchTerm}"` :
                `No results found for "${searchTerm}"`}
          </Typography>
        </Box>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="search results tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            label={
              <Badge badgeContent={totalResults} color="primary" max={999}>
                All
              </Badge>
            }
            id="search-tab-0"
          />
          <Tab
            label={
              <Badge badgeContent={searchResults.projects.length} color="primary" max={999}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <FolderOutlined fontSize="small" />
                  Projects
                </Box>
              </Badge>
            }
            id="search-tab-1"
          />
          <Tab
            label={
              <Badge badgeContent={searchResults.files.length} color="primary" max={999}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <InsertDriveFileOutlined fontSize="small" />
                  Files
                </Box>
              </Badge>
            }
            id="search-tab-2"
          />
          <Tab
            label={
              <Badge badgeContent={searchResults.folders.length} color="primary" max={999}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <FolderOpenOutlined fontSize="small" />
                  Folders
                </Box>
              </Badge>
            }
            id="search-tab-3"
          />
          <Tab
            label={
              <Badge badgeContent={searchResults.people.length} color="primary" max={999}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <PersonOutline fontSize="small" />
                  People
                </Box>
              </Badge>
            }
            id="search-tab-4"
          />
          <Tab
            label={
              <Badge badgeContent={searchResults.assets.length} color="primary" max={999}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <InsertDriveFileOutlined fontSize="small" />
                  Assets
                </Box>
              </Badge>
            }
            id="search-tab-5"
          />
          <Tab
            label={
              <Badge badgeContent={searchResults.notes.length} color="primary" max={999}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <NoteOutlined fontSize="small" />
                  Notes
                </Box>
              </Badge>
            }
            id="search-tab-6"
          />
        </Tabs>
      </Box>

      <SearchResults>
        {isInitializing ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="300px">
            <Box textAlign="center">
              <CircularProgress sx={{ mb: 2 }} />
              <Typography variant="body1">
                Initializing search service...
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Please wait while we set up the search index
              </Typography>
            </Box>
          </Box>
        ) : (
          <>
            <TabPanel value={activeTab} index={0}>
              <AllResultsList
                results={searchResults.all}
                searchTerm={searchTerm}
                expandedItems={expandedItems}
                onToggleExpand={handleToggleExpand}
                highlightText={highlightText}
                showRelevanceScores={SearchConfig.ui && SearchConfig.ui.showRelevanceScores}
              />
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              <ResultsList
                results={searchResults.projects}
                searchTerm={searchTerm}
                expandedItems={expandedItems}
                onToggleExpand={handleToggleExpand}
                highlightText={highlightText}
                showRelevanceScores={SearchConfig.ui && SearchConfig.ui.showRelevanceScores}
                emptyMessage={`No project results found for "${searchTerm}"`}
              />
            </TabPanel>

            <TabPanel value={activeTab} index={2}>
              <ResultsList
                results={searchResults.files}
                searchTerm={searchTerm}
                expandedItems={expandedItems}
                onToggleExpand={handleToggleExpand}
                highlightText={highlightText}
                showRelevanceScores={SearchConfig.ui && SearchConfig.ui.showRelevanceScores}
                emptyMessage={`No file results found for "${searchTerm}"`}
              />
            </TabPanel>

            <TabPanel value={activeTab} index={3}>
              <ResultsList
                results={searchResults.folders}
                searchTerm={searchTerm}
                expandedItems={expandedItems}
                onToggleExpand={handleToggleExpand}
                highlightText={highlightText}
                showRelevanceScores={SearchConfig.ui && SearchConfig.ui.showRelevanceScores}
                emptyMessage={`No folder results found for "${searchTerm}"`}
              />
            </TabPanel>

            <TabPanel value={activeTab} index={4}>
              <ResultsList
                results={searchResults.people}
                searchTerm={searchTerm}
                expandedItems={expandedItems}
                onToggleExpand={handleToggleExpand}
                highlightText={highlightText}
                showRelevanceScores={SearchConfig.ui && SearchConfig.ui.showRelevanceScores}
                emptyMessage={`No people results found for "${searchTerm}"`}
              />
            </TabPanel>

            <TabPanel value={activeTab} index={5}>
              <ResultsList
                results={searchResults.assets}
                searchTerm={searchTerm}
                expandedItems={expandedItems}
                onToggleExpand={handleToggleExpand}
                highlightText={highlightText}
                showRelevanceScores={SearchConfig.ui && SearchConfig.ui.showRelevanceScores}
                emptyMessage={`No asset results found for "${searchTerm}"`}
              />
            </TabPanel>

            <TabPanel value={activeTab} index={6}>
              <ResultsList
                results={searchResults.notes}
                searchTerm={searchTerm}
                expandedItems={expandedItems}
                onToggleExpand={handleToggleExpand}
                highlightText={highlightText}
                showRelevanceScores={SearchConfig.ui && SearchConfig.ui.showRelevanceScores}
                emptyMessage={`No note results found for "${searchTerm}"`}
              />
            </TabPanel>
          </>
        )}
      </SearchResults>

      {process.env.NODE_ENV === 'development' && !isInitializing && (
        <DebugPanel
          searchService={SearchService}
          searchStats={searchStats}
          searchConfig={SearchConfig}
          onStatsUpdate={updateSearchStats}
        />
      )}
    </SearchContainer>
  );
}

// Result list components
const AllResultsList = ({ results, searchTerm, expandedItems, onToggleExpand, highlightText, showRelevanceScores }) => {
  if (results.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="200px">
        <Typography variant="body1" color="textSecondary">
          {searchTerm ? `No results found for "${searchTerm}"` : 'Start typing to search...'}
        </Typography>
      </Box>
    );
  }

  const groupedResults = results.reduce((acc, result) => {
    const type = result.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(result);
    return acc;
  }, {});

  const typeOrder = ['project', 'file', 'folder', 'person', 'asset', 'note'];
  const typeLabels = {
    project: 'Projects',
    file: 'Files',
    folder: 'Folders',
    person: 'People',
    asset: 'Assets',
    note: 'Notes'
  };

  return (
    <Box>
      {typeOrder.map(type => {
        if (!groupedResults[type] || groupedResults[type].length === 0) return null;

        return (
          <Box key={type} mb={3}>
            <Typography variant="h6" gutterBottom color="primary">
              {typeLabels[type]} ({groupedResults[type].length})
            </Typography>
            <List>
              {groupedResults[type].slice(0, 10).map((result, index) => (
                <ResultItemComponent
                  key={`${type}-${index}`}
                  result={result}
                  searchTerm={searchTerm}
                  expanded={expandedItems[`${type}-${index}`]}
                  onToggleExpand={() => onToggleExpand(`${type}-${index}`)}
                  highlightText={highlightText}
                  showRelevanceScores={showRelevanceScores}
                />
              ))}
              {groupedResults[type].length > 10 && (
                <Box mt={1} ml={2}>
                  <Typography variant="body2" color="textSecondary">
                    ... and {groupedResults[type].length - 10} more {typeLabels[type].toLowerCase()}
                  </Typography>
                </Box>
              )}
            </List>
          </Box>
        );
      })}
    </Box>
  );
};

const ResultsList = ({ results, searchTerm, expandedItems, onToggleExpand, highlightText, showRelevanceScores, emptyMessage }) => {
  if (results.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" mt={4}>
        <Typography variant="body1" color="textSecondary">
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <List>
      {results.map((result, index) => (
        <ResultItemComponent
          key={`${result.type}-${index}`}
          result={result}
          searchTerm={searchTerm}
          expanded={expandedItems[`${result.type}-${index}`]}
          onToggleExpand={() => onToggleExpand(`${result.type}-${index}`)}
          highlightText={highlightText}
          showRelevanceScores={showRelevanceScores}
        />
      ))}
    </List>
  );
};

// Enhanced result item component with Fuse.js features
const ResultItemComponent = ({ result, searchTerm, expanded, onToggleExpand, highlightText, showRelevanceScores }) => {
  if (!result || !result.item) {
    return null;
  }

  const { item, score, type, highlights, matches } = result;
  const relevance = Math.floor((score) * 100);

  const getIcon = () => {
    switch (type) {
      case 'project': return <FolderOutlined />;
      case 'file': return <InsertDriveFileOutlined />;
      case 'folder': return <FolderOpenOutlined />;
      case 'person': return <PersonOutline />;
      case 'asset':
      case 'external-asset': return <InsertDriveFileOutlined />;
      case 'note': return <NoteOutlined />;
      default: return <Description />;
    }
  };

  const getRelevanceColor = (relevance) => {
    if (relevance >= 80) return 'success';
    if (relevance >= 60) return 'warning';
    if (relevance >= 40) return 'info';
    return 'default';
  };

  const renderTags = () => {
    if (!item.tags || !Array.isArray(item.tags) || item.tags.length === 0) return null;

    return (
      <Box mt={1} display="flex" gap={0.5} flexWrap="wrap">
        {item.tags.slice(0, 5).map((tag, index) => (
          <Chip
            key={index}
            label={tag}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.7rem', height: 20 }}
          />
        ))}
        {item.tags.length > 5 && (
          <Chip
            label={`+${item.tags.length - 5} more`}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.7rem', height: 20 }}
          />
        )}
      </Box>
    );
  };

  const renderPrimaryContent = () => {
    const title = item.title || item.name || item.filename || item.folderName || 'Untitled';

    return (
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box display="flex" alignItems="center" sx={{ minWidth: 0, flexGrow: 1 }}>
          {getIcon()}
          <Box ml={1} sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="subtitle1" component="div" noWrap>
              {highlightText(String(title), searchTerm)}
            </Typography>
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <Typography variant="caption" color="textSecondary">
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                •
              </Typography>
              <Typography variant="caption" color="textSecondary" noWrap>
                {item.projectName || 'Unknown Project'}
              </Typography>
              {item.extension && (
                <>
                  <Typography variant="caption" color="textSecondary">•</Typography>
                  <Chip label={item.extension} size="small" variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />
                </>
              )}
              {item.size && (
                <>
                  <Typography variant="caption" color="textSecondary">•</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {item.size > 1024 * 1024 ?
                      `${(item.size / (1024 * 1024)).toFixed(1)} MB` :
                      `${Math.round(item.size / 1024)} KB`}
                  </Typography>
                </>
              )}
            </Box>
          </Box>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          {showRelevanceScores && (
            <Tooltip title={`Relevance Score: ${relevance}%`}>
              <Chip
                label={`${relevance}%`}
                size="small"
                variant="outlined"
                color={getRelevanceColor(relevance)}
              />
            </Tooltip>
          )}
          <IconButton size="small" onClick={onToggleExpand}>
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
      </Box>
    );
  };

  const renderSecondaryContent = () => {
    return (
      <>
        <Typography variant="body2" color="textSecondary" component="div" noWrap>
          {item.path || item.relativePath || 'No path'}
        </Typography>
        {renderTags()}
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box mt={2}>
            {renderExpandedContent()}
          </Box>
        </Collapse>
      </>
    );
  };

  const renderExpandedContent = () => {
    switch (type) {
      case 'project':
        return (
          <Box>
            {item.description && (
              <Typography variant="body2" paragraph>
                <strong>Description:</strong> {highlightText(String(item.description), searchTerm)}
              </Typography>
            )}
            {item.categories && Array.isArray(item.categories) && (
              <Typography variant="body2" paragraph>
                <strong>Categories:</strong> {item.categories.join(', ')}
              </Typography>
            )}
            <Box mt={1}>
              <Link to={`${routes.PROJECT}/${item.projectId}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                <Button size="small" variant="outlined">
                  Open Project
                </Button>
              </Link>
            </Box>
          </Box>
        );

      case 'file':
        return (
          <Box>
            <Box display="flex" gap={4} flexWrap="wrap" mb={2}>
              <Typography variant="body2">
                <strong>Size:</strong> {item.size ?
                  item.size > 1024 * 1024 ?
                    `${(item.size / (1024 * 1024)).toFixed(2)} MB` :
                    `${(item.size / 1024).toFixed(1)} KB`
                  : 'Unknown'}
              </Typography>
              <Typography variant="body2">
                <strong>Extension:</strong> {item.extension || 'None'}
              </Typography>
              <Typography variant="body2">
                <strong>Content Indexed:</strong> {item.isContentIndexed ? 'Yes' : 'No'}
              </Typography>
              {item.lastModified && (
                <Typography variant="body2">
                  <strong>Modified:</strong> {new Date(item.lastModified).toLocaleDateString()}
                </Typography>
              )}
            </Box>

            {item.snippet && (
              <Paper variant="outlined" sx={{ p: 1, mt: 1, fontFamily: 'monospace', fontSize: '0.85rem', maxHeight: 200, overflow: 'auto' }}>
                <Typography variant="caption" color="textSecondary" display="block" mb={1}>
                  Content Preview:
                </Typography>
                {highlightText(String(item.snippet), searchTerm)}
              </Paper>
            )}

            {highlights && highlights.content && (
              <Box mt={1}>
                <Typography variant="caption" color="primary">
                  {highlights.content.length} match(es) found in content
                </Typography>
              </Box>
            )}

            <Box mt={2} display="flex" gap={1}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  if (item.fullPath) {
                    ipcRenderer.send('show-item-in-folder', item.fullPath);
                  }
                }}
              >
                Show in Folder
              </Button>

              {item.fullPath && SearchConfig.integration && SearchConfig.integration.enableExternalTools && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    ipcRenderer.send('open-file-with-default', item.fullPath);
                  }}
                >
                  Open File
                </Button>
              )}
            </Box>
          </Box>
        );

      case 'person':
        return (
          <Box>
            {item.affiliation && (
              <Typography variant="body2" paragraph>
                <strong>Affiliation:</strong> {highlightText(String(item.affiliation), searchTerm)}
              </Typography>
            )}
            {item.roles && Array.isArray(item.roles) && (
              <Typography variant="body2" paragraph>
                <strong>Roles:</strong> {item.roles.join(', ')}
              </Typography>
            )}
            <Box mt={1}>
              <Link to={`${routes.PROJECT}/${item.projectId}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                <Button size="small" variant="outlined">
                  Go to Project
                </Button>
              </Link>
            </Box>
          </Box>
        );

      case 'note':
        return (
          <Box>
            <Typography variant="body2" paragraph>
              <strong>Note Type:</strong> {item.noteType || 'Unknown'}
            </Typography>

            {item.snippet && (
              <Paper variant="outlined" sx={{ p: 1, mt: 1, maxHeight: 150, overflow: 'auto' }}>
                <Typography variant="caption" color="textSecondary" display="block" mb={1}>
                  Note Content:
                </Typography>
                {highlightText(String(item.snippet), searchTerm)}
              </Paper>
            )}

            <Box mt={2}>
              <Link to={`${routes.PROJECT}/${item.projectId}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                <Button size="small" variant="outlined">
                  Go to Project
                </Button>
              </Link>
            </Box>
          </Box>
        );

      default:
        return (
          <Typography variant="body2">
            Additional details not available for this item type.
          </Typography>
        );
    }
  };

  return (
    <ResultItem alignItems="flex-start">
      <ListItemText
        primary={renderPrimaryContent()}
        secondary={renderSecondaryContent()}
      />
    </ResultItem>
  );
};

// metrc debug panel component
const DebugPanel = ({ searchService, searchStats, searchConfig, onStatsUpdate }) => {
  const [debugExpanded, setDebugExpanded] = useState(false);

  return (
    <Box mt={2} p={2} border={1} borderColor="grey.300" borderRadius={1}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Typography variant="h6">Debug Tools & Analytics</Typography>
        <IconButton size="small" onClick={() => setDebugExpanded(!debugExpanded)}>
          {debugExpanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      <Collapse in={debugExpanded}>
        <Box mt={2}>
          <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
            <Button
              onClick={() => {
                if (searchService.getSearchStats) {
                  const stats = searchService.getSearchStats();
                  console.log('Fuse.js Search Debug Info:', stats);
                  console.log('Document Store Size:', searchService.documentStore?.size || 0);

                  alert(`Fuse.js Search Statistics:
                    - Total Documents: ${stats.totalDocuments || 0}
                    - Projects: ${stats.documentsByType?.project || 0}
                    - Files: ${stats.documentsByType?.file || 0}
                    - Folders: ${stats.documentsByType?.folder || 0}
                    - People: ${stats.documentsByType?.person || 0}
                    - Assets: ${stats.documentsByType?.asset || 0}
                    - Notes: ${stats.documentsByType?.note || 0}
                    - Content-indexed files: ${stats.contentIndexedFiles || 0}
                    - Cache Size: ${stats.cacheStats?.size || 0}/${stats.cacheStats?.maxSize || 0}

                    Performance:
                    - Total Searches: ${stats.performance?.totalSearches || 0}
                    - Average Search Time: ${Math.round(stats.performance?.averageSearchTime || 0)}ms

                    Check console for more details.
                  `);
                } else {
                  alert('Search service not fully initialized yet.');
                }
              }}
              variant="outlined"
              size="small"
            >
              Show Stats
            </Button>

            <Button
              onClick={() => {
                onStatsUpdate();
                alert('Search statistics refreshed');
              }}
              variant="outlined"
              size="small"
            >
              Refresh Stats
            </Button>
          </Box>

          {searchStats && (
            <Box>
              <Typography variant="body2" gutterBottom>
                <strong>Current Statistics:</strong>
              </Typography>
              <Box display="flex" gap={4} flexWrap="wrap">
                <Box>
                  <Typography variant="caption" display="block">
                    Total Documents: {searchStats.totalDocuments || 0}
                  </Typography>
                  <Typography variant="caption" display="block">
                    Content-indexed files: {searchStats.contentIndexedFiles || 0}
                  </Typography>
                  <Typography variant="caption" display="block">
                    Indexed Projects: {searchStats.indexedProjects || 0}
                  </Typography>
                </Box>

                {searchStats.performance && (
                  <Box>
                    <Typography variant="caption" display="block">
                      <strong>Performance:</strong>
                    </Typography>
                    <Typography variant="caption" display="block">
                      Total Searches: {searchStats.performance.totalSearches}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Avg Search Time: {Math.round(searchStats.performance.averageSearchTime)}ms
                    </Typography>
                  </Box>
                )}

                {searchStats.cacheStats && (
                  <Box>
                    <Typography variant="caption" display="block">
                      <strong>Cache:</strong>
                    </Typography>
                    <Typography variant="caption" display="block">
                      Size: {searchStats.cacheStats.size}/{searchStats.cacheStats.maxSize}
                    </Typography>
                  </Box>
                )}
              </Box>

              {searchStats.documentsByType && (
                <Box mt={2}>
                  <Typography variant="caption" display="block">
                    <strong>Documents by Type:</strong>
                  </Typography>
                  <Box display="flex" gap={2} flexWrap="wrap">
                    {Object.entries(searchStats.documentsByType).map(([type, count]) => (
                      <Typography key={type} variant="caption" component="span">
                        {type}: {count}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

export default Search;