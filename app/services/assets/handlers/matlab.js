import BaseCodeHandler from './baseCode';
import Constants from '../../../constants/constants';

// MATLAB / Octave file extensions that we will scan.
// All lookups should be lowercase - we will do lowercase conversion before comparison.
const FILE_EXTENSION_LIST = ['m'];

const DATA_READ_FUNCTIONS = new Map(
  [
    'readtable',
    'readmatrix',
    'readcell',
    'readvars',
    'readtimetable',
    'csvread',
    'dlmread',
    'textread',
    'xlsread',
    'importdata',
  ].map((fn) => [fn.toLowerCase(), fn]),
);

const FIGURE_READ_FUNCTIONS = new Map([['imread', 'imread']]);

const MEDIA_READ_FUNCTIONS = new Map(
  ['audioread', 'VideoReader'].map((fn) => [fn.toLowerCase(), fn]),
);

const WRITE_2ND_ARG_DATA_FUNCTIONS = new Map(
  ['writetable', 'writematrix', 'writecell', 'writetimetable'].map((fn) => [fn.toLowerCase(), fn]),
);

const WRITE_1ST_ARG_DATA_FUNCTIONS = new Map(
  ['csvwrite', 'dlmwrite', 'xlswrite', 'audiowrite'].map((fn) => [fn.toLowerCase(), fn]),
);

const WRITE_2ND_ARG_FIGURE_FUNCTIONS = new Map(
  ['saveas', 'exportgraphics', 'exportapp', 'imwrite'].map((fn) => [fn.toLowerCase(), fn]),
);

const ALL_TRACKED_FUNCTIONS = new Map([
  ...DATA_READ_FUNCTIONS,
  ...FIGURE_READ_FUNCTIONS,
  ...MEDIA_READ_FUNCTIONS,
  ...WRITE_2ND_ARG_DATA_FUNCTIONS,
  ...WRITE_1ST_ARG_DATA_FUNCTIONS,
  ...WRITE_2ND_ARG_FIGURE_FUNCTIONS,
  ['load', 'load'],
  ['save', 'save'],
  ['run', 'run'],
  ['fopen', 'fopen'],
  ['print', 'print'],
  ['addpath', 'addpath'],
  ['import', 'import'],
]);

const MATLAB_IMPORT_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*(?:\.\*)?$/;
const UNQUOTED_PATH_PATTERN = /^[a-zA-Z0-9_./\\-]+$/;

/**
 * Determine if a single quote at `index` is a MATLAB transpose operator rather than a string delimiter.
 */
function isTransposeQuote(text, index) {
  return index > 0 && /[a-zA-Z0-9_)\]}'.]/.test(text[index - 1]);
}

/**
 * Advance from an opening quote (' or ") to its closing quote on the same line.
 * Handles MATLAB doubled-quote escapes ('' and "") and Octave backslash escapes (\\, \") in double quotes.
 */
function findClosingQuote(text, startIndex) {
  const quote = text[startIndex];
  for (let i = startIndex + 1; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\n' || ch === '\r') {
      return i - 1;
    }
    if (quote === '"' && ch === '\\' && i + 1 < text.length) {
      const next = text[i + 1];
      if (next === '\\' || next === '"') {
        i += 1;
        continue;
      }
    }
    if (ch === quote) {
      if (i + 1 < text.length && text[i + 1] === quote) {
        i += 1;
        continue;
      }
      return i;
    }
  }
  return text.length - 1;
}

function isQuotedString(value) {
  if (!value) {
    return false;
  }
  const trimmed = value.trim();
  if (trimmed.length <= 2) {
    return false;
  }
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  if ((first !== "'" && first !== '"') || last !== first) {
    return false;
  }
  return findClosingQuote(trimmed, 0) === trimmed.length - 1;
}

function unquote(value) {
  return value.trim().replace(/^['"]|['"]$/g, '');
}

/**
 * Strip MATLAB %{ ... %} and Octave #{ ... #} block comments, including nested blocks.
 */
function stripBlockComments(text) {
  const lines = text.split(/\r\n|\r|\n/);
  const keptLines = [];
  const blockStack = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed === '%{' || trimmed === '#{') {
      blockStack.push(trimmed[0]);
      return;
    }
    if (blockStack.length > 0) {
      const top = blockStack[blockStack.length - 1];
      if ((top === '%' && trimmed === '%}') || (top === '#' && trimmed === '#}')) {
        blockStack.pop();
      }
      return;
    }
    keptLines.push(line);
  });

  return keptLines.join('\n');
}

