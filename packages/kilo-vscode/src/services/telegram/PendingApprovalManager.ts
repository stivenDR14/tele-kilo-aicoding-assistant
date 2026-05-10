/**
 * PendingApprovalManager: Tracks destructive actions awaiting approval.
 */
export class PendingApprovalManager {
  private approvals = new Map<string, { action: string; ttlTimer: NodeJS.Timeout; resolveFn: (approved: boolean) => void }>();

  set(id: string, action: string, resolveFn: (approved: boolean) => void) {
    const ttlTimer = setTimeout(() => {
      this.reject(id);
    }, 60000);
    this.approvals.set(id, { action, ttlTimer, resolveFn });
  }

  approve(id: string) {
    const entry = this.approvals.get(id);
    if (entry) {
      clearTimeout(entry.ttlTimer);
      entry.resolveFn(true);
      this.approvals.delete(id);
    }
  }

  reject(id: string) {
    const entry = this.approvals.get(id);
    if (entry) {
      clearTimeout(entry.ttlTimer);
      entry.resolveFn(false);
      this.approvals.delete(id);
    }
  }

  dispose() {
    for (const entry of this.approvals.values()) {
      clearTimeout(entry.ttlTimer);
    }
    this.approvals.clear();
  }
}
