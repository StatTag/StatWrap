/* eslint-disable react/prop-types */
/* eslint-disable valid-jsdoc */
import React from 'react';
import styles from './CodeNode.css';

const ICON_PATH = './images/';

const ICON_TYPES = {
  PYTHON: `${ICON_PATH}python.svg`,
  R: `${ICON_PATH}r.svg`,
  SAS: `${ICON_PATH}sas.svg`,
  STATA: `${ICON_PATH}stata.png`,
  GENERIC: `${ICON_PATH}generic.svg`,
  LIBRARY: `${ICON_PATH}library.svg`
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
  } else if (node.assetType === 'dependency') {
    iconUrl = ICON_TYPES.LIBRARY;
  }

  let element = (
    <div className={styles.container}>
      <div className={styles.icon} style={{ backgroundImage: `url('${iconUrl}')` }} />
    </div>
  );
  if (renderType === 'svg') {
    element = (
      <g fill="white">
        <image x="-12" y="-12" wiidth="24" height="24" href={iconUrl} />
        <text fill="black" strokeWidth="1" x="28" y="5">
          {node.name}
        </text>
      </g>
    );
  }
  return element;
}

export default CodeNode;
