import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
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
  Alert,
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
  CommentOutlined,
  FolderOpenOutlined,
  TrendingUpOutlined,
  FilterListOutlined,
  ClearOutlined,
  TuneOutlined,
  SearchOutlined,
  AutoAwesomeOutlined,
  SpeedOutlined,
  MemoryOutlined,
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { ipcRenderer } from 'electron';
import routes from '../../constants/routes.json';
import SettingsContext from '../../contexts/Settings';
import SearchService from '../../services/SearchService';
import SearchConfig from '../../constants/search-config';
import Messages from '../../constants/messages';

const SearchContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  margin: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  height: 'calc(100vh - 100px)',
  overflow: 'auto',
}));

const SearchHeader = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

const SearchFilters = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(2),
  flexWrap: 'wrap',
  alignItems: 'center',
}));

const SearchResults = styled(Box)({
  flexGrow: 1,
});

const ResultItem = styled(ListItem)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const HighlightedText = styled('span')(({ theme }) => ({
  backgroundColor: theme.palette.warning.light,
  fontWeight: 'bold',
  padding: '0 2px',
  borderRadius: 2,
}));

const AdvancedSearchPanel = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  padding: theme.spacing(2),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default,
}));

const PerformancePanel = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
  padding: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.grey[50],
}));

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`search-tabpanel-${index}`}
      aria-labelledby={`search-tab-${index}`}
      {...other}
    >
      {value === index && <Box p={1}>{children}</Box>}
    </div>
  );
};

