import { describe, it, expect } from 'vitest';
import { mdToHtml } from './md-to-html';

describe('mdToHtml', () => {
  it('renders ### headings as h4', () => {
    expect(mdToHtml('### Deep heading')).toContain('<h4>Deep heading</h4>');
  });

  it('renders ## headings as h3', () => {
    expect(mdToHtml('## Section')).toContain('<h3>Section</h3>');
  });

  it('renders # headings as h2', () => {
    expect(mdToHtml('# Main')).toContain('<h2>Main</h2>');
  });

  it('renders horizontal rules (--- and ***)', () => {
    expect(mdToHtml('---')).toContain('<hr class="ai-hr"/>');
    expect(mdToHtml('***')).toContain('<hr class="ai-hr"/>');
  });

  it('renders empty lines as <br/>', () => {
    expect(mdToHtml('\n')).toContain('<br/>');
  });

  it('renders unordered list items (- and *)', () => {
    const html = mdToHtml('- item one\n* item two');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>item one</li>');
    expect(html).toContain('<li>item two</li>');
    expect(html).toContain('</ul>');
  });

  it('flushes the list before a heading or table', () => {
    const html = mdToHtml('- item\n## After list');
    expect(html).toContain('</ul>');
    expect(html).toContain('<h3>After list</h3>');
  });

  it('renders a markdown table', () => {
    const md = '| Col A | Col B |\n|---|---|\n| val 1 | val 2 |';
    const html = mdToHtml(md);
    expect(html).toContain('<table class="ai-table">');
    expect(html).toContain('<th>Col A</th>');
    expect(html).toContain('<th>Col B</th>');
    expect(html).toContain('<td>val 1</td>');
    expect(html).toContain('<td>val 2</td>');
    expect(html).toContain('</tbody></table>');
  });

  it('flushes a table when a non-table line follows', () => {
    const md = '| Col |\n|---|\n| a |\nregular text';
    const html = mdToHtml(md);
    expect(html).toContain('</tbody></table>');
    expect(html).toContain('<p>regular text</p>');
  });

  it('handles inlineFormat: **bold**, *italic*, `code`', () => {
    const html = mdToHtml('**bold** and *italic* and `code`');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<code>code</code>');
  });

  it('renders plain paragraphs', () => {
    expect(mdToHtml('plain text line')).toContain('<p>plain text line</p>');
  });

  it('flushes list on empty line', () => {
    const html = mdToHtml('- item\n\ntext');
    expect(html).toContain('</ul>');
    expect(html).toContain('<br/>');
    expect(html).toContain('<p>text</p>');
  });

  it('flushes remaining table at end of input', () => {
    const md = '| H1 |\n|---|\n| row |';
    const html = mdToHtml(md);
    expect(html).toContain('</tbody></table>');
  });

  it('flushes remaining list at end of input', () => {
    const html = mdToHtml('- only item');
    expect(html).toContain('</ul>');
  });

  it('skips separator rows (|---) and bold-separator rows (| ***) in table body', () => {
    const md = '| Col |\n|---|\n| *** |\n| real |';
    const html = mdToHtml(md);
    // Separator rows should not produce <td> cells
    expect(html).not.toContain('<td>---</td>');
    expect(html).toContain('<td>real</td>');
  });

  it('flushes list before a table row', () => {
    const html = mdToHtml('- item\n| Col |\n|---|\n| val |');
    expect(html).toContain('</ul>');
    expect(html).toContain('<table');
  });

  it('handles a single empty-string input (outputs only the br for the empty line)', () => {
    // ''.split('\n') = [''] → one empty line → <br/>
    expect(mdToHtml('')).toContain('<br/>');
  });
});
