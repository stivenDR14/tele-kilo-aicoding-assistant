import { describe, it, expect, vi } from 'vitest';
import { PendingApprovalManager } from '../PendingApprovalManager';

describe('PendingApprovalManager', () => {
  it('should approve an action', () => {
    const manager = new PendingApprovalManager();
    const resolveFn = vi.fn();
    manager.set('1', 'test-action', resolveFn);
    manager.approve('1');
    expect(resolveFn).toHaveBeenCalledWith(true);
  });

  it('should reject an action', () => {
    const manager = new PendingApprovalManager();
    const resolveFn = vi.fn();
    manager.set('1', 'test-action', resolveFn);
    manager.reject('1');
    expect(resolveFn).toHaveBeenCalledWith(false);
  });

  it('should auto-reject after TTL', async () => {
    vi.useFakeTimers();
    const manager = new PendingApprovalManager();
    const resolveFn = vi.fn();
    manager.set('1', 'test-action', resolveFn);
    
    vi.advanceTimersByTime(61000);
    expect(resolveFn).toHaveBeenCalledWith(false);
    vi.useRealTimers();
  });
});
