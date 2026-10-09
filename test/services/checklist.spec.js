import fs from 'fs';
import os from 'os';
import path from 'path';
import ChecklistService from '../../app/services/checklist';
import ChecklistUtil from '../../app/utils/checklist';
import Constants from '../../app/constants/constants';
import GeneralUtil from '../../app/utils/general';
import pdfMake from 'pdfmake/build/pdfmake';
import releasedV1 from '../fixtures/checklist/released-v1.json';
import explicitV1 from '../fixtures/checklist/explicit-v1.json';
import currentChecklist from '../fixtures/checklist/v2.json';

describe('ChecklistService persistence', () => {
  let projectPath;
  let filePath;
  let service;
  let checklist;

  const load = () => {
    const callback = jest.fn();
    service.loadChecklist(projectPath, callback);
    expect(callback).toHaveBeenCalledTimes(1);
    return callback.mock.calls[0];
  };
  const writeOriginal = (data) => fs.writeFileSync(filePath, JSON.stringify(data));
  const read = () => JSON.parse(fs.readFileSync(filePath));
  const legacy = () => [{
    id: 1,
    name: 'Dependency',
    statement: 'Original question',
    answer: true,
    notes: [{ id: 'note-1', content: 'Original note' }],
    assets: [{ uri: 'data.csv', name: 'Data' }],
    subChecklist: [{ id: 'sub-1', statement: 'Sub question', answer: true }],
    extra: { retained: true },
  }];

  beforeEach(() => {
    projectPath = fs.mkdtempSync(path.join(os.tmpdir(), 'statwrap-checklist-test-'));
    fs.mkdirSync(path.join(projectPath, Constants.StatWrapFiles.BASE_FOLDER));
    filePath = path.join(projectPath, Constants.StatWrapFiles.BASE_FOLDER, Constants.StatWrapFiles.CHECKLIST);
    service = new ChecklistService();
    checklist = ChecklistUtil.initializeChecklist();
  });

  describe('ChecklistService PDF cover', () => {
    let create;
    let download;
    let renderPdf;

    beforeEach(() => {
      renderPdf = pdfMake.createPdf.bind(pdfMake);
      jest.spyOn(GeneralUtil, 'convertImageToBase64').mockReturnValue('image-data');
      download = jest.fn();
      create = jest.spyOn(pdfMake, 'createPdf').mockReturnValue({ download });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('uses aligned text answers, styled rows, and indented sub-items without checkbox images', () => {
      const items = [
        {
          statement: 'A long question '.repeat(16),
          answer: true,
          subChecklist: [
            { statement: 'First sub-item', answer: false },
            { statement: 'Second sub-item', answer: true },
          ],
        },
        { statement: 'Second question', answer: false },
      ];
      const original = JSON.stringify(items);
      service.generateReport(items, 'cover.pdf', false, { name: 'Example project' });
      const definition = create.mock.calls[0][0];
      const summary = definition.content.find((node) => node.table);
      expect(summary.table).toMatchObject({
        headerRows: 1,
        dontBreakRows: true,
        widths: [28, '*', 52],
      });
      expect(summary.table.body.map((row) => row.map((cell) => cell.text))).toEqual([
        ['', 'Checklist Summary', 'Answer'],
        ['1.', items[0].statement, 'Yes'],
        ['', '1.1 First sub-item', 'No'],
        ['', '1.2 Second sub-item', 'Yes'],
        ['2.', 'Second question', 'No'],
      ]);
      expect(summary.table.body[1][1].bold).toBe(true);
      expect(summary.table.body[2][1]).toMatchObject({ margin: [12, 0, 0, 0], color: '#555555' });
      expect(summary.table.body[2][1].bold).toBeUndefined();
      expect(summary.table.body[1][2]).toMatchObject({ style: 'summaryAnswer', color: '#32704A' });
      expect(summary.table.body[2][2]).toMatchObject({ style: 'summaryAnswer', color: '#444444' });
      expect(definition.styles.summaryAnswer).toEqual({ bold: true, alignment: 'center' });
      expect(summary.layout.fillColor(0)).toBe('#EEE8F4');
      expect(summary.layout.fillColor(1)).toBeNull();
      expect(summary.layout.fillColor(2)).toBe('#F7F7F9');
      expect(summary.layout.hLineWidth()).toBe(0.5);
      expect(summary.layout.vLineWidth()).toBe(0);
      expect(summary.layout.paddingTop()).toBe(8);
      expect(summary.layout.paddingBottom()).toBe(8);
      expect(GeneralUtil.convertImageToBase64).toHaveBeenCalledTimes(1);
      expect(GeneralUtil.convertImageToBase64).toHaveBeenCalledWith(
        expect.stringContaining('images/banner.png'),
      );
      expect(JSON.stringify(summary)).not.toContain('"image"');
      expect(definition.content.find((node) => node.text === 'Checklist Details'))
        .toMatchObject({ pageBreak: 'before' });
      expect(download).toHaveBeenCalledWith('cover.pdf');
      expect(JSON.stringify(items)).toBe(original);
    });

    it('supports an empty checklist and preserves project metadata', () => {
      service.generateReport([], 'empty.pdf', false, { name: 'Empty project' });
      const definition = create.mock.calls[0][0];
      expect(definition.content.find((node) => node.table).table.body).toHaveLength(1);
      expect(definition.content[2].columns).toEqual([
        { text: 'Project Name: Empty project', width: '*' },
        { text: `Date: ${new Date().toLocaleDateString()}`, width: 'auto', alignment: 'right' },
      ]);
      expect(definition.footer(1, 2).text).toBe('Page 1 of 2');
    });

    it.each([true, false])('includes de-emphasized descriptions only in details with exportNotes=%p', (exportNotes) => {
      const items = [{
        statement: 'Document dependencies',
        description: 'List software versions and installation instructions.\nInclude required packages.',
        answer: true,
        subChecklist: [{ statement: 'Packages listed', answer: true }],
        notes: [{ content: 'An optional note' }],
      }];
      const original = JSON.stringify(items);
      service.generateReport(items, 'descriptions.pdf', exportNotes, { name: 'Example project' });
      const definition = create.mock.calls[0][0];
      const descriptionIndex = definition.content.findIndex((node) => node.style === 'itemDescription');
      expect(definition.content.filter((node) => node.style === 'itemDescription')).toEqual([
        { text: items[0].description, style: 'itemDescription' },
      ]);
      expect(definition.content[descriptionIndex - 1].columns[1].text).toBe(items[0].statement);
      expect(definition.content[descriptionIndex + 1].columns[0].text).toBe('1.1 Packages listed');
      expect(definition.styles.itemDescription).toEqual({
        fontSize: 10,
        color: '#555555',
        margin: [15, 4, 15, 8],
        lineHeight: 1.2,
      });
      expect(definition.styles.itemDescription.fontSize).toBeLessThan(definition.defaultStyle.fontSize);
      expect(definition.styles.itemDescription.bold).toBeUndefined();
      const detailsIndex = definition.content.findIndex((node) => node.text === 'Checklist Details');
      expect(descriptionIndex).toBeGreaterThan(detailsIndex);
      expect(JSON.stringify(definition.content.slice(0, detailsIndex))).not.toContain(items[0].description);
      expect(JSON.stringify(items)).toBe(original);
    });

    it.each([undefined, null, '', ' \n\t '])('omits absent or blank descriptions: %p', (description) => {
      service.generateReport([{ statement: 'Question', answer: false, description }],
        'no-description.pdf', false, { name: 'Example project' });
      expect(create.mock.calls[0][0].content.some((node) => node.style === 'itemDescription')).toBe(false);
    });

    it('renders a long description as readable wrapped text in the details', async () => {
      GeneralUtil.convertImageToBase64.mockReturnValue(
        `data:image/png;base64,${fs.readFileSync(path.join(__dirname, '../../app/images/banner.png')).toString('base64')}`,
      );
      const description = 'Describe software versions, required packages, and installation instructions. '.repeat(10).trim();
      service.generateReport([{ statement: 'Document dependencies', answer: true, description }],
        'wrapped-description.pdf', false, { name: 'Example project' });
      const pages = await new Promise((resolve) => {
        renderPdf(create.mock.calls[0][0])._getPages({}, resolve);
      });
      const descriptionLines = pages[1].items
        .filter(({ type, item }) => type === 'line' && item.inlines.some((inline) => inline.fontSize === 10))
        .map(({ item }) => item);
      expect(descriptionLines.length).toBeGreaterThan(1);
      expect(descriptionLines.map((line) => line.inlines.map((inline) => inline.text).join(''))
        .join(' ').replace(/\s+/g, ' ').trim())
        .toBe(description);
      descriptionLines.forEach((line) => {
        expect(line.x).toBe(55);
        expect(line.x + line.inlines.reduce((sum, inline) => sum + inline.width, 0))
          .toBeLessThanOrEqual(pages[1].pageSize.width - 55);
        expect(line.y).toBeLessThan(pages[1].pageSize.height - 60);
        line.inlines.forEach((inline) => {
          expect(inline.fontSize).toBe(10);
          expect(inline.color).toBe('#555555');
        });
      });
    });

    it.each(['empty', 'default', 'multi-page'])('renders the %s summary with pdfMake', async (kind) => {
      GeneralUtil.convertImageToBase64.mockReturnValue(
        `data:image/png;base64,${fs.readFileSync(path.join(__dirname, '../../app/images/banner.png')).toString('base64')}`,
      );
      const items = kind === 'empty' ? [] : kind === 'default'
        ? ChecklistUtil.initializeChecklist()
        : Array.from({ length: 32 }, (_, index) => ({
          statement: `Question ${index + 1}: ${'A wrapping question '.repeat(11)}`,
          answer: index % 2 === 0,
          subChecklist: [
            { statement: `Sub-item ${index + 1}`, answer: index % 2 !== 0 },
          ],
        }));
      service.generateReport(items, 'render.pdf', false, { name: 'Example project' });
      const pages = await new Promise((resolve) => {
        renderPdf(create.mock.calls[0][0])._getPages({}, resolve);
      });
      const pageLines = pages.map((page) => page.items
        .filter((entry) => entry.type === 'line')
        .map(({ item }) => ({
          text: item.inlines.map((inline) => inline.text).join(''),
          x: item.x,
          y: item.y,
          width: item.inlines.reduce((sum, inline) => sum + inline.width, 0),
        })));
      const detailsPage = pageLines.findIndex((lines) => lines
        .some((line) => line.text === 'Checklist Details'));
      expect(detailsPage).toBeGreaterThan(0);
      if (kind === 'multi-page') {
        expect(detailsPage).toBeGreaterThan(1);
      } else {
        expect(detailsPage).toBe(1);
      }
      const coverPages = pageLines.slice(0, detailsPage);
      const answers = coverPages.flat().filter((line) => ['Yes', 'No'].includes(line.text));
      expect(answers).toHaveLength(items.reduce(
        (total, item) => total + 1 + (item.subChecklist || []).length, 0,
      ));
      coverPages.forEach((lines, pageIndex) => {
        expect(lines.filter((line) => line.text === 'Checklist Summary')).toHaveLength(1);
        expect(lines.filter((line) => line.text === 'Answer')).toHaveLength(1);
        const answerHeader = lines.find((line) => line.text === 'Answer');
        lines.forEach((line) => {
          expect(line.x).toBeGreaterThanOrEqual(40);
          expect(line.x + line.width).toBeLessThanOrEqual(pages[pageIndex].pageSize.width - 40);
          if (['Yes', 'No'].includes(line.text)) {
            expect(line.x + line.width / 2)
              .toBeCloseTo(answerHeader.x + answerHeader.width / 2, 5);
            expect(line.y).toBeLessThan(pages[pageIndex].pageSize.height - 60);
          }
        });
      });
      if (kind === 'multi-page') {
        expect(coverPages[0].filter((line) => line.x === 92).length)
          .toBeGreaterThan(coverPages[0].filter((line) => ['Yes', 'No'].includes(line.text)).length);
      }
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(projectPath, { recursive: true });
  });

  it.each([null, undefined])('rejects missing project paths and data: %p', (value) => {
    expect(() => service.writeChecklist(value, checklist)).toThrow('Invalid project path');
    expect(() => service.writeChecklist(projectPath, value)).toThrow('Invalid project path');
    const callback = jest.fn();
    service.loadChecklist(value, callback);
    expect(callback).toHaveBeenCalledWith('The project path must be specified', null);
  });

  it('preserves missing-file behavior', () => {
    expect(load()).toEqual(['Checklist file not found', []]);
  });

  it('writes the exact versioned envelope for new files and reads arrays', () => {
    service.writeChecklist(projectPath, checklist);
    expect(read()).toEqual({ version: Constants.CHECKLIST_VERSION, checklist });
    expect(load()).toEqual([null, checklist]);
  });

  it('does not rewrite an unchanged v2 file on load', () => {
    writeOriginal({ version: 2, checklist });
    const replace = jest.spyOn(service, 'replaceChecklistFile');
    expect(load()).toEqual([null, checklist]);
    expect(replace).not.toHaveBeenCalled();
  });

  it.each([{}, [null], [{ id: 'invalid' }]])('rejects invalid new saves before creating a file: %p', (data) => {
    expect(() => service.writeChecklist(projectPath, data)).toThrow();
    expect(fs.existsSync(filePath)).toBe(false);
    expect(fs.readdirSync(path.dirname(filePath))).toEqual([]);
  });

  it('writes and reads empty checklists', () => {
    service.writeChecklist(projectPath, []);
    expect(read()).toEqual({ version: 2, checklist: [] });
    expect(load()).toEqual([null, []]);
  });

  it('expands home-relative paths on reads and writes', () => {
    jest.spyOn(os, 'homedir').mockReturnValue(path.dirname(projectPath));
    const relative = `~/${path.basename(projectPath)}`;
    service.writeChecklist(relative, checklist);
    const callback = jest.fn();
    service.loadChecklist(relative, callback);
    expect(callback).toHaveBeenCalledWith(null, checklist);
  });

  it.each(['array', 'explicit', 'inferred'])('durably migrates %s v1 and reports metadata once', (shape) => {
    const items = legacy();
    writeOriginal(shape === 'array' ? items
      : shape === 'explicit' ? { version: 1, checklist: items } : { checklist: items });
    const [error, converted, migration] = load();
    expect(error).toBeNull();
    expect(converted[0]).toMatchObject({
      id: Constants.CHECKLIST_DEFAULTS[0].id,
      scanKey: 'Dependency',
      statement: items[0].statement,
      answer: true,
      notes: items[0].notes,
      assets: items[0].assets,
      subChecklist: items[0].subChecklist,
      extra: items[0].extra,
    });
    expect(converted[0]).not.toHaveProperty('name');
    expect(read()).toEqual({ version: 2, checklist: converted });
    expect(migration).toEqual({ fromVersion: 1, toVersion: 2 });
    const replace = jest.spyOn(service, 'replaceChecklistFile');
    expect(load()).toEqual([null, converted]);
    expect(replace).not.toHaveBeenCalled();
  });

  it('persists custom IDs so subsequent reads never regenerate them', () => {
    writeOriginal([{ id: 1, name: 'Custom question', source: 'custom' }]);
    const [, converted] = load();
    expect(converted[0].id).toEqual(expect.any(String));
    expect(load()).toEqual([null, converted]);
  });

  it.each([
    ['released v1', releasedV1, { version: 2, checklist: currentChecklist.checklist }, true],
    ['explicit v1', explicitV1, currentChecklist, true],
    ['v2', currentChecklist, currentChecklist, false],
  ])('preserves exact fixture content through %s load, save, and reload', (
    label, input, expected, migrates,
  ) => {
    writeOriginal(input);
    const original = fs.readFileSync(filePath, 'utf8');
    const sanitize = jest.spyOn(ChecklistUtil, 'sanitizeChecklistID');
    if (migrates) {
      sanitize.mockReturnValueOnce(currentChecklist.checklist[1].id);
    }
    const replace = jest.spyOn(service, 'replaceChecklistFile');
    expect(load()).toEqual(migrates
      ? [null, expected.checklist, { fromVersion: 1, toVersion: 2 }]
      : [null, expected.checklist]);
    expect(read()).toEqual(expected);
    expect(replace).toHaveBeenCalledTimes(migrates ? 1 : 0);
    if (!migrates) {
      expect(fs.readFileSync(filePath, 'utf8')).toBe(original);
    }
    sanitize.mockClear();
    expect(load()).toEqual([null, expected.checklist]);
    expect(sanitize.mock.calls.every(([id]) => typeof id === 'string')).toBe(true);
    expect(replace).toHaveBeenCalledTimes(migrates ? 1 : 0);
    service.writeChecklist(projectPath, expected.checklist);
    expect(read()).toEqual(expected);
    expect(load()).toEqual([null, expected.checklist]);
  });

  it('renders migrated questions, nested content, and scan results in the PDF document', () => {
    writeOriginal(releasedV1);
    jest.spyOn(ChecklistUtil, 'sanitizeChecklistID')
      .mockReturnValueOnce(currentChecklist.checklist[1].id);
    const [, migrated] = load();
    const original = JSON.stringify(migrated);
    jest.spyOn(GeneralUtil, 'convertImageToBase64').mockReturnValue('image-data');
    const download = jest.fn();
    const create = jest.spyOn(pdfMake, 'createPdf').mockReturnValue({ download });
    service.generateReport(migrated, 'checklist.pdf', true, { name: 'Fixture project' });
    expect(download).toHaveBeenCalledWith('checklist.pdf');
    const definition = create.mock.calls[0][0];
    const text = [];
    const links = [];
    const collect = (value) => {
      if (Array.isArray(value)) {
        value.forEach(collect);
      } else if (value && typeof value === 'object') {
        if (typeof value.text === 'string') text.push(value.text);
        if (value.link) links.push(value.link);
        Object.values(value).forEach(collect);
      }
    };
    collect(definition.content);
    expect(text.filter((value) => migrated.some((item) => item.statement === value))).toEqual([
      migrated[0].statement, migrated[1].statement,
      migrated[0].statement, migrated[1].statement,
    ]);
    expect(text).toEqual(expect.arrayContaining([
      'Project Name: Fixture project', '2.1 The result matches.',
      '1. Verified independently.', 'Analysis script', 'Entry script', 'dataFiles',
    ]));
    expect(JSON.stringify(definition.content)).toContain('"ul":["input.csv"]');
    expect(links).toEqual(['analysis.R']);
    expect(JSON.stringify(migrated)).toBe(original);
    create.mockClear();
    service.generateReport(migrated, 'checklist-without-notes.pdf', false, { name: 'Fixture project' });
    expect(JSON.stringify(create.mock.calls[0][0].content)).not.toContain('Verified independently.');
  });

  it('persists duplicate repairs without reporting a version migration', () => {
    writeOriginal({ version: 2, checklist: [checklist[0], checklist[0]] });
    const [error, repaired, migration] = load();
    expect(migration).toBeUndefined();
    expect(error).toBeNull();
    expect(repaired[0].id).not.toBe(repaired[1].id);
    expect(read().checklist).toEqual(repaired);
    expect(load()).toEqual([null, repaired]);
  });

  it('preserves v3 and unknown envelope/item/nested fields through actual saves and reloads', () => {
    checklist[0].weight = 0;
    checklist[0].future = { nested: [false, null, { threshold: 5 }] };
    writeOriginal({ version: 3, checklist, futureEnvelope: { enabled: true } });
    const replace = jest.spyOn(service, 'replaceChecklistFile');
    const [error, loaded] = load();
    expect(error).toBeNull();
    expect(replace).not.toHaveBeenCalled();
    const edited = loaded.map((item) => ({ ...item, answer: true }));
    delete edited[0].weight;
    delete edited[0].future;
    service.writeChecklist(projectPath, edited);
    const saved = read();
    expect(saved.version).toBe(3);
    expect(saved.futureEnvelope).toEqual({ enabled: true });
    expect(saved.checklist[0]).toEqual({ ...checklist[0], answer: true });
    expect(load()).toEqual([null, saved.checklist]);
  });

  it('honors item deletions and additions rather than resurrecting old items', () => {
    service.writeChecklist(projectPath, checklist);
    const updated = ChecklistUtil.renumberChecklist(checklist.slice(1));
    service.writeChecklist(projectPath, updated);
    expect(read().checklist).toEqual(updated);
  });

  it.each([
    { version: null, checklist: [] },
    { version: 2, checklist: {} },
    { version: 1, checklist: [null] },
    { version: 2, checklist: [{ id: '' }] },
  ])('rejects invalid data without overwriting it: %p', (data) => {
    writeOriginal(data);
    const original = fs.readFileSync(filePath, 'utf8');
    expect(load()[0]).toMatch(/Error loading checklist file:/);
    expect(load()[1]).toBeNull();
    expect(() => service.writeChecklist(projectPath, checklist)).toThrow();
    expect(fs.readFileSync(filePath, 'utf8')).toBe(original);
  });

  it('reports malformed JSON explicitly without overwriting it', () => {
    fs.writeFileSync(filePath, '{broken');
    expect(load()).toEqual([expect.stringContaining('Error loading checklist file:'), null]);
    expect(fs.readFileSync(filePath, 'utf8')).toBe('{broken');
  });

  it.each(['readFileSync', 'writeFileSync', 'fsyncSync', 'renameSync', 'openSync'])(
    'preserves the original and cleans up owned temporary files on %s failure', (operation) => {
      writeOriginal(legacy());
      const original = fs.readFileSync(filePath, 'utf8');
      const originalRead = fs.readFileSync.bind(fs);
      jest.spyOn(fs, operation).mockImplementation(() => { throw new Error(`${operation} failed`); });
      expect(load()).toEqual([expect.stringContaining(`${operation} failed`), null]);
      expect(originalRead(filePath, 'utf8')).toBe(original);
      expect(fs.readdirSync(path.dirname(filePath))).toEqual([Constants.StatWrapFiles.CHECKLIST]);
    },
  );

  it('removes a partially written temporary file without touching the original', () => {
    writeOriginal(legacy());
    const original = fs.readFileSync(filePath, 'utf8');
    const originalWrite = fs.writeFileSync.bind(fs);
    jest.spyOn(fs, 'writeFileSync').mockImplementation((descriptor) => {
      originalWrite(descriptor, 'partial');
      throw new Error('Partial write failed');
    });
    expect(load()).toEqual([expect.stringContaining('Partial write failed'), null]);
    expect(fs.readFileSync(filePath, 'utf8')).toBe(original);
    expect(fs.readdirSync(path.dirname(filePath))).toEqual([Constants.StatWrapFiles.CHECKLIST]);
  });

  it('reports close failures and still removes its temporary file', () => {
    writeOriginal(legacy());
    const original = fs.readFileSync(filePath, 'utf8');
    jest.spyOn(fs, 'closeSync').mockImplementationOnce(() => { throw new Error('Close failed'); });
    expect(load()).toEqual([expect.stringContaining('Close failed'), null]);
    expect(fs.readFileSync(filePath, 'utf8')).toBe(original);
    expect(fs.readdirSync(path.dirname(filePath))).toEqual([Constants.StatWrapFiles.CHECKLIST]);
  });

  it('does not delete an unowned file when exclusive temporary-file creation fails', () => {
    writeOriginal(legacy());
    const open = fs.openSync.bind(fs);
    let collision;
    jest.spyOn(fs, 'openSync').mockImplementation((target, flags, ...args) => {
      if (flags === 'wx') {
        collision = target;
        fs.writeFileSync(target, 'Unowned contents');
      }
      return open(target, flags, ...args);
    });
    expect(load()).toEqual([expect.stringContaining('EEXIST'), null]);
    expect(fs.readFileSync(collision, 'utf8')).toBe('Unowned contents');
    expect(read()).toEqual(legacy());
  });

  it('propagates ordinary save failures without losing the original', () => {
    service.writeChecklist(projectPath, checklist);
    const original = fs.readFileSync(filePath, 'utf8');
    jest.spyOn(fs, 'renameSync').mockImplementation(() => { throw new Error('Rename failed'); });
    expect(() => service.writeChecklist(projectPath, checklist)).toThrow('Rename failed');
    expect(fs.readFileSync(filePath, 'utf8')).toBe(original);
  });

  it('reports migration metadata when a save converts a legacy file', () => {
    writeOriginal(legacy());
    expect(service.writeChecklist(projectPath, checklist)).toEqual({ fromVersion: 1, toVersion: 2 });
    expect(read().version).toBe(2);
    expect(service.writeChecklist(projectPath, checklist)).toBeNull();
  });

  it('does not intercept exceptions raised by a successful-load callback', () => {
    service.writeChecklist(projectPath, checklist);
    const callback = jest.fn(() => { throw new Error('Consumer failed'); });
    expect(() => service.loadChecklist(projectPath, callback)).toThrow('Consumer failed');
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
