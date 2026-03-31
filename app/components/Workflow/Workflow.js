import { ToggleButtonGroup, ToggleButton, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import AssetUtil from '../../utils/asset';
import WorkflowUtil from '../../utils/workflow';
import ProjectUtil from '../../utils/project';
import Constants from '../../constants/constants';
import DependencyGraph from './DependencyGraph/DependencyGraphEChart';
import DependencyTree from './DependencyTree/DependencyTreeEChart';
import styles from './Workflow.css';

function Workflow(props) {
  const { project } = props;
  const [diagram, setDiagram] = useState('graph');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedAssetUri, setSelectedAssetUri] = useState('');

  // Get a flat list of all directories in the project
  const getAllDirectories = (asset, rootPath) => {
    let dirs = [];
    if (!asset) {
      return dirs;
    }

    // specific check to exclude the .statwrap folder and other hidden folders
    if (!AssetUtil.includeAsset(asset.uri)) {
      return dirs;
    }

    if (asset.type === Constants.AssetType.DIRECTORY || asset.type === Constants.AssetType.FOLDER) {
      let displayName = asset.uri;
      if (rootPath) {
        const relativeName = AssetUtil.absoluteToRelativePath(rootPath, asset);
        displayName = relativeName === '' || relativeName === null ? 'Project Root' : relativeName;
      }
      dirs.push({ uri: asset.uri, name: displayName });
    }

    if (asset.children) {
      asset.children.forEach((child) => {
        dirs = dirs.concat(getAllDirectories(child, rootPath));
      });
    }
    return dirs;
  };

  const directories = React.useMemo(() => {
    return project && project.assets ? getAllDirectories(project.assets, project.assets.uri) : [];
  }, [project]);

  // Whenever the project changes, we want to reset our selection to the root
  useEffect(() => {
    if (project && project.assets) {
      setSelectedAssetUri(project.assets.uri);
    }
  }, [project]);

  const handleDiagram = (event, newDiagram) => {
    setDiagram(newDiagram);
  };

  const handleZoomIn = () => {
    setZoomLevel((prevZoom) => prevZoom * 1.2);
  };

  const handleZoomOut = () => {
    setZoomLevel((prevZoom) => prevZoom / 1.2);
  };

  const handleAssetSelectChange = (event) => {
    setSelectedAssetUri(event.target.value);
  };

  const targetAsset = WorkflowUtil.findAssetByUri(project.assets, selectedAssetUri) || project.assets;

  let graph = <DependencyGraph assets={targetAsset} zoomLevel={zoomLevel} />;
  if (diagram === 'tree') {
    graph = <DependencyTree assets={targetAsset} />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.controls}>
          <ToggleButtonGroup
            value={diagram}
            exclusive
            onChange={handleDiagram}
            aria-label="select workflow diagram"
          >
            <ToggleButton value="graph" aria-label="dependency graph">
              Dependency Graph
            </ToggleButton>
            <ToggleButton value="tree" aria-label="dependency tree">
              Tree
            </ToggleButton>
          </ToggleButtonGroup>
          <FormControl margin="dense" className={styles.directorySelect}>
            <InputLabel id="asset-select-label">View Directory</InputLabel>
            <Select
              labelId="asset-select-label"
              id="asset-select"
              value={selectedAssetUri}
              label="View Directory"
              onChange={handleAssetSelectChange}
            >
              {directories.map((dir) => (
                <MenuItem key={dir.uri} value={dir.uri}>
                  {dir.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
        <span className={styles.projectPath}>
          Paths shown relative to project home:
          <br />
          {project.path}
        </span>
        <span className={styles.buttonsWrapper}>
          {diagram !== 'tree' && (
            <>
              <button type="button" onClick={handleZoomIn}>
                Zoom In
              </button>
              <button type="button" onClick={handleZoomOut}>
                Zoom Out
              </button>
            </>
          )}
        </span>
      </div>
      {graph}
    </div>
  );
}

Workflow.propTypes = {
  project: PropTypes.object.isRequired,
};

export default Workflow;
