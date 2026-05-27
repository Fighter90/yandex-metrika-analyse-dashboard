/**
 * Markdown-to-HTML converter for AI analysis rendering.
 * Handles: headers (##, ###), tables, bold, italic, inline code, lists, paragraphs, horizontal rules.
 * Designed to render the full AI narrative without truncation.
 */
export function mdToHtml(md: string): string {
  const lines = md.split('\n');
  const html: string[] = [];
  let inTable = false;
  let tableRows: string[] = [];
  let inList = false;

  const flushTable = () => {
    if (tableRows.length > 0) {
      const headerRow = tableRows[0]!;
      const dataRows = tableRows
        .slice(1)
        .filter((r) => !r.startsWith('|---') && !r.startsWith('| ***'));
      html.push('<table class="ai-table">');
      html.push('<thead><tr>');
      headerRow
        .split('|')
        .filter((c) => c.trim())
        .forEach((cell) => {
          html.push(`<th>${cell.trim()}</th>`);
        });
      html.push('</tr></thead><tbody>');
      dataRows.forEach((row) => {
        html.push('<tr>');
        row
          .split('|')
          .filter((c) => c.trim())
          .forEach((cell) => {
            html.push(`<td>${inlineFormat(cell.trim())}</td>`);
          });
        html.push('</tr>');
      });
      html.push('</tbody></table>');
      tableRows = [];
      inTable = false;
    }
  };

  const flushList = () => {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Table detection
    if (trimmed.startsWith('|') && !trimmed.startsWith('||')) {
      if (!inTable) inTable = true;
      tableRows.push(trimmed);
      flushList();
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Horizontal rule
    if (trimmed.startsWith('---') || trimmed.startsWith('***')) {
      flushList();
      html.push('<hr class="ai-hr"/>');
      continue;
    }

    // Empty line
    if (trimmed === '') {
      flushList();
      html.push('<br/>');
      continue;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      flushList();
      html.push(`<h4>${inlineFormat(trimmed.slice(4))}</h4>`);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      html.push(`<h3>${inlineFormat(trimmed.slice(3))}</h3>`);
      continue;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      html.push(`<h2>${inlineFormat(trimmed.slice(2))}</h2>`);
      continue;
    }

    // Unordered lists
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) html.push('<ul>');
      inList = true;
      html.push(`<li>${inlineFormat(trimmed.slice(2))}</li>`);
      continue;
    } else {
      flushList();
    }

    // Bold + italic inline
    html.push(`<p>${inlineFormat(trimmed)}</p>`);
  }

  if (inTable) flushTable();
  if (inList) flushList();

  return html.join('\n');
}

function inlineFormat(text: string): string {
  // Bold: **text**
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic: *text*
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Inline code: `text`
  text = text.replace(/`(.+?)`/g, '<code>$1</code>');
  return text;
}
