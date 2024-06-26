import React from 'react';
import PropTypes from 'prop-types';
import ChecklistItem from './ChecklistItem';

const dummyChecklistItems = [
  {
    id: '1',
    statement: 'First checklist item statement',
    type: 'Type1',
    answer: 'yes',
    userNotes: [
      {
        id: 'note1',
        author: 'Author1',
        updated: '2024-06-01',
        content: 'First note content',
      },
    ],
    attachedImages: [],
    attachedURLs: [],
    subChecklists: [],
    updated: '2024-06-01',
  },
  {
    id: '2',
    statement: 'Second checklist item statement',
    type: 'Type2',
    answer: 'no',
    userNotes: [
      {
        id: 'note2',
        author: 'Author2',
        updated: '2024-06-02',
        content: 'Second note content',
      },
    ],
    attachedImages: [],
    attachedURLs: [],
    subChecklists: [],
    updated: '2024-06-02',
  },
];

function ReproChecklists(props) {
  const { project, checklistItems, onUpdatedNote, onDeletedNote, onAddedNote } = props;

  return (
    <div>
      {checklistItems.map(item => (
        <ChecklistItem
          key={item.id}
          item={item}
          project={project}
          onUpdatedNote={onUpdatedNote}
          onDeletedNote={onDeletedNote}
          onAddedNote={onAddedNote}
        />
      ))}
    </div>
  );
}

ReproChecklists.propTypes = {
  project: PropTypes.object.isRequired,
  checklistItems: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      statement: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      answer: PropTypes.string.isRequired,
      userNotes: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          author: PropTypes.string.isRequired,
          updated: PropTypes.string.isRequired,
          content: PropTypes.string.isRequired,
        })
      ),
      attachedImages: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          data: PropTypes.instanceOf(Blob).isRequired,
          updated: PropTypes.string.isRequired,
        })
      ),
      attachedURLs: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          hyperlink: PropTypes.string.isRequired,
          updated: PropTypes.string.isRequired,
        })
      ),
      subChecklists: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          statement: PropTypes.string.isRequired,
          type: PropTypes.string.isRequired,
          answer: PropTypes.string.isRequired,
          updated: PropTypes.string.isRequired,
        })
      ),
      updated: PropTypes.string.isRequired,
    })
  ).isRequired,
  onUpdatedNote: PropTypes.func.isRequired,
  onDeletedNote: PropTypes.func.isRequired,
  onAddedNote: PropTypes.func.isRequired,
};

ReproChecklists.defaultProps = {
  checklistItems: dummyChecklistItems,
};

export default ReproChecklists;
