/* Copyright (c) 2026 santiago-qoop. All rights reserved. */
const DataLoading = ({ title, description }) => (
  <div className="glass-card mb-4 flex items-center gap-3 rounded-2xl p-3 sm:p-4" role="status" aria-live="polite" aria-atomic="true">
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center" aria-hidden="true">
      <span className="data-loading-ring absolute inset-0 rounded-full border-2 border-emerald-100 border-t-emerald-500" />
      <img src="/favicon.svg" alt="" width="30" height="30" className="rounded-lg" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-gray-950">{title}</p>
      <p className="mt-0.5 text-xs text-gray-500">{description}</p>
      <div className="mt-2 h-1 max-w-xs overflow-hidden rounded-full bg-emerald-100/60" aria-hidden="true">
        <div className="data-loading-track h-full w-1/3 rounded-full bg-emerald-500/70" />
      </div>
    </div>
  </div>
);

export default DataLoading;
