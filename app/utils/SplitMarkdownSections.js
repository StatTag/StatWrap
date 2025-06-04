import { marked } from 'marked';

export function SplitMarkdownSections(markdown) {
  const tokens = marked.lexer(markdown);
  const sections = [];
  let currentSection = null;

  tokens.forEach(token => {
    if (token.type === 'heading') {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        heading: token,
        content: ''
      };
    } else if (currentSection) {
      currentSection.content += token.raw || '';
    }
  });
  if (currentSection) sections.push(currentSection);
  return sections;
}