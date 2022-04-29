// import { style } from 'd3-selection';
import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import WorkflowUtil from '../../../utils/workflow';
import DependencyFilter from '../../Filter/Filter';
import styles from './DependencyGraph.css';
import Constants from '../../../constants/constants';

const ICON_PATH = 'image://./images/';

const ICON_TYPES = {
  PYTHON: `${ICON_PATH}python.svg`,
  R: `${ICON_PATH}r.svg`,
  SAS: `${ICON_PATH}sas.svg`,
  STATA: `${ICON_PATH}stata.png`,
  GENERIC: `${ICON_PATH}generic.svg`,
  LIBRARY: `${ICON_PATH}library.svg`,
  DATA: `${ICON_PATH}data.svg`,
  FIGURE: `${ICON_PATH}figure.svg`
};

/**
 * Component that renders a code file
 * @param {Object} props component props to render.
 */
function getIcon(node) {
  let iconUrl = ICON_TYPES.GENERIC;
  if (node.value === 'python') {
    iconUrl = ICON_TYPES.PYTHON;
  } else if (node.value === 'r') {
    iconUrl = ICON_TYPES.R;
  } else if (node.value === 'sas') {
    iconUrl = ICON_TYPES.SAS;
  } else if (node.value === 'stata') {
    iconUrl = ICON_TYPES.STATA;
  } else if (node.value === 'dependency') {
    iconUrl = ICON_TYPES.LIBRARY;
  } else if (node.value === Constants.DependencyType.DATA) {
    iconUrl = ICON_TYPES.DATA;
  } else if (node.value === Constants.DependencyType.FIGURE) {
    iconUrl = ICON_TYPES.FIGURE;
  }
  return iconUrl;
}

const dependencyGraphEChart = props => {
  const { assets } = props;
  const [graphData, setGraphData] = useState(null);

  useEffect(() => {
    if (assets) {
      setGraphData(WorkflowUtil.getAllDependenciesAsEChartGraph(assets));
    } else {
      setGraphData(null);
    }
  }, [assets]);

  // Whenever the filter changes, update the list of assets to include only
  // those that should be displayed.
  const handleFilterChanged = filter => {
    if (assets) {
      setGraphData(WorkflowUtil.getAllDependenciesAsEChartGraph(assets, filter));
    } else {
      setGraphData(null);
    }
  };

  let graph = null;
  if (graphData && graphData.nodes && graphData.nodes.length > 0) {
    const option = {
      tooltip: {},
      series: [
        {
          type: 'graph',
          layout: 'force',
          roam: true,
          label: {
            show: true,
            position: 'right',
            formatter: '{b}'
          },
          labelLayout: {
            hideOverlap: false
          },
          force: { repulsion: 100, edgeLength: 50 },
          data: graphData.nodes.map(x => ({ ...x, symbol: getIcon(x) })),
          links: graphData.links
        }
      ]
    };
    graph = <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />;
  }
  return (
    <div className={styles.container}>
      <div className={styles.filter}>
        <DependencyFilter assets={assets} mode="dependency" onFilterChanged={handleFilterChanged} />
      </div>
      <div className={styles.graph}>{graph}</div>
    </div>
  );
};

export default dependencyGraphEChart;
