/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@mui/material';
import AssetNode from './AssetNode/AssetNode';
import Constants from '../../constants/constants';
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

  // This is an internal callback used when iterating recursively over a directory
  // to allow us to set the node as being expanded.
  // node - the node to try and add (will only be added if a directory)
  // expandedNodes - the collection of URIs of expanded nodes
  setNodeExpanded = (node, expandedNodes) => {
    if (node.type === Constants.AssetType.DIRECTORY) {
      expandedNodes.push(node.uri);
      if (node.children) {
        node.children.forEach(x => this.setNodeExpanded(x, expandedNodes));
      }
    }
  };

  setExpandAll = expand => {
    this.setState(() => {
      const expandedNodes = [];
      // If we're collapsing, we just set this to an empty array.  Easy!
      if (!expand) {
        return { expandedNodes };
      }

      // If we're expanding, we need to recursively add every folder URI.
      expandedNodes.push(this.props.assets.uri);
      if (this.props.assets.children) {
        this.props.assets.children.forEach(c => this.setNodeExpanded(c, expandedNodes));
      }
      return { expandedNodes };
    });
  };

  render() {
    // const filteredAssets = !this.props.assets
    //   ? null
    //   : AssetUtil.filterIncludedFileAssets(this.props.assets);

    const assetTree = !this.props.assets ? null : (
      <>
        <div>
          <Button onClick={() => this.setExpandAll(true)}>Expand All</Button>
          <Button onClick={() => this.setExpandAll(false)}>Collapse All</Button>
        </div>
        <AssetNode
          onClick={this.handleClick}
          root
          key={this.props.assets.uri}
          node={this.props.assets}
          openNodes={this.state.expandedNodes}
          selectedAsset={this.props.selectedAsset}
          onToggle={this.onToggle}
        />
      </>
    );

    return <div className={styles.container}>{assetTree}</div>;
  }
}

AssetTree.propTypes = {
  assets: PropTypes.object.isRequired,
  onSelectAsset: PropTypes.func.isRequired,
  selectedAsset: PropTypes.object
};

AssetTree.defaultProps = {
  selectedAsset: null
};

export default AssetTree;
