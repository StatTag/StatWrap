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
import ElasticSearchService from '../../services/ElasticSearchService';
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

function ElasticSearch() {
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
    console.log('ElasticSearch: Starting initialization');
    
    // Force enable after 3 seconds no matter what
    // const forceEnableTimer = setTimeout(() => {
    //   console.log('ElasticSearch: Force enabling interface');
    //   setIsInitializing(false);
    // }, 3000);

    // Request project list
    ipcRenderer.send(SafeMessages.LOAD_PROJECT_LIST_REQUEST);
    
    // Handle response
    const handleProjectResponse = async (event, response) => {
      console.log('ElasticSearch: Got project response, initializing service');
      
      try {
        if (response.projects) {
          await ElasticSearchService.initialize(response.projects);
          response.projects.forEach(project => {
            ElasticSearchService.queueProjectForContentIndexing(project);
          });
        }
      } catch (error) {
        console.error('Init error:', error);
      }
      
      console.log('ElasticSearch: Enabling interface');
      setIsInitializing(false);
      // clearTimeout(forceEnableTimer);
    };

    ipcRenderer.once(SafeMessages.LOAD_PROJECT_LIST_RESPONSE, handleProjectResponse);

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
    // const handleKeyDown = (event) => {
    //   if (SearchConfig.ui && SearchConfig.ui.enableKeyboardShortcuts) {
    //     if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
    //       event.preventDefault();
    //       searchInputRef.current?.focus();
    //     } else if (event.key === 'Escape' && searchTerm) {
    //       handleClearSearch();
    //     }
    //   }
    // };

    // document.addEventListener('keydown', handleKeyDown);

    return () => {
      // clearTimeout(forceEnableTimer);
      ipcRenderer.removeListener(SafeMessages.ENHANCED_SEARCH_INDEX_PROJECT_RESPONSE, handleIndexProjectResponse);
      ipcRenderer.removeListener(SafeMessages.ENHANCED_SEARCH_INDEX_ALL_RESPONSE, handleIndexAllResponse);
      ipcRenderer.removeListener(SafeMessages.ENHANCED_SEARCH_STATUS_RESPONSE, handleSearchStatusResponse);
      clearInterval(statusInterval);
      document.removeEventListener('keydown', handleKeyDown);
      if (searchTimeout) clearTimeout(searchTimeout);
    };
    
  }, 
  []);
  useEffect(() => {
  const checkInterval = setInterval(() => {
    if (isInitializing && ElasticSearchService) {
      console.log('Checking if service is ready...');
      console.log('Service isInitialized:', ElasticSearchService.isInitialized);
      console.log('Document store size:', ElasticSearchService.documentStore?.size || 0);
      
      // If service is initialized, stop showing initializing state
      if (ElasticSearchService.isInitialized) {
        console.log('Service is ready! Stopping initialization...');
        setIsInitializing(false);
      }
    }
  }, 2000); // Check every 2 seconds

  return () => clearInterval(checkInterval);
}, [isInitializing]);

