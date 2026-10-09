import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import ReproChecklist from '../../app/components/ReproChecklist/ReproChecklist';
import ChecklistUtil from '../../app/utils/checklist';
import ChecklistService from '../../app/services/checklist';

jest.mock('../../app/components/ReproChecklist/ChecklistItem/ChecklistItem', () => 'ChecklistItem');
jest.mock('../../app/services/checklist', () => jest.fn());
jest.mock('../../app/components/Error/Error', () => 'ChecklistError');
jest.mock('@mui/material', () => Object.fromEntries([
  'Typography', 'Button', 'Dialog', 'DialogActions', 'DialogContent', 'DialogContentText',
  'DialogTitle', 'TextField', 'Snackbar', 'Alert', 'Menu', 'MenuItem', 'ListItemIcon', 'ListItemText',
].map((name) => [name, name])));
jest.mock('@mui/icons-material', () => ({
  Add: 'Add', SaveAlt: 'SaveAlt', FileUpload: 'FileUpload', FileDownload: 'FileDownload', Settings: 'Settings',
}));
jest.mock('uuid', () => ({ v4: () => 'new-custom-id' }));

describe('ReproChecklist v2 runtime', () => {
  let renderer;
  let props;
  const item = (id, order, statement = id) => ({
    id, order, statement, description: '', source: 'custom', scanKey: null,
    answer: false, notes: [], assets: [], subChecklist: [], scanResult: {},
    weight: 2,
  });
  const children = () => renderer.root.findAllByType('ChecklistItem');
  const dialog = (title) => renderer.root.findAllByType('Dialog').find((node) => (
    node.findAllByType('DialogTitle').some((heading) => heading.props.children === title)
  ));
  const clickSave = (node) => act(() => node.findAllByType('button').find(
    (button) => button.props.children === 'Save',
  ).props.onClick());
  const lastUpdate = () => props.onUpdated.mock.calls[props.onUpdated.mock.calls.length - 1];
  const refresh = (checklist) => {
    props = { ...props, checklist };
    act(() => renderer.update(<ReproChecklist {...props} />));
  };

  beforeEach(() => {
    jest.useFakeTimers();
    props = {
      project: { id: 'project', path: '/project' },
      checklist: [item('a', 3), item('b', 1), item('c', 2)],
      onUpdated: jest.fn(), onAddedNote: jest.fn(), onUpdatedNote: jest.fn(),
      onDeletedNote: jest.fn(), onSelectedAsset: jest.fn(),
    };
    act(() => { renderer = TestRenderer.create(<ReproChecklist {...props} />); });
  });
  afterEach(() => {
    act(() => renderer.unmount());
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('renders order-based display numbers and updates only the matching ID', () => {
    expect(children().map((node) => [node.props.item.id, node.props.displayNumber])).toEqual([
      ['b', 1], ['c', 2], ['a', 3],
    ]);
    const updated = { ...props.checklist[0], answer: true, assets: [{ uri: 'data.csv' }] };
    act(() => children()[2].props.onItemUpdate(updated, 'action', 'entity', 'a'));
    expect(lastUpdate()[1]).toEqual([updated, props.checklist[1], props.checklist[2]]);
    expect(lastUpdate()[4]).toBe('a');
  });

  it('deletes, adds, and updates a custom item using UUID identity and statement only', () => {
    act(() => children()[1].props.onDeleteItem('c'));
    expect(lastUpdate()[1].map((entry) => [entry.id, entry.order])).toEqual([['b', 1], ['a', 2]]);
    refresh(lastUpdate()[1]);
    const addDialog = renderer.root.findAllByType('Dialog').find((node) => (
      node.findAllByType('TextField').some((field) => field.props.placeholder === 'Write any reproducibility checklist question')
    ));
    act(() => addDialog.findAllByType('TextField')[0].props.onChange({ target: { value: '  New question  ' } }));
    clickSave(addDialog);
    const added = lastUpdate()[1][2];
    expect(added).toMatchObject({ id: 'new-custom-id', order: 3, statement: 'New question', scanKey: null });
    expect(added).not.toHaveProperty('name');
    expect(added).not.toHaveProperty('uid');
    expect(ChecklistUtil.validateChecklist(lastUpdate()[1])).toEqual(lastUpdate()[1]);
    expect(lastUpdate()[4]).toBe(added.id);
    refresh(lastUpdate()[1]);
    const changed = { ...added, answer: true };
    act(() => children()[2].props.onItemUpdate(changed, 'action', 'entity', added.id));
    expect(lastUpdate()[1].filter((entry) => entry.answer)).toEqual([changed]);
  });

  it('edits question text without changing ID, scan key, or unknown data', () => {
    const builtin = ChecklistUtil.initializeChecklist()[0];
    refresh([{ ...builtin, weight: 7 }]);
    act(() => children()[0].props.onEditItem(props.checklist[0]));
    const edit = dialog('Edit Checklist');
    act(() => edit.findAllByType('TextField')[0].props.onChange({ target: { value: ' Edited question ' } }));
    clickSave(edit);
    expect(lastUpdate()[1][0]).toEqual({ ...props.checklist[0], statement: 'Edited question' });
    expect(lastUpdate()[4]).toBe(builtin.id);
  });

  it('excludes the current ID during duplicate checks and rejects another question', () => {
    act(() => children()[0].props.onEditItem(props.checklist[1]));
    clickSave(dialog('Edit Checklist'));
    expect(props.onUpdated).toHaveBeenCalledTimes(1);
    act(() => children()[0].props.onEditItem(props.checklist[1]));
    act(() => dialog('Edit Checklist').findAllByType('TextField')[0].props.onChange({ target: { value: 'c' } }));
    clickSave(dialog('Edit Checklist'));
    expect(props.onUpdated).toHaveBeenCalledTimes(1);
    expect(dialog('Edit Checklist').findAllByType('TextField')[0].props.error).toBe(true);
  });

  it('reorders the displayed collection without changing identities or metadata', () => {
    const wrappers = renderer.root.findAllByType('div').filter((node) => node.props.draggable);
    act(() => wrappers[0].props.onDragStart());
    act(() => renderer.root.findAllByType('div').filter((node) => node.props.draggable)[2].props.onDrop());
    expect(lastUpdate()[1].map((entry) => [entry.id, entry.order])).toEqual([['c', 1], ['a', 2], ['b', 3]]);
    expect(lastUpdate()[1].every((entry) => entry.weight === 2)).toBe(true);
    expect(lastUpdate()[4]).toBe('b');
  });

  it('undo restores the original IDs, orders, and content', () => {
    const original = props.checklist;
    act(() => children()[1].props.onDeleteItem('c'));
    refresh(lastUpdate()[1]);
    act(() => jest.advanceTimersByTime(100));
    const undo = renderer.root.findByType('Alert').props.action;
    act(() => undo.props.onClick());
    expect(lastUpdate()[1]).toEqual(original);
    expect(lastUpdate()[4]).toBe('c');
  });

  it('scans renamed built-ins without mutating props and refreshes on checklist changes', () => {
    const builtin = ChecklistUtil.initializeChecklist()[1];
    const assets = { uri: '/project/data.csv', type: 'file', contentTypes: ['data'] };
    const expected = ChecklistUtil.findDataFiles(assets);
    expect(expected).toEqual({ dataFiles: ['data.csv'] });
    props = { ...props, project: { ...props.project, assets } };
    refresh([{ ...builtin, statement: 'Renamed', scanResult: {} }, item('custom', 2, 'Data')]);
    expect(children()[0].props.item.scanResult).toEqual(expected);
    expect(props.checklist[0].scanResult).toEqual({});
    expect(children()[1].props.item.scanResult).toEqual({});
    const incoming = { ...builtin, statement: 'Incoming data', scanResult: {} };
    refresh([incoming]);
    expect(children()[0].props.item.scanResult).toEqual(expected);
  });

  it('shows load errors instead of stale checklist content', () => {
    props = { ...props, error: 'Migration failed' };
    refresh(props.checklist);
    expect(renderer.root.findByType('ChecklistError').props.children.join('')).toContain('Migration failed');
    expect(children()).toHaveLength(0);
  });

  it('scans newly imported built-ins before emitting the updated array', () => {
    const originalDocument = global.document;
    const originalReader = global.FileReader;
    const input = { click: jest.fn() };
    const builtin = ChecklistUtil.initializeChecklist()[1];
    const json = JSON.stringify({
      type: 'statwrap-checklist', version: 2,
      checklists: [{
        id: builtin.id, statement: builtin.statement, source: 'default',
        notes: [{ id: 'injected', content: 'Ignore' }], answer: true, weight: 7, order: 100,
      }],
    });
    global.document = { createElement: () => input };
    global.FileReader = class {
      readAsText() {
        this.onload({ target: { result: json } });
      }
    };
    try {
      props = { ...props, project: { ...props.project, assets: {
        uri: '/project/data.csv', type: 'file', contentTypes: ['data'],
      } } };
      refresh(props.checklist);
      const importMenu = renderer.root.findAllByType('MenuItem').find((node) => (
        node.findByType('ListItemText').props.children === 'Import Checklist'
      ));
      act(() => importMenu.props.onClick());
      act(() => input.onchange({ target: { files: [{ size: 100 }] } }));
      expect(lastUpdate()[1].find((entry) => entry.id === builtin.id).scanResult).toEqual({
        dataFiles: ['data.csv'],
      });
      const imported = lastUpdate()[1].find((entry) => entry.id === builtin.id);
      expect(imported).toMatchObject({
        id: builtin.id, order: 4, source: 'default', scanKey: 'Data',
        notes: [], assets: [], subChecklist: [], answer: false,
      });
      expect(imported).not.toHaveProperty('uid');
      expect(imported).not.toHaveProperty('name');
      expect(imported).not.toHaveProperty('weight');
      expect(ChecklistUtil.validateChecklist(lastUpdate()[1])).toEqual(lastUpdate()[1]);
      refresh(lastUpdate()[1]);
      act(() => renderer.root.findAllByType('MenuItem').find(
        (node) => node.findByType('ListItemText').props.children === 'Import Checklist',
      ).props.onClick());
      act(() => input.onchange({ target: { files: [{ size: 100 }] } }));
      expect(props.onUpdated).toHaveBeenCalledTimes(1);
      expect(dialog('Import Failed').findByType('DialogContentText').props.children).toContain('duplicates');
    } finally {
      global.document = originalDocument;
      global.FileReader = originalReader;
    }
  });

  it('informs users when a corrupted built-in is skipped alongside valid imported items', () => {
    const originalDocument = global.document;
    const originalReader = global.FileReader;
    const input = { click: jest.fn() };
    const builtin = ChecklistUtil.initializeChecklist()[1];
    const json = JSON.stringify({
      type: 'statwrap-checklist', version: 2,
      checklists: [
        { ...builtin, statement: 'Modified built-in question' },
        { id: 'imported-custom', statement: 'New custom question' },
      ],
    });
    global.document = { createElement: () => input };
    global.FileReader = class {
      readAsText() {
        this.onload({ target: { result: json } });
      }
    };
    try {
      const importMenu = renderer.root.findAllByType('MenuItem').find((node) => (
        node.findByType('ListItemText').props.children === 'Import Checklist'
      ));
      act(() => importMenu.props.onClick());
      act(() => input.onchange({ target: { files: [{ size: 100 }] } }));
      expect(lastUpdate()[1].some((entry) => entry.id === builtin.id)).toBe(false);
      expect(lastUpdate()[1].some((entry) => entry.id === 'imported-custom')).toBe(true);
      expect(dialog('Import Successful').findByType('DialogContentText').props.children)
        .toContain('built-in checklist item could not be imported because it is corrupted');
    } finally {
      global.document = originalDocument;
      global.FileReader = originalReader;
    }
  });

  it('generates PDF content from the scanned display-ordered array', () => {
    const report = jest.fn();
    ChecklistService.mockImplementation(() => ({ generateReport: report }));
    const builtin = ChecklistUtil.initializeChecklist()[1];
    props = { ...props, project: { ...props.project, assets: {
      uri: '/project/data.csv', type: 'file', contentTypes: ['data'],
    } } };
    refresh([item('custom', 2), { ...builtin, order: 1 }]);
    const exportDialog = dialog('Export Report');
    act(() => exportDialog.findAllByType('Button').find((node) => node.props.children === 'Yes').props.onClick());
    expect(report.mock.calls[0][0].map((entry) => entry.id)).toEqual([builtin.id, 'custom']);
    expect(report.mock.calls[0][0][0].scanResult).toEqual({ dataFiles: ['data.csv'] });
    expect(report.mock.calls[0].slice(1)).toEqual(['Reproducibility_Checklist.pdf', true, props.project]);
    ChecklistService.mockReset();
  });
});
