"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  FileCheck,
} from "lucide-react";
import {
  parseAndValidateCSV,
  executeCSVImport,
  rollbackCSVImport,
  type CSVPreviewResult,
} from "@/modules/workspace/csv_import";
import { listSubscriptions } from "@/modules/workspace/subscriptions";
import { formatCurrency } from "@/lib/formatters";
import type { WorkspaceRole } from "@/modules/workspace/types";

interface ImportHistoryEntry {
  id: string;
  fileName: string;
  timestamp: string;
  rowCount: number;
  importedIds: string[];
  status: "completed" | "rolled_back";
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface CSVImportClientProps {
  workspaceId: string;
  userRole: WorkspaceRole;
}

export default function CSVImportClient({ workspaceId, userRole }: CSVImportClientProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [previewResult, setPreviewResult] = useState<CSVPreviewResult | null>(null);

  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importSuccess, setImportSuccess] = useState<{ count: number; importedIds: string[] } | null>(null);
  const [rollbackSuccess, setRollbackSuccess] = useState<string | null>(null);

  const isReadOnly = userRole === "viewer";

  const [history, setHistory] = useState<ImportHistoryEntry[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(`spendlens_import_history_${workspaceId}`);
      if (stored) return JSON.parse(stored);
    } catch {
      // Ignore storage errors
    }
    return [];
  });

  function saveHistory(newHistory: ImportHistoryEntry[]) {
    setHistory(newHistory);
    try {
      localStorage.setItem(`spendlens_import_history_${workspaceId}`, JSON.stringify(newHistory));
    } catch {
      // Ignore
    }
  }

  async function handleFileSelect(file: File) {
    if (isReadOnly) return;
    setFileError(null);
    setPreviewResult(null);
    setImportSuccess(null);
    setRollbackSuccess(null);

    if (file.size > MAX_FILE_SIZE) {
      setFileError(`File exceeds maximum size limit of 5MB (${(file.size / (1024 * 1024)).toFixed(1)}MB provided).`);
      return;
    }

    const isCsvName = file.name.toLowerCase().endsWith(".csv");
    const validMimes = ["text/csv", "application/vnd.ms-excel", "text/plain", "application/csv"];
    const isCsvMime = validMimes.includes(file.type) || file.type === "";

    if (!isCsvName && !isCsvMime) {
      setFileError("Invalid file type. Please upload a standard comma-separated (.csv) file.");
      return;
    }

    setSelectedFile(file);
    setParsing(true);

    try {
      const text = await file.text();
      const existing = await listSubscriptions(workspaceId, { pageSize: 100 });
      const existingLight = existing.data.map((s) => ({
        id: s.id,
        vendorName: s.vendorName,
        planName: s.planName,
      }));

      const result = parseAndValidateCSV(text, existingLight);
      setPreviewResult(result);
    } catch (err) {
      setFileError((err as Error).message);
    } finally {
      setParsing(false);
    }
  }

  async function handleConfirmImport() {
    if (isReadOnly || !previewResult || previewResult.validRows.length === 0) return;

    setImporting(true);
    setImportProgress(20);

    const interval = setInterval(() => {
      setImportProgress((p) => {
        if (p >= 90) {
          clearInterval(interval);
          return 90;
        }
        return p + 25;
      });
    }, 150);

    try {
      const result = await executeCSVImport(workspaceId, previewResult.validRows);
      clearInterval(interval);
      setImportProgress(100);

      const newEntry: ImportHistoryEntry = {
        id: `imp_${Date.now()}`,
        fileName: selectedFile?.name || "import.csv",
        timestamp: new Date().toLocaleString(),
        rowCount: result.importedIds.length,
        importedIds: result.importedIds,
        status: "completed",
      };

      saveHistory([newEntry, ...history]);
      setImportSuccess({ count: result.importedIds.length, importedIds: result.importedIds });
      setSelectedFile(null);
      setPreviewResult(null);
    } catch (err) {
      clearInterval(interval);
      setFileError(`Import execution failed: ${(err as Error).message}`);
    } finally {
      setImporting(false);
    }
  }

  async function handleRollback(entry: ImportHistoryEntry) {
    if (isReadOnly || entry.status === "rolled_back") return;

    const confirmed = confirm(
      `Rollback import of ${entry.fileName}? This will permanently remove the ${entry.rowCount} subscriptions created in this batch.`
    );
    if (!confirmed) return;

    try {
      await rollbackCSVImport(workspaceId, entry.importedIds);
      const updated = history.map((h) => (h.id === entry.id ? { ...h, status: "rolled_back" as const } : h));
      saveHistory(updated);
      setRollbackSuccess(`Successfully rolled back ${entry.rowCount} subscriptions from ${entry.fileName}.`);
    } catch (err) {
      alert(`Rollback failed: ${(err as Error).message}`);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-ink tracking-tight font-serif">CSV Import & Ingestion</h1>
          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-xs bg-canvas-subtle border border-border text-ink-muted">
            Role: {userRole}
          </span>
        </div>
        <p className="text-xs text-ink-muted mt-0.5">
          Bulk import subscription records from your company credit card or expense export with pre-validation and rollback.
        </p>
      </div>

      {isReadOnly ? (
        <div className="p-4 bg-warning-surface border border-warning-border rounded-xs text-xs text-ink">
          <strong>Read-Only Access:</strong> Viewers cannot import or modify subscriptions.
        </div>
      ) : (
        <>
          {/* Upload Drop Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileSelect(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-sm p-8 text-center bg-surface hover:bg-canvas-subtle transition-standard cursor-pointer space-y-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />
            <div className="w-12 h-12 rounded-full bg-canvas-subtle border border-border flex items-center justify-center mx-auto text-ink-muted">
              <UploadCloud className="w-6 h-6" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-bold text-ink">Click or drag a CSV file to inspect</p>
              <p className="text-xs text-ink-muted mt-1">Supports standard CSV exports up to 5MB.</p>
            </div>
          </div>

          {parsing && (
            <div className="p-4 bg-surface border border-border rounded-xs text-xs text-ink-muted text-center animate-pulse">
              Validating CSV rows against SpendLens schema…
            </div>
          )}

          {fileError && (
            <div role="alert" className="p-4 bg-danger-surface border border-danger-border text-danger text-xs rounded-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              <span>{fileError}</span>
            </div>
          )}

          {importSuccess && (
            <div className="p-4 bg-savings-surface border border-savings-border rounded-xs text-xs text-ink flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-savings shrink-0" strokeWidth={1.75} />
                <span>Successfully imported {importSuccess.count} subscriptions into workspace.</span>
              </div>
              <Link href="/subscriptions" className="font-semibold text-action-text hover:underline flex items-center gap-1">
                View Subscriptions <ArrowRight className="w-3 h-3" strokeWidth={1.75} />
              </Link>
            </div>
          )}

          {rollbackSuccess && (
            <div className="p-4 bg-info-surface border border-info-border rounded-xs text-xs text-ink flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-info shrink-0" strokeWidth={1.75} />
              <span>{rollbackSuccess}</span>
            </div>
          )}

          {/* Validation Preview Table */}
          {previewResult && (
            <div className="bg-surface border border-border rounded-sm p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-ink-muted" strokeWidth={1.75} />
                  <h2 className="text-sm font-bold text-ink">Preview: {selectedFile?.name}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase bg-savings-surface text-savings border border-savings-border px-2 py-0.5 rounded-xs">
                    {previewResult.validRows.length} Valid Rows
                  </span>
                  {previewResult.errors.length > 0 && (
                    <span className="text-[10px] font-bold uppercase bg-danger-surface text-danger border border-danger-border px-2 py-0.5 rounded-xs">
                      {previewResult.errors.length} Errors
                    </span>
                  )}
                </div>
              </div>

              {previewResult.potentialDuplicates.length > 0 && (
                <div className="p-3 bg-warning-surface border border-warning-border rounded-xs text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-warning">
                    <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Potential Duplicates Detected ({previewResult.potentialDuplicates.length})</span>
                  </div>
                  <ul className="text-[11px] text-ink-muted list-disc list-inside">
                    {previewResult.potentialDuplicates.map((dup, idx) => (
                      <li key={idx}>
                        Row {dup.row}: {dup.vendorName} ({dup.planName}) already exists in your workspace.
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Rows preview */}
              <div className="overflow-x-auto border border-border rounded-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-canvas-subtle text-ink-muted font-semibold border-b border-border">
                    <tr>
                      <th className="p-2.5">Vendor</th>
                      <th className="p-2.5">Plan</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Seats</th>
                      <th className="p-2.5">Monthly Cost</th>
                      <th className="p-2.5">Billing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {previewResult.validRows.slice(0, 10).map((r, i) => (
                      <tr key={i} className="hover:bg-canvas-subtle/50">
                        <td className="p-2.5 font-bold text-ink">{r.vendorName}</td>
                        <td className="p-2.5 text-ink-muted">{r.planName}</td>
                        <td className="p-2.5 uppercase text-[10px] text-ink-muted">{r.category.replace(/_/g, " ")}</td>
                        <td className="p-2.5 tabular-nums">{r.seats}</td>
                        <td className="p-2.5 font-bold text-ink tabular-nums">{formatCurrency(Math.round(r.monthlyCostUsd * 100), "USD")}</td>
                        <td className="p-2.5 capitalize text-ink-muted">{r.billingFrequency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewResult(null);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-ink bg-surface border border-border hover:bg-canvas-subtle rounded-xs transition-standard min-h-[44px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={importing || previewResult.validRows.length === 0}
                  className="px-4 py-2 text-xs font-semibold text-action-fill-foreground bg-action-fill hover:bg-action-fill-hover disabled:opacity-50 rounded-xs shadow-sm transition-standard min-h-[44px] cursor-pointer flex items-center gap-2"
                >
                  <FileCheck className="w-4 h-4" strokeWidth={1.75} />
                  <span>{importing ? `Importing (${importProgress}%)` : `Execute Import (${previewResult.validRows.length} Rows)`}</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Import History & Rollback Ledger */}
      <div className="bg-surface border border-border rounded-sm p-5 space-y-4 shadow-xs">
        <h2 className="text-sm font-bold text-ink border-b border-border pb-3">Audit Ingestion Ledger & Rollback</h2>

        {history.length === 0 ? (
          <p className="text-xs text-ink-muted italic">No previous CSV import batches recorded for this workspace.</p>
        ) : (
          <ul className="divide-y divide-border-subtle" role="list">
            {history.map((entry) => (
              <li key={entry.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink">{entry.fileName}</span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-xs border ${
                        entry.status === "completed"
                          ? "bg-savings-surface text-savings border-savings-border"
                          : "bg-danger-surface text-danger border-danger-border"
                      }`}
                    >
                      {entry.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    {entry.timestamp} • {entry.rowCount} subscriptions created
                  </p>
                </div>

                {!isReadOnly && entry.status === "completed" && (
                  <button
                    onClick={() => handleRollback(entry)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-danger border border-danger-border hover:bg-danger-surface rounded-xs transition-standard min-h-[36px] cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Rollback Batch</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
