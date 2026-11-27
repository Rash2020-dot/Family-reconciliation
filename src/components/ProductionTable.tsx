import { Fragment, useMemo, useState } from 'react';
import { Barcode, Database, Layers, ListChecks, Shirt } from 'lucide-react';
import type { ComputedProductionMetrics, SkuRecord, ViewLevel } from '../types/dashboard';
import { aggregateData, calculateMetrics } from '../utils/excelParser';
import { isEffectivelyZero } from '../utils/formatters';

interface ProductionTableProps {
  data: SkuRecord[];
  viewLevel: ViewLevel;
  onLoadDemo: () => void;
}

function fmtValue(val: number) {
  if (isEffectivelyZero(val)) {
    return <span className="text-[#94a3b8] font-medium">-</span>;
  }
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function fmtCurrency(val: number) {
  if (isEffectivelyZero(val)) {
    return <span className="text-[#94a3b8] font-medium">-</span>;
  }
  return (
    '€' + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
  );
}

function fmtNetSaving(val: number) {
  if (isEffectivelyZero(val)) {
    return <span className="text-[#94a3b8] font-medium">-</span>;
  }
  if (val < 0) {
    return (
      <span className="px-2 py-[3px] rounded-[12px] font-bold text-[11px] inline-block text-[#b91c1c] bg-[#fee2e2]">
        -€{Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
      </span>
    );
  }
  return (
    <span className="px-2 py-[3px] rounded-[12px] font-bold text-[11px] inline-block text-[#047857] bg-[#d1fae5]">
      +€{val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
    </span>
  );
}

function fmtProfitPct(val: number) {
  if (isEffectivelyZero(val)) {
    return <span className="text-[#94a3b8] font-medium">-</span>;
  }
  if (val < 0) {
    return (
      <span className="px-2 py-[3px] rounded-[12px] font-bold text-[11px] inline-block text-[#b91c1c] bg-[#fee2e2]">
        {val.toFixed(2)}%
      </span>
    );
  }
  return (
    <span className="px-2 py-[3px] rounded-[12px] font-bold text-[11px] inline-block text-[#047857] bg-[#d1fae5]">
      +{val.toFixed(2)}%
    </span>
  );
}

function ProductionMetricsCells({ metrics }: { metrics: ComputedProductionMetrics }) {
  const varBadge =
    metrics.varianceQty >= 0 ? 'text-[#047857] bg-[#d1fae5]' : 'text-[#b91c1c] bg-[#fee2e2]';
  const addCutBadge =
    metrics.actualAddCut > 0
      ? 'text-[#047857] bg-[#d1fae5]'
      : metrics.actualAddCut < 0
        ? 'text-[#b91c1c] bg-[#fee2e2]'
        : 'text-[#94a3b8] font-medium';
  const bundleVarBadge =
    metrics.varianceBundleShip >= 0
      ? 'text-[#047857] bg-[#d1fae5]'
      : 'text-[#b91c1c] bg-[#fee2e2]';

  return (
    <>
      <td className="px-3 py-2.5 text-right border-b border-[#e2e8f0] text-[12px] whitespace-nowrap tabular-nums">
        {metrics.orderQty.toLocaleString()}
      </td>
      <td className="px-3 py-2.5 text-right border-b border-[#e2e8f0] text-[12px] whitespace-nowrap tabular-nums">
        {metrics.add5Qty.toLocaleString()}
      </td>
      <td className="px-3 py-2.5 text-right border-b border-[#e2e8f0] text-[12px] whitespace-nowrap tabular-nums">
        {metrics.preEstQty.toLocaleString()}
      </td>
      <td className="px-3 py-2.5 text-right border-b border-[#e2e8f0] text-[12px] whitespace-nowrap tabular-nums">
        {metrics.actualCut.toLocaleString()}
      </td>
      <td className="px-3 py-2.5 text-right border-b border-[#e2e8f0] text-[12px] whitespace-nowrap tabular-nums">
        <span className={`px-2 py-[3px] rounded-[12px] font-bold text-[11px] inline-block ${addCutBadge}`}>
          {metrics.actualAddCut > 0 ? '+' : ''}
          {metrics.actualAddCut.toLocaleString()}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right border-b border-[#e2e8f0] text-[12px] whitespace-nowrap tabular-nums">
        {(metrics.bundleQty || 0).toLocaleString()}
      </td>
      <td className="px-3 py-2.5 text-right border-b border-[#e2e8f0] text-[12px] whitespace-nowrap tabular-nums">
        {(metrics.actualShip1st || 0).toLocaleString()}
      </td>
      <td className="px-3 py-2.5 text-right border-b border-[#e2e8f0] text-[12px] whitespace-nowrap tabular-nums text-[#d97706] font-bold">
        {(metrics.actualShip2nd || 0).toLocaleString()}
      </td>
      <td className="px-3 py-2.5 text-right border-b border-[#e2e8f0] text-[12px] whitespace-nowrap tabular-nums font-bold">
        {metrics.actualShip.toLocaleString()}
      </td>
      <td className="px-3 py-2.5 text-right border-b border-[#e2e8f0] text-[12px] whitespace-nowrap tabular-nums">
        <span className={`px-2 py-[3px] rounded-[12px] font-bold text-[11px] inline-block ${bundleVarBadge}`}>
          {metrics.varianceBundleShip > 0 ? '+' : ''}
          {metrics.varianceBundleShip.toLocaleString()}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right border-b border-[#e2e8f0] text-[12px] whitespace-nowrap tabular-nums">
        <span className={`px-2 py-[3px] rounded-[12px] font-bold text-[11px] inline-block ${varBadge}`}>
          {metrics.varianceQty > 0 ? '+' : ''}
          {metrics.varianceQty.toLocaleString()}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right border-b border-[#e2e8f0] text-[12px] whitespace-nowrap tabular-nums">
        <span className={`px-2 py-[3px] rounded-[12px] font-bold text-[11px] inline-block ${varBadge}`}>
          {metrics.varianceQty > 0 ? '+' : ''}
          {metrics.variancePct.toFixed(2)}%
        </span>
      </td>
      <td className="px-3 py-2.5 text-right border-b border-[#e2e8f0] text-[12px] whitespace-nowrap tabular-nums bg-[#f0f9ff] font-bold text-[#0369a1]">
        {fmtCurrency(metrics.totalOrderValue || 0)}
      </td>
      <td className="px-3 py-2.5 text-right border-b border-[#e2e8f0] text-[12px] whitespace-nowrap tabular-nums bg-[#f8fafc]">
        {fmtNetSaving(metrics.savings)}
      </td>
      <td className="px-3 py-2.5 text-right border-b border-[#e2e8f0] text-[12px] whitespace-nowrap tabular-nums bg-[#f0fdf4]">
        {fmtProfitPct(metrics.profitPct || 0)}
      </td>
    </>
  );
}

export function ProductionTable({ data, viewLevel, onLoadDemo }: ProductionTableProps) {
  const [expandedSkus, setExpandedSkus] = useState<Record<string, boolean>>({});

  const familyEntries = useMemo(() => {
    const grouped = aggregateData(data, 'family');
    return Object.entries(grouped).filter(([family, metrics]) => {
      if (metrics.orderQty > 0) return true;
      return data.some((d) => d.family === family && d.bom && d.bom.length > 0);
    });
  }, [data]);

  const toggleBom = (skuKey: string) => {
    setExpandedSkus((prev) => ({ ...prev, [skuKey]: !prev[skuKey] }));
  };

  const thClass =
    'px-3 py-2.5 bg-[#f8fafc] text-[#64748b] font-bold text-center sticky top-0 z-10 border-b-2 border-[#e2e8f0] uppercase text-[11px] tracking-[0.5px] whitespace-nowrap';

  return (
    <div className="overflow-x-auto bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] rounded-[10px] border border-[#e2e8f0] mb-[15px] max-h-[70vh] data-grid-scroll">
      <table className="w-full border-collapse min-w-full">
        <thead>
          <tr>
            <th className={`${thClass} !text-left`}>Category (Family / Style / SKU)</th>
            <th className={thClass}>Order Qty</th>
            <th className={thClass}>5% Additional Qty</th>
            <th className={thClass}>Pre Estimated Qty</th>
            <th className={thClass}>Actual Cutting</th>
            <th className={thClass}>Actual Additional Cut</th>
            <th className={thClass}>Bundle Qty</th>
            <th className={thClass}>1st Quality Ship</th>
            <th className={thClass}>2nd Quality Ship</th>
            <th className={thClass}>Total Ship</th>
            <th className={thClass}>Variance (Ship - Bundle)</th>
            <th className={thClass}>Variance (Ship - Order)</th>
            <th className={thClass}>Variance %</th>
            <th className={`${thClass} !bg-[#e0f2fe] !text-[#0369a1]`}>Total Order Value (€)</th>
            <th className={`${thClass} !bg-[#e0e7ff] !text-[#3730a3]`}>
              Actual Net Saving / Loss (€)
            </th>
            <th className={`${thClass} !bg-[#dcfce7] !text-[#15803d]`}>Additional Profit %</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={16} className="text-center text-[#64748b] py-[30px] px-3 text-[12px]">
                <div>කරුණාකර Excel ෆයිල් Upload කර &quot;Process Files&quot; ඔබන්න.</div>
                <button
                  type="button"
                  onClick={onLoadDemo}
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[6px] bg-[#fef3c7] hover:bg-[#fde68a] text-[#92400e] border border-[#fcd34d] text-[12px] font-bold cursor-pointer transition-colors"
                >
                  <Database className="w-3.5 h-3.5" />
                  Demo Data Load කරන්න
                </button>
              </td>
            </tr>
          ) : (
            familyEntries.map(([family, familyBase]) => {
              const familyMetrics = calculateMetrics(familyBase);
              const stylesInFamily = data.filter((d) => d.family === family);
              const styleGrouped = aggregateData(stylesInFamily, 'style');

              return (
                <Fragment key={family}>
                  <tr className="bg-[#e0e7ff] font-extrabold text-[#1e1b4b]">
                    <td className="px-3 py-2.5 text-left border-b border-[#e2e8f0] text-[12px] whitespace-nowrap font-extrabold text-[#1e1b4b]">
                      <span className="inline-flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 shrink-0" />
                        {family}
                      </span>
                    </td>
                    <ProductionMetricsCells metrics={familyMetrics} />
                  </tr>

                  {viewLevel !== 'family' &&
                    Object.entries(styleGrouped).map(([style, styleBase]) => {
                      const styleMetrics = calculateMetrics(styleBase);
                      const skusInStyle = stylesInFamily.filter((d) => d.style === style);

                      return (
                        <Fragment key={`${family}-${style}`}>
                          <tr className="bg-[#f1f5f9] font-bold text-[#4f46e5]">
                            <td className="px-3 py-2.5 text-left border-b border-[#e2e8f0] text-[12px] whitespace-nowrap font-bold text-[#4f46e5]">
                              <span className="inline-flex items-center gap-1.5 pl-2">
                                ↳ <Shirt className="w-3.5 h-3.5 shrink-0" />
                                {style}
                              </span>
                            </td>
                            <ProductionMetricsCells metrics={styleMetrics} />
                          </tr>

                          {viewLevel === 'sku' &&
                            skusInStyle.map((skuItem) => {
                              const skuMetrics = calculateMetrics(skuItem);
                              const hasBom = skuItem.bom && skuItem.bom.length > 0;
                              const isExpanded = Boolean(expandedSkus[skuItem.sku]);

                              return (
                                <Fragment key={skuItem.sku}>
                                  <tr className="bg-white hover:bg-[#f1f5f9] text-[#0f172a] text-[0.95em]">
                                    <td className="px-3 py-2.5 text-left border-b border-[#e2e8f0] text-[12px] whitespace-nowrap font-semibold text-[#0f172a]">
                                      <span className="inline-flex items-center gap-1.5 pl-6">
                                        ↳ <Barcode className="w-3.5 h-3.5 shrink-0 text-[#475569]" />
                                        {skuItem.sku}
                                        {hasBom && (
                                          <button
                                            type="button"
                                            onClick={() => toggleBom(skuItem.sku)}
                                            className="bg-[#e0e7ff] text-[#4f46e5] border border-[#c7d2fe] px-2 py-[3px] text-[11px] rounded-[4px] cursor-pointer ml-2 transition-colors font-bold inline-flex items-center gap-1 hover:bg-[#4f46e5] hover:text-white"
                                          >
                                            <ListChecks className="w-3 h-3" />
                                            BOM Materials
                                          </button>
                                        )}
                                      </span>
                                    </td>
                                    <ProductionMetricsCells metrics={skuMetrics} />
                                  </tr>

                                  {hasBom && isExpanded && (
                                    <tr className="bg-[#f8fafc]">
                                      <td
                                        colSpan={16}
                                        className="py-2.5 pr-[15px] pl-[35px] border-b border-[#e2e8f0]"
                                      >
                                        <div className="border border-[#c7d2fe] rounded-[8px] overflow-hidden">
                                          <table className="w-full bg-white m-0 border-collapse">
                                            <thead>
                                              <tr className="bg-[#e0e7ff] text-[11px]">
                                                <th className="text-left px-2.5 py-1.5 font-bold text-[#475569] uppercase border-b border-[#e2e8f0] whitespace-nowrap">
                                                  Material / Description
                                                </th>
                                                <th className="text-center px-2.5 py-1.5 font-bold text-[#6b21a8] bg-[#f3e8ff] uppercase border-b border-[#e2e8f0] whitespace-nowrap">
                                                  U Price (€)
                                                </th>
                                                <th className="text-center px-2.5 py-1.5 font-bold text-[#475569] uppercase border-b border-[#e2e8f0] whitespace-nowrap">
                                                  Con + Scrap
                                                </th>
                                                <th className="text-right px-2.5 py-1.5 font-bold text-[#d97706] uppercase border-b border-[#e2e8f0] whitespace-nowrap">
                                                  Cutting Qty
                                                </th>
                                                <th className="text-right px-2.5 py-1.5 font-bold text-[#7c3aed] uppercase border-b border-[#e2e8f0] whitespace-nowrap">
                                                  Actual Con (Withdraw / Cut)
                                                </th>
                                                <th className="text-right px-2.5 py-1.5 font-bold text-[#2563eb] uppercase border-b border-[#e2e8f0] whitespace-nowrap">
                                                  Order Req (Order × Con)
                                                </th>
                                                <th className="text-right px-2.5 py-1.5 font-bold text-[#d97706] uppercase border-b border-[#e2e8f0] whitespace-nowrap">
                                                  SAP Req Qty
                                                </th>
                                                <th className="text-right px-2.5 py-1.5 font-bold text-[#059669] uppercase border-b border-[#e2e8f0] whitespace-nowrap">
                                                  Qty Withdrawn
                                                </th>
                                                <th className="text-right px-2.5 py-1.5 font-bold text-[#dc2626] uppercase border-b border-[#e2e8f0] whitespace-nowrap">
                                                  Variance (SAP Req - Withdrawn)
                                                </th>
                                                <th className="text-right px-2.5 py-1.5 font-bold text-[#0369a1] bg-[#e0f2fe] uppercase border-b border-[#e2e8f0] whitespace-nowrap">
                                                  Shipped Order Value (€)
                                                </th>
                                                <th className="text-right px-2.5 py-1.5 font-bold text-[#1e1b4b] bg-[#e0e7ff] uppercase border-b border-[#e2e8f0] whitespace-nowrap">
                                                  Net Saving / Loss (€)
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {skuItem.bom.map((bom) => {
                                                const orderQty = skuItem.orderQty || 0;
                                                const con = bom.consumption || 0;
                                                const cutQty =
                                                  bom.cutQty > 0 ? bom.cutQty : skuItem.actualCut;
                                                const withdrawn = bom.withdrawn || 0;
                                                const uPrice = bom.unitPrice || 0;

                                                const actualCon =
                                                  cutQty > 0 && withdrawn > 0
                                                    ? withdrawn / cutQty
                                                    : con;
                                                const orderReqQty = orderQty * con;
                                                const sapReqQty =
                                                  bom.reqQty > 0 ? bom.reqQty : orderReqQty;
                                                const variance = sapReqQty - withdrawn;

                                                return (
                                                  <tr
                                                    key={`${skuItem.sku}-${bom.material}`}
                                                    className="border-b border-[#f1f5f9] hover:bg-[#f1f5f9]"
                                                  >
                                                    <td className="text-left px-2.5 py-1.5 text-[11px] font-semibold text-[#0f172a] whitespace-nowrap">
                                                      {bom.material}
                                                    </td>
                                                    <td className="text-center px-2.5 py-1.5 text-[11px] font-bold text-[#6b21a8] bg-[#faf5ff] whitespace-nowrap tabular-nums">
                                                      {uPrice > 0 ? (
                                                        fmtCurrency(uPrice)
                                                      ) : (
                                                        <span className="text-[#94a3b8] font-medium">
                                                          -
                                                        </span>
                                                      )}
                                                    </td>
                                                    <td className="text-center px-2.5 py-1.5 text-[11px] font-bold text-[#475569] whitespace-nowrap tabular-nums">
                                                      {fmtValue(con)}
                                                    </td>
                                                    <td className="text-right px-2.5 py-1.5 text-[11px] text-[#d97706] font-bold whitespace-nowrap tabular-nums">
                                                      {cutQty > 0 ? cutQty.toLocaleString() : '-'}
                                                    </td>
                                                    <td className="text-right px-2.5 py-1.5 text-[11px] text-[#7c3aed] font-bold whitespace-nowrap tabular-nums">
                                                      {fmtValue(actualCon)}
                                                    </td>
                                                    <td className="text-right px-2.5 py-1.5 text-[11px] text-[#2563eb] font-bold whitespace-nowrap tabular-nums">
                                                      {fmtValue(orderReqQty)}
                                                    </td>
                                                    <td className="text-right px-2.5 py-1.5 text-[11px] text-[#d97706] font-bold whitespace-nowrap tabular-nums">
                                                      {fmtValue(sapReqQty)}
                                                    </td>
                                                    <td className="text-right px-2.5 py-1.5 text-[11px] text-[#059669] font-bold whitespace-nowrap tabular-nums">
                                                      {fmtValue(withdrawn)}
                                                    </td>
                                                    <td
                                                      className={`text-right px-2.5 py-1.5 text-[11px] font-bold whitespace-nowrap tabular-nums ${
                                                        variance >= 0
                                                          ? 'text-[#059669]'
                                                          : 'text-[#dc2626]'
                                                      }`}
                                                    >
                                                      {fmtValue(variance)}
                                                    </td>
                                                    <td className="text-right px-2.5 py-1.5 text-[11px] font-bold text-[#0369a1] bg-[#f0f9ff] whitespace-nowrap tabular-nums">
                                                      {fmtCurrency(bom.orderValue || 0)}
                                                    </td>
                                                    <td className="text-right px-2.5 py-1.5 text-[11px] font-bold bg-[#f8fafc] whitespace-nowrap tabular-nums">
                                                      {fmtNetSaving(bom.saving)}
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              );
                            })}
                        </Fragment>
                      );
                    })}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
