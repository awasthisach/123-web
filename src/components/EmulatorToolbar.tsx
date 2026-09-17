import React from 'react';
import {
  Smartphone,
  Tablet,
  Monitor,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileCheck,
  AlertTriangle,
  Sliders,
  Sparkles,
  Eye,
  CheckCircle2,
  Layers,
  Touchpad,
  Crosshair,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { DeviceProfile, DeviceOrientation } from '../types';
import { EMULATOR_DEVICES } from '../lib/devices';

interface EmulatorToolbarProps {
  currentDevice: DeviceProfile;
  orientation: DeviceOrientation;
  zoomScale: number;
  dpr: number;
  showOverflowInspector: boolean;
  showTouchTargetAudit: boolean;
  activeViewMode: 'emulator' | 'native' | 'audit_report';
  isReloading?: boolean;
  autoReload?: boolean;
  onSelectDevice: (device: DeviceProfile) => void;
  onToggleOrientation: () => void;
  onSetZoom: (scale: number) => void;
  onSetDpr: (dpr: number) => void;
  onToggleOverflowInspector: () => void;
  onToggleTouchTargetAudit: () => void;
  onSelectViewMode: (mode: 'emulator' | 'native' | 'audit_report') => void;
  onToggleAutoReload?: () => void;
  onManualReload?: () => void;
}

export const EmulatorToolbar: React.FC<EmulatorToolbarProps> = ({
  currentDevice,
  orientation,
  zoomScale,
  dpr,
  showOverflowInspector,
  showTouchTargetAudit,
  activeViewMode,
  isReloading = false,
  autoReload = true,
  onSelectDevice,
  onToggleOrientation,
  onSetZoom,
  onSetDpr,
  onToggleOverflowInspector,
  onToggleTouchTargetAudit,
  onSelectViewMode,
  onToggleAutoReload,
  onManualReload,
}) => {
  const currentWidth = orientation === 'portrait' ? currentDevice.width : currentDevice.height;
  const currentHeight = orientation === 'portrait' ? currentDevice.height : currentDevice.width;

  return (
    <header className="sticky top-0 z-40 bg-zinc-950 text-zinc-100 border-b border-zinc-800 shadow-lg px-3 py-2 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: App Branding & Primary View Selector */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-xs text-sm">
              VVF
            </div>
            <div>
              <span className="font-bold text-xs sm:text-sm tracking-tight block leading-tight">
                Perfect VVF
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">Responsive Emulator Suite</span>
            </div>
          </div>

          <div className="hidden md:flex h-5 w-px bg-zinc-800" />

          {/* Primary View Mode Tabs */}
          <div className="flex items-center p-0.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
            <button
              id="viewmode-native-btn"
              type="button"
              onClick={() => onSelectViewMode('native')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition min-h-[36px] flex items-center gap-1.5 ${
                activeViewMode === 'native'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Native Screen</span>
            </button>

            <button
              id="viewmode-emulator-btn"
              type="button"
              onClick={() => onSelectViewMode('emulator')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition min-h-[36px] flex items-center gap-1.5 ${
                activeViewMode === 'emulator'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Device Frame</span>
            </button>

            <button
              id="viewmode-audit-report-btn"
              type="button"
              onClick={() => onSelectViewMode('audit_report')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition min-h-[36px] flex items-center gap-1.5 ${
                activeViewMode === 'audit_report'
                  ? 'bg-amber-500 text-black font-bold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Audit Report</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </button>
          </div>
        </div>

        {/* Center/Right: Device Controls (Visible when in emulator mode) */}
        {activeViewMode === 'emulator' && (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Device Dropdown */}
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1">
              {currentDevice.category === 'mobile' ? (
                <Smartphone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              ) : currentDevice.category === 'tablet' ? (
                <Tablet className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              ) : (
                <Monitor className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
              <select
                id="emulator-device-select"
                value={currentDevice.id}
                onChange={e => {
                  const dev = EMULATOR_DEVICES.find(d => d.id === e.target.value);
                  if (dev) onSelectDevice(dev);
                }}
                className="bg-transparent text-zinc-100 font-semibold focus:outline-none cursor-pointer text-xs pr-1 min-h-[32px]"
              >
                <optgroup label="Mobile Phones">
                  {EMULATOR_DEVICES.filter(d => d.category === 'mobile').map(d => (
                    <option key={d.id} value={d.id} className="bg-zinc-900 text-zinc-100">
                      {d.name} ({d.width}×{d.height})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Tablets">
                  {EMULATOR_DEVICES.filter(d => d.category === 'tablet').map(d => (
                    <option key={d.id} value={d.id} className="bg-zinc-900 text-zinc-100">
                      {d.name} ({d.width}×{d.height})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Laptops & Desktop">
                  {EMULATOR_DEVICES.filter(d => d.category === 'desktop').map(d => (
                    <option key={d.id} value={d.id} className="bg-zinc-900 text-zinc-100">
                      {d.name} ({d.width}×{d.height})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Rotate Orientation Toggle */}
            <button
              id="emulator-rotate-btn"
              type="button"
              onClick={onToggleOrientation}
              title={`Rotate to ${orientation === 'portrait' ? 'Landscape' : 'Portrait'}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 transition min-h-[36px]"
            >
              <RotateCw className="w-3.5 h-3.5 text-amber-400" />
              <span className="capitalize hidden sm:inline">{orientation}</span>
            </button>

            {/* Pixel Density DPR Toggle */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-0.5">
              {[1, 2, 3].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onSetDpr(d)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-mono font-semibold transition ${
                    dpr === d ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title={`${d}x DPR (${d * 160} approx PPI)`}
                >
                  {d}x
                </button>
              ))}
            </div>

            {/* Zoom Slider / Controls */}
            <div className="hidden lg:flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1">
              <button
                type="button"
                onClick={() => onSetZoom(Math.max(0.4, zoomScale - 0.1))}
                className="p-1 hover:text-white text-zinc-400"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px] w-10 text-center text-zinc-300">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => onSetZoom(Math.min(1.2, zoomScale + 0.1))}
                className="p-1 hover:text-white text-zinc-400"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onSetZoom(0.85)}
                className="text-[10px] text-blue-400 hover:underline px-1"
              >
                Fit
              </button>
            </div>

            {/* Inspector Toggles */}
            <button
              id="toggle-overflow-inspector-btn"
              type="button"
              onClick={onToggleOverflowInspector}
              className={`p-1.5 rounded-xl border transition min-h-[36px] min-w-[36px] flex items-center justify-center ${
                showOverflowInspector
                  ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
              title="Toggle Layout Overflow Highlighting (Red outline on overflowing containers)"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>

            <button
              id="toggle-touch-target-btn"
              type="button"
              onClick={onToggleTouchTargetAudit}
              className={`p-1.5 rounded-xl border transition min-h-[36px] min-w-[36px] flex items-center justify-center ${
                showTouchTargetAudit
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
              title="Toggle Touch Target Accessibility Highlighting (Min 44x44px criteria)"
            >
              <Touchpad className="w-3.5 h-3.5" />
            </button>

            {/* Auto-Reload on Configuration Change Toggle */}
            <button
              id="emulator-auto-reload-toggle-btn"
              type="button"
              onClick={onToggleAutoReload}
              title={
                autoReload
                  ? 'Auto-Reload is ON: Emulator automatically reloads and recalculates styles whenever device or orientation changes'
                  : 'Auto-Reload is OFF: Click to enable automatic reload on configuration change'
              }
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition min-h-[36px] ${
                autoReload
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${autoReload ? 'text-emerald-400 fill-emerald-400/40' : 'text-zinc-500'}`} />
              <span className="text-[11px] font-medium hidden md:inline">
                Auto-Reload {autoReload ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Manual Reload & Recalculate Styles Button */}
            <button
              id="emulator-manual-reload-btn"
              type="button"
              onClick={onManualReload}
              disabled={isReloading}
              title="Reload emulator view and recalculate layout styles"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 transition min-h-[36px] disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin text-blue-400' : 'text-zinc-300'}`} />
              <span className="hidden sm:inline text-[11px] font-medium">
                {isReloading ? 'Recalculating...' : 'Reload'}
              </span>
            </button>

            {/* Metric Tag */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400">
              <span className="text-zinc-200 font-semibold">{currentWidth}×{currentHeight}</span>
              <span className="text-zinc-600">•</span>
              <span>{currentDevice.aspectRatio}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
