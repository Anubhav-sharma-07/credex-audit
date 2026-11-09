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

interface ImportHistoryEntry {
  id: string;
  fileName: string;
  timestamp: string;
  rowCount: number;
  importedIds: string[];
  status: "completed" | "rolled_back";
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function CSVImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [previewResult, setPreviewResult] = useState<CSVPreviewResult | null>(null);

  // Import execution states
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importSuccess, setImportSuccess] = useState<{ count: number; importedIds: string[] } | null>(null);
  const [rollbackSuccess, setRollbackSuccess] = useState<string | null>(null);

  // Import history (persisted in localStorage for demo)
  const [history, setHistory] = useState<ImportHistoryEntry[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("spendlens_import_history");
      if (stored) return JSON.parse(stored);
    } catch {
      // Ignore storage errors
    }
    return [];
  });

  function saveHistory(newHistory: ImportHistoryEntry[]) {
    setHistory(newHistory);
    try {
      localStorage.setItem("spendlens_import_history", JSON.stringify(newHistory));
    } catch {
      // Ignore
    }
  }

  async function handleFileSelect(file: File) {
    setFileError(null);
    setPreviewResult(null);
    setImportSuccess(null);
    setRollbackSuccess(null);

    // 1. Size check
    if (file.size > MAX_FILE_SIZE) {
      setFileError(`File exceeds maximum size limit of 5MB (${(file.size / (1024 * 1024)).toFixed(1)}MB provided).`);
      return;
    }

    // 2. Content-type & extension check
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
      // Fetch existing subscriptions for duplicate detection
      const existing = await listSubscriptions("ws_default", { pageSize: 100 });
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
    if (!previewResult || previewResult.validRows.length === 0) return;

    setImporting(true);
    setImportProgress(20);

    // Stream progress simulation
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
      const result = await executeCSVImport("ws_default", previewResult.validRows);
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
      setPreviewResult(null);
    } catch (err) {
      clearInterval(interval);
      setFileError((err as Error).message);
    } finally {
      setImporting(false);
    }
  }

  async function handleRollback(entry: ImportHistoryEntry) {
    try {
      await rollbackCSVImport("ws_default", entry.importedIds);
      const updated = history.map((h) =>
        h.id === entry.id ? { ...h, status: "rolled_back" as const } : h
      );
      saveHistory(updated);
      setRollbackSuccess(`Successfully rolled back import from ${entry.fileName} (${entry.rowCount} subscriptions removed).`);
    } catch (err) {
      setFileError((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-xl font-bold text-ink tracking-tight font-serif">CSV Spend Import</h1>
        <p className="text-xs text-ink-muted">
          Import bulk subscriptions with automatic column mapping, duplicate detection, and 1-click rollback.
        </p>
      </div>

      {importSuccess && (
        <div className="rounded-sm border border-savings-border bg-savings-surface p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-savings shrink-0" strokeWidth={1.75} />
            <div>
              <p className="text-xs font-bold text-ink">
                Import complete: {importSuccess.count} subscriptions added.
              </p>
              <p className="text-xs text-ink-muted">
                All records have passed schema validation and have been stored in your workspace.
              </p>
            </div>
          </div>
          <Link
            href="/subscriptions"
            className="px-3.5 py-1.5 bg-ink text-canvas rounded-xs text-xs font-semibold hover:bg-neutral-8 transition-standard min-h-[36px] flex items-center"
          >
            View in Subscriptions
          </Link>
        </div>
      )}

      {rollbackSuccess && (
        <div className="rounded-sm border border-info-border bg-info-surface p-3.5 flex items-center gap-2.5 text-xs text-ink">
          <RotateCcw className="w-4 h-4 text-info shrink-0" strokeWidth={1.75} />
          <span>{rollbackSuccess}</span>
        </div>
      )}

      {fileError && (
        <div role="alert" className="rounded-sm border border-danger-border bg-danger-surface p-3.5 flex items-center gap-2.5 text-xs text-danger">
          <AlertCircle className="w-4 h-4 text-danger shrink-0" strokeWidth={1.75} />
          <span>{fileError}</span>
        </div>
      )}

      {/* Upload Dropzone */}
      {!previewResult && !importing && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileSelect(e.dataTransfer.files[0]);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer border-2 border-dashed border-border hover:border-ink rounded-sm bg-surface p-10 text-center transition-standard group shadow-xs"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
            accept=".csv,text/csv"
            className="hidden"
            aria-label="Upload CSV file"
          />

          <div className="w-12 h-12 bg-canvas-subtle border border-border text-ink rounded-xs flex items-center justify-center mx-auto mb-3">
            <UploadCloud className="w-6 h-6 text-ink-muted" strokeWidth={1.75} />
          </div>

          <h3 className="text-sm font-bold text-ink">
            {selectedFile ? selectedFile.name : "Select or drag and drop your billing CSV"}
          </h3>
          <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">
            Maximum file size: 5MB. Accepts standard CSV exports with vendor, plan, seats, and monthly cost.
          </p>

          <div className="mt-3.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-muted bg-canvas-subtle border border-border px-3 py-1 rounded-xs">
            <FileSpreadsheet className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Accepts .csv format</span>
          </div>
        </div>
      )}

      {/* Parsing progress */}
      {parsing && (
        <div className="p-8 bg-surface border border-border rounded-sm text-center space-y-2">
          <div className="inline-block animate-spin w-5 h-5 border-2 border-ink border-t-transparent rounded-full" />
          <p className="text-xs text-ink-muted">Parsing and validating CSV schema…</p>
        </div>
      )}

      {/* Preview, Row Validation & Duplicate Warnings */}
      {previewResult && !importing && (
        <div className="bg-surface border border-border rounded-sm p-5 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3.5 border-b border-border gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-savings" strokeWidth={1.75} />
                <h2 className="text-sm font-bold text-ink">Import Preview & Validation</h2>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                File: <span className="font-semibold text-ink">{selectedFile?.name}</span> •{" "}
                {previewResult.validRows.length} valid rows parsed.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPreviewResult(null);
                  setSelectedFile(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-ink bg-surface border border-border hover:bg-canvas-subtle rounded-xs transition-standard min-h-[36px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={previewResult.validRows.length === 0}
                onClick={handleConfirmImport}
                className="px-4 py-1.5 text-xs font-semibold text-action-fill-foreground bg-action-fill hover:bg-action-fill-hover disabled:opacity-50 rounded-xs shadow-xs transition-standard flex items-center gap-1.5 min-h-[36px] cursor-pointer"
              >
                <span>Confirm & Import {previewResult.validRows.length} Rows</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            </div>
          </div>

          {/* Validation Errors Notice */}
          {previewResult.errors.length > 0 && (
            <div role="alert" className="rounded-xs border border-danger-border bg-danger-surface p-3.5 text-xs text-danger">
              <div className="flex items-center gap-2 font-bold uppercase tracking-wide">
                <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                <span>{previewResult.errors.length} Validation Errors Found (these rows will be skipped):</span>
              </div>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                {previewResult.errors.map((err, idx) => (
                  <li key={idx}>
                    Row {err.row} [{err.column}]: {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Duplicate Warnings Notice */}
          {previewResult.potentialDuplicates.length > 0 && (
            <div className="rounded-xs border border-warning-border bg-warning-surface p-3.5 text-xs text-warning">
              <div className="flex items-center gap-2 font-bold uppercase tracking-wide">
                <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                <span>{previewResult.potentialDuplicates.length} Possible Duplicates Detected:</span>
              </div>
              <ul className="mt-2 space-y-1">
                {previewResult.potentialDuplicates.map((dup, idx) => (
                  <li key={idx}>
                    Row {dup.row}: <strong>{dup.vendorName}</strong> ({dup.planName}) matches an active subscription.
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Table */}
          <div className="overflow-x-auto border border-border rounded-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas-subtle text-ink-muted font-semibold border-b border-border">
                <tr>
                  <th className="py-2 px-3 text-[11px]">#</th>
                  <th className="py-2 px-3 text-[11px]">Vendor</th>
                  <th className="py-2 px-3 text-[11px]">Plan</th>
                  <th className="py-2 px-3 text-[11px]">Category</th>
                  <th className="py-2 px-3 text-[11px] text-center">Seats</th>
                  <th className="py-2 px-3 text-[11px] text-right">Monthly Cost</th>
                  <th className="py-2 px-3 text-[11px]">Billing</th>
                  <th className="py-2 px-3 text-[11px]">Renewal Date</th>
                  <th className="py-2 px-3 text-[11px]">Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {previewResult.validRows.map((r, i) => (
                  <tr key={i} className="hover:bg-canvas-subtle/50">
                    <td className="py-2 px-3 text-ink-subtle font-mono text-[10px]">{i + 1}</td>
                    <td className="py-2 px-3 font-semibold text-ink">{r.vendorName}</td>
                    <td className="py-2 px-3 text-ink-muted">{r.planName}</td>
                    <td className="py-2 px-3">
                      <span className="font-mono text-[10px] bg-canvas-subtle border border-border text-ink-muted px-1.5 py-0.5 rounded-xs capitalize">
                        {r.category.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center font-medium text-ink tabular-nums">{r.seats}</td>
                    <td className="py-2 px-3 text-right font-bold text-ink tabular-nums">
                      {formatCurrency(Math.round(r.monthlyCostUsd * 100), "USD")}
                    </td>
                    <td className="py-2 px-3 capitalize text-ink-muted">{r.billingFrequency}</td>
                    <td className="py-2 px-3 text-ink-muted">{r.renewalDate || "—"}</td>
                    <td className="py-2 px-3 text-ink-muted">{r.ownerEmail || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Importing progress bar */}
      {importing && (
        <div className="bg-surface border border-border rounded-sm p-6 text-center space-y-3 shadow-sm">
          <h3 className="text-sm font-bold text-ink">Importing Subscriptions…</h3>
          <p className="text-xs text-ink-muted">Writing records to tenant workspace and verifying schema constraints.</p>
          <div className="w-full bg-canvas-subtle rounded-full h-2.5 max-w-md mx-auto overflow-hidden border border-border">
            <div
              className="bg-action-fill h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${importProgress}%` }}
            />
          </div>
          <span className="text-xs font-mono text-ink-muted tabular-nums">{importProgress}% completed</span>
        </div>
      )}

      {/* Import History & Rollback Section */}
      <div className="bg-surface border border-border rounded-sm p-5 shadow-sm space-y-3">
        <div>
          <h2 className="text-sm font-bold text-ink">Import History & Rollback</h2>
          <p className="text-xs text-ink-muted">
            Safely revert any mistaken or duplicated import with 1-click atomic rollback.
          </p>
        </div>

        {history.length === 0 ? (
          <div className="py-5 text-center text-xs text-ink-subtle border border-border-subtle rounded-xs bg-canvas">
            No previous imports recorded in this workspace session.
          </div>
        ) : (
          <div className="overflow-x-auto border border-border rounded-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas-subtle text-ink-muted font-semibold border-b border-border">
                <tr>
                  <th className="py-2 px-3 text-[11px]">Timestamp</th>
                  <th className="py-2 px-3 text-[11px]">File Name</th>
                  <th className="py-2 px-3 text-[11px]">Rows</th>
                  <th className="py-2 px-3 text-[11px]">Status</th>
                  <th className="py-2 px-3 text-[11px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {history.map((entry) => (
                  <tr key={entry.id} className="hover:bg-canvas-subtle/50">
                    <td className="py-2 px-3 text-ink-muted">{entry.timestamp}</td>
                    <td className="py-2 px-3 font-semibold text-ink">{entry.fileName}</td>
                    <td className="py-2 px-3 font-medium text-ink tabular-nums">{entry.rowCount} subscriptions</td>
                    <td className="py-2 px-3">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-xs border ${
                          entry.status === "completed"
                            ? "bg-savings-surface text-savings border-savings-border"
                            : "bg-canvas-subtle text-ink-muted border-border"
                        }`}
                      >
                        {entry.status === "completed" ? "Active" : "Rolled Back"}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      {entry.status === "completed" ? (
                        <button
                          type="button"
                          onClick={() => handleRollback(entry)}
                          className="inline-flex items-center gap-1 text-xs text-danger hover:underline font-semibold cursor-pointer min-h-[32px]"
                        >
                          <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
                          <span>Rollback</span>
                        </button>
                      ) : (
                        <span className="text-ink-subtle italic text-[11px]">Reverted</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
