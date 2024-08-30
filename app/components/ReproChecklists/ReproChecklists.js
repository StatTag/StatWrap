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
    type: 'Type1',
    bool: true,
    answerList: {},
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
      },
      {
        id: 'image2',
        uri: '/home/adi/Pictures/Screenshots/maskedvt.png',
        title: 'Dummy Image',
        description: 'This is a dummy image description',
      },
      {
        id: 'image3',
        uri: '/home/adi/Pictures/Screenshots/maskedvt.png',
        title: 'Dummy Image',
        description: 'This is a dummy image description',
      },
    ],
    attachedURLs: [
      {
        id: 'url1',
        hyperlink: 'https://github.com/StatTag/StatWrap/blob/master/app/services/user.js',
        title: 'StatWrap URL',
        description: 'This is URL description',
      },
      {
        id: 'url2',
        hyperlink: 'https://github.com/StatTag/StatWrap/blob/master/app/services/user.js',
        title: 'StatWrap URL',
        description: 'This is URL description',
      },
      {
        id: 'url3',
        hyperlink: 'https://github.com/StatTag/StatWrap/blob/master/app/services/user.js',
        title: 'StatWrap URL',
        description: 'This is URL description',
      },
    ],
    subChecklists: [],
  },
  {
    id: '2',
    statement: 'Second checklist item statement',
    type: 'Type2',
    bool: false,
    answerList: {},
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
    statement: 'List of all the languages used and the dependencies of the project',
    type: 'List',
    bool: true,
    answerList: {},
    userNotes: [],
    attachedImages: [],
    attachedURLs: [],
    subChecklists:[],
  }
];

const languages = new Set();
const dependencies = new Set();

function findAssetLanguagesAndDependencies(asset) {
  if (asset.contentTypes.includes('code') && asset.type === 'file') {
    const lastSep = asset.uri.lastIndexOf(path.sep);
    const fileName = asset.uri.substring(lastSep + 1);
    const ext = fileName.split('.').pop();
    if(ext){
      AssetsConfig.contentTypes.forEach((contentType) => {
        if(contentType.extensions.includes(ext)) {
          languages.add(contentType.name);
        }
      });
    }
  }

  if(asset.children){
    asset.children.forEach(findAssetLanguagesAndDependencies);
  }

  reproducibilityChecklist[2].answerList = {languages: Array.from(languages),dependencies: Array.from(dependencies) };
}

function ReproChecklists(props) {
  const { project, reproChecklist, onUpdatedNote, onDeletedNote, onAddedNote } = props;
  const [checklistItems, setChecklistItems] = useState(reproducibilityChecklist);

  useEffect(() => {
    if (project && project.assets) {
      findAssetLanguagesAndDependencies(project.assets);
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
      bool: PropTypes.bool.isRequired,
      answerList: PropTypes.objectOf(
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
          type: PropTypes.string.isRequired,
          bool: PropTypes.bool.isRequired,
          answerList: PropTypes.objectOf(
            PropTypes.arrayOf(PropTypes.string)
          ),
        })
      ),
    })
  ).isRequired,
  onUpdatedNote: PropTypes.func.isRequired,
  onDeletedNote: PropTypes.func.isRequired,
  onAddedNote: PropTypes.func.isRequired,
};

ReproChecklists.defaultProps = {
  reproChecklist: reproducibilityChecklist,
};

export default ReproChecklists;
