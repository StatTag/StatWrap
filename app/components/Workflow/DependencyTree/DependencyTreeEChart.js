import React from 'react';
import ReactECharts from 'echarts-for-react';
import WorkflowUtil from '../../../utils/workflow';
import styles from './DependencyTree.css';

const dependencyGraphEChart = props => {
  const { assets } = props;

  const data = WorkflowUtil.getAllDependenciesAsTree(assets);
  let tree = null;
  if (data) {
    console.log(data);
    const option = {
      tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove'
      },
      series: [
        {
          type: 'tree',
          id: 0,
          name: 'tree1',
          data: [data],
          edgeShape: 'polyline',
          edgeForkPosition: '63%',
          initialTreeDepth: 2,
          label: {
            position: 'left',
            align: 'right'
          },
          leaves: {
            label: {
              position: 'right',
              align: 'left'
            }
          }
        }
      ]
    };
    tree = <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />;
  }
  return <div className={styles.container}>{tree}</div>;
};

export default dependencyGraphEChart;
