/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import AssetNode from './AssetNode/AssetNode';
import MetadataUtil from '../../utils/metadata';
import styles from './AssetTree.css';

// This implementation borrows heavily from: https://github.com/davidtran/simple-treeview
// Many thanks to davidtran for the implementation to get us started!

const mapNode = node => {
  return [{ uri: node.uri, node }, ...mapNodeChildren(node.children)];
};

const mapNodeChildren = (children = []) => {
  return children.flatMap(c => mapNode(c));
};

class AssetTree extends Component {
  constructor(props) {
    super(props);
    this.uriNodeMap = mapNode(props.project.assets);
    this.state = { nodes: props.project.assets };
  }

  onToggle = node => {
    const { nodes } = this.state;
    const foundNode = this.uriNodeMap.find(x => x.uri === node.uri);
    if (foundNode) {
      foundNode.isOpen = !node.isOpen;
      foundNode.node.isOpen = foundNode.isOpen;
      this.setState({ nodes });
    }
  };

  render() {
    const filteredAssets = !this.props.project.assets
      ? null
      : MetadataUtil.filterIncludedFileAssets(this.props.project.assets);
    const assetTree =
      !filteredAssets || !filteredAssets.children
        ? null
        : filteredAssets.children.map(child => (
            <AssetNode key={child.uri} node={child} onToggle={this.onToggle} />
          ));

    return <div className={styles.container}>{assetTree}</div>;
  }
}

AssetTree.propTypes = {
  project: PropTypes.object.isRequired
};

export default AssetTree;
