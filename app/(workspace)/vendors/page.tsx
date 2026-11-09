"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Layers, DollarSign, Mail, ArrowRight } from "lucide-react";
import { getVendorDirectory } from "@/modules/workspace/subscriptions";
import { formatCurrency } from "@/lib/formatters";
import EmptyState from "@/components/workspace/EmptyState";
import { MetricCardSkeleton } from "@/components/workspace/Skeletons";

const WORKSPACE_ID = "ws_default_demo";

interface VendorCardData {
  vendorName: string;
  toolId: string;
  category: string;
  subscriptionCount: number;
  totalMonthlyCostMinor: number;
  primaryOwner: string | null;
  billingFrequencies: string[];
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<VendorCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getVendorDirectory(WORKSPACE_ID);
        setVendors(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-xl font-bold text-ink tracking-tight font-serif">Vendors Directory</h1>
        <p className="text-xs text-ink-muted">
          Portfolio overview of active AI software vendors, aggregate expenditure, and designated department owners.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>
      ) : vendors.length === 0 ? (
        <EmptyState
          title="No active vendors found"
          description="Register your team's software subscriptions to automatically populate the vendor directory."
          actionLabel="Add Subscription"
          actionHref="/subscriptions"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" role="list">
          {vendors.map((v) => (
            <div
              key={v.vendorName}
              className="bg-surface p-4 rounded-sm border border-border shadow-xs hover:border-ink transition-standard flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xs bg-canvas-subtle border border-border text-ink font-bold flex items-center justify-center text-xs">
                      {v.vendorName.charAt(0)}
                    </div>
                    <div>
                      <h2 className="font-bold text-ink text-sm">{v.vendorName}</h2>
                      <p className="text-[10px] text-ink-muted uppercase tracking-wider">
                        {v.category.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-canvas-subtle border border-border text-ink-muted font-semibold px-2 py-0.5 rounded-xs">
                    {v.subscriptionCount} {v.subscriptionCount === 1 ? "plan" : "plans"}
                  </span>
                </div>

                <div className="mt-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted flex items-center gap-1.5 text-[11px]">
                      <DollarSign className="w-3.5 h-3.5 text-ink-subtle" strokeWidth={1.75} />
                      Monthly Total
                    </span>
                    <span className="font-bold text-ink tabular-nums">
                      {formatCurrency(v.totalMonthlyCostMinor, "USD")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted flex items-center gap-1.5 text-[11px]">
                      <Layers className="w-3.5 h-3.5 text-ink-subtle" strokeWidth={1.75} />
                      Billing Terms
                    </span>
                    <span className="capitalize font-medium text-ink text-xs">
                      {v.billingFrequencies.join(", ")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted flex items-center gap-1.5 text-[11px]">
                      <Mail className="w-3.5 h-3.5 text-ink-subtle" strokeWidth={1.75} />
                      Primary Owner
                    </span>
                    {v.primaryOwner ? (
                      <a
                        href={`mailto:${v.primaryOwner}?subject=SpendLens%20Vendor%20Inquiry%20-%20${v.vendorName}`}
                        className="text-action-text hover:underline truncate max-w-[150px] text-xs"
                      >
                        {v.primaryOwner}
                      </a>
                    ) : (
                      <span className="text-warning text-[11px] font-medium">Unassigned</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border-subtle flex items-center justify-end">
                <Link
                  href={`/subscriptions?search=${encodeURIComponent(v.vendorName)}`}
                  className="text-xs font-semibold text-action-text hover:underline inline-flex items-center gap-1 min-h-[32px]"
                >
                  <span>Filter Plans</span>
                  <ArrowRight className="w-3 h-3" strokeWidth={1.75} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
