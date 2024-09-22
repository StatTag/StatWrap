import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import ChecklistItem from './ChecklistItem';
import { Typography } from '@mui/material';

const path = require('path');
const AssetsConfig = require('../../constants/assets-config');

const reproducibilityChecklist = [
  {
    id: '1',
    statement: 'First checklist item statement. Now, I am just trying to make this statement a bit longer to see how it looks in the UI, without making any sense.',
    answer: true,
    scanResult: {},
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
  },
  {
    id: '2',
    statement: 'Second checklist item statement.',
    answer: false,
    scanResult: {},
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
  },
  {
    id: '3',
    statement: 'List of all the languages used and the dependencies of the project.',
    answer: true,
    scanResult: {},
    userNotes: [],
    attachedImages: [],
    attachedURLs: [],
    subChecklists:[
      {
        id: '3.1',
        statement: 'Are all the languages used in the project listed?',
        answer: true,
      },
      {
        id: '3.2',
        statement: 'Are all the dependencies of the project listed?',
        answer: false,
      },
    ],
  }
];

const languages = {};
const dependencies = {};
const imageAssets = {};

function findAssetLanguagesAndDependencies(asset) {
  if (asset.type === 'file' && asset.contentTypes.includes('code') ) {
    const lastSep = asset.uri.lastIndexOf(path.sep);
    const fileName = asset.uri.substring(lastSep + 1);
    const ext = fileName.split('.').pop();
    if(ext){
      AssetsConfig.contentTypes.forEach((contentType) => {
        if(contentType.extensions.includes(ext)) {
          languages[contentType.name] = true;
        }
      });
    }
  }

  if(asset.children){
    asset.children.forEach(findAssetLanguagesAndDependencies);
  }

  reproducibilityChecklist[2].scanResult = {
    languages: Object.keys(languages),
    dependencies: Object.keys(dependencies)
  };
}

function findImageAssets(asset) {
  if (asset.type === 'file' && asset.contentTypes.includes('image')) {
    imageAssets[asset.uri] = true;
  }
  if (asset.children) {
    asset.children.forEach(findImageAssets);
  }
};

function ReproChecklists(props) {
  const { project, reproChecklist, onUpdatedNote, onDeletedNote, onAddedNote } = props;
  const [checklistItems, setChecklistItems] = useState(reproducibilityChecklist);
  const [allImages, setAllImages] = useState([]);

  useEffect(() => {
    if (project && project.assets) {
      findAssetLanguagesAndDependencies(project.assets);
      findImageAssets(project.assets);
      setAllImages(Object.keys(imageAssets));
    }
  }, [project]);

  const handleItemUpdate = (updatedItem) => {
    const updatedChecklistItems = checklistItems.map(item =>
      item.id === updatedItem.id ? updatedItem : item
    );
    setChecklistItems(updatedChecklistItems);
  };

  return (
    <div>
      <Typography variant='h5' align='center' marginTop='10px'>Reproducibility Checklists</Typography>
      <br />
      {checklistItems.map(item => (
        <ChecklistItem
          key={item.id}
          item={item}
          project={project}
          imageAssets={allImages}
          onUpdatedNote={onUpdatedNote}
          onDeletedNote={onDeletedNote}
          onAddedNote={onAddedNote}
          onItemUpdate={handleItemUpdate}
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
      answer: PropTypes.bool.isRequired,
      scanResult: PropTypes.objectOf(
        PropTypes.arrayOf(PropTypes.string)
      ),
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
          answer: PropTypes.bool.isRequired,
        })
      ),
    })
  ).isRequired,
  imageAssets: PropTypes.arrayOf(PropTypes.string),
  onUpdatedNote: PropTypes.func.isRequired,
  onDeletedNote: PropTypes.func.isRequired,
  onAddedNote: PropTypes.func.isRequired,
};

ReproChecklists.defaultProps = {
  reproChecklist: reproducibilityChecklist,
};

export default ReproChecklists;
