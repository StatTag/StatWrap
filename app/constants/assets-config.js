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
  ]
};
