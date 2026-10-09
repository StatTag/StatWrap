import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import ChecklistItem from '../../app/components/ReproChecklist/ChecklistItem/ChecklistItem';
import ChecklistUtil from '../../app/utils/checklist';
import Constants from '../../app/constants/constants';

jest.mock('../../app/components/NoteEditor/NoteEditor', () => 'NoteEditor');
jest.mock('../../app/components/AssetTree/AssetTree', () => 'AssetTree');
jest.mock('@mui/material', () => Object.fromEntries([
  'IconButton', 'Checkbox', 'Dialog', 'DialogActions', 'DialogContent',
  'DialogContentText', 'DialogTitle', 'Tooltip',
].map((name) => [name, name])));
jest.mock('@mui/icons-material', () => ({
  ContentCopy: 'ContentCopy', Done: 'Done', Delete: 'Delete', Edit: 'Edit', HelpOutline: 'HelpOutline',
}));

describe('ChecklistItem stable identity', () => {
  let renderer;
  let props;
  beforeEach(() => {
    props = {
      item: { ...ChecklistUtil.initializeChecklist()[0], weight: 3 },
      displayNumber: 1,
      project: { path: '/project', assets: { uri: '/project', type: 'directory', children: [] } },
      onItemUpdate: jest.fn(), onDeleteItem: jest.fn(), onEditItem: jest.fn(),
      onAddedNote: jest.fn(), onUpdatedNote: jest.fn(), onDeletedNote: jest.fn(), onSelectedAsset: jest.fn(),
    };
    act(() => { renderer = TestRenderer.create(<ChecklistItem {...props} />); });
  });
  afterEach(() => act(() => renderer.unmount()));

  it('uses string ID for answer updates and deletion', () => {
    act(() => renderer.root.findByType('Checkbox').props.onChange({ target: { checked: true } }));
    expect(props.onItemUpdate.mock.calls[0][0]).toEqual({ ...props.item, answer: true });
    expect(props.onItemUpdate.mock.calls[0][3]).toBe(props.item.id);
    act(() => renderer.root.findAllByType('IconButton').find(
      (node) => node.props.title === 'Delete checklist',
    ).props.onClick());
    expect(props.onDeleteItem).toHaveBeenCalledWith(props.item.id);
  });

  it('preserves ID, scan key, and unknown fields through attaching and removing an asset', () => {
    const toggle = renderer.root.findAllByType('button').find(
      (node) => node.props.children && node.props.children.type,
    );
    act(() => toggle.props.children.props.onClick());
    const asset = {
      uri: 'https://example.org/data', name: 'Reference', type: Constants.AssetType.URL, contentTypes: [],
    };
    act(() => renderer.root.findAllByType('AssetTree')[0].props.onSelectAsset(asset));
    act(() => renderer.root.findAllByType('button').find((node) => node.props.children === 'Add').props.onClick());
    const updated = props.onItemUpdate.mock.calls[0][0];
    expect(updated).toEqual({
      ...props.item,
      assets: [{ uri: asset.uri, name: 'Reference', isExternalAsset: true, description: '' }],
    });
    expect(props.onItemUpdate.mock.calls[0][3]).toBe(props.item.id);
    props = { ...props, item: updated };
    act(() => renderer.update(<ChecklistItem {...props} />));
    act(() => renderer.root.findAllByType('Tooltip').find(
      (node) => node.props.title === 'Remove asset reference',
    ).findByType('Delete').props.onClick());
    expect(props.onItemUpdate.mock.calls[1][0]).toEqual({ ...updated, assets: [] });
    expect(props.onItemUpdate.mock.calls[1][3]).toBe(props.item.id);
  });
});
