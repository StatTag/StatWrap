import React from 'react';
import Tree from 'react-d3-tree';
import WorkflowUtil from '../../../utils/workflow';
import AssetUtil from '../../../utils/asset';
import styles from './DependencyTree.css';

const dependencyGraphD3 = (props) => {
  const { assets } = props;

  const data = WorkflowUtil.getAllDependenciesAsTree(AssetUtil.filterIncludedFileAssets(assets));
  let tree = null;
  if (data) {
    tree = (
      <Tree
        data={data}
        initialDepth={2}
        depthFactor={750}
        separation={{
          siblings: 0.4,
          nonSiblings: 0.8,
        }}
        dimensions={{ height: window.innerHeight / 2, width: (2 * window.innerWidth) / 3 }}
        pathFunc={'step'}
        zoom={0.4}
        scaleExtent={{ max: 2, min: 0.1 }}
        translate={{ x: 10, y: window.innerHeight / 3 }}
        rootNodeClassName={styles.node__root}
        branchNodeClassName={styles.node__branch}
        leafNodeClassName={styles.node__leaf}
      />
    );
  }
  return (
    <div style={{ width: '100%', height: '75vh', fontSize: '2.1em', fontFamily: 'monospace' }}>
      {tree}
    </div>
  );
};

export default dependencyGraphD3;
