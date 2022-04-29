import React from 'react';
import Tree from 'react-d3-tree';
import WorkflowUtil from '../../../utils/workflow';
import CodeNode from '../DependencyGraph/CustomNodes/Code/CodeNode';
import styles from './DependencyTree.css';

const renderCodeNode = node => (
  <CodeNode
    renderType="svg"
    node={{ name: node.nodeDatum.name, assetType: node.nodeDatum.attributes.assetType }}
  />
);

const dependencyGraphD3 = props => {
  const { assets } = props;

  const data = WorkflowUtil.getAllDependenciesAsTree(assets);
  let tree = null;
  if (data) {
    tree = <Tree data={data} renderCustomNodeElement={renderCodeNode} />;
  }
  return <div className={styles.container}>{tree}</div>;
};

export default dependencyGraphD3;
