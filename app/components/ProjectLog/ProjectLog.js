/* eslint-disable react/forbid-prop-types */
import React, { useEffect, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@mui/material';
import styled from 'styled-components';
import DataTable from 'react-data-table-component';
import Error from '../Error/Error';
import ProjectLogRow from './ProjectLogRow/ProjectLogRow';
import GeneralUtil from '../../utils/general';
import styles from './ProjectLog.css';

const columns = [
  {
    name: 'Date/Time',
    selector: 'datetime',
    sortable: true
  },
  {
    name: 'Event',
    selector: 'title',
    sortable: true,
    grow: 3,
    wrap: true,
    cell: row => (
      <div>
        <div style={{ fontWeight: 700, paddingBottom: '5px' }}>{row.title}</div>
        {row.description}
      </div>
    )
  }
];

const TextField = styled.input`
  height: 32px;
  width: 200px;
  border-radius: 3px;
  border-top-left-radius: 5px;
  border-bottom-left-radius: 5px;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border: 1px solid #e5e5e5;
  padding: 0 32px 0 16px;
  &:hover {
    cursor: pointer;
  }
`;

const ClearButton = styled.button`
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  border-top-right-radius: 5px;
  border-bottom-right-radius: 5px;
  height: 34px;
  width: 32px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
`;

// eslint-disable-next-line react/prop-types
const FilterComponent = ({ filterText, onFilter, onClear }) => (
  <>
    <TextField
      id="search"
      type="text"
      placeholder="Search logs"
      aria-label="Search Input"
      value={filterText}
      onChange={onFilter}
    />
    <ClearButton type="button" onClick={onClear}>
      X
    </ClearButton>
  </>
);

const projectLog = props => {
  const [filterText, setFilterText] = useState('');
  const [expandAll, setExpandAll] = useState(false);
  const { feed, error } = props;
  const [pending, setPending] = useState(true);

  const subHeaderComponentMemo = useMemo(() => {
    const handleClear = () => {
      if (filterText) {
        setFilterText('');
      }
    };

    return (
      <>
        <div className={styles.headerButton}>
          <Button onClick={() => setExpandAll(true)}>Expand All</Button>
          <Button onClick={() => setExpandAll(false)}>Collapse All</Button>
        </div>
        <FilterComponent
          onFilter={e => setFilterText(e.target.value)}
          onClear={handleClear}
          filterText={filterText}
        />
      </>
    );
  }, [filterText]);

  useEffect(() => {
    setPending(!props.feed && !props.error);
  }, [props.feed, props.error]);

  let contents = <div className={styles.empty}>There are no actions or notifications to show</div>;
  if (feed) {
    const data = feed
      .map(f => {
        return { ...f, datetime: GeneralUtil.formatDateTime(f.timestamp) };
      })
      .filter(
        f =>
          filterText === '' ||
          (f.type && f.type.toLowerCase().includes(filterText.toLowerCase())) ||
          (f.title && f.title.toLowerCase().includes(filterText.toLowerCase())) ||
          (f.description && f.description.toLowerCase().includes(filterText.toLowerCase()))
      );
    contents = (
      <DataTable
        title="Project Log"
        columns={columns}
        data={data}
        striped
        progressPending={pending}
        expandableRows
        expandableRowsComponent={<ProjectLogRow />}
        expandableRowExpanded={() => expandAll}
        subHeader
        subHeaderComponent={subHeaderComponentMemo}
      />
    );
  } else if (error) {
    contents = <Error>There was an error loading the project log: {error}</Error>;
  }
  return <div className={styles.container}>{contents}</div>;
};

projectLog.propTypes = {
  project: PropTypes.object.isRequired,
  feed: PropTypes.arrayOf(PropTypes.object),
  error: PropTypes.string
};

projectLog.defaultProps = {
  feed: null,
  error: null
};

export default projectLog;
