import React, { useState } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle, Wifi, WifiOff, X } from 'lucide-react';
import { SyncStats } from '../types';

interface SyncStatusBadgeProps {
  stats: SyncStats;
  onTriggerSync: () => void;
  onToggleOnline: () => void;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  stats,
  onTriggerSync,
  onToggleOnline,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getStatusDisplay = () => {
    if (!stats.networkOnline) {
      return {
        label: 'Offline Mode',
        color: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
        icon: <CloudOff className="w-3.5 h-3.5" />,
      };
    }
    switch (stats.status) {
      case 'syncing':
        return {
          label: 'Syncing Changes...',
          color: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
          icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
        };
      case 'pending':
        return {
          label: `${stats.pendingCount} Pending`,
          color: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
          icon: <RefreshCw className="w-3.5 h-3.5" />,
        };
      case 'error':
        return {
          label: 'Sync Issue',
          color: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400',
          icon: <AlertCircle className="w-3.5 h-3.5" />,
        };
      case 'synced':
      default:
        return {
          label: 'All Files Synced',
          color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        };
    }
  };

  const current = getStatusDisplay();

  return (
    <div className="relative">
      <button
        id="sync-status-badge-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 min-h-[36px] touch-manipulation hover:opacity-90 active:scale-95 ${current.color}`}
        aria-label="Cloud sync status details"
      >
        {current.icon}
        <span className="hidden sm:inline font-semibold">{current.label}</span>
      </button>

      {isOpen && (
        <div
          id="sync-status-popover"
          className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl p-4 z-50 animate-in fade-in zoom-in-95"
        >
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Google Drive Sync</h4>
            </div>
            <button
              id="close-sync-popover"
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-3 space-y-2.5 text-xs text-zinc-600 dark:text-zinc-300">
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">Network State:</span>
              <span className="inline-flex items-center gap-1 font-medium text-zinc-800 dark:text-zinc-200">
                {stats.networkOnline ? (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-emerald-500" /> Connected
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-500" /> Disconnected
                  </>
                )}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-zinc-500">Last Synced:</span>
              <span className="font-mono text-zinc-700 dark:text-zinc-300">
                {new Date(stats.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-zinc-500">Sync Status:</span>
              <span className="font-medium capitalize text-zinc-800 dark:text-zinc-200">{stats.status}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-zinc-500">Total Tracked:</span>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">{stats.totalSyncedCount} items</span>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex gap-2">
            <button
              id="trigger-sync-now-btn"
              type="button"
              onClick={() => {
                onTriggerSync();
                setIsOpen(false);
              }}
              disabled={!stats.networkOnline || stats.status === 'syncing'}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition disabled:opacity-50 min-h-[44px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${stats.status === 'syncing' ? 'animate-spin' : ''}`} />
              Sync Now
            </button>

            <button
              id="toggle-offline-mode-btn"
              type="button"
              onClick={onToggleOnline}
              className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition min-h-[44px]"
            >
              {stats.networkOnline ? 'Simulate Offline' : 'Go Online'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
