/* eslint-disable jsx-a11y/label-has-associated-control */
import React from 'react';
import hash from 'object-hash';
import FilterItem from './FilterItem/FilterItem';
import styles from './Filter.css';
import ProjectUtil from '../../utils/project';

const filterComponent = props => {
  const [filter, setFilter] = React.useState([]);
  React.useEffect(() => {
    if (props.assets) {
      if (props.mode === 'asset') {
        setFilter(ProjectUtil.getAssetFilters(props.assets));
      } else if (props.mode === 'dependency') {
        setFilter(ProjectUtil.getWorkflowFilters(props.assets));
      }
    }
    // Only update on the hash change, otherwise this will trigger even
    // when the underlying assets prop hasn't changed
  }, [hash(props.assets)]);

  const handleFilterChecked = (category, filterKey, value) => {
    const categoryIndex = filter.findIndex(x => x.category === category);
    if (categoryIndex === -1) {
      return;
    }

    const filterIndex = filter[categoryIndex].values.findIndex(x => x.key === filterKey);
    if (filterIndex === -1) {
      return;
    }

    filter[categoryIndex].values[filterIndex].value = value;
    setFilter(filter);

    if (props.onFilterChanged) {
      props.onFilterChanged(filter);
    }
  };

  const filterElements = [];
  filter.forEach(x => {
    const valueElements = x.values.map(f => {
      return (
        <FilterItem
          onChecked={handleFilterChecked}
          key={f.key}
          filter={f.key}
          category={x.category}
          label={f.label}
          disabled={props.disabled}
        />
      );
    });
    filterElements.push(
      <div className={styles.category} key={x.category}>
        <div className={styles.categoryHeader}>{x.category}</div>
        <div className={styles.categoryList}>{valueElements}</div>
      </div>
    );
  });

  return <div className={styles.container}>{filterElements}</div>;
};

export default filterComponent;
