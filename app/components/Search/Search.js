import React, { useState, useEffect, useCallback } from 'react';
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
  Switch,
  FormControlLabel
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
  BugReportOutlined,
  VisibilityOutlined,
  VisibilityOffOutlined
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { ipcRenderer } from 'electron';
import routes from '../../constants/routes.json';
import SearchService from '../../services/SearchService';
import Messages from '../../constants/messages';

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

function EnhancedSearch() {
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
    dateRange: 'all'
  });
  const [searchHistory, setSearchHistory] = useState([]);
  const [searchStats, setSearchStats] = useState(null);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false); 

  useEffect(() => {
    console.log('EnhancedSearch: Initializing search component');
    setIsInitializing(true);

    ipcRenderer.send(Messages.LOAD_PROJECT_LIST_REQUEST);
    ipcRenderer.once(Messages.LOAD_PROJECT_LIST_RESPONSE, (event, response) => {
      console.log('EnhancedSearch: Received project list response', response);
      if (!response.error && response.projects) {
        SearchService.initialize(response.projects);

        response.projects.forEach(project => {
          SearchService.queueProjectForContentIndexing(project);
        });

        updateSearchStats();
      } else {
        console.error('EnhancedSearch: Error loading projects', response.errorMessage);
      }
      setIsInitializing(false);
    });

    // Set up listeners for search messages
    const handleIndexProjectResponse = (event, response) => {
      setIndexingStatus(response.status);
    };

    const handleIndexAllResponse = (event, response) => {
      setIndexingStatus(response.status);
    };

    const handleSearchStatusResponse = (event, response) => {
      setIndexingStatus(response.status);
    };

    ipcRenderer.on(Messages.SEARCH_INDEX_PROJECT_RESPONSE, handleIndexProjectResponse);
    ipcRenderer.on(Messages.SEARCH_INDEX_ALL_RESPONSE, handleIndexAllResponse);
    ipcRenderer.on(Messages.SEARCH_STATUS_RESPONSE, handleSearchStatusResponse);

    // Check indexing status periodically
    const statusInterval = setInterval(() => {
      ipcRenderer.send(Messages.SEARCH_STATUS_REQUEST);
      updateSearchStats();
    }, 5000);

    return () => {
      ipcRenderer.removeListener(Messages.SEARCH_INDEX_PROJECT_RESPONSE, handleIndexProjectResponse);
      ipcRenderer.removeListener(Messages.SEARCH_INDEX_ALL_RESPONSE, handleIndexAllResponse);
      ipcRenderer.removeListener(Messages.SEARCH_STATUS_RESPONSE, handleSearchStatusResponse);
      clearInterval(statusInterval);
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  }, []);

  const updateSearchStats = useCallback(() => {
    if (SearchService.getSearchStats) {
      const stats = SearchService.getSearchStats();
      setSearchStats(stats);
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

    console.log('EnhancedSearch: Performing search for', query);
    setIsSearching(true);

    try {
      const results = SearchService.search(query);
      console.log('EnhancedSearch: Search results', results);
      
      const filteredResults = applyFilters(results);
      setSearchResults(filteredResults);

      if (query.trim() && !searchHistory.includes(query.trim())) {
        setSearchHistory(prev => [query.trim(), ...prev].slice(0, 10));
      }
    } catch (error) {
      console.error('EnhancedSearch: Search error', error);
    }

    setIsSearching(false);
  }, [searchFilters, searchHistory]);

  const handleSearch = () => {
    performSearch(searchTerm);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (value.trim()) {
      const timeout = setTimeout(() => {
        performSearch(value);
      }, 300);
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
    }
  };

  const applyFilters = (results) => {
    let filtered = { ...results };

    if (searchFilters.type !== 'all') {
      Object.keys(filtered).forEach(key => {
        if (key !== 'all' && key !== searchFilters.type) {
          filtered[key] = [];
        }
      });
      filtered.all = filtered.all.filter(result => result.type === searchFilters.type);
    }

    if (searchFilters.project !== 'all') {
      Object.keys(filtered).forEach(key => {
        filtered[key] = filtered[key].filter(result => 
          result.item && result.item.projectId === searchFilters.project
        );
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

  const handleReindexAll = () => {
    console.log('EnhancedSearch: Reindexing all projects');
    if (SearchService.reindexAll) {
      SearchService.reindexAll();
    }
    // Safety check before sending IPC message
    if (SafeMessages.ENHANCED_SEARCH_INDEX_ALL_REQUEST) {
      ipcRenderer.send(SafeMessages.ENHANCED_SEARCH_INDEX_ALL_REQUEST);
    } else {
      console.warn('SafeMessages.ENHANCED_SEARCH_INDEX_ALL_REQUEST is undefined');
    }
    updateSearchStats();
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
    if (searchTimeout) clearTimeout(searchTimeout);
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

  return (
    <SearchContainer elevation={2}>
      <SearchHeader>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">
            Lunr Search
          </Typography>
          
          {/* Debug Panel Toggle */}
          <Box display="flex" alignItems="center" gap={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={showDebugPanel}
                  onChange={(e) => setShowDebugPanel(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Box display="flex" alignItems="center" gap={0.5}>
                  <BugReportOutlined fontSize="small" />
                  Debug Panel
                </Box>
              }
              labelPlacement="start"
            />
          </Box>
        </Box>
        
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Autocomplete
            freeSolo
            options={searchHistory}
            value={searchTerm}
            onInputChange={(event, newValue) => {
              setSearchTerm(newValue || '');
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                variant="outlined"
                placeholder="Search for projects, files, people, notes, or content..."
                onKeyUp={handleSearchKeyUp}
                onChange={handleSearchChange}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <Box display="flex" alignItems="center">
                      {searchTerm && (
                        <IconButton size="small" onClick={handleClearSearch}>
                          <ClearOutlined />
                        </IconButton>
                      )}
                      <IconButton
                        onClick={handleSearch}
                        disabled={!searchTerm.trim() || isSearching}
                      >
                        {isSearching ? <CircularProgress size={24} /> : <SearchIcon />}
                      </IconButton>
                    </Box>
                  )
                }}
              />
            )}
            sx={{ flexGrow: 1 }}
          />
          
          <Button
            startIcon={<SettingsOutlined />}
            onClick={handleReindexAll}
            variant="outlined"
            disabled={indexingStatus.inProgress}
          >
            REINDEX
          </Button>
        </Box>

        <SearchFilters>
          <FilterListOutlined color="action" />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={searchFilters.type}
              label="Type"
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

          {searchStats && (
            <Tooltip title={`Total: ${searchStats.totalDocuments} documents indexed`}>
              <Chip
                icon={<TrendingUpOutlined />}
                label={`↗️ ${searchStats.totalDocuments} docs`}
                size="small"
                variant="outlined"
              />
            </Tooltip>
          )}
        </SearchFilters>

        {indexingStatus.inProgress && (
          <Box display="flex" alignItems="center" mt={1}>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            <Typography variant="body2">
              Indexing in progress... {indexingStatus.queueLength} projects in queue
            </Typography>
          </Box>
        )}

        {isInitializing && (
          <Box display="flex" alignItems="center" mt={1}>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            <Typography variant="body2">
              Initializing search...
            </Typography>
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
        <TabPanel value={activeTab} index={0}>
          <AllResultsList 
            results={searchResults.all} 
            searchTerm={searchTerm}
            expandedItems={expandedItems}
            onToggleExpand={handleToggleExpand}
            highlightText={highlightText}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <ResultsList 
            results={searchResults.projects}
            searchTerm={searchTerm}
            expandedItems={expandedItems}
            onToggleExpand={handleToggleExpand}
            highlightText={highlightText}
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
            emptyMessage={`No note results found for "${searchTerm}"`}
          />
        </TabPanel>
      </SearchResults>

      {/* Collapsible Debug Panel - only show in development */}
      {process.env.NODE_ENV === 'development' && (
        <Collapse in={showDebugPanel} timeout="auto">
          <EnhancedDebugPanel 
            searchService={SearchService}
            searchStats={searchStats}
            onStatsUpdate={updateSearchStats}
          />
        </Collapse>
      )}
    </SearchContainer>
  );
}

// Enhanced Debug panel component with indexing speed
const EnhancedDebugPanel = ({ searchService, searchStats, onStatsUpdate }) => {
  const [debugData, setDebugData] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [showPerformanceData, setShowPerformanceData] = useState(false);

  const refreshDebugData = () => {
    if (searchService?.getDebugInfo) {
      setDebugData(searchService.getDebugInfo());
    }
    if (searchService?.runDiagnostics) {
      setDiagnostics(searchService.runDiagnostics());
    }
    onStatsUpdate();
  };

  const clearCache = () => {
    if (searchService?.clearCache) {
      searchService.clearCache();
      refreshDebugData();
      alert('Search cache cleared successfully');
    }
  };

  const exportPerformanceData = () => {
    if (searchService?.exportPerformanceData) {
      const data = searchService.exportPerformanceData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `search-performance-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const runDiagnostics = () => {
    if (searchService?.runDiagnostics) {
      const results = searchService.runDiagnostics();
      setDiagnostics(results);
      
      const status = results.overall;
      const message = `Diagnostics completed: ${results.summary}\nOverall status: ${status.toUpperCase()}`;
      
      if (status === 'healthy') {
        alert(`✅ ${message}`);
      } else if (status === 'warning') {
        alert(`⚠️ ${message}\n\nCheck console for details.`);
      } else {
        alert(`❌ ${message}\n\nCheck console for errors.`);
      }
      
      console.log('Search Service Diagnostics:', results);
    }
  };

  // Calculate indexing speed
  const calculateIndexingSpeed = () => {
    if (!searchStats?.performance?.totalIndexingTime || !searchStats?.performance?.documentsIndexed) {
      return 0;
    }
    
    // Documents per second
    const docsPerSecond = (searchStats.performance.documentsIndexed / (searchStats.performance.totalIndexingTime / 1000));
    return Math.round(docsPerSecond * 100) / 100; 
  };

  useEffect(() => {
    refreshDebugData();
  }, [searchService]);

  return (
    <Box mt={2} p={2} border={1} borderColor="grey.300" borderRadius={1}>
      <Typography variant="h6" gutterBottom>
        Debug Tools & Analytics
      </Typography>
      
      {/* Main Action Buttons */}
      <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
        <Button
          onClick={refreshDebugData}
          variant="outlined"
          size="small"
          startIcon={<TrendingUpOutlined />}
        >
          REFRESH STATS
        </Button>
        
        <Button
          onClick={clearCache}
          variant="outlined"
          size="small"
          startIcon={<ClearOutlined />}
        >
          CLEAR CACHE
        </Button>

        <Button
          onClick={runDiagnostics}
          variant="outlined"
          size="small"
          startIcon={<SettingsOutlined />}
        >
          RUN DIAGNOSTICS
        </Button>

        <Button
          onClick={exportPerformanceData}
          variant="outlined"
          size="small"
          startIcon={<TrendingUpOutlined />}
        >
          EXPORT DATA
        </Button>

        <Button
          onClick={() => setShowPerformanceData(!showPerformanceData)}
          variant="outlined"
          size="small"
        >
          SHOW PERFORMANCE DETAILS
        </Button>
      </Box>

      {/* Current Statistics */}
      {searchStats && (
        <Box mb={3}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
            Current Statistics:
          </Typography>
          
          <Box display="flex" flexWrap="wrap" gap={4}>
            {/* Basic Stats */}
            <Box>
              <Typography variant="body2" gutterBottom>
                Total Documents: {searchStats.totalDocuments || 0}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Content-indexed Files: {searchStats.contentIndexedFiles || 0}
              </Typography>
              <Typography variant="body2">
                Indexed Projects: {searchStats.indexedProjects || 0}
              </Typography>
            </Box>

            {/* Performance Stats */}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }} gutterBottom>
                Performance:
              </Typography>
              <Typography variant="body2" gutterBottom>
                Total Searches: {searchStats.performance?.totalSearches || 0}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Avg Search Time: {searchStats.performance?.averageSearchTime || 0}ms
              </Typography>
              <Typography variant="body2">
                Indexing Speed: {calculateIndexingSpeed()} docs/sec
              </Typography>
            </Box>

            {/* Cache Stats */}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }} gutterBottom>
                Cache:
              </Typography>
              <Typography variant="body2" gutterBottom>
                Size: {searchStats.cache?.size || 0}/{searchStats.cache?.maxSize || 100}
              </Typography>
              <Typography variant="body2">
                Hit Rate: {searchStats.cache?.hitRate || 0}%
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* Documents by Type */}
      {searchStats?.documentsByType && (
        <Box mb={3}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
            Documents by Type:
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            {Object.entries(searchStats.documentsByType).map(([type, count]) => (
              <Typography key={type} variant="body2">
                {type}: {count}
              </Typography>
            ))}
          </Box>
        </Box>
      )}

      {/* Configuration */}
      {searchStats?.configuration && (
        <Box mb={3}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
            Configuration:
          </Typography>
          <Typography variant="body2">
            Max File Size: {searchStats.configuration.maxFileSize}
          </Typography>
          <Typography variant="body2">
            Indexable Extensions: {searchStats.configuration.indexableExtensions}
          </Typography>
          <Typography variant="body2">
            Enable Fuzzy Search: {searchStats.configuration.enableFuzzySearch ? 'Yes' : 'No'}
          </Typography>
          <Typography variant="body2">
            Enable Suggestions: {searchStats.configuration.enableSuggestions ? 'Yes' : 'No'}
          </Typography>
        </Box>
      )}

      {/* Performance Details */}
      {showPerformanceData && searchStats?.performance && (
        <Collapse in={showPerformanceData}>
          <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
            <Typography variant="subtitle2" gutterBottom>
              Performance Details:
            </Typography>
            <Typography variant="caption" component="div">
              Total Indexing Time: {searchStats.performance.totalIndexingTime}ms
            </Typography>
            <Typography variant="caption" component="div">
              Documents Indexed: {searchStats.performance.documentsIndexed}
            </Typography>
            <Typography variant="caption" component="div">
              Indexing Speed: {calculateIndexingSpeed()} docs/sec
            </Typography>
            <Typography variant="caption" component="div">
              Error Count: {searchStats.performance.errorCount}
            </Typography>
            
            {searchStats.recentSearches && searchStats.recentSearches.length > 0 && (
              <Box mt={1}>
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                  Recent Searches:
                </Typography>
                {searchStats.recentSearches.slice(0, 5).map((search, index) => (
                  <Typography key={index} variant="caption" component="div" sx={{ ml: 1 }}>
                    "{search.query}" - {search.resultCount} results ({search.searchTime}ms)
                    {search.cached && ' [cached]'}
                  </Typography>
                ))}
              </Box>
            )}

            {searchStats.recentIndexing && searchStats.recentIndexing.length > 0 && (
              <Box mt={1}>
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                  Recent Indexing:
                </Typography>
                {searchStats.recentIndexing.slice(0, 3).map((indexing, index) => (
                  <Typography key={index} variant="caption" component="div" sx={{ ml: 1 }}>
                    Project {indexing.projectId}: +{indexing.documentsAdded} docs ({indexing.indexingTime}ms)
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        </Collapse>
      )}

      {/* Diagnostics Results */}
      {diagnostics && (
        <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
          <Typography variant="subtitle2" gutterBottom>
            Diagnostics ({diagnostics.timestamp}):
          </Typography>
          <Typography variant="body2" gutterBottom>
            Overall Status: 
            <Chip 
              label={diagnostics.overall.toUpperCase()} 
              size="small"
              color={
                diagnostics.overall === 'healthy' ? 'success' :
                diagnostics.overall === 'warning' ? 'warning' : 'error'
              }
              sx={{ ml: 1 }}
            />
          </Typography>
          <Typography variant="body2" gutterBottom>
            {diagnostics.summary}
          </Typography>

          {Object.entries(diagnostics.tests).map(([testName, result]) => (
            <Typography 
              key={testName} 
              variant="caption" 
              component="div"
              color={result.passed ? 'success.main' : 'error.main'}
            >
              {result.passed ? '✓' : '✗'} {testName}: {result.message}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
};

// Result list components 
const AllResultsList = ({ results, searchTerm, expandedItems, onToggleExpand, highlightText }) => {
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
              {groupedResults[type].slice(0, 5).map((result, index) => (
                <ResultItemComponent
                  key={`${type}-${index}`}
                  result={result}
                  searchTerm={searchTerm}
                  expanded={expandedItems[`${type}-${index}`]}
                  onToggleExpand={() => onToggleExpand(`${type}-${index}`)}
                  highlightText={highlightText}
                />
              ))}
              {groupedResults[type].length > 5 && (
                <Box mt={1} ml={2}>
                  <Typography variant="body2" color="textSecondary">
                    ... and {groupedResults[type].length - 5} more {typeLabels[type].toLowerCase()}
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

const ResultsList = ({ results, searchTerm, expandedItems, onToggleExpand, highlightText, emptyMessage }) => {
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
        />
      ))}
    </List>
  );
};

// Universal result item component 
const ResultItemComponent = ({ result, searchTerm, expanded, onToggleExpand, highlightText }) => {
  if (!result || !result.item) {
    return null;
  }

  const { item, score, type } = result;
  const relevance = Math.floor((score || 0) * 100);

  const getIcon = () => {
    switch (type) {
      case 'project': return <FolderOutlined />;
      case 'file': return <InsertDriveFileOutlined />;
      case 'folder': return <FolderOpenOutlined />;
      case 'person': return <PersonOutline />;
      case 'asset': return <InsertDriveFileOutlined />;
      case 'note': return <NoteOutlined />;
      default: return <Description />;
    }
  };

  const renderPrimaryContent = () => {
    const title = item.title || item.name || item.filename || item.folderName || 'Untitled';
    
    return (
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box display="flex" alignItems="center">
          {getIcon()}
          <Box ml={1}>
            <Typography variant="subtitle1" component="div">
              {highlightText(String(title), searchTerm)}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {type.charAt(0).toUpperCase() + type.slice(1)} • {item.projectName || 'Unknown Project'}
            </Typography>
          </Box>
        </Box>
        <Box display="flex" alignItems="center">
          <Chip 
            label={`${Math.round((score || 0))}`} 
            size="small" 
            variant="outlined"
            color={
              (score || 0) >= 0.8 ? 'success' :
              (score || 0) >= 0.6 ? 'primary' :
              (score || 0) >= 0.4 ? 'warning' : 'default'
            }
            sx={{ mr: 1 }}
          />
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
        <Typography variant="body2" color="textSecondary" component="div">
          {item.path || item.relativePath || 'No path'}
        </Typography>
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box mt={1}>
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
              <Typography variant="body2">
                <strong>Categories:</strong> {item.categories.join(', ')}
              </Typography>
            )}
            <Box mt={1}>
              <Link to={`${routes.PROJECT}/${item.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
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
            <Typography variant="body2">
              <strong>Size:</strong> {item.size ? `${(item.size / 1024).toFixed(1)} KB` : 'Unknown'}
            </Typography>
            <Typography variant="body2">
              <strong>Extension:</strong> {item.extension || 'None'}
            </Typography>
            <Typography variant="body2">
              <strong>Content Indexed:</strong> {item.isContentIndexed ? 'Yes' : 'No'}
            </Typography>
            {item.snippet && (
              <Paper variant="outlined" sx={{ p: 1, mt: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                {highlightText(String(item.snippet), searchTerm)}
              </Paper>
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
                Show in Folder
              </Button>
            </Box>
          </Box>
        );

      case 'person':
        return (
          <Box>
            {item.affiliation && (
              <Typography variant="body2">
                <strong>Affiliation:</strong> {highlightText(String(item.affiliation), searchTerm)}
              </Typography>
            )}
            {item.roles && Array.isArray(item.roles) && (
              <Typography variant="body2">
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
            <Typography variant="body2">
              <strong>Note Type:</strong> {item.noteType || 'Unknown'}
            </Typography>
            {item.snippet && (
              <Paper variant="outlined" sx={{ p: 1, mt: 1 }}>
                {highlightText(String(item.snippet), searchTerm)}
              </Paper>
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

      case 'folder':
        return (
          <Box>
            <Typography variant="body2">
              <strong>Relative Path:</strong> {item.relativePath || 'Unknown'}
            </Typography>
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
        return (
          <Box>
            {item.uri && (
              <Typography variant="body2" noWrap>
                <strong>URI:</strong> {item.uri}
              </Typography>
            )}
            {item.attributes && Object.keys(item.attributes).length > 0 && (
              <Box mt={1} mb={1}>
                <Typography variant="body2">
                  <strong>Attributes:</strong>
                </Typography>
                <List dense>
                  {Object.entries(item.attributes).map(([key, value]) => (
                    <ListItem key={key} sx={{ pl: 0 }}>
                      <ListItemText primary={`${key}: ${value}`} />
                    </ListItem>
                  ))}
                </List>
              </Box>
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

export default EnhancedSearch;