/**
 * Tokenize command-syntax arguments on whitespace while preserving quoted strings.
 */
function tokenizeCommandArgs(text) {
  const tokens = [];
  let i = 0;

  while (i < text.length) {
    while (i < text.length && /\s/.test(text[i])) {
      i += 1;
    }
    if (i >= text.length) {
      break;
    }
    const ch = text[i];
    if (ch === '"' || ch === "'") {
      const closeIdx = findClosingQuote(text, i);
      tokens.push(text.slice(i, closeIdx + 1));
      i = closeIdx + 1;
    } else {
      const start = i;
      while (i < text.length && !/\s/.test(text[i])) {
        i += 1;
      }
      tokens.push(text.slice(start, i));
    }
  }

  return tokens;
}

/**
 * Pick the first command-syntax token that represents a file matching `extensionRegex`, skipping flags.
 */
function findCommandTarget(argsText, extensionRegex) {
  const tokens = tokenizeCommandArgs(argsText);
  const target = tokens.find((token) => {
    if (isQuotedString(token)) {
      const inner = unquote(token);
      return !inner.startsWith('-') && extensionRegex.test(inner);
    }
    return !token.startsWith('-') && UNQUOTED_PATH_PATTERN.test(token) && extensionRegex.test(token);
  });
  return target ? target.trim() : '';
}

/**
 * Split text on any top-level character in `delimiterSet` while respecting MATLAB quotes
 * and balanced (), [], {} delimiters.
 */
function splitTopLevel(text, delimiterSet) {
  const segments = [];
  if (!text || text.trim() === '') {
    return segments;
  }

  let start = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '"' || (ch === "'" && !isTransposeQuote(text, i))) {
      i = findClosingQuote(text, i);
      continue;
    }

    if (ch === '(') {
      parenDepth += 1;
    } else if (ch === ')') {
      parenDepth = Math.max(parenDepth - 1, 0);
    } else if (ch === '[') {
      bracketDepth += 1;
    } else if (ch === ']') {
      bracketDepth = Math.max(bracketDepth - 1, 0);
    } else if (ch === '{') {
      braceDepth += 1;
    } else if (ch === '}') {
      braceDepth = Math.max(braceDepth - 1, 0);
    } else if (
      delimiterSet.has(ch) &&
      parenDepth === 0 &&
      bracketDepth === 0 &&
      braceDepth === 0
    ) {
      const segment = text.slice(start, i).trim();
      if (segment !== '') {
        segments.push(segment);
      }
      start = i + 1;
    }
  }

  const tail = text.slice(start).trim();
  if (tail !== '') {
    segments.push(tail);
  }

  return segments;
}

const ARGUMENT_DELIMITERS = new Set([',']);
const STATEMENT_DELIMITERS = new Set(['\n', '\r', ';', ',']);

export default class MatlabHandler extends BaseCodeHandler {
  static id = 'StatWrap.MatlabHandler';

  constructor() {
    super(MatlabHandler.id, FILE_EXTENSION_LIST);
  }

  id() {
    return MatlabHandler.id;
  }

  /**
   * Strip MATLAB/Octave block comments (%{ ... %}, #{ ... #}), line comments (% and #)
   * outside strings, and collapse line continuations (...) outside strings.
   */
  stripComments(text) {
    if (!text || text.trim() === '') {
      return '';
    }

    // Strip MATLAB %{ ... %} and Octave #{ ... #} block comments (including nested blocks)
    const withoutBlocks = stripBlockComments(text);

    let result = '';
    for (let i = 0; i < withoutBlocks.length; i++) {
      const ch = withoutBlocks[i];

      if (ch === '"' || (ch === "'" && !isTransposeQuote(withoutBlocks, i))) {
        const closeIdx = findClosingQuote(withoutBlocks, i);
        result += withoutBlocks.slice(i, closeIdx + 1);
        i = closeIdx;
        continue;
      }

      // Line continuation `...` in MATLAB (acts as comment until end of line + joins next line)
      if (withoutBlocks.startsWith('...', i)) {
        while (i < withoutBlocks.length && withoutBlocks[i] !== '\n') {
          i += 1;
        }
        result += ' ';
        continue;
      }

      // Single-line comment (% for MATLAB/Octave, # for Octave)
      if (ch === '%' || ch === '#') {
        while (i < withoutBlocks.length && withoutBlocks[i] !== '\n') {
          i += 1;
        }
        if (i < withoutBlocks.length && withoutBlocks[i] === '\n') {
          result += '\n';
        }
        continue;
      }

      result += ch;
    }

    return result;
  }

