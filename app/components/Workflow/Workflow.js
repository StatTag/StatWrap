import { ToggleButtonGroup, ToggleButton } from '@mui/material';
import React, { useState } from 'react';
import DependencyGraph from './DependencyGraph/DependencyGraphEChart';
import DependencyTree from './DependencyTree/DependencyTreeEChart';
import styles from './Workflow.css';

function Workflow(props) {
  const [diagram, setDiagram] = useState('graph');
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleDiagram = (event, newDiagram) => {
    setDiagram(newDiagram);
  };

  const handleZoomIn = () => {
    setZoomLevel((prevZoom) => prevZoom * 1.2);
  };

  const handleZoomOut = () => {
    setZoomLevel((prevZoom) => prevZoom / 1.2);
  };

  const { project } = props;
  let graph = <DependencyGraph assets={project.assets} zoomLevel={zoomLevel} />;
  if (diagram === 'tree') {
    graph = <DependencyTree assets={project.assets} />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
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
        <span className={styles.projectPath}>
          Paths shown relative to project home:
          <br />
          {project.path}
        </span>
        <span className={styles.buttonsWrapper}>
          {diagram !== 'tree' && (
            <>
              <button onClick={handleZoomIn}>Zoom In</button>
              <button onClick={handleZoomOut}>Zoom Out</button>
            </>
          )}
        </span>
      </div>
      {graph}
    </div>
  );
}

export default Workflow;
