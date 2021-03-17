import React from 'react';
import { Graph } from 'react-d3-graph';
import AssetUtil from '../../utils/asset';
import CodeNode from './CustomNodes/Code/CodeNode';
import styles from './Workflow.css';

// // graph payload (with minimalist structure)
// const data = {
//   nodes: [{ id: 'Harry' }, { id: 'Sally' }, { id: 'Alice' }],
//   links: [
//     { source: 'Harry', target: 'Sally' },
//     { source: 'Harry', target: 'Alice' }
//   ]
// };

// the graph configuration, just override the ones you need
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

  // const [shouldRender, setShouldRender] = React.useState(false);
  // React.useEffect(() => {
  //   const timeout = setTimeout(() => setShouldRender(true), 1000);
  //   return () => clearTimeout(timeout);
  // }, []);

  const data = AssetUtil.getAllDependenciesAsGraph(project.assets);
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
