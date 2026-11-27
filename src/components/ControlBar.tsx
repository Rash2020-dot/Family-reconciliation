import { Database, FileOutput, FileSpreadsheet, Globe, Search, Settings } from 'lucide-react';
import type { ViewLevel } from '../types/dashboard';

interface ControlBarProps {
  onFilesSelected: (files: File[]) => void;
  onProcessFiles: () => void;
  onLoadDemo: () => void;
  onExportExcel: () => void;
  onExportHtml: () => void;
  viewLevel: ViewLevel;
  onViewLevelChange: (level: ViewLevel) => void;
  zoomLevel: number;
  onZoomChange: (delta: number) => void;
  onZoomReset: () => void;
  isProcessing: boolean;
}

export function ControlBar({
  onFilesSelected,
  onProcessFiles,
  onLoadDemo,
  onExportExcel,
  onExportHtml,
  viewLevel,
  onViewLevelChange,
  zoomLevel,
  onZoomChange,
  onZoomReset,
  isProcessing,
}: ControlBarProps) {
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesSelected(Array.from(e.target.files));
    }
  };

  return (
    <div className="bg-white px-5 py-4 rounded-[12px] border border-[#e2e8f0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] mb-5 flex items-center gap-[15px] flex-wrap">
      {/* Upload Area */}
      <div className="border-2 border-dashed border-[#a5b4fc] px-4 py-2 rounded-[8px] bg-[#f5f3ff] flex-grow flex items-center gap-2.5 min-w-[260px]">
        <FileSpreadsheet className="w-6 h-6 text-[#10b981] shrink-0" />
        <div className="min-w-0">
          <label
            htmlFor="fileInput"
            className="font-semibold text-[#4f46e5] cursor-pointer text-[13px] block"
          >
            Select Excel File(s):
          </label>
          <input
            id="fileInput"
            type="file"
            multiple
            accept=".xlsx, .xls, .csv"
            onChange={handleFileInput}
            className="text-[12px] text-[#64748b] file:mr-2.5 file:py-0.5 file:px-2.5 file:rounded file:border file:border-[#cbd5e1] file:bg-white file:text-[#0f172a] file:text-[12px] file:cursor-pointer hover:file:bg-slate-50"
          />
        </div>
      </div>

      {/* View Level Dropdown */}
      <div>
        <label
          htmlFor="viewLevel"
          className="block font-semibold mb-1 text-[#64748b] text-[11px] uppercase"
        >
          VIEW LEVEL
        </label>
        <select
          id="viewLevel"
          value={viewLevel}
          onChange={(e) => onViewLevelChange(e.target.value as ViewLevel)}
          className="px-4 py-2 rounded-[6px] border border-[#e2e8f0] bg-white text-[12px] font-semibold text-[#0f172a] cursor-pointer outline-none focus:border-[#4f46e5]"
        >
          <option value="family">Family Level</option>
          <option value="style">Style Level</option>
          <option value="sku">SKU Level (Detailed)</option>
        </select>
      </div>

      {/* Action Buttons */}
      <button
        type="button"
        onClick={onProcessFiles}
        disabled={isProcessing}
        className="px-4 py-2 rounded-[6px] border-0 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[12px] font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60"
      >
        <Settings className="w-3.5 h-3.5" />
        Process Files
      </button>

      <button
        type="button"
        onClick={onLoadDemo}
        className="px-4 py-2 rounded-[6px] border-0 bg-[#f59e0b] hover:bg-[#d97706] text-white text-[12px] font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] flex items-center gap-1.5 whitespace-nowrap"
      >
        <Database className="w-3.5 h-3.5" />
        Demo Data
      </button>

      <button
        type="button"
        onClick={onExportExcel}
        className="px-4 py-2 rounded-[6px] border-0 bg-[#10b981] hover:bg-[#059669] text-white text-[12px] font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] flex items-center gap-1.5 whitespace-nowrap"
      >
        <FileOutput className="w-3.5 h-3.5" />
        Export Excel
      </button>

      <button
        type="button"
        onClick={onExportHtml}
        className="px-4 py-2 rounded-[6px] border-0 bg-[#06b6d4] hover:bg-[#0891b2] text-white text-[12px] font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] flex items-center gap-1.5 whitespace-nowrap"
      >
        <Globe className="w-3.5 h-3.5" />
        Export HTML
      </button>

      {/* Zoom Controls */}
      <div className="flex items-center gap-1 bg-[#f1f5f9] p-1 rounded-[8px] border border-[#e2e8f0] ml-auto">
        <span className="text-[11px] font-bold text-[#64748b] mr-1 pl-1 flex items-center">
          <Search className="w-3.5 h-3.5" />
        </span>
        <button
          type="button"
          onClick={() => onZoomChange(-10)}
          className="bg-white border border-[#e2e8f0] px-2.5 py-1 rounded-[4px] text-[#0f172a] text-[12px] font-semibold cursor-pointer transition-colors hover:bg-[#4f46e5] hover:text-white hover:border-[#4f46e5]"
        >
          -
        </button>
        <span className="font-bold min-w-[45px] text-center text-[12px] text-[#4f46e5] tabular-nums">
          {zoomLevel}%
        </span>
        <button
          type="button"
          onClick={() => onZoomChange(10)}
          className="bg-white border border-[#e2e8f0] px-2.5 py-1 rounded-[4px] text-[#0f172a] text-[12px] font-semibold cursor-pointer transition-colors hover:bg-[#4f46e5] hover:text-white hover:border-[#4f46e5]"
        >
          +
        </button>
        <button
          type="button"
          onClick={onZoomReset}
          className="bg-white border border-[#e2e8f0] px-2.5 py-1 rounded-[4px] text-[#0f172a] text-[12px] font-semibold cursor-pointer transition-colors hover:bg-[#4f46e5] hover:text-white hover:border-[#4f46e5]"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
