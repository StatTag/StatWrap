/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { IconButton } from '@material-ui/core';
import { FaTrash, FaEdit } from 'react-icons/fa';
import styled from 'styled-components';
import DataTable from 'react-data-table-component';
import GeneralUtil from '../../../utils/general';
import styles from './PeopleTable.css';

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
      placeholder="Search people"
      aria-label="Search Input"
      value={filterText}
      onChange={onFilter}
    />
    <ClearButton type="button" onClick={onClear}>
      X
    </ClearButton>
  </>
);

const peopleTable = props => {
  const { mode, list, onEdit, onDelete } = props;
  const [filterText, setFilterText] = React.useState('');

  const subHeaderComponentMemo = React.useMemo(() => {
    const handleClear = () => {
      if (filterText) {
        setFilterText('');
      }
    };

    return (
      <FilterComponent
        onFilter={e => setFilterText(e.target.value)}
        onClear={handleClear}
        filterText={filterText}
      />
    );
  }, [filterText]);

  let columns = [
    {
      name: 'Name',
      selector: 'displayName',
      sortable: true
    },
    {
      name: 'E-mail',
      selector: 'email',
      sortable: true
    },
    {
      name: 'Affiliation',
      selector: 'affiliation',
      sortable: true
    },
    {
      name: 'Roles',
      selector: 'displayRoles',
      sortable: true,
      wrap: true
    },
    {
      key: 'edit',
      compact: true,
      width: '5%',
      sortable: false,
      cell: record => {
        return (
          <IconButton
            onClick={() => {
              if (onEdit && record) {
                onEdit(record);
              }
            }}
            aria-label="delete"
            className={styles.action}
          >
            <FaEdit fontSize="small" />
          </IconButton>
        );
      }
    },
    {
      key: 'delete',
      compact: true,
      width: '5%',
      sortable: false,
      cell: record => {
        return (
          <IconButton
            onClick={() => {
              if (onDelete && record && record.id) {
                onDelete(record.id);
              }
            }}
            aria-label="delete"
            className={styles.action}
          >
            <FaTrash fontSize="small" />
          </IconButton>
        );
      }
    }
  ];

  // Remove the 'roles' column if we aren't displaying for a project.
  if (mode.toLowerCase() !== 'project') {
    columns = columns.filter(item => {
      return !item.selector || item.selector !== 'displayRoles';
    });
  }

  let contents = <div className={styles.empty}>No people have been added to this project yet</div>;
  if (list) {
    const data = list
      .map(p => {
        return {
          ...p,
          displayName: GeneralUtil.formatName(p.name),
          displayRoles: p.roles ? p.roles.join(', ') : ''
        };
      })
      .filter(
        f =>
          filterText === '' ||
          (f.displayName && f.displayName.toLowerCase().includes(filterText.toLowerCase())) ||
          (f.email && f.email.toLowerCase().includes(filterText.toLowerCase())) ||
          (f.affiliation && f.affiliation.toLowerCase().includes(filterText.toLowerCase())) ||
          (f.displayRoles && f.displayRoles.toLowerCase().includes(filterText.toLowerCase()))
      );
    contents = (
      <DataTable
        title="People"
        columns={columns}
        data={data}
        striped
        subHeader
        subHeaderComponent={subHeaderComponentMemo}
      />
    );
  }

  return <div className={styles.container}>{contents}</div>;
};

peopleTable.propTypes = {
  list: PropTypes.array,
  mode: PropTypes.string.isRequired,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func
};

peopleTable.defaultProps = {
  list: [],
  onEdit: null,
  onDelete: null
};

export default peopleTable;
