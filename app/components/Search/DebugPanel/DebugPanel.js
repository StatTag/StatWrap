import React, { useState } from 'react';
import {
  Typography,
  Box,
  IconButton,
  Collapse,
  Button,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import SearchConfig from '../../../constants/search-config';

const debugPanel = ({ searchStats, indexFileInfo, onShowStats }) => {
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
              onClick={onShowStats}
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

          {SearchConfig && (
            <Box mt={2}>
              <Typography variant="caption" display="block">
                <strong>Configuration:</strong>
              </Typography>
              <Typography variant="caption" display="block">
                Max File Size: {((SearchConfig.indexing?.maxFileSize || 0) * 1.0) / (1024 * 1024)}MB
              </Typography>
              <Typography variant="caption" display="block">
                Enable Fuzzy Search: {SearchConfig.search?.enableFuzzySearch ? 'Yes' : 'No'}
              </Typography>
              <Typography variant="caption" display="block">
                Enable Suggestions: {SearchConfig.ui?.enableSuggestions ? 'Yes' : 'No'}
              </Typography>
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

export default debugPanel;