const Search = (props) => {
  const { searchSettings } = useContext(SettingsContext);

  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState({
    projects: [],
    people: [],
    assets: [],
    files: [],
    folders: [],
    notes: [],
    all: [],
  });
  const [activeTab, setActiveTab] = useState(0);
  const [expandedItems, setExpandedItems] = useState({});
  const [isInitializing, setIsInitializing] = useState(true);
  const [indexingStatus, setIndexingStatus] = useState({
    inProgress: false,
    projectId: null,
    queueLength: 0,
  });
  const [indexFileInfo, setIndexFileInfo] = useState({ exists: false, path: null, size: 0 });
  const [lastUpdateInfo, setLastUpdateInfo] = useState({ added: 0, removed: 0, updated: 0 });

  const [searchFilters, setSearchFilters] = useState({
    type: 'all',
    project: 'all',
    fileType: 'all',
  });
  const [searchHistory, setSearchHistory] = useState([]);
  const [searchStats, setSearchStats] = useState(null);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showPerformanceMetrics, setShowPerformanceMetrics] = useState(false);
  const [lastSearchTime, setLastSearchTime] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchInputRef = useRef(null);

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
    console.log('Search: Starting initialization with persistent indexing');

    const handleSearchIndexStatusResponse = async (event, response) => {
      console.log('Search: Got search status response, initializing service with persistent index');

      try {
        if (!response.error) {
          setSearchStats(response.stats);
          setIndexFileInfo(response.info);
        }
      } catch (error) {
        console.error('Init error:', error);
      }
      // Enable interface
      console.log('Search: Enabling interface');
      setIsInitializing(false);
    };

    const handleSearchResponse = async (event, response) => {
      console.log('Search response: ', response);

      if (!response.error) {
        const filteredResults = applyFilters(response.results);
        setSearchResults(filteredResults);
        setLastSearchTime(response.searchTime);
      }
    }

    ipcRenderer.on(Messages.SEARCH_INDEX_STATUS_RESPONSE, handleSearchIndexStatusResponse);
    ipcRenderer.on(Messages.SEARCH_RESPONSE, handleSearchResponse);

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
      ipcRenderer.removeListener(Messages.SEARCH_INDEX_REINDEX_RESPONSE, handleSearchIndexStatusResponse);
      ipcRenderer.removeListener(Messages.SEARCH_RESPONSE, handleSearchResponse);

      document.removeEventListener('keydown', handleKeyDown);
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  }, []);

  const updateSearchStats = useCallback(() => {
    try {
      //if (SearchService && SearchService.getSearchStats) {
        //const stats = SearchService.getSearchStats();
        //setSearchStats(stats);
      //}
    } catch (error) {
      console.error('Error updating search stats:', error);
    }
  }, []);

  const updateIndexFileInfo = useCallback(() => {
    try {
      //if (SearchService && SearchService.getIndexFileInfo) {
        //const info = SearchService.getIndexFileInfo();
        //setIndexFileInfo(info);
      //}
    } catch (error) {
      console.error('Error updating index file info:', error);
    }
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const performSearch = useCallback(
    (query) => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        setSearchResults({
          projects: [],
          people: [],
          assets: [],
          files: [],
          folders: [],
          notes: [],
          all: [],
        });
        setExpandedItems({});
        return;
      }

      console.log('Search: Performing search for', query);
      setIsSearching(true);
      setExpandedItems({});

      try {
        let results;

        const searchOptions = {
          type: searchFilters.type !== 'all' ? searchFilters.type : undefined,
          projectId: searchFilters.project !== 'all' ? searchFilters.project : undefined,
          maxResults: SearchConfig.search ? SearchConfig.search.maxResults : 1000,
        };

        ipcRenderer.send(Messages.SEARCH_REQUEST, query, searchOptions);

        // Add to search history
        if (trimmedQuery && !searchHistory.includes(trimmedQuery)) {
          const historySize = SearchConfig.ui ? SearchConfig.ui.searchHistorySize : 15;
          setSearchHistory((prev) => [trimmedQuery, ...prev].slice(0, historySize));
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
          all: [],
        });
      }

      setIsSearching(false);
    },
    [searchFilters, searchHistory],
  );

  const handleSearch = () => {
    if (searchTerm.trim()) {
      performSearch(searchTerm);
    }
  };

  const handleAutocompleteChange = (event, newValue) => {
    setSearchTerm(newValue || '');

    if (newValue && newValue.trim() && suggestions.includes(newValue)) {
      performSearch(newValue);
      setShowSuggestions(false);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      setSearchTimeout(null);
    }

    if (SearchConfig.ui && SearchConfig.ui.enableSuggestions && value.length >= 2) {
      try {
        const newSuggestions = SearchService.getSuggestions
          ? SearchService.getSuggestions(value)
          : [];
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

    if (!value.trim()) {
      setSearchResults({
        projects: [],
        people: [],
        assets: [],
        files: [],
        folders: [],
        notes: [],
        all: [],
      });
      setExpandedItems({});
    }
  };

  const handleSearchKeyUp = (e) => {
    if (e.key === 'Enter') {
      if (searchTerm.trim()) {
        performSearch(searchTerm);
        setShowSuggestions(false);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const applyFilters = (results) => {
    let filtered = { ...results };

    if (searchFilters.type !== 'all') {
      Object.keys(filtered).forEach((key) => {
        if (key !== 'all' && key !== searchFilters.type) {
          filtered[key] = [];
        }
      });
      filtered.all = filtered.all.filter((result) => result.type === searchFilters.type);
    }

    if (searchFilters.project !== 'all') {
      Object.keys(filtered).forEach((key) => {
        filtered[key] = filtered[key].filter(
          (result) => result.item && result.item.projectId === searchFilters.project,
        );
      });
    }

    if (searchFilters.fileType !== 'all') {
      Object.keys(filtered).forEach((key) => {
        filtered[key] = filtered[key].filter((result) => {
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
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
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
      all: [],
    });
    setSuggestions([]);
    setShowSuggestions(false);
    setExpandedItems({});
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      setSearchTimeout(null);
    }
  };

  const highlightText = (text, query) => {
    if (!query || !text || typeof text !== 'string') return text;

    try {
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const parts = text.split(regex);

      return parts.map((part, index) =>
        regex.test(part) ? <HighlightedText key={index}>{part}</HighlightedText> : part,
      );
    } catch (error) {
      console.error('Error highlighting text:', error);
      return text;
    }
  };

  const totalResults = searchResults.all.length;
  const availableProjects = props?.projects ? props.projects : [];
    //searchStats?.documentsByType && SearchService.projectsData ? SearchService.projectsData : [];

  const availableFileTypes = React.useMemo(() => {
    const extensions = new Set();
    searchResults.files.forEach((result) => {
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
          Search
        </Typography>

        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Box position="relative" flexGrow={1}>
            <Autocomplete
              freeSolo
              disabled={isInitializing}
              options={showSuggestions ? suggestions : searchHistory}
              value={searchTerm}
              onInputChange={handleAutocompleteChange}
              onClose={() => setShowSuggestions(false)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  inputRef={searchInputRef}
                  fullWidth
                  variant="outlined"
                  placeholder="Search for projects, files, people, notes... (Press Enter or click Search)"
                  disabled={isInitializing}
                  onKeyUp={handleSearchKeyUp}
                  onChange={handleSearchChange}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <Box display="flex" alignItems="center">
                        {searchTerm && !isInitializing && (
                          <IconButton size="small" onClick={handleClearSearch} title="Clear search">
                            <ClearOutlined />
                          </IconButton>
                        )}
                        <IconButton
                          onClick={handleSearch}
                          disabled={!searchTerm.trim() || isSearching || isInitializing}
                          title="Search"
                          color="primary"
                        >
                          {isSearching ? <CircularProgress size={24} /> : <SearchIcon />}
                        </IconButton>
                      </Box>
                    ),
                  }}
                />
              )}
            />
          </Box>
          <IconButton
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            color={showAdvancedSearch ? 'primary' : 'default'}
            disabled={isInitializing}
          >
            <TuneOutlined />
          </IconButton>
        </Box>

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
                  onChange={(e) => setSearchFilters((prev) => ({ ...prev, type: e.target.value }))}
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
                  onChange={(e) =>
                    setSearchFilters((prev) => ({ ...prev, project: e.target.value }))
                  }
                >
                  <MenuItem value="all">All Projects</MenuItem>
                  {availableProjects.map((project) => (
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
                    onChange={(e) =>
                      setSearchFilters((prev) => ({ ...prev, fileType: e.target.value }))
                    }
                  >
                    <MenuItem value="all">All Types</MenuItem>
                    {availableFileTypes.map((ext) => (
                      <MenuItem key={ext} value={ext}>
                        {ext}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
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
            </Box>
          </AdvancedSearchPanel>
        </Collapse>

        {/* Performance Metrics */}
        {showPerformanceMetrics && searchStats && !isInitializing && (
          <PerformancePanel>
            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
              <Box display="flex" alignItems="center" gap={0.5}>
                <SpeedOutlined fontSize="small" />
                <Typography variant="caption">Last Search: {lastSearchTime}ms</Typography>
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
              {indexFileInfo.exists
                ? 'Loading persistent index and checking for updates...'
                : 'Creating new search index...'}
            </Typography>
          </Box>
        )}

        {indexingStatus.inProgress && !isInitializing && (
          <Box display="flex" alignItems="center" mt={1}>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            <Typography variant="body2">
              Updating index... {indexingStatus.queueLength} projects remaining
            </Typography>
          </Box>
        )}

        {searchStats && !isInitializing && (
          <Box display="flex" alignItems="center" gap={2} mt={1} mb={2}>
            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
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
                  color={
                    searchStats.indexedProjects === availableProjects.length ? 'success' : 'default'
                  }
                />
              )}

              {searchStats.contentIndexedFiles !== undefined && (
                <Chip
                  label={`${searchStats.contentIndexedFiles} files with content`}
                  size="small"
                  variant="outlined"
                  color={searchStats.contentIndexedFiles > 0 ? 'success' : 'error'}
                />
              )}
            </Box>
          </Box>
        )}

        {/* Index file info - small text below stats */}
        {indexFileInfo.exists && !isInitializing && (
          <Box mb={1}>
            <Typography variant="caption" color="textSecondary" display="block">
              Persistent index: {indexFileInfo.sizeMB.toFixed(2)}MB saved locally
              {lastUpdateInfo.added > 0 ||
              lastUpdateInfo.removed > 0 ||
              lastUpdateInfo.updated > 0 ? (
                <>
                  {' '}
                  • Last update: +{lastUpdateInfo.added} -{lastUpdateInfo.removed} ~
                  {lastUpdateInfo.updated} projects
                </>
              ) : null}
            </Typography>
          </Box>
        )}
      </SearchHeader>

      {!isInitializing && searchTerm && (
        <Box mt={2} mb={1}>
          <Typography variant="body2">
            {isSearching
              ? 'Searching...'
              : totalResults > 0
                ? `Found ${totalResults} results for "${searchTerm}"`
                : `No results found for "${searchTerm}"`}
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
                  <CommentOutlined fontSize="small" />
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
                {indexFileInfo.exists ? 'Loading existing index...' : 'Creating search index...'}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {indexFileInfo.exists
                  ? 'Loading saved index and checking for changes'
                  : 'Building new search index for all projects'}
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
          indexFileInfo={indexFileInfo}
        />
      )}
    </SearchContainer>
  );
}

const AllResultsList = ({
  results,
  searchTerm,
  expandedItems,
  onToggleExpand,
  highlightText,
  showRelevanceScores,
}) => {
  if (results.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="200px">
        <Typography variant="body1" color="textSecondary">
          {searchTerm ? `No results found for "${searchTerm}"` : 'Start typing to search...'}
        </Typography>
      </Box>
    );
  }

  const sortedResults = [...results].sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <Box>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        Showing {sortedResults.length} results sorted by relevance
      </Typography>
      <List>
        {sortedResults.map((result, index) => (
          <ResultItemComponent
            key={`all-${result.type}-${index}`}
            result={result}
            searchTerm={searchTerm}
            expanded={expandedItems[`all-${result.type}-${index}`]}
            onToggleExpand={() => onToggleExpand(`all-${result.type}-${index}`)}
            highlightText={highlightText}
            showRelevanceScores={showRelevanceScores}
            showTypeTag={true}
          />
        ))}
      </List>
    </Box>
  );
};

const ResultsList = ({
  results,
  searchTerm,
  expandedItems,
  onToggleExpand,
  highlightText,
  showRelevanceScores,
  emptyMessage,
}) => {
  if (results.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" mt={4}>
        <Typography variant="body1" color="textSecondary">
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  const sortedResults = [...results].sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <List>
      {sortedResults.map((result, index) => (
        <ResultItemComponent
          key={`${result.type}-${index}`}
          result={result}
          searchTerm={searchTerm}
          expanded={expandedItems[`${result.type}-${index}`]}
          onToggleExpand={() => onToggleExpand(`${result.type}-${index}`)}
          highlightText={highlightText}
          showRelevanceScores={showRelevanceScores}
          showTypeTag={false}
        />
      ))}
    </List>
  );
};
const formatPersonName = (name) => {
  if (!name) return '';
  if (typeof name === 'string') return name;

  const parts = [];
  if (name.first) parts.push(name.first);
  if (name.middle) parts.push(name.middle);
  if (name.last) parts.push(name.last);

  return parts.join(' ').trim();
};

const ResultItemComponent = ({
  result,
  searchTerm,
  expanded,
  onToggleExpand,
  highlightText,
  showRelevanceScores,
}) => {
  if (!result || !result.item) {
    return null;
  }

  const { item, score, type, highlights } = result;
  const relevance = Math.floor((score || 0) * 100);

  const getIcon = () => {
    switch (type) {
      case 'project':
        return <FolderOutlined />;
      case 'file':
        return <InsertDriveFileOutlined />;
      case 'folder':
        return <FolderOpenOutlined />;
      case 'person':
        return <PersonOutline />;
      case 'asset':
      case 'external-asset':
        return <InsertDriveFileOutlined />;
      case 'note':
        return <CommentOutlined />;
      default:
        return <Description />;
    }
  };

  const getRelevanceColor = (relevance) => {
    if (relevance >= 80) return 'success';
    if (relevance >= 60) return 'warning';
    if (relevance >= 40) return 'info';
    return 'default';
  };

  const renderTags = () => {
    if (!item.tags || (!Array.isArray(item.tags) && typeof item.tags !== 'string')) return null;

    const tagArray = Array.isArray(item.tags)
      ? item.tags
      : item.tags.split(' ').filter((t) => t.trim());
    if (tagArray.length === 0) return null;

    return (
      <Box mt={1} display="flex" gap={0.5} flexWrap="wrap">
        {tagArray.slice(0, 5).map((tag, index) => (
          <Chip
            key={index}
            label={tag}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.7rem', height: 20 }}
          />
        ))}
        {tagArray.length > 5 && (
          <Chip
            label={`+${tagArray.length - 5} more`}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.7rem', height: 20 }}
          />
        )}
      </Box>
    );
  };

  const renderPrimaryContent = () => {
    const title =
      type === 'person' && typeof item.name === 'object' && item.name !== null
        ? formatPersonName(item.name)
        : item.title || item.name || item.filename || item.folderName || 'Untitled';

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
                {item.projectName || (type === 'project' && item.name) || 'Unknown Project'}
              </Typography>
              {item.extension && (
                <>
                  <Typography variant="caption" color="textSecondary">
                    •
                  </Typography>
                  <Chip
                    label={item.extension}
                    size="small"
                    variant="outlined"
                    sx={{ height: 16, fontSize: '0.6rem' }}
                  />
                </>
              )}
              {item.size && (
                <>
                  <Typography variant="caption" color="textSecondary">
                    •
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {item.size > 1024 * 1024
                      ? `${(item.size / (1024 * 1024)).toFixed(1)} MB`
                      : `${Math.round(item.size / 1024)} KB`}
                  </Typography>
                </>
              )}
              {item.isContentIndexed && (
                <>
                  <Typography variant="caption" color="textSecondary">
                    •
                  </Typography>
                  <Chip
                    label="Content Indexed"
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{ height: 16, fontSize: '0.6rem' }}
                  />
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
      <Box>
        {' '}
        {/* Use Box instead of Fragment to avoid nesting issues */}
        <Typography variant="body2" color="textSecondary" component="div" noWrap>
          {item.path || item.relativePath || item.uri || ''}
        </Typography>
        {renderTags()}
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box mt={2}>{renderExpandedContent()}</Box>
        </Collapse>
      </Box>
    );
  };

  const renderExpandedContent = () => {
    switch (type) {
      case 'file':
        return (
          <Box>
            <Box display="flex" gap={4} flexWrap="wrap" mb={2}>
              <Typography variant="body2" component="span">
                <strong>Size:</strong>{' '}
                {item.size
                  ? item.size > 1024 * 1024
                    ? `${(item.size / (1024 * 1024)).toFixed(2)} MB`
                    : `${(item.size / 1024).toFixed(1)} KB`
                  : 'Unknown'}
              </Typography>
              <Typography variant="body2" component="span">
                <strong>Extension:</strong> {item.extension || 'None'}
              </Typography>
              <Typography variant="body2" component="span">
                <strong>Content Indexed:</strong> {item.isContentIndexed ? 'Yes' : 'No'}
              </Typography>
              {item.lastModified && (
                <Typography variant="body2" component="span">
                  <strong>Modified:</strong> {new Date(item.lastModified).toLocaleDateString()}
                </Typography>
              )}
            </Box>

            {item.snippet && (
              <Paper
                variant="outlined"
                sx={{
                  p: 1,
                  mt: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  maxHeight: 200,
                  overflow: 'auto',
                }}
              >
                <Typography variant="caption" color="textSecondary" display="block" mb={1}>
                  Content Preview:
                </Typography>
                {highlightText(String(item.snippet), searchTerm)}
              </Paper>
            )}

            {highlights && highlights.content && (
              <Box mt={1}>
                <Typography variant="caption" color="primary">
                  Match found in content
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{ p: 1, mt: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}
                >
                  {highlightText(highlights.content[0], searchTerm)}
                </Paper>
              </Box>
            )}

            <Box mt={2} display="flex" gap={1}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  if (item.fullPath) {
                    ipcRenderer.send(Messages.SHOW_ITEM_IN_FOLDER, item.fullPath);
                  }
                }}
              >
                Show in Folder
              </Button>

              {item.fullPath &&
                SearchConfig.integration &&
                SearchConfig.integration.enableExternalTools && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      ipcRenderer.send(Messages.OPEN_FILE_WITH_DEFAULT, item.fullPath);
                    }}
                  >
                    Open File
                  </Button>
                )}
            </Box>
          </Box>
        );

      case 'project':
        return (
          <Box>
            {item.description && (
              <Typography variant="body2" component="div" sx={{ mb: 1 }}>
                <strong>Description:</strong> {highlightText(String(item.description), searchTerm)}
              </Typography>
            )}
            {item.categories && Array.isArray(item.categories) && (
              <Typography variant="body2" component="div" sx={{ mb: 1 }}>
                <strong>Categories:</strong> {item.categories.join(', ')}
              </Typography>
            )}
          </Box>
        );

      case 'person':
        return (
          <Box>
            {item.affiliation && (
              <Typography variant="body2" component="div" sx={{ mb: 1 }}>
                <strong>Affiliation:</strong> {highlightText(String(item.affiliation), searchTerm)}
              </Typography>
            )}
            {item.roles && Array.isArray(item.roles) && (
              <Typography variant="body2" component="div" sx={{ mb: 1 }}>
                <strong>Roles:</strong> {item.roles.join(', ')}
              </Typography>
            )}
          </Box>
        );

      case 'note':
        return (
          <Box>
            <Typography variant="body2" component="div" sx={{ mb: 1 }}>
              <strong>Note Type:</strong> {item.noteType || 'Unknown'}
            </Typography>

            {item.content && (
              <Paper variant="outlined" sx={{ p: 1, mt: 1, maxHeight: 150, overflow: 'auto' }}>
                <Typography variant="caption" color="textSecondary" display="block" mb={1}>
                  Note Content:
                </Typography>
                {highlightText(String(item.content), searchTerm)}
              </Paper>
            )}
          </Box>
        );

      default:
        return (
          <Typography variant="body2" component="div">
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
        secondaryTypographyProps={{
          component: 'div',
        }}
      />
    </ResultItem>
  );
};

const DebugPanel = ({ searchService, searchStats, searchConfig, onStatsUpdate, indexFileInfo }) => {
  const [debugExpanded, setDebugExpanded] = useState(false);

  return (
    <Box
      mt={2}
      p={2}
      border={1}
      borderColor="grey.300"
      borderRadius={1}
      sx={{
        backgroundColor: 'background.paper',
        position: 'relative',
        zIndex: 1,
      }}
    >
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
                  console.log('FlexSearch Debug Info:', stats);
                  console.log('Document Store Size:', searchService.documentStore?.size || 0);
                  console.log('Index File Info:', indexFileInfo);

                  alert(`Search Statistics:
                    - Total Documents: ${stats.totalDocuments || 0}
                    - Projects: ${stats.documentsByType?.project || 0}
                    - Files: ${stats.documentsByType?.file || 0}
                    - Folders: ${stats.documentsByType?.folder || 0}
                    - People: ${stats.documentsByType?.person || 0}
                    - Assets: ${stats.documentsByType?.asset || 0}
                    - Notes: ${stats.documentsByType?.note || 0}
                    - Content-indexed files: ${stats.contentIndexedFiles || 0}
                    - Indexed Projects: ${stats.indexedProjects || 0}
                    - Cache Size: ${stats.cacheStats?.size || 0}/${stats.cacheStats?.maxSize || 0}

                    Index File:
                    - Exists: ${indexFileInfo.exists}
                    - Size: ${indexFileInfo.sizeMB.toFixed(2) || 0}MB
                    - Path: ${indexFileInfo.path || 'N/A'}

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
                    Content-indexed Files: {searchStats.contentIndexedFiles || 0}
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

                {indexFileInfo && (
                  <Box>
                    <Typography variant="caption" display="block">
                      <strong>Index File:</strong>
                    </Typography>
                    <Typography variant="caption" display="block">
                      Exists: {indexFileInfo.exists ? 'Yes' : 'No'}
                    </Typography>
                    {indexFileInfo.exists && (
                      <>
                        <Typography variant="caption" display="block">
                          Size: {indexFileInfo.sizeMB.toFixed(2)}MB
                        </Typography>
                        <Typography variant="caption" display="block">
                          Path: {indexFileInfo.path}
                        </Typography>
                      </>
                    )}
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

          {searchConfig && (
            <Box mt={2}>
              <Typography variant="caption" display="block">
                <strong>Configuration:</strong>
              </Typography>
              <Typography variant="caption" display="block">
                Max File Size: {((searchConfig.indexing?.maxFileSize || 0) * 1.0) / (1024 * 1024)}MB
              </Typography>
              <Typography variant="caption" display="block">
                Enable Fuzzy Search: {searchConfig.search?.enableFuzzySearch ? 'Yes' : 'No'}
              </Typography>
              <Typography variant="caption" display="block">
                Enable Suggestions: {searchConfig.ui?.enableSuggestions ? 'Yes' : 'No'}
              </Typography>
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

export default Search;
