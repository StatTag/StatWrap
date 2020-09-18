/* eslint-disable react/forbid-prop-types */
import React from 'react';
import { FaFile, FaFolder, FaFolderOpen, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import styled from 'styled-components';
import last from 'lodash/last';
import PropTypes from 'prop-types';
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
`;

const NodeIcon = styled.div`
  font-size: 12px;
  margin-right: ${props => (props.marginRight ? props.marginRight : 5)}px;
`;

const getNodeLabel = node => last(node.uri.split('/'));

const AssetNode = props => {
  const { node, level, onToggle } = props;

  return (
    <>
      <StyledTreeNode level={level} type={node.type}>
        <NodeIcon onClick={() => onToggle(node)}>
          {node.type === Constants.AssetType.DIRECTORY &&
            (node.isOpen ? <FaChevronDown /> : <FaChevronRight />)}
        </NodeIcon>

        <NodeIcon marginRight={10}>
          {node.type === Constants.AssetType.FILE && <FaFile />}
          {node.type === Constants.AssetType.DIRECTORY && node.isOpen === true && <FaFolderOpen />}
          {node.type === Constants.AssetType.DIRECTORY && !node.isOpen && <FaFolder />}
        </NodeIcon>

        <span role="button">{getNodeLabel(node)}</span>
      </StyledTreeNode>

      {node.isOpen &&
        (!node.children
          ? null
          : node.children.map(childNode => (
              <AssetNode
                key={childNode.uri}
                node={childNode}
                level={level + 1}
                onToggle={onToggle}
              />
            )))}
    </>
  );
};

AssetNode.propTypes = {
  node: PropTypes.object.isRequired,
  level: PropTypes.number,
  onToggle: PropTypes.func
};

AssetNode.defaultProps = {
  onToggle: null,
  level: 0
};

export default AssetNode;
