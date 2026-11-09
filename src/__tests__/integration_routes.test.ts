import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getHealth } from "../../app/api/health/route";
import { POST as postVitals } from "../../app/api/vitals/route";
import { POST as postLead } from "../../app/api/lead/route";
import { POST as postUnsubscribe } from "../../app/api/unsubscribe/route";
import { POST as postExport } from "../../app/api/workspace/export/route";
import { POST as postDelete } from "../../app/api/workspace/delete/route";
import { resetRateLimits } from "@/modules/security/rate_limiter";
import { resetAuditLogs } from "@/modules/security/audit_log";

describe("SpendLens API Route Handlers Integration Suite", () => {
  beforeEach(() => {
    resetRateLimits();
    resetAuditLogs();
  });

  // ==========================================
  // 1. Health Heartbeat Endpoint (/api/health)
  // ==========================================
  describe("GET /api/health", () => {
    it("returns 200 OK with healthy system diagnostics", async () => {
      const resp = await getHealth();
      expect(resp.status).toBe(200);

      const json = await resp.json();
      expect(json.status).toBe("healthy");
      expect(typeof json.uptimeSeconds).toBe("number");
      expect(json.timestamp).toBeDefined();
      expect(json.checks.database.status).toBe("ok");
      expect(json.checks.memory.status).toBe("ok");
      expect(resp.headers.get("Cache-Control")).toContain("no-store");
    });
  });

  // ==========================================
  // 2. Web Vitals Ingestion Endpoint (/api/vitals)
  // ==========================================
  describe("POST /api/vitals", () => {
    it("accepts valid Web Vitals metric payload", async () => {
      const payload = {
        id: "v_12345",
        name: "LCP",
        value: 1240.5,
        rating: "good",
        delta: 24.1,
        pathname: "/overview",
      };

      const req = new NextRequest("http://localhost/api/vitals", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      const resp = await postVitals(req);
      expect(resp.status).toBe(200);

      const json = await resp.json();
      expect(json.ok).toBe(true);
      expect(json.requestId).toBeDefined();
    });

    it("rejects unknown fields in metric payload (.strict validation)", async () => {
      const payload = {
        id: "v_malicious",
        name: "LCP",
        value: 100,
        rating: "good",
        injectedUnknownField: "evil_data",
      };

      const req = new NextRequest("http://localhost/api/vitals", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      const resp = await postVitals(req);
      expect(resp.status).toBe(400);

      const json = await resp.json();
      expect(json.error).toContain("Invalid request payload");
    });
  });

  // ==========================================
  // 3. Lead & Consent Verification (/api/lead)
  // ==========================================
  describe("POST /api/lead", () => {
    it("accepts lead submission with explicit consent", async () => {
      const payload = {
        auditId: "aud_12345",
        email: "cfo@growthcorp.com",
        companyName: "Growth Corp",
        role: "CFO",
        consent: true,
      };

      const req = new NextRequest("http://localhost/api/lead", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      const resp = await postLead(req);
      expect(resp.status).toBe(200);

      const json = await resp.json();
      expect(json.success).toBe(true);
    });

    it("rejects lead submission without mandatory consent checkbox", async () => {
      const payload = {
        auditId: "aud_12345",
        email: "user@noconsent.com",
        consent: false,
      };

      const req = new NextRequest("http://localhost/api/lead", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      const resp = await postLead(req);
      expect(resp.status).toBe(400);

      const json = await resp.json();
      expect(json.error).toContain("Explicit consent is required");
    });

    it("silently drops bot submissions caught by honeypot", async () => {
      const payload = {
        auditId: "aud_12345",
        email: "bot@spammer.com",
        consent: true,
        hp_check: "I am a spam bot filling hidden fields",
      };

      const req = new NextRequest("http://localhost/api/lead", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      const resp = await postLead(req);
      expect(resp.status).toBe(200);

      const json = await resp.json();
      // Returns success to confuse the bot without persisting lead
      expect(json.success).toBe(true);
    });
  });

  // ==========================================
  // 4. Privacy & Unsubscribe (/api/unsubscribe)
  // ==========================================
  describe("POST /api/unsubscribe", () => {
    it("registers user opt-out in global registry", async () => {
      const payload = {
        email: "optout@company.com",
      };

      const req = new NextRequest("http://localhost/api/unsubscribe", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      const resp = await postUnsubscribe(req);
      expect(resp.status).toBe(200);

      const json = await resp.json();
      expect(json.success).toBe(true);
      expect(json.email).toBe("optout@company.com");
    });
  });

  // ==========================================
  // 5. Tenant Data Export (/api/workspace/export)
  // ==========================================
  describe("POST /api/workspace/export", () => {
    it("allows owner or admin to export full workspace dataset", async () => {
      const payload = {
        workspaceId: "ws_default",
      };

      const req = new NextRequest("http://localhost/api/workspace/export", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      const resp = await postExport(req);
      expect(resp.status).toBe(200);
      expect(resp.headers.get("Content-Disposition")).toContain("attachment; filename=");

      const json = await resp.json();
      expect(json.workspaceId).toBe("ws_default");
      expect(Array.isArray(json.subscriptions)).toBe(true);
    });
  });

  // ==========================================
  // 6. Hard Deletion & Purge (/api/workspace/delete)
  // ==========================================
  describe("POST /api/workspace/delete", () => {
    it("rejects deletion without exact confirmation string", async () => {
      const payload = {
        workspaceId: "ws_default",
        confirmation: "wrong_confirmation_phrase",
      };

      const req = new NextRequest("http://localhost/api/workspace/delete", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      const resp = await postDelete(req);
      expect(resp.status).toBe(400);

      const json = await resp.json();
      expect(json.error).toContain("Must type: DELETE ws_default");
    });

    it("successfully permanently deletes workspace with correct confirmation phrase", async () => {
      const payload = {
        workspaceId: "ws_default",
        confirmation: "DELETE ws_default",
      };

      const req = new NextRequest("http://localhost/api/workspace/delete", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      const resp = await postDelete(req);
      expect(resp.status).toBe(200);

      const json = await resp.json();
      expect(json.success).toBe(true);
    });
  });
});