  /**
   * Split function call arguments at top-level commas while respecting quotes and nested delimiters.
   */
  splitArguments(argsText) {
    return splitTopLevel(argsText, ARGUMENT_DELIMITERS);
  }

  /**
   * Extract function calls outside string literals with balanced parentheses.
   * Handles multiple calls per line, multi-line calls, and nested calls in arguments.
   */
  extractFunctionCalls(cleanText) {
    const calls = [];
    let i = 0;

    while (i < cleanText.length) {
      const ch = cleanText[i];

      if (ch === '"' || (ch === "'" && !isTransposeQuote(cleanText, i))) {
        i = findClosingQuote(cleanText, i) + 1;
        continue;
      }

      if (/[a-zA-Z_]/.test(ch)) {
        const prev = i > 0 ? cleanText[i - 1] : '';
        let end = i + 1;
        while (end < cleanText.length && /[a-zA-Z0-9_]/.test(cleanText[end])) {
          end += 1;
        }
        const ident = cleanText.slice(i, end);

        if (!/[a-zA-Z0-9_.]/.test(prev)) {
          const canonical = ALL_TRACKED_FUNCTIONS.get(ident.toLowerCase());
          if (canonical) {
            let look = end;
            while (look < cleanText.length && /[ \t\r\n]/.test(cleanText[look])) {
              look += 1;
            }
            if (look < cleanText.length && cleanText[look] === '(') {
              let depth = 1;
              let cursor = look + 1;
              while (cursor < cleanText.length && depth > 0) {
                const innerCh = cleanText[cursor];
                if (innerCh === '"' || (innerCh === "'" && !isTransposeQuote(cleanText, cursor))) {
                  cursor = findClosingQuote(cleanText, cursor) + 1;
                  continue;
                }
                if (innerCh === '(') {
                  depth += 1;
                } else if (innerCh === ')') {
                  depth -= 1;
                }
                cursor += 1;
              }
              if (depth === 0) {
                const argsText = cleanText.slice(look + 1, cursor - 1);
                calls.push({
                  fn: canonical,
                  args: this.splitArguments(argsText),
                });
              }
            }
          }
        }
        i = end;
        continue;
      }

      i += 1;
    }

    return calls;
  }

  /**
   * Split cleaned code into top-level statements on newlines, semicolons, and commas
   * outside quotes and nested delimiters.
   */
  splitStatements(cleanText) {
    return splitTopLevel(cleanText, STATEMENT_DELIMITERS);
  }

  getLibraryId(packageName, importItem) {
    if (packageName && importItem) {
      return `${packageName}.${importItem}`;
    }
    if (packageName) {
      return packageName;
    }
    if (importItem) {
      return importItem;
    }
    return '(unknown)';
  }

