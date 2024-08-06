import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import ChecklistItem from './ChecklistItem';
import { Typography } from '@mui/material';
// /home/adi/Pictures/Screenshots/maskedvt.png
const dummyChecklistItems = [
  {
    id: '1',
    statement: 'First checklist item statement. Now, I am just trying to make this statement a bit longer to see how it looks in the UI, without making any sense.',
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
    attachedImages: [
      {
        id: 'image1',
        uri: '/home/adi/Pictures/Screenshots/maskedvt.png',
        title: 'Dummy Image',
        description: 'This is a dummy image description',
        updated: '2024-06-09',
      },
      {
        id: 'image1',
        uri: '/home/adi/Pictures/Screenshots/maskedvt.png',
        title: 'Dummy Image',
        description: 'This is a dummy image description',
        updated: '2024-06-09',
      },
      {
        id: 'image1',
        uri: '/home/adi/Pictures/Screenshots/maskedvt.png',
        title: 'Dummy Image',
        description: 'This is a dummy image description',
        updated: '2024-06-09',
      },
    ],
    attachedURLs: [
      {
        id: 'url1',
        hyperlink: 'https://github.com/StatTag/StatWrap/blob/master/app/services/user.js',
        title: 'StatWrap URL',
        description: 'This is URL description',
        updated: '2024-06-09',
      },
      {
        id: 'url1',
        hyperlink: 'https://github.com/StatTag/StatWrap/blob/master/app/services/user.js',
        title: 'StatWrap URL',
        description: 'This is URL description',
        updated: '2024-06-09',
      },
      {
        id: 'url1',
        hyperlink: 'https://github.com/StatTag/StatWrap/blob/master/app/services/user.js',
        title: 'StatWrap URL',
        description: 'This is URL description',
        updated: '2024-06-09',
      },
    ],
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
  const { project, reproChecklist, onUpdatedNote, onDeletedNote, onAddedNote } = props;
  const [checklistItems, setChecklistItems] = useState(dummyChecklistItems);

  useEffect(() => {
    if (project && Array.isArray(project.assets)) {
      const imageAssets = [];

      const findImageAssets = (asset) => {
        if (asset.type === 'image') {
          imageAssets.push(asset);
        }
        if (asset.children) {
          asset.children.forEach(findImageAssets);
        }
      };

      project.assets.forEach(findImageAssets);

      const updatedItems = dummyChecklistItems.map(item => ({
        ...item,
        attachedImages: imageAssets.map(asset => ({
          id: asset.id,
          uri: asset.uri,
          title: asset.title || 'Image',
          description: asset.description || 'About Image',
          updated: asset.updated || 'NA',
        })),
      }));

      setChecklistItems(updatedItems);
    }
  }, [project]);

  return (
    <div>
      <Typography variant='h5' align='center'>Reproducibility Checklists</Typography>
      <br />
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
  reproChecklist: PropTypes.arrayOf(
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
          uri: PropTypes.string.isRequired,
          title: PropTypes.string.isRequired,
          description: PropTypes.string.isRequired,
          updated: PropTypes.string.isRequired,
        })
      ),
      attachedURLs: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          hyperlink: PropTypes.string.isRequired,
          title: PropTypes.string.isRequired,
          description: PropTypes.string.isRequired,
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
  reproChecklist: dummyChecklistItems,
};

export default ReproChecklists;
