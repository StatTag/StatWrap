import ChecklistUtil from '../../app/utils/checklist';
import Constants from '../../app/constants/constants';
import { v4 as uuidv4 } from 'uuid';

jest.mock('uuid', () => ({ v4: jest.fn() }));

describe('checklist v2 definitions', () => {
  const builtin = Constants.CHECKLIST_DEFAULTS[0];
  const definition = (properties = {}) => ({ id: 'custom-id', statement: 'Question', ...properties });
  const importItems = (items, existing = []) => ChecklistUtil.validateAndParseImport(JSON.stringify({
    type: Constants.CHECKLIST_EXPORT_TYPE,
    version: Constants.CHECKLIST_VERSION,
    checklists: items,
  }), existing);

  beforeEach(() => {
    let sequence = 0;
    uuidv4.mockReset();
    uuidv4.mockImplementation(() => `generated-${++sequence}`);
  });

  it('round-trips built-ins and custom definitions with exactly the allowlisted fields', () => {
    const custom = {
      ...ChecklistUtil.initializeChecklist()[0],
      id: 'custom-id', source: 'custom', scanKey: null, statement: 'Custom question', order: 7,
      answer: true, notes: [{ id: 'note' }], assets: [{ uri: 'file', name: 'Asset' }],
      weight: 3,
    };
    const items = [...ChecklistUtil.initializeChecklist(), custom];
    const exported = ChecklistUtil.generateChecklistExport(items);
    expect(exported.version).toBe(Constants.CHECKLIST_VERSION);
    const result = ChecklistUtil.validateAndParseImport(JSON.stringify(exported), []);
    expect(result.valid).toBe(true);
    expect(result.items).toEqual(exported.checklists);
    exported.checklists.forEach((item) => {
      expect(Object.keys(item)).toEqual(['id', 'statement', 'description', 'source', 'scanKey']);
    });
    expect(uuidv4).not.toHaveBeenCalled();
  });

  it.each([undefined, null, 1, 3, '2', 0, true])('rejects unsupported export version %p', (version) => {
    const result = ChecklistUtil.validateAndParseImport(JSON.stringify({
      type: Constants.CHECKLIST_EXPORT_TYPE, version, checklists: [definition()],
    }), []);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('export version');
  });

  it('does not interpret older name/UID fields as question text or identity', () => {
    expect(importItems([{ uid: 'legacy', name: 'Legacy question' }]).valid).toBe(false);
    const result = importItems([{ uid: builtin.id, name: 'Ignored', statement: 'Current question' }]);
    expect(result.items[0]).toMatchObject({
      id: 'generated-1', statement: 'Current question', source: 'custom', scanKey: null,
    });
  });

  it('restores omitted built-in source/scan key for the canonical statement', () => {
    expect(importItems([definition({ id: builtin.id, statement: builtin.statement })]).items).toEqual([{
      id: builtin.id, statement: builtin.statement, description: '', source: 'default', scanKey: builtin.scanKey,
    }]);
  });

  it.each([
    { statement: 'Edited question' },
    { description: 'Edited description' },
    { scanKey: 'Data' },
    { scanKey: null },
  ])('rejects corrupted built-in definitions: %p', (properties) => {
    const result = importItems([definition({
      id: builtin.id, statement: builtin.statement, ...properties,
    })]);
    expect(result.valid).toBe(false);
    expect(result.skippedCount).toBe(1);
    expect(result.error).toContain('built-in checklist item could not be imported because it is corrupted');
  });

  it('reports corrupted built-ins when other definitions in the same file import', () => {
    const result = importItems([
      definition({ id: builtin.id, statement: 'Edited question' }),
      definition({ id: 'other-id', statement: 'Another question' }),
    ]);
    expect(result.valid).toBe(true);
    expect(result.items.map((item) => item.id)).toEqual(['other-id']);
    expect(result.invalidReasons).toEqual([
      'Item 1: built-in checklist item could not be imported because it is corrupted.',
    ]);
  });

  it('preserves repaired built-in UUID identities with recognized scan associations', () => {
    const result = importItems([definition({
      id: 'repaired-builtin', source: 'default', scanKey: builtin.scanKey,
    })]);
    expect(result.valid).toBe(true);
    expect(result.items[0].id).toBe('repaired-builtin');
    expect(result.items[0].scanKey).toBe(builtin.scanKey);
  });

  it.each([
    { id: builtin.id, statement: builtin.statement, source: 'custom' },
    { scanKey: builtin.scanKey, source: 'custom' },
    { scanKey: 123 },
    { source: 'default', scanKey: 'unknown' },
    { source: 'default' },
    { id: '' },
    { id: '   ' },
  ])('skips invalid definitions with an explicit reason: %p', (properties) => {
    const result = importItems([definition(properties)]);
    expect(result.valid).toBe(false);
    expect(result.skippedCount).toBe(1);
    expect(result.error).toContain('invalid ID or conflicting/unknown scan');
  });

  it('sanitizes non-string/overlength IDs and checks collisions after truncation', () => {
    const prefix = 'x'.repeat(Constants.CHECKLIST_ID_MAX_LENGTH);
    const result = importItems([
      definition({ id: null, statement: 'Generated question' }),
      definition({ id: ` ${prefix}one `, statement: 'First long ID' }),
      definition({ id: `${prefix}two`, statement: 'Second long ID' }),
    ]);
    expect(result.items.map((item) => item.id)).toEqual(['generated-1', prefix]);
    expect(result.skippedCount).toBe(1);
  });

  it('checks sanitized statements and exact identities against existing and incoming definitions', () => {
    const result = importItems([
      definition({ id: 'existing', statement: 'Renamed question' }),
      definition({ id: 'one', statement: ' DUPLICATE QUESTION ' }),
      definition({ id: 'two', statement: 'New question' }),
      definition({ id: 'two', statement: 'Another question' }),
      definition({ id: 'three', statement: ' new QUESTION ' }),
    ], [{ id: 'existing', statement: 'Original' }, { id: 'other', statement: 'Duplicate question' }]);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('two');
    expect(result.skippedCount).toBe(4);
  });

  it('generates different UUIDs for multiple definitions with omitted IDs', () => {
    expect(importItems([{ statement: 'One' }, { statement: 'Two' }]).items.map((item) => item.id))
      .toEqual(['generated-1', 'generated-2']);
  });

  it('exports in display order without mutating input', () => {
    const items = ChecklistUtil.initializeChecklist().reverse();
    const snapshot = JSON.stringify(items);
    const exported = ChecklistUtil.generateChecklistExport(items);
    expect(exported.checklists.map((item) => item.id))
      .toEqual(Constants.CHECKLIST_DEFAULTS.map((item) => item.id));
    expect(JSON.stringify(items)).toBe(snapshot);
  });

  it('does not export non-canonical default items without a recognized scan association', () => {
    const item = {
      ...ChecklistUtil.initializeChecklist()[0],
      id: 'noncanonical-default',
      scanKey: null,
    };
    expect(() => ChecklistUtil.generateChecklistExport([item])).toThrow(
      'Default checklist items must have a recognized scan association.',
    );
  });
});
