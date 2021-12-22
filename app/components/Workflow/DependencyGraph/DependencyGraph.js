// import { style } from 'd3-selection';
import React from 'react';
import { Graph } from 'react-d3-graph';
import WorkflowUtil from '../../../utils/workflow';
import CodeNode from './CustomNodes/Code/CodeNode';
import styles from './DependencyGraph.css';

const graphConfig = {
  nodeHighlightBehavior: false,
  directed: true,
  maxZoom: 8,
  minZoom: 0.1,
  node: {
    color: 'white',
    size: 120,
    highlightStrokeColor: 'blue',
    viewGenerator: node => <CodeNode node={node} />
  },
  link: {
    highlightColor: 'lightblue'
  }
};

const dependencyGraph = props => {
  const { assets } = props;

  const data = WorkflowUtil.getAllDependenciesAsGraph(assets);
  let graph = null;
  if (data && data.nodes && data.nodes.length > 0) {
    graph = <Graph id="graph-id" data={data} config={graphConfig} />;
  }
  return <div className={styles.container}>{graph}</div>;
};

export default dependencyGraph;