  /**
   * Extract inputs from MATLAB/Octave code
   */
  getInputs(uri, text) {
    const inputs = [];
    if (!text || text.trim() === '') {
      return inputs;
    }

    const cleanText = this.stripComments(text);
    const processedPaths = new Set();

    const addInput = (id, type, filePath) => {
      if (!filePath || processedPaths.has(filePath)) {
        return;
      }
      inputs.push({
        id,
        type,
        path: filePath,
      });
      processedPaths.add(filePath);
    };

    const calls = this.extractFunctionCalls(cleanText);
    calls.forEach(({ fn, args }) => {
      const lower = fn.toLowerCase();
      const firstArg = args[0] ? args[0].trim() : '';

      if (lower === 'load') {
        const targetArg = args.find((arg) => isQuotedString(arg) && !unquote(arg).startsWith('-'));
        if (targetArg) {
          const trimmedArg = targetArg.trim();
          addInput(`load - ${trimmedArg}`, Constants.DependencyType.DATA, trimmedArg);
        }
        return;
      }

      if (!isQuotedString(firstArg)) {
        return;
      }

      if (DATA_READ_FUNCTIONS.has(lower)) {
        addInput(`${fn} - ${firstArg}`, Constants.DependencyType.DATA, firstArg);
      } else if (FIGURE_READ_FUNCTIONS.has(lower)) {
        addInput(`${fn} - ${firstArg}`, Constants.DependencyType.FIGURE, firstArg);
      } else if (MEDIA_READ_FUNCTIONS.has(lower)) {
        addInput(`${fn} - ${firstArg}`, Constants.DependencyType.DATA, firstArg);
      } else if (lower === 'run') {
        addInput(`${fn} - ${firstArg}`, Constants.DependencyType.DATA, firstArg);
      } else if (lower === 'fopen') {
        const modeArg = args[1] ? args[1].trim() : '';
        if (!modeArg) {
          if (unquote(firstArg).toLowerCase() !== 'all') {
            addInput(`fopen - ${firstArg}`, Constants.DependencyType.DATA, firstArg);
          }
        } else if (isQuotedString(modeArg) && /^r(?:\+[tb]?|[tb]?\+?)$/i.test(unquote(modeArg))) {
          addInput(`fopen - ${firstArg}`, Constants.DependencyType.DATA, firstArg);
        }
      }
    });

    // Command syntax at statement boundaries: `load file.mat`, `load -ascii data.txt`, `run script.m`
    const statements = this.splitStatements(cleanText);
    statements.forEach((stmt) => {
      const loadMatch = stmt.match(/^load\s+([^=(].+)$/i);
      if (loadMatch) {
        const filePath = findCommandTarget(loadMatch[1], /\.(?:mat|txt|dat|csv)$/i);
        if (filePath) {
          addInput(`load - ${filePath}`, Constants.DependencyType.DATA, filePath);
        }
        return;
      }

      const runMatch = stmt.match(/^run\s+([^=(].+)$/i);
      if (runMatch) {
        const filePath = findCommandTarget(runMatch[1], /\.m$/i);
        if (filePath) {
          addInput(`run - ${filePath}`, Constants.DependencyType.DATA, filePath);
        }
      }
    });

    return inputs;
  }

  /**
   * Extract outputs from MATLAB/Octave code
   */
  getOutputs(uri, text) {
    const outputs = [];
    if (!text || text.trim() === '') {
      return outputs;
    }

    const cleanText = this.stripComments(text);
    const processedPaths = new Set();

    const addOutput = (id, type, filePath) => {
      if (!filePath || processedPaths.has(filePath)) {
        return;
      }
      if (unquote(filePath).startsWith('-')) {
        return; // Ignore flags like -dpng, -r300, etc.
      }
      outputs.push({
        id,
        type,
        path: filePath,
      });
      processedPaths.add(filePath);
    };

    const calls = this.extractFunctionCalls(cleanText);
    calls.forEach(({ fn, args }) => {
      const lower = fn.toLowerCase();
      const firstArg = args[0] ? args[0].trim() : '';
      const secondArg = args[1] ? args[1].trim() : '';
      const thirdArg = args[2] ? args[2].trim() : '';

      if (WRITE_2ND_ARG_DATA_FUNCTIONS.has(lower)) {
        if (isQuotedString(secondArg)) {
          addOutput(`${fn} - ${secondArg}`, Constants.DependencyType.DATA, secondArg);
        }
      } else if (WRITE_1ST_ARG_DATA_FUNCTIONS.has(lower)) {
        if (isQuotedString(firstArg)) {
          addOutput(`${fn} - ${firstArg}`, Constants.DependencyType.DATA, firstArg);
        }
      } else if (lower === 'save') {
        const targetArg = args.find((arg) => isQuotedString(arg) && !unquote(arg).startsWith('-'));
        if (targetArg) {
          const trimmedArg = targetArg.trim();
          addOutput(`save - ${trimmedArg}`, Constants.DependencyType.DATA, trimmedArg);
        }
      } else if (WRITE_2ND_ARG_FIGURE_FUNCTIONS.has(lower)) {
        if (isQuotedString(secondArg)) {
          addOutput(`${fn} - ${secondArg}`, Constants.DependencyType.FIGURE, secondArg);
        } else if (lower === 'imwrite' && isQuotedString(thirdArg)) {
          // imwrite(X, map, filename) for indexed images
          addOutput(`${fn} - ${thirdArg}`, Constants.DependencyType.FIGURE, thirdArg);
        }
      } else if (lower === 'print') {
        const targetArg = args.find((arg) => isQuotedString(arg) && !unquote(arg).startsWith('-'));
        if (targetArg) {
          const trimmedArg = targetArg.trim();
          addOutput(`print - ${trimmedArg}`, Constants.DependencyType.FIGURE, trimmedArg);
        }
      } else if (lower === 'fopen') {
        if (isQuotedString(firstArg) && secondArg && isQuotedString(secondArg)) {
          const mode = unquote(secondArg);
          if (/^(?:[wa]\+?[tb]?|r(?:\+[tb]?|[tb]\+)|[wa][tb]?\+)$/i.test(mode)) {
            addOutput(`fopen - ${firstArg}`, Constants.DependencyType.DATA, firstArg);
          }
        }
      }
    });

    // Command syntax at statement boundaries: `save results.mat`, `print -dpng plot.png`
    const statements = this.splitStatements(cleanText);
    statements.forEach((stmt) => {
      const saveMatch = stmt.match(/^save\s+([^=(].+)$/i);
      if (saveMatch) {
        const filePath = findCommandTarget(saveMatch[1], /\.(?:mat|txt|dat)$/i);
        if (filePath) {
          addOutput(`save - ${filePath}`, Constants.DependencyType.DATA, filePath);
        }
        return;
      }

      const printMatch = stmt.match(/^print\s+([^=(].+)$/i);
      if (printMatch) {
        const filePath = findCommandTarget(printMatch[1], /\.[a-zA-Z0-9]+$/i);
        if (filePath) {
          addOutput(`print - ${filePath}`, Constants.DependencyType.FIGURE, filePath);
        }
      }
    });

    return outputs;
  }

  /**
   * Extract libraries / imports / packages / addpath
   */
  getLibraries(uri, text) {
    const libraries = [];
    if (!text || text.trim() === '') {
      return libraries;
    }

    const cleanText = this.stripComments(text);
    const processedLibs = new Set();

    const addLib = (id, pkg, importName) => {
      if (!id || processedLibs.has(id)) {
        return;
      }
      libraries.push({
        id,
        package: pkg,
        import: importName || null,
      });
      processedLibs.add(id);
    };

    const addImportToken = (rawToken) => {
      const item = isQuotedString(rawToken) ? unquote(rawToken).trim() : rawToken.trim();
      if (!item || !MATLAB_IMPORT_PATTERN.test(item)) {
        return;
      }
      if (item.includes('.')) {
        const parts = item.split('.');
        const importName = parts.pop();
        const pkg = parts.join('.');
        addLib(this.getLibraryId(pkg, importName), pkg, importName);
      } else {
        addLib(this.getLibraryId(item, null), item, null);
      }
    };

    const statements = this.splitStatements(cleanText);
    statements.forEach((stmt) => {
      // 1. import pkg.subpkg.* or import pkg.ClassName (only at statement start)
      const importMatch = stmt.match(/^import\s+([^=(].+)$/);
      if (importMatch) {
        importMatch[1]
          .trim()
          .split(/[\s,]+/)
          .forEach(addImportToken);
        return;
      }

      // 2. Command-form addpath: `addpath mydir`, `addpath 'my dir'`, or `addpath mydir -end`
      const addpathCmdMatch = stmt.match(/^addpath\s+([^=(].+)$/i);
      if (addpathCmdMatch) {
        tokenizeCommandArgs(addpathCmdMatch[1]).forEach((token) => {
          if (isQuotedString(token)) {
            if (!unquote(token).startsWith('-')) {
              addLib(`addpath - ${token}`, token, null);
            }
          } else if (!token.startsWith('-') && UNQUOTED_PATH_PATTERN.test(token)) {
            addLib(`addpath - ${token}`, token, null);
          }
        });
      }
    });

    // 3. Functional import(...) and addpath('dir'), addpath('-end', 'dir'), addpath(genpath('dir'))
    const calls = this.extractFunctionCalls(cleanText);
    calls.forEach(({ fn, args }) => {
      const lower = fn.toLowerCase();
      if (lower === 'import') {
        args.forEach(addImportToken);
        return;
      }
      if (lower !== 'addpath') {
        return;
      }
      args.forEach((arg) => {
        const trimmed = arg.trim();
        if (isQuotedString(trimmed)) {
          if (!unquote(trimmed).startsWith('-')) {
            addLib(`addpath - ${trimmed}`, trimmed, null);
          }
          return;
        }
        const genpathMatch = trimmed.match(/^genpath\s*\(([\s\S]+)\)$/i);
        if (genpathMatch) {
          this.splitArguments(genpathMatch[1]).forEach((gpArg) => {
            const gpTrimmed = gpArg.trim();
            if (isQuotedString(gpTrimmed) && !unquote(gpTrimmed).startsWith('-')) {
              addLib(`addpath - ${gpTrimmed}`, gpTrimmed, null);
            }
          });
        }
      });
    });

    return libraries;
  }
}
