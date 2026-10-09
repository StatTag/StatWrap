import ChecklistUtil from '../../app/utils/checklist';
import Constants from '../../app/constants/constants';
import { v4 as uuidv4 } from 'uuid';

jest.mock('uuid', () => ({ v4: jest.fn() }));

describe('checklist v2 format', () => {
  const dependency = Constants.CHECKLIST_DEFAULTS[0];
  const data = Constants.CHECKLIST_DEFAULTS[1];
  const custom = (properties = {}) => ({
    id: 1,
    name: 'Custom question',
    statement: 'Custom question',
    source: 'custom',
    answer: true,
    ...properties,
  });
  let sequence;
  beforeEach(() => {
    sequence = 0;
    uuidv4.mockReset();
    uuidv4.mockImplementation(() => `custom-${++sequence}`);
  });

  describe('initialization and validation', () => {
    it('initializes valid v2 items without legacy fields', () => {
      const checklist = ChecklistUtil.initializeChecklist();
      expect(Constants.CHECKLIST_VERSION).toBe(2);
      expect(ChecklistUtil.validateChecklist(checklist)).toBe(checklist);
      expect(checklist).toHaveLength(Constants.CHECKLIST_DEFAULTS.length);
      checklist.forEach((item, index) => {
        expect(item).toMatchObject({
          ...Constants.CHECKLIST_DEFAULTS[index],
          order: index + 1,
          answer: false,
          notes: [],
          assets: [],
          subChecklist: [],
          source: 'default',
        });
        expect(item).not.toHaveProperty('name');
        expect(item).not.toHaveProperty('uid');
        expect(Constants.CHECKLIST_DEFAULTS[index]).not.toHaveProperty('name');
        expect(Constants.CHECKLIST_DEFAULTS[index]).not.toHaveProperty('uid');
      });
      expect(uuidv4).not.toHaveBeenCalled();
    });

    it.each([
      { id: undefined }, { id: '' }, { id: '   ' }, { id: 1 }, { id: ' padded ' },
      { id: 'x'.repeat(51) }, { statement: '' }, { statement: null },
      { source: 'other' }, { order: 0 }, { order: 1.5 }, { order: 7 },
      { name: 'legacy' }, { uid: undefined }, { scanKey: 'unknown' },
      { scanKey: null }, { source: 'custom' }, { answer: 'yes' },
      { description: null }, { notes: null }, { assets: {} },
      { subChecklist: null }, { scanResult: [] },
    ])('rejects invalid current-version metadata: %p', (properties) => {
      const checklist = ChecklistUtil.initializeChecklist();
      checklist[0] = { ...checklist[0], ...properties };
      expect(() => ChecklistUtil.validateChecklist(checklist)).toThrow();
    });

    it('repairs duplicate IDs and orders without mutating or dropping items', () => {
      const checklist = ChecklistUtil.initializeChecklist();
      const original = JSON.stringify(checklist[0]);
      const repaired = ChecklistUtil.validateChecklist([checklist[0], checklist[0], checklist[0]]);
      expect(repaired.map((item) => item.id)).toEqual([dependency.id, 'custom-1', 'custom-2']);
      expect(repaired.map((item) => item.order)).toEqual([1, 2, 3]);
      repaired.forEach((item) => {
        expect(item.scanKey).toBe(dependency.scanKey);
        expect(item.source).toBe('default');
        expect(ChecklistUtil.getItemScanKey(item)).toBe(dependency.scanKey);
      });
      expect(JSON.stringify(checklist[0])).toBe(original);
      expect(ChecklistUtil.validateChecklist(repaired)).toBe(repaired);
    });

    it('moves duplicate ordered items to the end in encounter order', () => {
      const checklist = ChecklistUtil.initializeChecklist();
      checklist[1].order = checklist[0].order;
      checklist[3].order = checklist[2].order;
      const original = JSON.stringify(checklist);
      const result = ChecklistUtil.validateChecklist(checklist);
      expect(result.map((item) => item.id)).toEqual([
        checklist[0].id, checklist[2].id, checklist[4].id, checklist[5].id,
        checklist[1].id, checklist[3].id,
      ]);
      expect(result.map((item) => item.order)).toEqual([1, 2, 3, 4, 5, 6]);
      expect(JSON.stringify(checklist)).toBe(original);
      expect(uuidv4).not.toHaveBeenCalled();
    });

    it('avoids assigning a generated ID already used by a later item', () => {
      const checklist = ChecklistUtil.convertChecklistV1([
        custom({ id: 'same' }), custom({ id: 'same' }), custom({ id: 'custom-1' }),
      ]);
      expect(checklist.map((item) => item.id)).toEqual(['same', 'custom-2', 'custom-1']);
    });

    it('accepts a unique UUID on the fifth attempt', () => {
      const item = ChecklistUtil.initializeChecklist()[0];
      uuidv4.mockReturnValue(item.id);
      uuidv4.mockReturnValueOnce(item.id)
        .mockReturnValueOnce(item.id)
        .mockReturnValueOnce(item.id)
        .mockReturnValueOnce(item.id)
        .mockReturnValueOnce('unique-id');
      const result = ChecklistUtil.validateChecklist([item, item]);
      expect(result[1].id).toBe('unique-id');
      expect(uuidv4).toHaveBeenCalledTimes(5);
    });

    it('throws after five collisions without making a sixth attempt or mutating input', () => {
      const item = ChecklistUtil.initializeChecklist()[0];
      const checklist = [item, item];
      const snapshot = JSON.stringify(checklist);
      uuidv4.mockReturnValue(item.id);
      expect(() => ChecklistUtil.validateChecklist(checklist)).toThrow(
        'Unable to correct a duplicated checklist item ID.',
      );
      expect(uuidv4).toHaveBeenCalledTimes(5);
      expect(JSON.stringify(checklist)).toBe(snapshot);
    });

    it('accepts valid empty checklists and rejects non-arrays/items', () => {
      expect(ChecklistUtil.validateChecklist([])).toEqual([]);
      expect(() => ChecklistUtil.validateChecklist({})).toThrow('array');
      expect(() => ChecklistUtil.validateChecklist([null])).toThrow('object');
    });

    it('preserves the order and identities of already-valid v2 data', () => {
      const checklist = ChecklistUtil.initializeChecklist().reverse();
      const snapshot = JSON.stringify(checklist);
      const result = ChecklistUtil.parseChecklistFile({ version: 2, checklist });
      expect(result).toEqual({ version: 2, checklist, migratedFromVersion: null });
      expect(JSON.stringify(checklist)).toBe(snapshot);
      expect(uuidv4).not.toHaveBeenCalled();
    });
  });

  describe('envelopes', () => {
    it.each([
      (checklist) => checklist,
      (checklist) => ({ checklist }),
      (checklist) => ({ version: 1, checklist }),
    ])('converts each supported legacy shape', (envelope) => {
      const result = ChecklistUtil.parseChecklistFile(envelope([custom()]));
      expect(result).toMatchObject({
        version: Constants.CHECKLIST_VERSION,
        migratedFromVersion: 1,
        checklist: [{ id: 'custom-1', statement: 'Custom question', scanKey: null, order: 1 }],
      });
      expect(ChecklistUtil.validateChecklist(result.checklist)).toBe(result.checklist);
    });

    it.each([null, undefined, 0, '2', -1, 1.5, true, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1])(
      'rejects explicit invalid version %p', (version) => {
      expect(() => ChecklistUtil.parseChecklistFile({ version, checklist: [] })).toThrow('version');
      },
    );

    it.each([null, undefined, true, 2, 'text', {}, { version: 2 }, { checklist: {} }])(
      'rejects malformed file shapes: %p', (input) => {
        expect(() => ChecklistUtil.parseChecklistFile(input)).toThrow('array');
      },
    );
  });

  describe('forward-compatible envelopes', () => {
    it.each([3, 4, 100])('reads version %p without migration or a version downgrade', (version) => {
      const checklist = ChecklistUtil.initializeChecklist();
      checklist[0].weight = 0.75;
      checklist[0].futureSettings = { scoring: { enabled: true }, tags: ['required'] };
      const envelope = {
        version,
        checklist,
        scoringPolicy: { method: 'weighted', revision: 3 },
      };
      const snapshot = JSON.stringify(envelope);
      const parsed = ChecklistUtil.parseChecklistFile(envelope);
      expect(parsed).toEqual({ ...envelope, migratedFromVersion: null });
      expect(parsed.checklist).toBe(checklist);
      expect(JSON.stringify(envelope)).toBe(snapshot);
      expect(uuidv4).not.toHaveBeenCalled();
    });

    it('preserves future fields through known-field edits, reordering, and JSON round-trips', () => {
      const checklist = ChecklistUtil.initializeChecklist();
      checklist[0].weight = 0;
      checklist[0].futureDetails = { nested: [null, false, { threshold: 2 }] };
      checklist[0].notes.push({ id: 'note-1', content: 'Note', futureNoteField: 'retained' });
      const parsed = ChecklistUtil.parseChecklistFile({
        version: 3, checklist, futureFileField: { enabled: false },
      });
      const edited = parsed.checklist.map((item) => item.id === checklist[0].id
        ? { ...item, answer: true, statement: 'Edited question' } : item);
      const reordered = ChecklistUtil.renumberChecklist([...edited].reverse());
      const { migratedFromVersion, ...persisted } = parsed;
      expect(migratedFromVersion).toBeNull();
      const reread = ChecklistUtil.parseChecklistFile(JSON.parse(JSON.stringify({
        ...persisted, checklist: reordered,
      })));
      expect(reread.version).toBe(3);
      expect(reread.futureFileField).toEqual({ enabled: false });
      expect(reread.checklist.find((item) => item.id === checklist[0].id)).toEqual({
        ...checklist[0], answer: true, statement: 'Edited question', order: checklist.length,
      });
      expect(uuidv4).not.toHaveBeenCalled();
    });

    it('preserves unknown envelope fields during v1 conversion too', () => {
      const parsed = ChecklistUtil.parseChecklistFile({
        version: 1,
        checklist: [custom({ weight: 2 })],
        extensions: { retained: true },
      });
      expect(parsed).toMatchObject({
        version: 2,
        migratedFromVersion: 1,
        extensions: { retained: true },
        checklist: [{ weight: 2 }],
      });
    });

    it('still rejects malformed known fields in a future version', () => {
      const checklist = ChecklistUtil.initializeChecklist();
      checklist[0].answer = 'yes';
      expect(() => ChecklistUtil.parseChecklistFile({ version: 3, checklist })).toThrow('answer');
    });
  });

  describe('v1 conversion', () => {
    it('recovers each built-in by its legacy internal name without positional assumptions', () => {
      const legacy = Constants.CHECKLIST_DEFAULTS.map((item, index) => ({
        id: 100 + index,
        name: item.scanKey,
        answer: true,
      }));
      const converted = ChecklistUtil.convertChecklistV1(legacy);
      converted.forEach((item, index) => {
        expect(item).toMatchObject({
          ...Constants.CHECKLIST_DEFAULTS[index],
          source: 'default',
          answer: true,
          order: index + 1,
        });
      });
      expect(uuidv4).not.toHaveBeenCalled();
    });

    it('recovers a built-in by scan key or canonical ID and preserves edited question text', () => {
      const converted = ChecklistUtil.convertChecklistV1([
        { id: 20, scanKey: dependency.scanKey, statement: '  Edited question  ' },
        { id: data.id, statement: 'Edited data question' },
      ]);
      expect(converted.find((item) => item.id === dependency.id).statement).toBe('  Edited question  ');
      expect(converted.find((item) => item.id === data.id).scanKey).toBe(data.scanKey);
    });

    it('preserves valid custom string IDs and recovers missing custom statements from names', () => {
      expect(ChecklistUtil.convertChecklistV1([
        custom({ id: 'existing-custom', statement: undefined }),
      ])[0]).toMatchObject({ id: 'existing-custom', statement: 'Custom question', scanKey: null });
      expect(uuidv4).not.toHaveBeenCalled();
    });

    it('trims and truncates legacy string IDs during conversion', () => {
      const prefix = 'A'.repeat(Constants.CHECKLIST_ID_MAX_LENGTH - 1);
      expect(ChecklistUtil.convertChecklistV1([
        custom({ id: ` \n${prefix} B \t` }),
      ])[0].id).toBe(prefix);
    });

    it('repairs duplicate legacy IDs after sanitization', () => {
      const prefix = 'A'.repeat(Constants.CHECKLIST_ID_MAX_LENGTH);
      const result = ChecklistUtil.convertChecklistV1([
        custom({ id: `${prefix}one` }),
        custom({ id: `${prefix}two` }),
      ]);
      expect(result.map((item) => item.id)).toEqual([prefix, 'custom-1']);
    });

    it('does not classify custom question names as scan keys', () => {
      expect(ChecklistUtil.convertChecklistV1([
        custom({ name: dependency.scanKey, statement: undefined }),
      ])[0]).toMatchObject({ id: 'custom-1', statement: dependency.scanKey, scanKey: null });
    });

    it('does not recognize fuzzy text or numeric position as built-in identity', () => {
      const result = ChecklistUtil.convertChecklistV1([
        { id: 1, name: 'dependency-ish', statement: dependency.statement },
      ]);
      expect(result[0]).toMatchObject({ id: 'custom-1', source: 'custom', scanKey: null });
    });

    it('ignores unreleased UID values and removes legacy fields without mutating inputs', () => {
      const legacy = [custom({ uid: dependency.id })];
      const original = JSON.stringify(legacy);
      const converted = ChecklistUtil.convertChecklistV1(legacy);
      expect(JSON.stringify(legacy)).toBe(original);
      expect(converted[0].id).toBe('custom-1');
      expect(converted[0]).not.toHaveProperty('name');
      expect(converted[0]).not.toHaveProperty('uid');
    });

    it('preserves user content, nested identities/names, scan results, and extra metadata', () => {
      const content = {
        description: 'Original description',
        answer: true,
        notes: [{ id: 'note-1', content: 'Original note' }],
        assets: [{ uri: 'data.csv', name: 'Raw data' }],
        subChecklist: [{ id: 'sub-1', statement: 'Sub question', answer: true }],
        scanResult: { Python: ['numpy'] },
        extraMetadata: { retained: true },
      };
      const result = ChecklistUtil.convertChecklistV1([custom(content)]);
      expect(result[0]).toMatchObject(content);
    });

    it('does not truncate previously stored question text', () => {
      const statement = 'x'.repeat(Constants.CHECKLIST_STATEMENT_MAX_LENGTH + 1);
      expect(ChecklistUtil.convertChecklistV1([custom({ statement })])[0].statement).toBe(statement);
    });

    it('normalizes mixed legacy ordering and keeps ties stable', () => {
      const result = ChecklistUtil.convertChecklistV1([
        custom({ id: 'a', order: 4 }),
        custom({ id: 2, statement: 'b' }),
        custom({ id: 'c', order: 2 }),
        custom({ id: 'd' }),
      ]);
      expect(result.map((item) => item.id)).toEqual(['custom-1', 'c', 'a', 'd']);
      expect(result.map((item) => item.order)).toEqual([1, 2, 3, 4]);
    });

    it('replaces duplicate numeric IDs with distinct UUIDs', () => {
      const result = ChecklistUtil.convertChecklistV1([custom(), custom()]);
      expect(result.map((item) => item.id)).toEqual(['custom-1', 'custom-2']);
    });

    it.each([
      [{ id: 'same', name: dependency.scanKey }, { id: 'same', name: data.scanKey }],
      [{ id: 1, name: dependency.scanKey }, { id: 2, scanKey: dependency.scanKey }],
    ])('preserves items with duplicate legacy or recovered identities', (...items) => {
      const result = ChecklistUtil.convertChecklistV1(items);
      expect(result).toHaveLength(items.length);
      expect(new Set(result.map((item) => item.id)).size).toBe(items.length);
      expect(ChecklistUtil.validateChecklist(result)).toBe(result);
    });

    it('moves legacy duplicate orders to the end during conversion', () => {
      const result = ChecklistUtil.convertChecklistV1([
        custom({ id: 'first', order: 1 }),
        custom({ id: 'duplicate', order: 1 }),
        custom({ id: 'last', order: 3 }),
      ]);
      expect(result.map((item) => item.id)).toEqual(['first', 'last', 'duplicate']);
      expect(result.map((item) => item.order)).toEqual([1, 2, 3]);
    });

    it('preserves future data when repairing duplicates through the parser', () => {
      const item = { ...ChecklistUtil.initializeChecklist()[0], weight: 2, future: { keep: true } };
      const result = ChecklistUtil.parseChecklistFile({
        version: 3, checklist: [item, item], futureEnvelope: 'retained',
      });
      expect(result.version).toBe(3);
      expect(result.futureEnvelope).toBe('retained');
      expect(result.checklist.map((entry) => entry.id)).toEqual([item.id, 'custom-1']);
      expect(result.checklist[1]).toEqual({ ...item, id: 'custom-1', order: 2 });
    });

    it.each([
      { id: dependency.id, scanKey: data.scanKey },
      { name: dependency.scanKey, scanKey: data.scanKey },
      { source: 'custom', scanKey: dependency.scanKey },
      { source: 'custom', id: dependency.id },
    ])('rejects conflicting recognized metadata: %p', (item) => {
      expect(() => ChecklistUtil.convertChecklistV1([item])).toThrow('conflicting');
    });

    it.each([
      null, [], { id: null }, { id: false }, { id: -1 }, { id: 1.5 },
      { id: '' }, { source: 'invalid' }, { scanKey: {} },
      { statement: null }, { name: '  ' },
    ])('rejects malformed legacy data: %p', (item) => {
      expect(() => ChecklistUtil.convertChecklistV1([item])).toThrow();
    });

    it('converts unrecognized scan associations to null', () => {
      expect(ChecklistUtil.convertChecklistV1([
        custom({ scanKey: 'unknown' }),
      ])[0].scanKey).toBeNull();
    });

    it('rejects malformed retained content rather than silently replacing it', () => {
      expect(() => ChecklistUtil.convertChecklistV1([custom({ notes: null })])).toThrow('collections');
    });

    it('is stable when converted data is read as v2 again', () => {
      const converted = ChecklistUtil.parseChecklistFile([custom(), custom()]);
      const calls = uuidv4.mock.calls.length;
      const reread = ChecklistUtil.parseChecklistFile({
        version: converted.version, checklist: converted.checklist,
      });
      expect(reread.checklist).toEqual(converted.checklist);
      expect(reread.migratedFromVersion).toBeNull();
      expect(uuidv4).toHaveBeenCalledTimes(calls);
    });
  });
});
