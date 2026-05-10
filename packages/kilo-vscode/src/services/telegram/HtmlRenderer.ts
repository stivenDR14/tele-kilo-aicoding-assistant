/**
 * HtmlRenderer: Generates HTML fallback content for Telegram messages.
 */
export class HtmlRenderer {
  /**
   * Renders a conversation history into a standalone HTML document.
   */
  static renderConversation(history: { role: string; content: string; reasoning?: string; timestamp: string }[]): string {
    const messagesHtml = history.map(msg => `
      <div class="message ${msg.role}">
        <div class="meta">${msg.timestamp} · ${msg.role}</div>
        ${msg.reasoning ? `<details style="margin-bottom:6px;"><summary style="color:#888;font-size:0.85em;cursor:pointer;">🧠 Reasoning</summary><div style="color:#aaa;font-size:0.85em;font-style:italic;padding:6px 0;white-space:pre-wrap;">${msg.reasoning.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div></details>` : ''}
        <div class="content">${msg.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: sans-serif; background: #1e1e1e; color: #d4d4d4; padding: 20px; }
          .message { margin-bottom: 15px; padding: 10px; border-radius: 5px; }
          .message.user { background: #2d2d2d; }
          .message.assistant { background: #3c3c3c; }
          .meta { font-size: 0.8em; color: #888; }
        </style>
      </head>
      <body>${messagesHtml}</body>
      </html>
    `;
  }

  /**
   * Renders a unified diff string into a standalone colored HTML document.
   */
  static renderDiff(filePath: string, unifiedDiff: string): string {
    const lines = unifiedDiff.split('\n');
    const linesHtml = lines.map(line => {
      let bg = 'transparent';
      let color = '#d4d4d4';
      if (line.startsWith('+++') || line.startsWith('---')) {
        bg = '#1a3a4a'; color = '#9cdcfe';
      } else if (line.startsWith('+')) {
        bg = '#1a3a1a'; color = '#b5cea8';
      } else if (line.startsWith('-')) {
        bg = '#3a1a1a'; color = '#f44747';
      } else if (line.startsWith('@@')) {
        bg = '#2a2a3a'; color = '#c586c0';
      }
      const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<div style="background:${bg};color:${color};white-space:pre;font-family:monospace;font-size:13px;padding:1px 8px;min-height:18px;">${escaped}</div>`;
    }).join('');

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Diff: ${filePath}</title></head>
<body style="margin:0;background:#1e1e1e;padding:8px;">
<div style="color:#888;font-size:12px;margin-bottom:8px;">📄 ${filePath}</div>
${linesHtml}
</body>
</html>`;
  }

  /**
   * Renders a file tree as a collapsible/expandable nested folder structure.
   */
  static renderTree(paths: string[]): string {
    interface TreeNode { [key: string]: TreeNode | null; }
    const root: TreeNode = {};

    for (const p of paths) {
      const parts = p.replace(/^\.\//, '').split('/').filter(Boolean);
      let current = root;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          // Leaf file (or folder with no children listed)
          if (!(part in current)) current[part] = null;
        } else {
          if (!current[part] || current[part] === null) current[part] = {};
          current = current[part] as TreeNode;
        }
      }
    }

    function renderNode(node: TreeNode, depth: number): string {
      const entries = Object.entries(node).sort(([a, av], [b, bv]) => {
        const aIsDir = av !== null ? 0 : 1;
        const bIsDir = bv !== null ? 0 : 1;
        if (aIsDir !== bIsDir) return aIsDir - bIsDir;
        return a.localeCompare(b);
      });

      let html = '';
      for (const [name, children] of entries) {
        if (children !== null) {
          const open = depth < 1 ? ' open' : '';
          html += `<details${open} style="margin-left:${depth * 16}px;">`;
          html += `<summary style="cursor:pointer;padding:2px 0;user-select:none;">📁 ${name}</summary>`;
          html += renderNode(children, depth + 1);
          html += `</details>`;
        } else {
          html += `<div style="margin-left:${depth * 16}px;padding:2px 0;">📄 ${name}</div>`;
        }
      }
      return html;
    }

    const treeHtml = renderNode(root, 0);

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>File Tree</title>
<style>
  body { font-family: 'SF Mono', Menlo, monospace; font-size: 13px; background: #1e1e1e; color: #d4d4d4; padding: 12px; margin: 0; }
  summary { outline: none; }
  summary:hover { color: #9cdcfe; }
</style>
</head>
<body>
${treeHtml}
</body>
</html>`;
  }
}
