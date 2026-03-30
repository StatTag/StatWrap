import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import PropTypes from 'prop-types';
import WorkflowUtil from '../../../utils/workflow';
import ProjectUtil from '../../../utils/project';
import AssetUtil from '../../../utils/asset';
import DependencyFilter from '../../Filter/Filter';
import styles from './DependencyGraph.css';
import Constants from '../../../constants/constants';

const ICON_PATH = 'image://./images/';

const ICON_TYPES = {
  PYTHON: `${ICON_PATH}python.svg`,
  R: `${ICON_PATH}r.svg`,
  SAS: `${ICON_PATH}sas.svg`,
  STATA: `${ICON_PATH}stata.png`,
  CPP: `${ICON_PATH}cpp.svg`,
  JAVA: `${ICON_PATH}java.svg`,
  GENERIC: `${ICON_PATH}generic.svg`,
  LIBRARY: `${ICON_PATH}library.svg`,
  DATA: `${ICON_PATH}data.svg`,
  FIGURE: `${ICON_PATH}figure.svg`,
  RUST: `${ICON_PATH}rust.svg`,
  SQL: `${ICON_PATH}sql.svg`,
  GO: `${ICON_PATH}go.svg`,
  C: `${ICON_PATH}c.svg`,
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
  } else if (node.value === 'cpp') {
    iconUrl = ICON_TYPES.CPP;
  } else if (node.value === 'java') {
    iconUrl = ICON_TYPES.JAVA;
  } else if (node.value === 'dependency') {
    iconUrl = ICON_TYPES.LIBRARY;
  } else if(node.value === 'rust'){
    iconUrl = ICON_TYPES.RUST;
  } else if (node.value === 'sql') {
    iconUrl = ICON_TYPES.SQL;
  } else if (node.value === 'go') {
    iconUrl = ICON_TYPES.GO;
  } else if (node.value === 'c') {
    iconUrl = ICON_TYPES.C;
  } else if (node.value === Constants.DependencyType.DATA) {
    iconUrl = ICON_TYPES.DATA;
  } else if (node.value === Constants.DependencyType.FIGURE) {
    iconUrl = ICON_TYPES.FIGURE;
  }
  return iconUrl;
}

function DependencyGraphEChart(props) {
  const { assets, zoomLevel } = props;
  const [graphData, setGraphData] = useState(null);
  const [filter, setFilter] = useState([]);

  const resetFilter = () => {
    if (assets) {
      const archivedFilteredAssets = WorkflowUtil.filterArchivedAssets(assets);
      const filteredAssets = AssetUtil.filterIncludedFileAssets(archivedFilteredAssets);
      setFilter(ProjectUtil.getWorkflowFilters(filteredAssets));
      setGraphData(WorkflowUtil.getAllDependenciesAsEChartGraph(filteredAssets));
    } else {
      setGraphData(null);
    }
  };

  useEffect(() => {
    resetFilter();
  }, [assets]);

  // Whenever the filter changes, update the list of assets to include only
  // those that should be displayed.
  const handleFilterChanged = (updatedFilter) => {
    if (assets) {
      const filteredAssets = WorkflowUtil.filterArchivedAssets(assets);
      setFilter(updatedFilter);
      setGraphData(WorkflowUtil.getAllDependenciesAsEChartGraph(filteredAssets, updatedFilter));
    } else {
      setGraphData(null);
    }
  };

  const handleFilterReset = () => {
    resetFilter();
  };

  let graph = null;
  if (graphData && graphData.nodes && graphData.nodes.length > 0) {
    const option = {
      tooltip: {
        formatter(params) {
          if (params.data.direction) {
            return `<b>Direction</b>: ${params.data.direction}<br/><b>Name</b>: ${params.data.fullName}`;
          }
          if (params.data.source && params.data.target) {
            return `<b>Source</b>: ${params.data.source}<br/><b>Target</b>: ${params.data.target}`;
          }
          return `${params.data.fullName}`;
        },
        confine: true,
        textStyle: {
          overflow: 'breakAll',
          width: 200,
        },
      },
      series: [
        {
          type: 'graph',
          layout: 'force',
          roam: true,
          zoom: zoomLevel, // Apply zoom level
          label: {
            show: true,
            position: 'right',
            formatter: '{b}',
          },
          labelLayout: {
            hideOverlap: false,
          },
          force: { repulsion: 100, edgeLength: 50 },
          data: graphData.nodes.map((x) => ({ ...x, symbol: getIcon(x) })),
          links: graphData.links,
        },
      ],
    };
    graph = <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.filter}>
        <DependencyFilter
          filter={filter}
          mode="dependency"
          onFilterChanged={handleFilterChanged}
          onFilterReset={handleFilterReset}
        />
      </div>
      <div className={styles.graph}>{graph}</div>
    </div>
  );
}

DependencyGraphEChart.propTypes = {
  assets: PropTypes.object,
  zoomLevel: PropTypes.number,
};

DependencyGraphEChart.defaultProps = {
  assets: null,
  zoomLevel: 1,
};

export default DependencyGraphEChart;
