/**
 * HtmlRenderer: Generates HTML fallback content for Telegram messages.
 */
export class HtmlRenderer {
  /**
   * Renders a conversation history into a standalone HTML document.
   */
  static renderConversation(history: { role: string; content: string; timestamp: string }[]): string {
    const messagesHtml = history.map(msg => `
      <div class="message ${msg.role}">
        <div class="meta">${msg.timestamp}</div>
        <div class="content">${msg.content}</div>
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
   * Renders a file tree into an HTML list.
   */
  static renderTree(tree: string[]): string {
    const listItems = tree.map(item => `<li>${item}</li>`).join('');
    return `
      <!DOCTYPE html>
      <html>
      <body>
        <ul>${listItems}</ul>
      </body>
      </html>
    `;
  }
}
