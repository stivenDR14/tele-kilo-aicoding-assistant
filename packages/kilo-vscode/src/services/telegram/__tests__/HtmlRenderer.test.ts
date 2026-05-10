import { describe, it, expect } from 'vitest';
import { HtmlRenderer } from '../HtmlRenderer';

describe('HtmlRenderer', () => {
  it('should render conversation history', () => {
    const history = [{ role: 'user', content: 'hello', timestamp: '10:00' }];
    const html = HtmlRenderer.renderConversation(history);
    expect(html).toContain('hello');
    expect(html).toContain('10:00');
    expect(html).toContain('user');
  });

  it('should render empty history', () => {
    const html = HtmlRenderer.renderConversation([]);
    expect(html).toContain('</body>');
  });

  it('should render file tree', () => {
    const tree = ['src', 'src/services'];
    const html = HtmlRenderer.renderTree(tree);
    expect(html).toContain('src');
    expect(html).toContain('src/services');
  });
});