// debug info 
{process.env.NODE_ENV === 'development' && (
  <Box sx={{ p: 1, mb: 1, backgroundColor: '#ffffcc', border: '1px solid #ccc' }}>
    <Typography variant="caption">
      DEBUG: isInitializing={String(isInitializing)} | 
      Service.isInitialized={String(ElasticSearchService?.isInitialized)} | 
      DocumentCount={ElasticSearchService?.documentStore?.size || 0}
    </Typography>
  </Box>
)};

  const updateSearchStats = useCallback(() => {
  try {
    if (ElasticSearchService && ElasticSearchService.getSearchStats) {
      const stats = ElasticSearchService.getSearchStats();
      setSearchStats(stats);
      
      // Log current stats for debugging
      // console.log('ElasticSearch: Updated stats:', {
      //   totalSearches: stats.performance?.totalSearches || 0,
      //   averageSearchTime: stats.performance?.averageSearchTime || 0,
      //   totalIndexingTime: stats.performance?.totalIndexingTime || 0,
      //   cacheHitRate: stats.cache?.hitRate || 0
      // });
    }
  } catch (error) {
    console.error('Error updating search stats:', error);
  }
}, []);
useEffect(() => {
  updateSearchStats();
  
  // periodic updates every 2 seconds when searches are active
  const statsInterval = setInterval(() => {
    updateSearchStats();
  }, 2000);

  return () => clearInterval(statsInterval);
}, [updateSearchStats]);

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

  console.log('ElasticSearch: Performing search for', query);
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
        results = ElasticSearchService.advancedSearch ? 
          ElasticSearchService.advancedSearch(query, searchOptions) :
          ElasticSearchService.search(query, searchOptions);
        break;
      case 'operators':
        results = ElasticSearchService.advancedSearch ? 
          ElasticSearchService.advancedSearch(query, searchOptions) :
          ElasticSearchService.search(query, searchOptions);
        break;
      default:
        results = ElasticSearchService.search(query, searchOptions);
    }

    console.log('ElasticSearch: Search results', results);
    
    const filteredResults = applyFilters(results);
    setSearchResults(filteredResults);

    const searchTime = Date.now() - searchStartTime;
    setLastSearchTime(searchTime);
    updateSearchStats();

    // Add to search history
    if (query.trim() && !searchHistory.includes(query.trim())) {
      const historySize = SearchConfig.ui ? SearchConfig.ui.searchHistorySize : 15;
      setSearchHistory(prev => [query.trim(), ...prev].slice(0, historySize));
    }

  } catch (error) {
    console.error('ElasticSearch: Search error', error);
    setSearchResults({
      projects: [],
      people: [],
      assets: [],
      files: [],
      folders: [],
      notes: [],
      all: []
    });
    
    // Update stats even on error
    updateSearchStats();
  }

  setIsSearching(false);
}, [searchFilters, searchHistory, searchMode, updateSearchStats]);

  const handleSearch = () => {
    performSearch(searchTerm);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Get suggestions
    if (SearchConfig.ui && SearchConfig.ui.enableSuggestions && value.length >= 2) {
      try {
        const newSuggestions = ElasticSearchService.getSuggestions ? 
          ElasticSearchService.getSuggestions(value) : [];
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

    if (value.trim()) {
      const debounceTime = SearchConfig.search ? SearchConfig.search.debounceTime : 300;
      const timeout = setTimeout(() => {
        performSearch(value);
      }, debounceTime);
      setSearchTimeout(timeout);
    } else {
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
      performSearch(searchTerm);
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
    console.log('ElasticSearch: Reindexing all projects');
    
    try {
      await ElasticSearchService.reindexAll();
      
      if (SafeMessages.ENHANCED_SEARCH_INDEX_ALL_REQUEST) {
        ipcRenderer.send(SafeMessages.ENHANCED_SEARCH_INDEX_ALL_REQUEST);
      }
      
      updateSearchStats();
    } catch (error) {
      console.error('ElasticSearch: Error during reindex:', error);
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
      const exportData = ElasticSearchService.exportIndex();
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `statwrap-search-index-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
    } catch (error) {
      console.error('ElasticSearch: Error exporting index:', error);
    }
  };

  const handleImportIndex = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result);
        ElasticSearchService.importIndex(importData);
        updateSearchStats();
        console.log('ElasticSearch: Successfully imported search index');
      } catch (error) {
        console.error('ElasticSearch: Error importing index:', error);
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
  const availableProjects = searchStats?.documentsByType && ElasticSearchService.projectsData ? 
    ElasticSearchService.projectsData : [];

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
          ElasticLunr Enhanced Search
          {SearchConfig.ui && SearchConfig.ui.showRelevanceScores && (
            <Chip size="small" label="Debug Mode" color="warning" sx={{ ml: 1 }} />
          )}
        </Typography>
        
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
                  placeholder="Search for projects, files, people, notes... (Ctrl+K to focus)"
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
                <strong>Search Operators:</strong> Use +term (required), -term (exclude), "exact phrase", 
                field:value (e.g., type:file, ext:py, project:myproject)
              </>
            )}
            {searchMode === 'advanced' && (
              <>
                <strong>Advanced Search:</strong> Enhanced relevance scoring with fuzzy matching and content analysis
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
                  <MenuItem value="project">Projects</MenuItem>
                  <MenuItem value="file">Files</MenuItem>
                  <MenuItem value="folder">Folders</MenuItem>
                  <MenuItem value="person">People</MenuItem>
                  <MenuItem value="asset">Assets</MenuItem>
                  <MenuItem value="note">Notes</MenuItem>
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
        <EnhancedDebugPanel 
          searchService={ElasticSearchService}
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

//  result item component with ElasticLunr features
const ResultItemComponent = ({ result, searchTerm, expanded, onToggleExpand, highlightText, showRelevanceScores }) => {
  if (!result || !result.item) {
    return null;
  }

  const { item, score, type, highlights, originalScore } = result;
  
  // Convert score (0-1) to percentage (0-100%)
  const relevancePercentage = Math.round((score || 0) * 100);

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

  const getRelevanceColor = (percentage) => {
    if (percentage >= 80) return 'success';
    if (percentage >= 60) return 'primary';
    if (percentage >= 40) return 'warning';
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
            <Tooltip 
              title={`Relevance: ${relevancePercentage}%${originalScore ? ` (Raw: ${originalScore.toFixed(2)})` : ''}`}
            >
              <Chip 
                label={`${relevancePercentage}%`} 
                size="small" 
                variant="outlined"
                color={getRelevanceColor(relevancePercentage)}
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
            {item.metadata && (
              <Box mb={2}>
                <Typography variant="body2">
                  <strong>Project Stats:</strong>
                </Typography>
                <Box ml={2}>
                  <Typography variant="caption" display="block">
                    People: {item.metadata.peopleCount || 0}
                  </Typography>
                  <Typography variant="caption" display="block">
                    Assets: {item.metadata.assetCount || 0}
                  </Typography>
                  <Typography variant="caption" display="block">
                    External Assets: {item.metadata.externalAssetCount || 0}
                  </Typography>
                </Box>
              </Box>
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
            {item.metadata && item.metadata.noteCount > 0 && (
              <Typography variant="body2" paragraph>
                <strong>Notes:</strong> {item.metadata.noteCount} note(s)
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
            
            {item.metadata && item.metadata.contentLength && (
              <Typography variant="caption" color="textSecondary" display="block" mt={1}>
                Content Length: {item.metadata.contentLength} characters
              </Typography>
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

      case 'folder':
        return (
          <Box>
            <Typography variant="body2" paragraph>
              <strong>Relative Path:</strong> {item.relativePath || 'Unknown'}
            </Typography>
            
            {item.metadata && (
              <Typography variant="body2" paragraph>
                <strong>Folder Depth:</strong> {item.metadata.depth || 'Unknown'}
              </Typography>
            )}
            
            <Box mt={1}>
              <Button 
                size="small" 
                variant="outlined"
                onClick={() => {
                  if (item.fullPath) {
                    ipcRenderer.send('show-item-in-folder', item.fullPath);
                  }
                }}
              >
                Open Folder
              </Button>
            </Box>
          </Box>
        );

      case 'asset':
      case 'external-asset':
        return (
          <Box>
            {item.uri && (
              <Typography variant="body2" noWrap paragraph>
                <strong>URI:</strong> {item.uri}
              </Typography>
            )}
            
            {item.attributes && Object.keys(item.attributes).length > 0 && (
              <Box mt={1} mb={2}>
                <Typography variant="body2">
                  <strong>Attributes:</strong>
                </Typography>
                <Box ml={2}>
                  {Object.entries(item.attributes).slice(0, 5).map(([key, value]) => (
                    <Typography key={key} variant="caption" display="block">
                      {key}: {String(value)}
                    </Typography>
                  ))}
                  {Object.keys(item.attributes).length > 5 && (
                    <Typography variant="caption" color="textSecondary">
                      ... and {Object.keys(item.attributes).length - 5} more attributes
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
            
            {item.metadata && item.metadata.noteCount > 0 && (
              <Typography variant="body2" paragraph>
                <strong>Notes:</strong> {item.metadata.noteCount} note(s)
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

//  debug panel component
const EnhancedDebugPanel = ({ searchService, searchStats, searchConfig, onStatsUpdate }) => {
  const [debugExpanded, setDebugExpanded] = useState(false);
  const [liveStats, setLiveStats] = useState(null);

  // Update live stats every second when panel is open
  useEffect(() => {
    if (!debugExpanded) return;
    
    const updateLiveStats = () => {
      if (searchService?.getSearchStats) {
        const stats = searchService.getSearchStats();
        setLiveStats(stats);
      }
    };
    
    updateLiveStats(); // Initial update
    const interval = setInterval(updateLiveStats, 1000); // Update every second
    
    return () => clearInterval(interval);
  }, [debugExpanded, searchService]);

  const currentStats = liveStats || searchStats;

  return (
    <Box mt={2} p={2} border={1} borderColor="grey.300" borderRadius={1}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Typography variant="h6">
          Debug Tools & Analytics 
          {currentStats?.performance?.totalSearches > 0 && (
            <Chip 
              size="small" 
              label={`${currentStats.performance.totalSearches} searches`} 
              color="primary" 
              sx={{ ml: 1 }} 
            />
          )}
        </Typography>
        <IconButton size="small" onClick={() => setDebugExpanded(!debugExpanded)}>
          {debugExpanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>
      
      <Collapse in={debugExpanded}>
        <Box mt={2}>
          <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
            <Button
              onClick={() => {
                const testQueries = ['test', 'project', 'hackathon', 'data', 'analysis'];
                console.log('Running test searches to verify performance tracking...');
                
                testQueries.forEach((testQuery, index) => {
                  setTimeout(() => {
                    console.log(`Test search ${index + 1}: "${testQuery}"`);
                    searchService.search(testQuery);
                    onStatsUpdate();
                  }, index * 500);
                });
                
                alert('Running 5 test searches to verify performance tracking. Check stats in 3 seconds.');
              }}
              variant="outlined"
              size="small"
            >
              Test Search Performance
            </Button>
            
            <Button
              onClick={() => {
                if (searchService.getSearchStats) {
                  const stats = searchService.getSearchStats();
                  console.log('ElasticLunr Search Debug Info:', stats);
                  console.log('Document Store Size:', searchService.documentStore?.size || 0);
                  console.log('Performance Tracking:', searchService.performanceStats);

                  alert(`ElasticLunr Search Statistics:
                    - Total Documents: ${stats.totalDocuments || 0}
                    - Content-indexed Files: ${stats.contentIndexedFiles || 0}
                    - Projects: ${stats.documentsByType?.project || 0}
                    - Files: ${stats.documentsByType?.file || 0}
                    
                    Performance (Live):
                    - Total Searches: ${stats.performance?.totalSearches || 0}
                    - Average Search Time: ${stats.performance?.averageSearchTime || 0}ms
                    - Total Indexing Time: ${stats.performance?.totalIndexingTimeFormatted || '0ms'}
                    - Indexing Speed: ${stats.performance?.indexingSpeed || 0} docs/sec
                    - Cache Hit Rate: ${stats.cache?.hitRate || 0}%

                    Check console for detailed performance data.
                  `);
                } else {
                  alert('Search service not fully initialized yet.');
                }
              }}
              variant="outlined"
              size="small"
            >
              Show Live Stats
            </Button>
            
            <Button
              onClick={() => {
                onStatsUpdate();
                if (searchService?.updateSearchStats) {
                  searchService.updateSearchStats(0, 'manual-refresh', 0, false);
                }
                alert('Search statistics refreshed');
              }}
              variant="outlined"
              size="small"
            >
              Force Refresh
            </Button>

            <Button
              onClick={() => {
                if (searchService.clearCaches) {
                  searchService.clearCaches();
                  onStatsUpdate();
                  alert('Caches cleared successfully');
                }
              }}
              variant="outlined"
              size="small"
            >
              Clear Cache
            </Button>
          </Box>
          
          {currentStats && (
            <Box>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Current Statistics: (Live Updated)
              </Typography>
              
              <Box display="flex" gap={4} flexWrap="wrap" mb={2}>
                {/* Basic Stats */}
                <Box>
                  <Typography variant="caption" display="block">
                    Total Documents: {currentStats.totalDocuments || 0}
                  </Typography>
                  <Typography variant="caption" display="block">
                    Content-indexed Files: {currentStats.contentIndexedFiles || 0}
                  </Typography>
                  <Typography variant="caption" display="block">
                    Indexed Projects: {currentStats.indexedProjects || 0}
                  </Typography>
                  <Typography variant="caption" display="block">
                    Indexing: {currentStats.indexingInProgress ? 'In Progress' : 'Idle'}
                  </Typography>
                  <Typography variant="caption" display="block">
                    Queue: {currentStats.queueLength || 0} projects
                  </Typography>
                </Box>
                
                {/* Performance Stats - Live */}
                {currentStats.performance && (
                  <Box>
                    <Typography variant="caption" display="block" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      Performance: (Live)
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ color: currentStats.performance.totalSearches > 0 ? 'success.main' : 'text.secondary' }}>
                      Total Searches: {currentStats.performance.totalSearches || 0}
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ color: currentStats.performance.averageSearchTime > 0 ? 'success.main' : 'text.secondary' }}>
                      Avg Search Time: {currentStats.performance.averageSearchTime || 0}ms
                    </Typography>
                    <Typography variant="caption" display="block">
                      Total Indexing Time: {currentStats.performance.totalIndexingTimeFormatted || Math.round(currentStats.performance.totalIndexingTime || 0) + 'ms'}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Indexing Speed: {currentStats.performance.indexingSpeed || 0} docs/sec
                    </Typography>
                    <Typography variant="caption" display="block">
                      Documents Indexed: {currentStats.performance.documentsIndexed || 0}
                    </Typography>
                  </Box>
                )}
                
                {/* Cache Stats */}
                {currentStats.cache && (
                  <Box>
                    <Typography variant="caption" display="block" sx={{ fontWeight: 'bold' }}>
                      Cache:
                    </Typography>
                    <Typography variant="caption" display="block">
                      Size: {currentStats.cache.size || 0}/{currentStats.cache.maxSize || 100}
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ color: currentStats.cache.hitRate > 0 ? 'success.main' : 'text.secondary' }}>
                      Hit Rate: {currentStats.cache.hitRate || 0}%
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Recent Search Activity */}
              {currentStats.performance?.recentSearches && currentStats.performance.recentSearches.length > 0 && (
                <Box mt={2}>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Recent Search Activity:
                  </Typography>
                  {currentStats.performance.recentSearches.slice(0, 5).map((search, index) => (
                    <Typography key={index} variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
                      "{search.query}" - {search.resultCount} results in {search.searchTime}ms {search.wasCached ? '[cached]' : ''}
                    </Typography>
                  ))}
                </Box>
              )}
              
              {/* Documents by Type */}
              {currentStats.documentsByType && (
                <Box mt={2}>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Documents by Type:
                  </Typography>
                  <Box display="flex" gap={2} flexWrap="wrap">
                    {Object.entries(currentStats.documentsByType).map(([type, count]) => (
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
export default ElasticSearch;