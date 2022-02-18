/* eslint-disable jsx-a11y/label-has-associated-control */
import React from 'react';
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
  }, [props.assets]);

  const handleFilterChecked = (category, filterKey, value) => {
    const categoryIndex = filter.findIndex(x => x.category === category);
    if (categoryIndex === -1) {
      return;
    }

    console.log(filter[categoryIndex]);
    const filterIndex = filter[categoryIndex].values.findIndex(x => x === filterKey);
    if (filterIndex === -1) {
      return;
    }

    console.log(filterIndex);
  };

  const filterElements = [];
  filter.forEach(x => {
    const valueElements = x.values.map(val => {
      return (
        <FilterItem
          onChecked={handleFilterChecked}
          key={val}
          filter={val}
          category={x.category}
          label={val}
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
