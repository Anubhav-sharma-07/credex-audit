"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  Search,
  Plus,
  Download,
  Archive,
  ArrowUpDown,
  Filter,
  CheckSquare,
  Square,
  Edit2,
  AlertCircle,
} from "lucide-react";
import type {
  Subscription,
  SubscriptionCategory,
  BillingFrequency,
  SubscriptionStatus,
  WorkspaceRole,
} from "@/modules/workspace/types";
import {
  bulkArchiveSubscriptions,
  exportSubscriptionsCsv,
  listSubscriptions,
} from "@/modules/workspace/subscriptions";
import { formatCurrency, formatRelativeDays } from "@/lib/formatters";
import SubscriptionSheet from "@/components/workspace/SubscriptionSheet";
import EmptyState from "@/components/workspace/EmptyState";
import UndoToast from "@/components/workspace/UndoToast";

interface SubscriptionsClientProps {
  initialSubscriptions: Subscription[];
  workspaceId: string;
  userRole: WorkspaceRole;
}

export default function SubscriptionsClient({
  initialSubscriptions,
  workspaceId,
  userRole,
}: SubscriptionsClientProps) {
  const [data, setData] = useState<Subscription[]>(initialSubscriptions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<SubscriptionCategory | "all">("all");
  const [frequencyFilter, setFrequencyFilter] = useState<BillingFrequency | "all">("all");
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | "all">("active");

  // Selection & Sheet
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);

  // Optimistic Archive & Undo Toast State
  const [undoToast, setUndoToast] = useState<{
    message: string;
    actionIds: string[];
  } | null>(null);
  const pendingArchiveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const archivedBackupRef = useRef<Subscription[]>([]);

  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await listSubscriptions(workspaceId, {
        search,
        category: categoryFilter,
        billingFrequency: frequencyFilter,
        status: statusFilter,
        pageSize: 100,
      });
      setData(res.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, search, categoryFilter, frequencyFilter, statusFilter]);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map((d) => d.id)));
    }
  }, [selectedIds.size, data]);

  function handleSelectOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const isReadOnly = userRole === "viewer";

  // Single subscription optimistic archive with 6s undo
  function handleArchiveSingle(subId: string) {
    if (isReadOnly) return;
    const sub = data.find((s) => s.id === subId);
    if (!sub) return;
    archivedBackupRef.current = data;

    setData((prev) => prev.filter((s) => s.id !== subId));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(subId);
      return next;
    });

    setUndoToast({
      message: `${sub.vendorName} archived.`,
      actionIds: [subId],
    });

    if (pendingArchiveTimeoutRef.current) {
      clearTimeout(pendingArchiveTimeoutRef.current);
    }

    pendingArchiveTimeoutRef.current = setTimeout(async () => {
      try {
        await bulkArchiveSubscriptions(workspaceId, [subId]);
      } catch (err) {
        console.error("Archive commit error:", err);
      }
      setUndoToast(null);
    }, 6000);
  }

  // Optimistic Archive with Undo capability
  function handleBulkArchive() {
    if (isReadOnly || selectedIds.size === 0) return;
    const targetIds = Array.from(selectedIds);
    archivedBackupRef.current = data;

    setData((prev) => prev.filter((sub) => !selectedIds.has(sub.id)));
    setSelectedIds(new Set());

    setUndoToast({
      message: `${targetIds.length} ${targetIds.length === 1 ? "subscription" : "subscriptions"} archived.`,
      actionIds: targetIds,
    });

    if (pendingArchiveTimeoutRef.current) {
      clearTimeout(pendingArchiveTimeoutRef.current);
    }

    pendingArchiveTimeoutRef.current = setTimeout(async () => {
      try {
        await bulkArchiveSubscriptions(workspaceId, targetIds);
      } catch (err) {
        console.error("Archive commit error:", err);
      }
      setUndoToast(null);
    }, 6000);
  }

  function handleUndoArchive() {
    if (pendingArchiveTimeoutRef.current) {
      clearTimeout(pendingArchiveTimeoutRef.current);
      pendingArchiveTimeoutRef.current = null;
    }
    setData(archivedBackupRef.current);
    setUndoToast(null);
  }

  function handleExportCsv() {
    const csv = exportSubscriptionsCsv(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spendlens-subscriptions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns = useMemo<ColumnDef<Subscription>[]>(
    () => [
      {
        id: "select",
        header: () =>
          isReadOnly ? <span className="sr-only">Select</span> : (
            <button
              onClick={handleSelectAll}
              className="p-1 min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
              aria-label="Select all subscriptions"
            >
              {selectedIds.size > 0 && selectedIds.size === data.length ? (
                <CheckSquare className="w-4 h-4 text-ink" strokeWidth={1.75} />
              ) : (
                <Square className="w-4 h-4 text-ink-subtle" strokeWidth={1.75} />
              )}
            </button>
          ),
        cell: ({ row }) =>
          isReadOnly ? null : (
            <button
              onClick={() => handleSelectOne(row.original.id)}
              className="p-1 min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
              aria-label={`Select ${row.original.vendorName}`}
            >
              {selectedIds.has(row.original.id) ? (
                <CheckSquare className="w-4 h-4 text-ink" strokeWidth={1.75} />
              ) : (
                <Square className="w-4 h-4 text-ink-subtle" strokeWidth={1.75} />
              )}
            </button>
          ),
      },
      {
        accessorKey: "vendorName",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 font-semibold text-ink-muted text-[11px] uppercase tracking-wider hover:text-ink cursor-pointer"
          >
            Vendor & Tool
            <ArrowUpDown className="w-3 h-3 text-ink-subtle" strokeWidth={1.75} />
          </button>
        ),
        cell: ({ row }) => (
          <div>
            <span className="font-bold text-ink text-xs block">
              {row.original.vendorName}
            </span>
            <span className="text-[11px] text-ink-muted">{row.original.planName}</span>
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => (
          <span className="text-[10px] font-medium uppercase tracking-wider bg-canvas-subtle text-ink-muted border border-border px-2 py-0.5 rounded-xs">
            {row.original.category.replace(/_/g, " ")}
          </span>
        ),
      },
      {
        accessorKey: "seats",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 font-semibold text-ink-muted text-[11px] uppercase tracking-wider hover:text-ink cursor-pointer"
          >
            Seats
            <ArrowUpDown className="w-3 h-3 text-ink-subtle" strokeWidth={1.75} />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-xs text-ink font-semibold tabular-nums">{row.original.seats}</span>
        ),
      },
      {
        accessorKey: "costMinor",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 font-semibold text-ink-muted text-[11px] uppercase tracking-wider hover:text-ink cursor-pointer"
          >
            Monthly Spend
            <ArrowUpDown className="w-3 h-3 text-ink-subtle" strokeWidth={1.75} />
          </button>
        ),
        cell: ({ row }) => (
          <div>
            <span className="font-bold text-ink text-xs tabular-nums">
              {formatCurrency(row.original.costMinor, "USD")}
            </span>
            <span className="text-[10px] text-ink-muted ml-1">
              /{row.original.billingFrequency === "annual" ? "yr avg" : "mo"}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "renewalDate",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 font-semibold text-ink-muted text-[11px] uppercase tracking-wider hover:text-ink cursor-pointer"
          >
            Renewal
            <ArrowUpDown className="w-3 h-3 text-ink-subtle" strokeWidth={1.75} />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-xs text-ink-muted">
            {row.original.renewalDate ? formatRelativeDays(row.original.renewalDate) : "—"}
          </span>
        ),
      },
      {
        accessorKey: "ownerEmail",
        header: "Owner",
        cell: ({ row }) => (
          <span className="text-xs text-ink-muted truncate max-w-[130px] block">
            {row.original.ownerEmail || <span className="text-warning font-medium">Unassigned</span>}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) =>
          isReadOnly ? null : (
            <button
              onClick={() => {
                setEditingSub(row.original);
                setIsSheetOpen(true);
              }}
              className="p-1.5 text-ink-muted hover:text-ink rounded-xs hover:bg-canvas-subtle min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer transition-standard"
              title="Edit subscription"
              aria-label={`Edit ${row.original.vendorName}`}
            >
              <Edit2 className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          ),
      },
    ],
    [selectedIds, data, handleSelectAll, isReadOnly]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-ink tracking-tight font-serif">Subscriptions</h1>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-xs bg-canvas-subtle border border-border text-ink-muted">
              Role: {userRole}
            </span>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            Manage provisioned AI tool licenses, seat counts, and recurring contracts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCsv}
            disabled={data.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xs text-xs font-semibold text-ink bg-surface hover:bg-canvas-subtle disabled:opacity-50 transition-standard min-h-[44px] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.75} />
            <span>CSV Export</span>
          </button>

          {!isReadOnly && (
            <button
              onClick={() => {
                setEditingSub(null);
                setIsSheetOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-action-fill text-action-fill-foreground rounded-xs text-xs font-semibold hover:bg-action-fill-hover transition-standard min-h-[44px] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Add Subscription</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-surface p-3.5 rounded-sm border border-border shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-ink-subtle" strokeWidth={1.75} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendor, plan, or owner email..."
            className="w-full text-xs bg-transparent text-ink placeholder-ink-subtle border-none focus-visible:outline-none min-h-[36px]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-ink-subtle" strokeWidth={1.75} />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as SubscriptionCategory | "all")}
            className="text-xs border border-border rounded-xs px-2.5 py-1.5 bg-canvas text-ink focus-visible:outline-2 focus-visible:outline-ink min-h-[36px]"
            aria-label="Filter by category"
          >
            <option value="all">All Categories</option>
            <option value="ide_assistant">IDE Assistant</option>
            <option value="chat_assistant">Chat Assistant</option>
            <option value="api">API Tokens</option>
            <option value="general">General AI</option>
          </select>

          <select
            value={frequencyFilter}
            onChange={(e) => setFrequencyFilter(e.target.value as BillingFrequency | "all")}
            className="text-xs border border-border rounded-xs px-2.5 py-1.5 bg-canvas text-ink focus-visible:outline-2 focus-visible:outline-ink min-h-[36px]"
            aria-label="Filter by billing frequency"
          >
            <option value="all">All Billing</option>
            <option value="monthly">Monthly</option>
            <option value="annual">Annual</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SubscriptionStatus | "all")}
            className="text-xs border border-border rounded-xs px-2.5 py-1.5 bg-canvas text-ink focus-visible:outline-2 focus-visible:outline-ink min-h-[36px]"
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="review">Under Review</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {!isReadOnly && selectedIds.size > 0 && (
        <div className="p-3 bg-canvas-subtle border border-border rounded-xs flex items-center justify-between">
          <span className="text-xs font-semibold text-ink">
            {selectedIds.size} {selectedIds.size === 1 ? "subscription" : "subscriptions"} selected
          </span>
          <button
            onClick={handleBulkArchive}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-xs text-xs font-semibold text-danger hover:bg-danger-surface hover:border-danger-border transition-standard min-h-[36px] cursor-pointer"
          >
            <Archive className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Bulk Archive</span>
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          role="alert"
          className="p-4 bg-danger-surface border border-danger-border text-danger text-xs rounded-xs flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          <span>Error loading subscriptions: {error}</span>
        </div>
      )}

      {/* Table Container / Mobile Card List */}
      <div className="bg-surface rounded-sm border border-border shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-4">
            <p className="text-xs text-ink-muted">Loading subscriptions...</p>
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            title="No subscriptions match this view"
            description="Adjust your search filters or register a new software contract to begin monitoring."
            actionLabel={isReadOnly ? undefined : "Add Subscription"}
            actionOnClick={
              isReadOnly
                ? undefined
                : () => {
                    setEditingSub(null);
                    setIsSheetOpen(true);
                  }
            }
          />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="border-b border-border bg-canvas-subtle">
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} scope="col" className="p-3 text-[11px] font-semibold text-ink-muted">
                          {header.isPlaceholder
                            ? null
                            : typeof header.column.columnDef.header === "function"
                            ? header.column.columnDef.header(header.getContext())
                            : header.column.columnDef.header}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-canvas-subtle/50 transition-standard">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="p-3 text-xs">
                          {typeof cell.column.columnDef.cell === "function"
                            ? cell.column.columnDef.cell(cell.getContext())
                            : (cell.getValue() as React.ReactNode)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-border-subtle" role="list">
              {data.map((sub) => {
                const isSelected = selectedIds.has(sub.id);
                return (
                  <div
                    key={sub.id}
                    className={`p-4 space-y-3 ${isSelected ? "bg-canvas-subtle" : "bg-surface"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        {!isReadOnly && (
                          <button
                            onClick={() => handleSelectOne(sub.id)}
                            className="mt-0.5 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                            aria-label={`Select ${sub.vendorName}`}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-ink" strokeWidth={1.75} />
                            ) : (
                              <Square className="w-4 h-4 text-ink-subtle" strokeWidth={1.75} />
                            )}
                          </button>
                        )}
                        <div>
                          <h3 className="font-bold text-ink text-sm">{sub.vendorName}</h3>
                          <p className="text-xs text-ink-muted">{sub.planName}</p>
                        </div>
                      </div>

                      {!isReadOnly && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingSub(sub);
                              setIsSheetOpen(true);
                            }}
                            className="p-2 text-ink-muted hover:text-ink rounded-xs border border-border min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                            aria-label={`Edit ${sub.vendorName}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                          </button>
                          <button
                            onClick={() => handleArchiveSingle(sub.id)}
                            className="p-2 text-ink-muted hover:text-danger rounded-xs border border-border min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                            aria-label={`Archive ${sub.vendorName}`}
                          >
                            <Archive className="w-3.5 h-3.5" strokeWidth={1.75} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-canvas p-2.5 rounded-xs border border-border-subtle">
                      <div>
                        <span className="text-[10px] text-ink-muted uppercase block">Seats</span>
                        <span className="font-semibold text-ink tabular-nums">{sub.seats} seats</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-muted uppercase block">Monthly Spend</span>
                        <span className="font-bold text-ink tabular-nums">{formatCurrency(sub.costMinor, "USD")}</span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-border-subtle flex items-center justify-between text-[11px]">
                        <span className="text-ink-muted">Renewal:</span>
                        <span className="text-ink font-medium">
                          {sub.renewalDate ? formatRelativeDays(sub.renewalDate) : "TBD"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Undo Toast Notification */}
      {undoToast && (
        <UndoToast
          message={undoToast.message}
          onUndo={handleUndoArchive}
          durationSeconds={6}
        />
      )}

      {/* Add / Edit Sheet Modal */}
      {!isReadOnly && (
        <SubscriptionSheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          onSuccess={fetchSubscriptions}
          subscriptionToEdit={editingSub}
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
}
