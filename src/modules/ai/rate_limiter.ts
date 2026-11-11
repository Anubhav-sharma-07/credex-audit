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

  public async checkRateLimitDistributed(
    userId: string,
    workspaceId: string,
    now: number = Date.now()
  ): Promise<{ allowed: boolean; reason?: string }> {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token || url.includes("placeholder")) {
      return this.checkRateLimit(userId, workspaceId, now);
    }

    try {
      const currentDay = new Date(now).toISOString().slice(0, 10);
      const userKey = `ai:user:${userId}:${Math.floor(now / 60_000)}`;
      const wsKey = `ai:ws:${workspaceId}:${Math.floor(now / 60_000)}`;
      const costKey = `ai:cost:${workspaceId}:${currentDay}`;

      const resp = await fetch(`${url}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["GET", costKey],
          ["INCR", userKey],
          ["EXPIRE", userKey, 60, "NX"],
          ["INCR", wsKey],
          ["EXPIRE", wsKey, 60, "NX"],
        ]),
        cache: "no-store",
      });

      if (!resp.ok) {
        return this.checkRateLimit(userId, workspaceId, now);
      }

      const results = await resp.json();
      const currentCost = parseFloat(results[0]?.result || "0");
      const userCount = Number(results[1]?.result || 1);
      const wsCount = Number(results[3]?.result || 1);

      if (currentCost >= this.config.maxDailyCostUsdWorkspace) {
        return {
          allowed: false,
          reason: `Daily AI cost limit of $${this.config.maxDailyCostUsdWorkspace} reached for workspace.`,
        };
      }

      if (userCount > this.config.maxRequestsPerMinuteUser) {
        return {
          allowed: false,
          reason: `Rate limit exceeded: max ${this.config.maxRequestsPerMinuteUser} requests/min per user.`,
        };
      }

      if (wsCount > this.config.maxRequestsPerMinuteWorkspace) {
        return {
          allowed: false,
          reason: `Rate limit exceeded: max ${this.config.maxRequestsPerMinuteWorkspace} requests/min per workspace.`,
        };
      }

      return { allowed: true };
    } catch {
      return this.checkRateLimit(userId, workspaceId, now);
    }
  }

  public recordCost(workspaceId: string, costUsd: number, now: number = Date.now()): void {
    const currentDay = new Date(now).toISOString().slice(0, 10);
    const existing = this.dailyCostByWorkspace.get(workspaceId);
    if (!existing || existing.day !== currentDay) {
      this.dailyCostByWorkspace.set(workspaceId, { day: currentDay, costUsd });
    } else {
      existing.costUsd += costUsd;
    }

    // Asynchronously update Upstash Redis if configured
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token && !url.includes("placeholder")) {
      const costKey = `ai:cost:${workspaceId}:${currentDay}`;
      fetch(`${url}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCRBYFLOAT", costKey, costUsd.toString()],
          ["EXPIRE", costKey, 172800, "NX"], // 48h retention
        ]),
      }).catch(() => {});
    }
  }

  public reset(): void {
    this.userWindows.clear();
    this.workspaceWindows.clear();
    this.dailyCostByWorkspace.clear();
  }
}

export const defaultAIRateLimiter = new AIRateLimiter();
