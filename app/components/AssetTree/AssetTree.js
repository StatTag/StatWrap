import React, { Component } from 'react';
import PropTypes from 'prop-types';
import AssetNode from './AssetNode/AssetNode';
import Constants from '../../constants/constants';
import styles from './AssetTree.css';

// This implementation borrows heavily from: https://github.com/davidtran/simple-treeview
// Many thanks to davidtran for the implementation to get us started!
// Additional thanks to https://github.com/jakezatecky/react-checkbox-tree - reviewed and
// inspired how we handle managing checkbox state.

class AssetTree extends Component {
  constructor(props) {
    super(props);
    this.state = { expandedNodes: [], checkedNodes: [] };
  }

  handleClick = (node) => {
    this.props.onSelectAsset(node);
  };

  onToggle = (node) => {
    this.setState((prevState) => {
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
        node.children.forEach((x) => this.setNodeExpanded(x, expandedNodes));
      }
    }
  };

  setPreCheckedNodes = (nodes) => {
    this.setState({ checkedNodes: nodes });
  };

  setExpandAll = (expand) => {
    this.setState(() => {
      const expandedNodes = [];
      // If we're collapsing, we just set this to an empty array.  Easy!
      if (!expand) {
        return { expandedNodes };
      }

      // If we're expanding, we need to recursively add every folder URI.
      expandedNodes.push(this.props.assets.uri);
      if (this.props.assets.children) {
        this.props.assets.children.forEach((c) => this.setNodeExpanded(c, expandedNodes));
      }
      return { expandedNodes };
    });
  };

  handleCheck = (node, value) => {
    this.setState((prevState) => {
      const checkedNodes = [...prevState.checkedNodes];
      const index = checkedNodes.indexOf(node.uri);
      if (index === -1) {
        checkedNodes.push(node.uri);
      } else {
        checkedNodes.splice(index, 1);
      }
      return { checkedNodes };
    });

    if (this.props.onCheckAsset) {
      this.props.onCheckAsset(node, value);
    }
  };

  render() {
    const assetTree = !this.props.assets ? null : (
      <AssetNode
        onClick={this.handleClick}
        root
        key={this.props.assets.uri}
        node={this.props.assets}
        openNodes={this.state.expandedNodes}
        checkedNodes={this.state.checkedNodes}
        selectedAsset={this.props.selectedAsset}
        checkboxes={this.props.checkboxes}
        onToggle={this.onToggle}
        onCheck={this.handleCheck}
      />
    );

    return <div className={styles.container}>{assetTree}</div>;
  }
}

AssetTree.propTypes = {
  assets: PropTypes.object.isRequired,
  onSelectAsset: PropTypes.func.isRequired,
  onCheckAsset: PropTypes.func,
  selectedAsset: PropTypes.object,
  checkboxes: PropTypes.bool,
};

AssetTree.defaultProps = {
  selectedAsset: null,
  checkboxes: false,
  onCheckAsset: null,
};

export default AssetTree;
