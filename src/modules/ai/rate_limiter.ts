export interface RateLimitConfig {
  maxRequestsPerMinuteUser: number;
  maxRequestsPerMinuteWorkspace: number;
  maxDailyCostUsdWorkspace: number;
}

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRequestsPerMinuteUser: 20,
  maxRequestsPerMinuteWorkspace: 60,
  maxDailyCostUsdWorkspace: 10.0, // $10/day cost cap
};

interface WindowRecord {
  timestamps: number[];
}

export class AIRateLimiter {
  private userWindows = new Map<string, WindowRecord>();
  private workspaceWindows = new Map<string, WindowRecord>();
  private dailyCostByWorkspace = new Map<string, { day: string; costUsd: number }>();

  constructor(private readonly config: RateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG) {}

  public checkRateLimit(
    userId: string,
    workspaceId: string,
    now: number = Date.now()
  ): { allowed: boolean; reason?: string } {
    const oneMinuteAgo = now - 60_000;
    const currentDay = new Date(now).toISOString().slice(0, 10);

    // 1. Check workspace daily cost cap
    const costRecord = this.dailyCostByWorkspace.get(workspaceId);
    if (costRecord && costRecord.day === currentDay) {
      if (costRecord.costUsd >= this.config.maxDailyCostUsdWorkspace) {
        return {
          allowed: false,
          reason: `Daily AI cost limit of $${this.config.maxDailyCostUsdWorkspace} reached for workspace.`,
        };
      }
    }

    // 2. Check user requests per minute
    const userRec = this.userWindows.get(userId) || { timestamps: [] };
    userRec.timestamps = userRec.timestamps.filter((t) => t > oneMinuteAgo);
    if (userRec.timestamps.length >= this.config.maxRequestsPerMinuteUser) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: max ${this.config.maxRequestsPerMinuteUser} requests/min per user.`,
      };
    }

    // 3. Check workspace requests per minute
    const wsRec = this.workspaceWindows.get(workspaceId) || { timestamps: [] };
    wsRec.timestamps = wsRec.timestamps.filter((t) => t > oneMinuteAgo);
    if (wsRec.timestamps.length >= this.config.maxRequestsPerMinuteWorkspace) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: max ${this.config.maxRequestsPerMinuteWorkspace} requests/min per workspace.`,
      };
    }

    // Record usage
    userRec.timestamps.push(now);
    wsRec.timestamps.push(now);
    this.userWindows.set(userId, userRec);
    this.workspaceWindows.set(workspaceId, wsRec);

    return { allowed: true };
  }

  public recordCost(workspaceId: string, costUsd: number, now: number = Date.now()): void {
    const currentDay = new Date(now).toISOString().slice(0, 10);
    const existing = this.dailyCostByWorkspace.get(workspaceId);
    if (!existing || existing.day !== currentDay) {
      this.dailyCostByWorkspace.set(workspaceId, { day: currentDay, costUsd });
    } else {
      existing.costUsd += costUsd;
    }
  }

  public reset(): void {
    this.userWindows.clear();
    this.workspaceWindows.clear();
    this.dailyCostByWorkspace.clear();
  }
}

export const defaultAIRateLimiter = new AIRateLimiter();

