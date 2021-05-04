/* eslint-disable react/forbid-prop-types */
import React from 'react';
import { FaFile, FaFolder, FaFolderOpen, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import AssetUtil from '../../../utils/asset';
import Constants from '../../../constants/constants';

// This implementation borrows heavily from: https://github.com/davidtran/simple-treeview
// Many thanks to davidtran for the implementation to get us started!

const getPaddingLeft = level => {
  return level * 20;
};

const StyledTreeNode = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 5px 8px;
  padding-left: ${props => getPaddingLeft(props.level)}px;
  ${props => (props.selected ? 'background-color: #eee;' : null)}
`;

const NodeIcon = styled.div`
  font-size: 12px;
  margin-right: ${props => (props.marginRight ? props.marginRight : 5)}px;
`;

const AssetNode = props => {
  const { node, openNodes, selectedAsset, level, onToggle, onRightClick, onClick } = props;
  const isOpen = openNodes.includes(node.uri);
  return (
    <>
      <StyledTreeNode
        level={level}
        type={node.type}
        selected={node && selectedAsset && node.uri === selectedAsset.uri}
        onContextMenu={e => onRightClick(e)}
        onClick={e => {
          e.stopPropagation();
          onClick(node);
        }}
      >
        <NodeIcon onClick={() => onToggle(node)}>
          {node.type === Constants.AssetType.DIRECTORY &&
            (isOpen ? <FaChevronDown /> : <FaChevronRight />)}
        </NodeIcon>

        <NodeIcon marginRight={10}>
          {node.type === Constants.AssetType.FILE && <FaFile />}
          {node.type === Constants.AssetType.DIRECTORY && isOpen === true && <FaFolderOpen />}
          {node.type === Constants.AssetType.DIRECTORY && !isOpen && <FaFolder />}
        </NodeIcon>

        <span role="button">{AssetUtil.getAssetNameFromUri(node)}</span>
      </StyledTreeNode>

      {isOpen &&
        (!node.children
          ? null
          : node.children.map(childNode => (
              <AssetNode
                key={childNode.uri}
                node={childNode}
                level={level + 1}
                selectedAsset={selectedAsset}
                openNodes={openNodes}
                onToggle={onToggle}
                onClick={onClick}
                onRightClick={onRightClick}
              />
            )))}
    </>
  );
};

AssetNode.propTypes = {
  node: PropTypes.object.isRequired,
  selectedAsset: PropTypes.object,
  level: PropTypes.number,
  onToggle: PropTypes.func,
  onRightClick: PropTypes.func,
  onClick: PropTypes.func,
  openNodes: PropTypes.array
};

AssetNode.defaultProps = {
  onToggle: null,
  onRightClick: null,
  onClick: null,
  level: 0,
  selectedAsset: null,
  openNodes: []
};

export default AssetNode;
