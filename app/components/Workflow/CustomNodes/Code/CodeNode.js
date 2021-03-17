/* eslint-disable react/prop-types */
/* eslint-disable valid-jsdoc */
import React from 'react';
import styles from './CodeNode.css';

const ICON_PATH = './images/';

const ICON_TYPES = {
  PYTHON: `${ICON_PATH}python.svg`,
  GENERIC: `${ICON_PATH}generic.svg`,
  LIBRARY: `${ICON_PATH}library.svg`
};

/**
 * Component that renders a code file
 * @param {Object} props component props to render.
 */
function CodeNode({ node }) {
  let iconUrl = ICON_TYPES.GENERIC;
  if (node.assetType === 'python') {
    iconUrl = ICON_TYPES.PYTHON;
  } else if (node.assetType === 'dependency') {
    iconUrl = ICON_TYPES.LIBRARY;
  }
  return (
    <div className={styles.container}>
      <div className={styles.icon} style={{ backgroundImage: `url('${iconUrl}')` }} />
    </div>
  );
}

export default CodeNode;
