import React from 'react';
import styles from './CodeNode.css';
import Constants from '../../../../../constants/constants';

const ICON_PATH = './images/';

const ICON_TYPES = {
  PYTHON: `${ICON_PATH}python.svg`,
  R: `${ICON_PATH}r.svg`,
  SAS: `${ICON_PATH}sas.svg`,
  STATA: `${ICON_PATH}stata.png`,
  JAVASCRIPT: `${ICON_PATH}js.svg`,
  TYPESCRIPT: `${ICON_PATH}ts.svg`,
  CPP: `${ICON_PATH}cpp.svg`,
  GENERIC: `${ICON_PATH}generic.svg`,
  LIBRARY: `${ICON_PATH}library.svg`,
  DATA: `${ICON_PATH}data.svg`,
  FIGURE: `${ICON_PATH}figure.svg`,
  RUST: `${ICON_PATH}rust.svg`,
  DART: `${ICON_PATH}dart.svg`,
  SQL: `${ICON_PATH}sql.svg`,
  GO: `${ICON_PATH}go.svg`,
  C: `${ICON_PATH}c.svg`,
  SCALA: `${ICON_PATH}scala.svg`,
  JULIA: `${ICON_PATH}julia.svg`,
};

/**
 * Component that renders a code file
 * @param {Object} props component props to render.
 */
function CodeNode({ node, renderType }) {
  let iconUrl = ICON_TYPES.GENERIC;
  if (node.assetType === 'python') {
    iconUrl = ICON_TYPES.PYTHON;
  } else if (node.assetType === 'r') {
    iconUrl = ICON_TYPES.R;
  } else if (node.assetType === 'sas') {
    iconUrl = ICON_TYPES.SAS;
  } else if (node.assetType === 'stata') {
    iconUrl = ICON_TYPES.STATA;
  } else if (node.assetType === 'javascript') {
    iconUrl = ICON_TYPES.JAVASCRIPT;
  } else if (node.assetType === 'typescript') {
    iconUrl = ICON_TYPES.TYPESCRIPT;
  } else if (node.assetType === 'cpp') {
    iconUrl = ICON_TYPES.CPP;
  } else if (node.assetType === 'rust') {
    iconUrl = ICON_TYPES.RUST;
  } else if (node.assetType === 'java') {
    iconUrl = ICON_TYPES.JAVA;
  } else if (node.assetType === 'dependency') {
    iconUrl = ICON_TYPES.LIBRARY;
  } else if (node.assetType === 'sql') {
    iconUrl = ICON_TYPES.SQL;
  } else if (node.assetType === 'go') {
    iconUrl = ICON_TYPES.GO;
  } else if (node.assetType === 'c') {
    iconUrl = ICON_TYPES.C;    
  } else if (node.assetType === 'dart') {
    iconUrl = ICON_TYPES.DART;
  } else if (node.assetType === 'scala') {
    iconUrl = ICON_TYPES.SCALA;
  } else if (node.assetType === 'julia') {
    iconUrl = ICON_TYPES.JULIA;
  } else if (node.assetType === Constants.DependencyType.DATA) {
    iconUrl = ICON_TYPES.DATA;
  } else if (node.assetType === Constants.DependencyType.FIGURE) {
    iconUrl = ICON_TYPES.FIGURE;
  }

  let element = (
    <div className={styles.container}>
      <div className={styles.icon} style={{ backgroundImage: `url('${iconUrl}')` }} />
    </div>
  );
  if (renderType === 'svg') {
    element = (
      <g fill="white">
        <image x="-12" y="-12" width="24" height="24" href={iconUrl} />
        <text fill="black" strokeWidth="1" x="28" y="5">
          {node.name}
        </text>
      </g>
    );
  }
  return element;
}

export default CodeNode;
