/* eslint-disable prettier/prettier */
// Collection of constant values

module.exports = {
  attributes: [
    {
      id: 'archived',
      display: 'Archived',
      details:
        'Is this asset no longer actively used within the project?  StatWrap will ignore this for most of its processing and analysis tasks.',
      type: 'bool',
      default: false,
      appliesTo: ['*']
    },
    {
      id: 'entrypoint',
      display: 'Entry Point',
      details: 'Is this asset an entry point for a programmatic workflow?',
      type: 'bool',
      default: false,
      appliesTo: ['code']
    },
    {
      id: 'sensitive',
      display: 'Sensitive Info',
      details: 'Does this asset contain sensitive information (PHI, PII, passwords, secrets)',
      type: 'bool',
      default: false,
      appliesTo: ['code', 'data', 'documentation']
    }
  ],
  // In the patterns, don't use /g. TIL (after hours of debugging), global state preserves
  // where it's checking between calls, so you can call .test() multiple times on the same
  // string and you will get different results (https://stackoverflow.com/a/2630538/5670646).
  contentTypes: [
    {
      type: 'code',
      patterns: [
        // R: .r, .rmd, .rnw, .snw
        /^.+\.r(?:md)?$/i, /^.+\.[rs]nw$/i,
        // Python: .py, py3, .pyi
        /^.+\.py[3i]?$/i,
        // SAS: .sas
        /^.+\.sas$/i,
        // Stata: .do, .ado, .mata
        /^.+\.[a]?do$/i, /^.+\.mata$/i
      ]
    },
    {
      type: 'data',
      patterns: [
        // General: .csv, .tsv, .xls, .xlsx
        /^.+\.(csv|tsv|xls|xlsx)$/i,
        // R: .rdata, .rda
        /^.+\.dta$/i,
        // SAS: .sas7bdat, .sas7bvew, .sas7bndx, .sd7, .sv7, si7
        //      We are only supporting SAS V7 and beyond extensions (both short and long)
        /^.+\.rda(?:ta)?$/i,
        // Stata: .dta
        /^.+\.sas7b(dat|vew|ndx)?$/i, /^.+\.s[dvi]?7$/i
      ]
    },
    {
      type: 'documentation',
      patterns: [/\.md$/i]
    }
  ]
};
