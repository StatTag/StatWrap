import React from 'react';
import { Graph } from 'react-d3-graph';
import WorkflowUtil from '../../utils/workflow';
import CodeNode from './CustomNodes/Code/CodeNode';
import styles from './Workflow.css';

const myConfig = {
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

const workflow = props => {
  const { project } = props;

  const data = WorkflowUtil.getAllDependenciesAsGraph(project.assets);
  let graph = null;
  if (data && data.nodes && data.nodes.length > 0) {
    graph = (
      <Graph
        id="graph-id" // id is mandatory
        data={data}
        config={myConfig}
      />
    );
  }
  return <div className={styles.container}>{graph}</div>;
};

export default workflow;
