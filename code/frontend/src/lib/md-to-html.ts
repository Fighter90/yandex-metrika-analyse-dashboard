/** Simple markdown-to-HTML converter for AI analysis rendering. */
export function mdToHtml(md: string): string {
  const lines = md.split('\n');
  const html: string[] = [];
  let inTable = false;
  let tableRows: string[] = [];

  const flushTable = () => {
    if (tableRows.length > 0) {
      const headerRow = tableRows[0];
      const dataRows = tableRows.slice(1).filter((r) => !r.startsWith('|---'));
      html.push('<table class="ai-table">');
      html.push('<thead><tr>');
      headerRow.split('|').filter((c) => c.trim()).forEach((cell) => {
        html.push(`<th>${cell.trim()}</th>`);
      });
      html.push('</tr></thead><tbody>');
      dataRows.forEach((row) => {
        html.push('<tr>');
        row.split('|').filter((c) => c.trim()).forEach((cell) => {
          html.push(`<td>${cell.trim()}</td>`);
        });
        html.push('</tr>');
      });
      html.push('</tbody></table>');
      tableRows = [];
      inTable = false;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Table detection
    if (trimmed.startsWith('|')) {
      if (!inTable) inTable = true;
      tableRows.push(trimmed);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Empty line
    if (trimmed === '') {
      html.push('<br/>');
      continue;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      html.push(`<h4>${inlineFormat(trimmed.slice(4))}</h4>`);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      html.push(`<h3>${inlineFormat(trimmed.slice(3))}</h3>`);
      continue;
    }
    if (trimmed.startsWith('# ')) {
      html.push(`<h2>${inlineFormat(trimmed.slice(2))}</h2>`);
      continue;
    }

    // Bold + italic inline
    html.push(`<p>${inlineFormat(trimmed)}</p>`);
  }

  if (inTable) flushTable();

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
