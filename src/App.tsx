import { useState } from 'react';
import {
  AlertCircle,
  Code2,
  Loader2,
  PieChart,
  Scissors,
  TrendingUp,
  X,
} from 'lucide-react';
import { ControlBar } from './components/ControlBar';
import { KpiStrip } from './components/KpiStrip';
import { MaterialTable } from './components/MaterialTable';
import { ProductionTable } from './components/ProductionTable';
import type {
  ActiveTab,
  DashboardKpis,
  NotificationState,
  ParsedDashboardData,
  ViewLevel,
} from './types/dashboard';
import { createSampleDataset, parseExcelFiles } from './utils/excelParser';
import { exportDashboardToExcel, exportDashboardToHtml } from './utils/exporters';

const EMPTY_KPIS: DashboardKpis = {
  totalOrderQty: 0,
  totalShippedQty: 0,
  totalOrderValue: 0,
  totalSaving: 0,
  additionalProfitPct: 0,
  excessStockValue: 0,
};

export default function App() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dashboardData, setDashboardData] = useState<ParsedDashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('production');
  const [viewLevel, setViewLevel] = useState<ViewLevel>('family');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [notification, setNotification] = useState<NotificationState | null>(null);

  const productionData = dashboardData?.productionData ?? [];
  const materialData = dashboardData?.materialData ?? [];
  const kpis = dashboardData?.kpis ?? EMPTY_KPIS;
  const hasData = productionData.length > 0 || materialData.length > 0;

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
    setNotification(null);
  };

  const handleProcessFiles = async () => {
    if (selectedFiles.length === 0) {
      setNotification({
        type: 'error',
        message: 'කරුණාකර ෆයිල් එකක් හෝ කිහිපයක් තෝරන්න!',
      });
      return;
    }

    setIsProcessing(true);
    setNotification(null);

    try {
      const parsed = await parseExcelFiles(selectedFiles);
      setDashboardData(parsed);
    } catch (err) {
      setNotification({
        type: 'error',
        message:
          err instanceof Error
            ? `Failed to process files: ${err.message}`
            : 'Unable to parse the selected Excel file(s).',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadDemo = () => {
    const sample = createSampleDataset();
    setDashboardData(sample);
    setViewLevel('sku');
    setNotification({
      type: 'success',
      message: 'Demo Data සාර්ථකව Load විය! (Family, Style, SKU, BOM සහ Material විස්තර බලාගත හැක)',
    });
  };

  const handleExportExcel = () => {
    const ok = exportDashboardToExcel(productionData, materialData);
    if (!ok) {
      setNotification({
        type: 'error',
        message: 'No data available! Please process the files first.',
      });
    }
  };

  const handleExportHtml = () => {
    const ok = exportDashboardToHtml(productionData, materialData, kpis);
    if (!ok) {
      setNotification({
        type: 'error',
        message: 'No data available! Please process the files first.',
      });
    }
  };

  const handleZoomChange = (delta: number) => {
    setZoomLevel((prev) => Math.max(50, Math.min(150, prev + delta)));
  };

  const handleZoomReset = () => {
    setZoomLevel(100);
  };

  return (
    <div
      className="min-h-screen bg-[#f8fafc] p-5 text-[#0f172a] text-[13px]"
      style={zoomLevel !== 100 ? { zoom: `${zoomLevel}%` } : undefined}
    >
      {/* Header Section */}
      <header className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-br from-[#1e1b4b] to-[#312e81] text-white px-6 py-4 rounded-[12px] mb-5 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]">
        <div>
          <h2 className="m-0 text-[20px] font-bold flex items-center gap-2.5">
            <TrendingUp className="w-5 h-5" />
            Production &amp; Material Requirement Dashboard
          </h2>
          <div className="text-[12px] text-[#a5b4fc] mt-1">
            Real-time Analytics, BOM Reconciliation &amp; Material Tracking
          </div>
        </div>
        <div className="bg-white/10 border border-white/20 px-3.5 py-1.5 rounded-[20px] text-[11px] font-semibold text-[#c7d2fe] flex items-center gap-1.5 whitespace-nowrap">
          <Code2 className="w-3.5 h-3.5" />
          Developed by Rashmi Peiris
        </div>
      </header>

      {/* Top KPI Cards Section */}
      <KpiStrip kpis={kpis} hasData={hasData} />

      {/* Control Toolbar */}
      <ControlBar
        onFilesSelected={handleFilesSelected}
        onProcessFiles={handleProcessFiles}
        onLoadDemo={handleLoadDemo}
        onExportExcel={handleExportExcel}
        onExportHtml={handleExportHtml}
        viewLevel={viewLevel}
        onViewLevelChange={setViewLevel}
        zoomLevel={zoomLevel}
        onZoomChange={handleZoomChange}
        onZoomReset={handleZoomReset}
        isProcessing={isProcessing}
      />

      {/* Inline Notification Banner */}
      {notification && (
        <div
          role="alert"
          className={`flex items-center justify-between gap-3 mb-3 px-4 py-2.5 rounded-[8px] border text-[12px] font-semibold ${
            notification.type === 'success'
              ? 'border-[#a7f3d0] bg-[#d1fae5] text-[#047857]'
              : 'border-[#fecaca] bg-[#fee2e2] text-[#b91c1c]'
          }`}
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {notification.message}
          </span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            aria-label="Close alert"
            className="p-0.5 rounded hover:bg-black/5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Loading Banner */}
      {isProcessing && (
        <div className="text-[#4f46e5] font-bold mb-2.5 text-[13px] bg-[#e0e7ff] px-[15px] py-2.5 rounded-[8px] text-center flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Processing files... Please wait.
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-[15px] border-b-2 border-[#e2e8f0] pb-0.5 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('production')}
          className={`border-0 px-[18px] py-2.5 rounded-t-[8px] font-bold text-[13px] transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'production'
              ? 'bg-[#4f46e5] text-white'
              : 'bg-transparent text-[#64748b] hover:text-[#4f46e5] hover:bg-[#f1f5f9]'
          }`}
        >
          <PieChart className="w-4 h-4" />
          Production &amp; Shipping Summary
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('material')}
          className={`border-0 px-[18px] py-2.5 rounded-t-[8px] font-bold text-[13px] transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'material'
              ? 'bg-[#4f46e5] text-white'
              : 'bg-transparent text-[#64748b] hover:text-[#4f46e5] hover:bg-[#f1f5f9]'
          }`}
        >
          <Scissors className="w-4 h-4" />
          Material &amp; Article Requirement
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'production' ? (
        <ProductionTable
          data={productionData}
          viewLevel={viewLevel}
          onLoadDemo={handleLoadDemo}
        />
      ) : (
        <MaterialTable data={materialData} onLoadDemo={handleLoadDemo} />
      )}

      {/* Footer Section */}
      <footer className="text-center py-[15px] mt-5 text-[12px] text-[#64748b] border-t border-[#e2e8f0] font-semibold">
        Designed &amp; Developed by{' '}
        <span className="text-[#4f46e5] font-bold">Rashmi Peiris</span> | Enterprise Dashboard
        System
      </footer>
    </div>
  );
}
