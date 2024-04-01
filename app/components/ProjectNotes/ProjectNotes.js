/* eslint-disable react/forbid-prop-types */
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import DataTable from 'react-data-table-component';
import Error from '../Error/Error';
import GeneralUtil from '../../utils/general';
import AssetUtil from '../../utils/asset';
import styles from './ProjectNotes.css';
import NoteEditor from '../NoteEditor/NoteEditor';
import { Typography } from '@mui/material';

const columns = [
  {
    name: 'Type',
    selector: 'type',
    sortable: true,
  },
  {
    name: 'URI',
    selector: 'uri',
    sortable: true,
    grow: 3,
    wrap: true,
  },
  {
    name: 'Date/Time',
    selector: 'updated',
    sortable: true,
  },
  {
    name: 'Author',
    selector: 'author',
    sortable: true,
  },
  {
    name: 'Note',
    selector: 'content',
    sortable: true,
    grow: 3,
    wrap: true,
    // Only way I could figure out to get it to prioritize my white-space CSS setting.
    cell: (row) => (
      <span style={{ whiteSpace: 'pre-wrap', paddingBottom: '5px', paddingTop: '5px' }}>
        {row.content}
      </span>
    ),
  },
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
function FilterComponent({ filterText, onFilter, onClear }) {
  return (
    <>
      <TextField
        id="search"
        type="text"
        placeholder="Search notes"
        aria-label="Search Input"
        value={filterText}
        onChange={onFilter}
      />
      <ClearButton type="button" onClick={onClear}>
        <FontAwesomeIcon icon="times" size="sm" />
      </ClearButton>
    </>
  );
}

function projectNotes(props) {
  const [filterText, setFilterText] = React.useState('');
  const [pending, setPending] = useState(true);
  const [feed, setFeed] = useState(null);
  const [error, setError] = useState(null);

  const updatedNoteHandler = (note, text) => {
    if (note) {
      if (props.onUpdatedNote) {
        props.onUpdatedNote(props.project, text, note);
      }
    } else if (props.onAddedNote) {
      props.onAddedNote(props.project, text);
    }
  };

  const deleteNoteHandler = (note) => {
    if (props.onDeletedNote) {
      props.onDeletedNote(props.project, note);
    }
  };

  const subHeaderComponentMemo = React.useMemo(() => {
    const handleClear = () => {
      if (filterText) {
        setFilterText('');
      }
    };

    return (
      <FilterComponent
        onFilter={(e) => setFilterText(e.target.value)}
        onClear={handleClear}
        filterText={filterText}
      />
    );
  }, [filterText]);

  useEffect(() => {
    setPending(false);

    if (props.project) {
      let mappedProjectNotes = [];
      if (props.project.notes) {
        mappedProjectNotes = props.project.notes.map((n) => {
          return { type: 'Project', updated: n.updated, author: n.author, content: n.content };
        });
      }

      let mappedAssetNotes = [];
      if (props.project.assets) {
        mappedAssetNotes = AssetUtil.getAllNotes(props.project.assets).map((n) => {
          return {
            type: 'Asset',
            uri: n.uri,
            updated: n.updated,
            author: n.author,
            content: n.content,
          };
        });
      }

      const mappedPersonNotes = [];
      if (props.project.people) {
        props.project.people.forEach((p) => {
          if (p && p.notes) {
            p.notes.forEach((n) =>
              mappedPersonNotes.push({
                type: 'Person',
                uri: GeneralUtil.formatName(p.name),
                updated: n.updated,
                author: n.author,
                content: n.content,
              }),
            );
          }
        });
      }

      // If any of our notes collections are set, build up a combined collection
      // of the notes.  Otherwise set the feed explicitly to null so we know to
      // render it as empty.
      if (
        mappedAssetNotes.length > 0 ||
        mappedProjectNotes.length > 0 ||
        mappedPersonNotes.length > 0
      ) {
        setFeed([...mappedProjectNotes, ...mappedAssetNotes, ...mappedPersonNotes]);
      } else {
        setFeed(null);
      }
      return;
    }
    setFeed(null);
  }, [props.project]);

  let contents = (
    <div className={styles.empty}>
      There are no notes to show
      <Typography variant="h6" className={styles.addTitle}>Add Project Notes</Typography>
      <NoteEditor notes={[]} onEditingComplete={updatedNoteHandler} onDelete={deleteNoteHandler} />
    </div>
  );
  if (feed) {
    const data = feed
      .map((f) => {
        return { ...f, datetime: GeneralUtil.formatDateTime(f.timestamp) };
      })
      .filter(
        (f) =>
          filterText === '' ||
          (f.content && f.content.toLowerCase().includes(filterText.toLowerCase())) ||
          (f.author && f.author.toLowerCase().includes(filterText.toLowerCase())) ||
          (f.uri && f.uri.toLowerCase().includes(filterText.toLowerCase())),
      );
    contents = (
      <>
        <Typography variant="h6" className={styles.addTitle}>Add Project Notes</Typography>
        <NoteEditor notes={[]} onEditingComplete={updatedNoteHandler} onDelete={deleteNoteHandler} />
        <DataTable
          title="Notes"
          columns={columns}
          data={data}
          striped
          progressPending={pending}
          subHeader
          subHeaderComponent={subHeaderComponentMemo}
        />
      </>
    );
  } else if (error) {
    contents = <Error>There was an error loading the notes: {error}</Error>;
  }
  return <div className={styles.container}>{contents}</div>;
}

projectNotes.propTypes = {
  project: PropTypes.object.isRequired,
};

export default projectNotes;
