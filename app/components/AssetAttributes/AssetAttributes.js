import React from 'react';
import { Checkbox, FormControlLabel } from '@material-ui/core';
import styles from './AssetAttributes.css';

const assetAttributes = props => {
  const { asset, configuration, onUpdateAttribute } = props;
  const updateAttributeValue = a => {
    if (onUpdateAttribute) {
      onUpdateAttribute(a.target.name, a.target.checked);
    }
  };

  const applicableAttributes = configuration
    .map(a => {
      // If the attribute doesn't apply to this asset, skip it
      if (!a.appliesTo.includes(a.contentType) && !a.appliesTo.includes('*')) {
        return null;
      }
      return a;
    })
    .filter(a => a !== null);

  let controls = null;
  if (asset) {
    controls = applicableAttributes.map(a => {
      let control = <span>{a.display}</span>;
      if (a.type === 'bool') {
        const value =
          asset.attributes && asset.attributes[a.id] !== undefined
            ? asset.attributes[a.id]
            : a.default;
        control = (
          <FormControlLabel
            label={a.display}
            control={
              <Checkbox
                checked={value}
                color="primary"
                size="small"
                name={a.id}
                onChange={updateAttributeValue}
              />
            }
          />
        );
      }
      return <li key={a.id}>{control}</li>;
    });
  }

  return (
    <div className={styles.container}>
      <ul className={styles.attributesList}>{controls}</ul>
    </div>
  );
};

export default assetAttributes;
