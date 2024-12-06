import React, { useState, useEffect } from 'react';
import { Graph } from 'react-d3-graph';
import CodeNode from './CustomNodes/Code/CodeNode';
import WorkflowUtil from '../../../utils/workflow';
import ProjectUtil from '../../../utils/project';
import DependencyFilter from '../../Filter/Filter';
import styles from './DependencyGraph.css';

const graphConfig = {
  nodeHighlightBehavior: true,
  directed: true,
  maxZoom: 8,
  minZoom: 0.1,
  node: {
    color: 'white',
    size: 120,
    highlightStrokeColor: 'blue',
    viewGenerator: (node) => <CodeNode node={node} />,
  },
  link: {
    highlightColor: 'lightblue',
  },
};

const dependencyGraphD3 = (props) => {
  const { assets } = props;
  const [graphData, setGraphData] = useState(null);
  // The actual contents of the filter (no filter by default)
  const [filter, setFilter] = useState([]);

  useEffect(() => {
    if (assets) {
      setFilter(ProjectUtil.getWorkflowFilters(assets));
      setGraphData(WorkflowUtil.getAllDependenciesAsGraph(assets));
    } else {
      setGraphData(null);
    }
  }, [assets]);

  // Whenever the filter changes, update the list of assets to include only
  // those that should be displayed.
  const handleFilterChanged = (updatedFilter) => {
    if (assets) {
      setFilter(updatedFilter);
      setGraphData(WorkflowUtil.getAllDependenciesAsGraph(assets, updatedFilter));
    } else {
      setGraphData(null);
    }
  };

  let graph = null;
  if (graphData && graphData.nodes && graphData.nodes.length > 0) {
    graph = <Graph id="graph-id" data={graphData} config={graphConfig} />;
  }
  return (
    <div className={styles.container}>
      <div className={styles.filter}>
        <DependencyFilter filter={filter} mode="dependency" onFilterChanged={handleFilterChanged} />
      </div>
      <div className={styles.graph}>{graph}</div>
    </div>
  );
};

export default dependencyGraphD3;
