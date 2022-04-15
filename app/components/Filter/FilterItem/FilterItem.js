/* eslint-disable jsx-a11y/label-has-associated-control */
import React from 'react';
import styles from './FilterItem.css';

const filterItem = props => {
  const { disabled, onChecked, category, filter } = props;
  const [checked, setChecked] = React.useState(true);

  React.useEffect(() => {
    if (onChecked) {
      onChecked(category, filter, checked);
    }
  }, [checked]);

  const handleChange = () => {
    setChecked(!checked);
  };

  return (
    <label className={styles.container}>
      <input
        className={styles.filterCheck}
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
      />{' '}
      {props.label}
    </label>
  );
};

export default filterItem;
