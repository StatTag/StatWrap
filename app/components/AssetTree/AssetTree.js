/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import AssetNode from './AssetNode/AssetNode';
import AssetUtil from '../../utils/asset';
import styles from './AssetTree.css';

// This implementation borrows heavily from: https://github.com/davidtran/simple-treeview
// Many thanks to davidtran for the implementation to get us started!

class AssetTree extends Component {
  constructor(props) {
    super(props);
    this.state = { expandedNodes: [] };
  }

  handleClick = node => {
    this.props.onSelectAsset(node);
  };

  onToggle = node => {
    this.setState(prevState => {
      const expandedNodes = [...prevState.expandedNodes];
      const index = expandedNodes.indexOf(node.uri);
      if (index === -1) {
        expandedNodes.push(node.uri);
      } else {
        expandedNodes.splice(index, 1);
      }
      return { expandedNodes };
    });
  };

  render() {
    const filteredAssets = !this.props.project.assets
      ? null
      : AssetUtil.filterIncludedFileAssets(this.props.project.assets);
    const assetTree = !filteredAssets ? null : (
      <AssetNode
        onClick={this.handleClick}
        key={filteredAssets.uri}
        node={filteredAssets}
        openNodes={this.state.expandedNodes}
        selectedAsset={this.props.selectedAsset}
        onToggle={this.onToggle}
      />
    );

    return <div className={styles.container}>{assetTree}</div>;
  }
}

AssetTree.propTypes = {
  project: PropTypes.object.isRequired,
  onSelectAsset: PropTypes.func.isRequired,
  selectedAsset: PropTypes.object
};

AssetTree.defaultProps = {
  selectedAsset: null
};

export default AssetTree;
