import * as XLSX from 'xlsx';
import type { DashboardKpis, MaterialRecord, SkuRecord } from '../types/dashboard';
import {
  formatCurrency,
  formatDecimal,
  formatInteger,
  formatKpiCurrency,
  formatSignedCurrency,
  formatSignedDecimal,
  formatSignedInteger,
  formatSignedPercent,
} from './formatters';
import { aggregateData, calculateMetrics } from './excelParser';

export function exportDashboardToExcel(
  productionData: SkuRecord[],
  materialData: MaterialRecord[],
): boolean {
  if (productionData.length === 0 && materialData.length === 0) {
    return false;
  }

  const wb = XLSX.utils.book_new();

  const prodExportData = productionData.map((item) => {
    const orderVal = item.totalOrderValue || 0;
    const profitPct =
      orderVal > 0 ? Number((((item.savings || 0) / orderVal) * 100).toFixed(2)) : 0;
    return {
      Family: item.family,
      Style: item.style,
      SKU: item.sku,
      'Order Qty': item.orderQty,
      '5% Additional Qty': item.add5Qty,
      'Pre Estimated Qty': item.preEstQty,
      'Actual Cutting': item.actualCut,
      'Actual Additional Cut': item.actualCut - item.orderQty,
      'Bundle Qty': item.bundleQty || 0,
      '1st Quality Ship': item.actualShip1st || 0,
      '2nd Quality Ship': item.actualShip2nd || 0,
      'Total Ship': item.actualShip,
      'Variance (Ship - Bundle)': item.actualShip - (item.bundleQty || 0),
      'Variance (Ship - Order)': item.actualShip - item.orderQty,
      'Total Order Value (€)': orderVal,
      'Actual Net Saving / Loss (€)': item.savings || 0,
      'Additional Profit %': profitPct,
    };
  });
  const wsProd = XLSX.utils.json_to_sheet(prodExportData);
  XLSX.utils.book_append_sheet(wb, wsProd, 'Production Summary');

  const matExportData = materialData.map((mat) => ({
    'Article / Material': mat.article,
    Type: mat.type,
    'Unit Price (€)': mat.unitPrice,
    'Additional Reqmnt': mat.totalReq,
    'Add Cutting Provide': mat.cutProvide,
    Scrap: mat.scrap,
    'Add Planing Provide': mat.planProvide,
    'Planning Re order': mat.reorder,
    'Requirement Qty': mat.reqQty,
    Shortage: mat.shortage,
    'Qty Withdrawn': mat.withdrawn,
    'Variance (Req - Withdraw)': mat.reqQty - mat.withdrawn,
    'Excess Stock': mat.excessStock,
    'Excess Stock Value (€)': mat.excessStockValue,
  }));
  const wsMat = XLSX.utils.json_to_sheet(matExportData);
  XLSX.utils.book_append_sheet(wb, wsMat, 'Material Requirement');

  const bomExportData: Record<string, string | number>[] = [];
  for (const sku of productionData) {
    if (sku.bom && sku.bom.length > 0) {
      for (const b of sku.bom) {
        const orderQty = sku.orderQty || 0;
        const con = b.consumption || 0;
        const cutQty = b.cutQty > 0 ? b.cutQty : sku.actualCut;
        const withdrawn = b.withdrawn || 0;
        const actualCon = cutQty > 0 && withdrawn > 0 ? withdrawn / cutQty : con;
        const orderReqQty = orderQty * con;
        const sapReqQty = b.reqQty > 0 ? b.reqQty : orderReqQty;
        bomExportData.push({
          SKU: sku.sku,
          Material: b.material,
          'U Price (€)': b.unitPrice || 0,
          'Con + Scrap': con,
          'Cutting Qty': cutQty,
          'Actual Con': actualCon,
          'Order Req': orderReqQty,
          'SAP Req Qty': sapReqQty,
          'Qty Withdrawn': withdrawn,
          Variance: sapReqQty - withdrawn,
          'Shipped Order Value (€)': b.orderValue || 0,
          'Net Saving (€)': b.saving || 0,
        });
      }
    }
  }

  if (bomExportData.length > 0) {
    const wsBom = XLSX.utils.json_to_sheet(bomExportData);
    XLSX.utils.book_append_sheet(wb, wsBom, 'BOM Details');
  }

  XLSX.writeFile(wb, 'Production_Material_Dashboard_Export.xlsx');
  return true;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function exportDashboardToHtml(
  productionData: SkuRecord[],
  materialData: MaterialRecord[],
  kpis: DashboardKpis,
): boolean {
  if (productionData.length === 0 && materialData.length === 0) {
    return false;
  }

  const familyData = aggregateData(productionData, 'family');
  let prodRows = '';
  let skuCounter = 0;

  for (const [family, fBase] of Object.entries(familyData)) {
    const fm = calculateMetrics(fBase);
    prodRows += `
      <tr class="row-family">
        <td>${escapeHtml(family)}</td>
        <td>${formatInteger(fm.orderQty)}</td>
        <td>${formatInteger(fm.add5Qty)}</td>
        <td>${formatInteger(fm.preEstQty)}</td>
        <td>${formatInteger(fm.actualCut)}</td>
        <td class="${fm.actualAddCut >= 0 ? 'pos' : 'neg'}">${formatSignedInteger(fm.actualAddCut)}</td>
        <td>${formatInteger(fm.bundleQty)}</td>
        <td>${formatInteger(fm.actualShip1st)}</td>
        <td class="warn">${formatInteger(fm.actualShip2nd)}</td>
        <td><strong>${formatInteger(fm.actualShip)}</strong></td>
        <td class="${fm.varianceBundleShip >= 0 ? 'pos' : 'neg'}">${formatSignedInteger(fm.varianceBundleShip)}</td>
        <td class="${fm.varianceQty >= 0 ? 'pos' : 'neg'}">${formatSignedInteger(fm.varianceQty)}</td>
        <td class="${fm.varianceQty >= 0 ? 'pos' : 'neg'}">${formatSignedPercent(fm.variancePct)}</td>
        <td class="val">${formatCurrency(fm.totalOrderValue)}</td>
        <td class="${fm.savings >= 0 ? 'pos' : 'neg'}">${formatSignedCurrency(fm.savings)}</td>
        <td class="${fm.profitPct >= 0 ? 'pos' : 'neg'}">${formatSignedPercent(fm.profitPct)}</td>
      </tr>
    `;

    const stylesInFamily = productionData.filter((d) => d.family === family);
    const styleData = aggregateData(stylesInFamily, 'style');

    for (const [style, sBase] of Object.entries(styleData)) {
      const sm = calculateMetrics(sBase);
      prodRows += `
        <tr class="row-style">
          <td style="padding-left:20px;">↳ ${escapeHtml(style)}</td>
          <td>${formatInteger(sm.orderQty)}</td>
          <td>${formatInteger(sm.add5Qty)}</td>
          <td>${formatInteger(sm.preEstQty)}</td>
          <td>${formatInteger(sm.actualCut)}</td>
          <td class="${sm.actualAddCut >= 0 ? 'pos' : 'neg'}">${formatSignedInteger(sm.actualAddCut)}</td>
          <td>${formatInteger(sm.bundleQty)}</td>
          <td>${formatInteger(sm.actualShip1st)}</td>
          <td class="warn">${formatInteger(sm.actualShip2nd)}</td>
          <td><strong>${formatInteger(sm.actualShip)}</strong></td>
          <td class="${sm.varianceBundleShip >= 0 ? 'pos' : 'neg'}">${formatSignedInteger(sm.varianceBundleShip)}</td>
          <td class="${sm.varianceQty >= 0 ? 'pos' : 'neg'}">${formatSignedInteger(sm.varianceQty)}</td>
          <td class="${sm.varianceQty >= 0 ? 'pos' : 'neg'}">${formatSignedPercent(sm.variancePct)}</td>
          <td class="val">${formatCurrency(sm.totalOrderValue)}</td>
          <td class="${sm.savings >= 0 ? 'pos' : 'neg'}">${formatSignedCurrency(sm.savings)}</td>
          <td class="${sm.profitPct >= 0 ? 'pos' : 'neg'}">${formatSignedPercent(sm.profitPct)}</td>
        </tr>
      `;

      const skusInStyle = stylesInFamily.filter((d) => d.style === style);
      for (const skuItem of skusInStyle) {
        skuCounter += 1;
        const m = calculateMetrics(skuItem);
        const bomId = `bom-${skuCounter}`;
        const hasBom = skuItem.bom.length > 0;
        prodRows += `
          <tr class="row-sku">
            <td style="padding-left:38px;">
              ↳ ${escapeHtml(skuItem.sku)}
              ${hasBom ? `<button class="bom-toggle" onclick="toggleBom('${bomId}')">BOM (${skuItem.bom.length})</button>` : ''}
            </td>
            <td>${formatInteger(m.orderQty)}</td>
            <td>${formatInteger(m.add5Qty)}</td>
            <td>${formatInteger(m.preEstQty)}</td>
            <td>${formatInteger(m.actualCut)}</td>
            <td class="${m.actualAddCut >= 0 ? 'pos' : 'neg'}">${formatSignedInteger(m.actualAddCut)}</td>
            <td>${formatInteger(m.bundleQty)}</td>
            <td>${formatInteger(m.actualShip1st)}</td>
            <td class="warn">${formatInteger(m.actualShip2nd)}</td>
            <td><strong>${formatInteger(m.actualShip)}</strong></td>
            <td class="${m.varianceBundleShip >= 0 ? 'pos' : 'neg'}">${formatSignedInteger(m.varianceBundleShip)}</td>
            <td class="${m.varianceQty >= 0 ? 'pos' : 'neg'}">${formatSignedInteger(m.varianceQty)}</td>
            <td class="${m.varianceQty >= 0 ? 'pos' : 'neg'}">${formatSignedPercent(m.variancePct)}</td>
            <td class="val">${formatCurrency(m.totalOrderValue)}</td>
            <td class="${m.savings >= 0 ? 'pos' : 'neg'}">${formatSignedCurrency(m.savings)}</td>
            <td class="${m.profitPct >= 0 ? 'pos' : 'neg'}">${formatSignedPercent(m.profitPct)}</td>
          </tr>
        `;

        if (hasBom) {
          const bomRows = skuItem.bom
            .map((bom) => {
              const cutQty = bom.cutQty > 0 ? bom.cutQty : skuItem.actualCut;
              const actualCon =
                cutQty > 0 && bom.withdrawn > 0 ? bom.withdrawn / cutQty : bom.consumption || 0;
              const orderReq = (skuItem.orderQty || 0) * (bom.consumption || 0);
              const sapReq = bom.reqQty > 0 ? bom.reqQty : orderReq;
              const variance = sapReq - (bom.withdrawn || 0);
              return `
                <tr>
                  <td style="text-align:left;">${escapeHtml(bom.material)}</td>
                  <td>${formatCurrency(bom.unitPrice)}</td>
                  <td>${formatDecimal(bom.consumption)}</td>
                  <td>${cutQty > 0 ? formatInteger(cutQty) : '—'}</td>
                  <td>${formatDecimal(actualCon)}</td>
                  <td>${formatDecimal(orderReq)}</td>
                  <td>${formatDecimal(sapReq)}</td>
                  <td>${formatDecimal(bom.withdrawn)}</td>
                  <td class="${variance >= 0 ? 'pos' : 'neg'}">${formatSignedDecimal(variance)}</td>
                  <td class="val">${formatCurrency(bom.orderValue)}</td>
                  <td class="${bom.saving >= 0 ? 'pos' : 'neg'}">${formatSignedCurrency(bom.saving)}</td>
                </tr>
              `;
            })
            .join('');

          prodRows += `
            <tr id="${bomId}" style="display:none;" class="bom-container">
              <td colspan="16" style="padding:10px 16px 10px 42px;">
                <table class="bom-table">
                  <thead>
                    <tr>
                      <th style="text-align:left;">Material / Description</th>
                      <th>U Price (€)</th>
                      <th>Con + Scrap</th>
                      <th>Cutting Qty</th>
                      <th>Actual Con</th>
                      <th>Order Req</th>
                      <th>SAP Req Qty</th>
                      <th>Qty Withdrawn</th>
                      <th>Variance</th>
                      <th>Shipped Order Value (€)</th>
                      <th>Net Saving / Loss (€)</th>
                    </tr>
                  </thead>
                  <tbody>${bomRows}</tbody>
                </table>
              </td>
            </tr>
          `;
        }
      }
    }
  }

  const matRows = materialData
    .map((mat) => {
      const variance = mat.reqQty - mat.withdrawn;
      const varPct = mat.reqQty > 0 ? (variance / mat.reqQty) * 100 : 0;
      return `
        <tr class="mat-row">
          <td style="text-align:left;">${escapeHtml(mat.article)}</td>
          <td style="text-align:center;">${escapeHtml(mat.type || '—')}</td>
          <td>${formatCurrency(mat.unitPrice)}</td>
          <td>${formatDecimal(mat.totalReq)}</td>
          <td>${formatDecimal(mat.cutProvide)}</td>
          <td>${formatDecimal(mat.scrap)}</td>
          <td>${formatDecimal(mat.planProvide)}</td>
          <td>${formatDecimal(mat.reorder)}</td>
          <td>${formatDecimal(mat.reqQty)}</td>
          <td>${formatDecimal(mat.shortage)}</td>
          <td><strong>${formatDecimal(mat.withdrawn)}</strong></td>
          <td class="${variance >= 0 ? 'pos' : 'neg'}">${formatSignedDecimal(variance)}</td>
          <td class="${variance >= 0 ? 'pos' : 'neg'}">${formatSignedPercent(varPct)}</td>
          <td class="val">${formatDecimal(mat.excessStock)}</td>
          <td class="val">${formatCurrency(mat.excessStockValue)}</td>
        </tr>
      `;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Production &amp; Material Requirement Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Plus Jakarta Sans', sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 20px; font-size: 13px; }
    .app-header { display: flex; align-items: center; justify-content: space-between; background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); color: #fff; padding: 16px 24px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
    .app-header h2 { margin: 0; font-size: 20px; font-weight: 700; }
    .subtitle { font-size: 12px; color: #a5b4fc; margin-top: 4px; }
    .dev-badge { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 600; color: #c7d2fe; }
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 15px; margin-bottom: 20px; }
    .kpi { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .kpi-label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; }
    .kpi-val { font-size: 18px; font-weight: 800; margin-top: 2px; font-variant-numeric: tabular-nums; }
    .tabs { display: flex; gap: 8px; margin-bottom: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 2px; }
    .tab-btn { border: none; background: transparent; padding: 10px 18px; border-radius: 8px 8px 0 0; font-weight: 700; color: #64748b; cursor: pointer; font-size: 13px; }
    .tab-btn.active { background: #4f46e5; color: #fff; }
    .panel { display: none; }
    .panel.active { display: block; }
    .search { width: 300px; padding: 8px 12px; border: 1.5px solid #e2e8f0; border-radius: 8px; margin-bottom: 12px; font-size: 12px; }
    .wrap { overflow-x: auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); max-height: 70vh; }
    table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
    th, td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; white-space: nowrap; font-size: 12px; }
    th { background: #f8fafc; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; position: sticky; top: 0; border-bottom: 2px solid #e2e8f0; }
    td:first-child, th:first-child { text-align: left; }
    .row-family { background: #e0e7ff; font-weight: 800; color: #1e1b4b; }
    .row-style { background: #f1f5f9; font-weight: 700; color: #4f46e5; }
    .pos { color: #047857; font-weight: 700; }
    .neg { color: #b91c1c; font-weight: 700; }
    .warn { color: #d97706; font-weight: 700; }
    .val { color: #0369a1; font-weight: 700; background: #f0f9ff; }
    .bom-toggle { margin-left: 8px; padding: 3px 8px; font-size: 11px; border: 1px solid #c7d2fe; background: #e0e7ff; color: #4f46e5; border-radius: 4px; cursor: pointer; font-weight: 700; }
    .bom-table { background: #fff; border: 1px solid #c7d2fe; }
    footer { text-align: center; padding: 15px 0; margin-top: 20px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; font-weight: 600; }
    footer span { color: #4f46e5; font-weight: 700; }
  </style>
</head>
<body>
  <div class="app-header">
    <div>
      <h2>Production &amp; Material Requirement Dashboard</h2>
      <div class="subtitle">Real-time Analytics, BOM Reconciliation &amp; Material Tracking · Exported ${escapeHtml(new Date().toLocaleString())}</div>
    </div>
    <div class="dev-badge">Developed by Rashmi Peiris</div>
  </div>
  <div class="kpis">
    <div class="kpi"><div class="kpi-label">Total Order Qty</div><div class="kpi-val">${formatInteger(kpis.totalOrderQty)}</div></div>
    <div class="kpi"><div class="kpi-label">Total Shipped Qty</div><div class="kpi-val">${formatInteger(kpis.totalShippedQty)}</div></div>
    <div class="kpi"><div class="kpi-label">Total Order Value</div><div class="kpi-val">${formatKpiCurrency(kpis.totalOrderValue)}</div></div>
    <div class="kpi"><div class="kpi-label">Total Saving</div><div class="kpi-val" style="color:#10b981;">${formatKpiCurrency(kpis.totalSaving, true)}</div></div>
    <div class="kpi"><div class="kpi-label">Additional Profit %</div><div class="kpi-val" style="color:#10b981;">${kpis.additionalProfitPct.toFixed(2)}%</div></div>
    <div class="kpi"><div class="kpi-label">Excess Stock Value</div><div class="kpi-val">${formatKpiCurrency(kpis.excessStockValue)}</div></div>
  </div>
  <div class="tabs">
    <button class="tab-btn active" onclick="showTab('prod', this)">Production &amp; Shipping Summary</button>
    <button class="tab-btn" onclick="showTab('mat', this)">Material &amp; Article Requirement</button>
  </div>
  <div id="prod" class="panel active">
    <div class="wrap">
      <table>
        <thead>
          <tr>
            <th>Category (Family / Style / SKU)</th>
            <th>Order Qty</th>
            <th>5% Additional Qty</th>
            <th>Pre Estimated Qty</th>
            <th>Actual Cutting</th>
            <th>Actual Additional Cut</th>
            <th>Bundle Qty</th>
            <th>1st Quality Ship</th>
            <th>2nd Quality Ship</th>
            <th>Total Ship</th>
            <th>Variance (Ship - Bundle)</th>
            <th>Variance (Ship - Order)</th>
            <th>Variance %</th>
            <th style="background:#e0f2fe; color:#0369a1;">Total Order Value (€)</th>
            <th style="background:#e0e7ff; color:#3730a3;">Actual Net Saving / Loss (€)</th>
            <th style="background:#dcfce7; color:#15803d;">Additional Profit %</th>
          </tr>
        </thead>
        <tbody>${prodRows}</tbody>
      </table>
    </div>
  </div>
  <div id="mat" class="panel">
    <input class="search" type="text" placeholder="Search Article / Material..." oninput="filterMat(this.value)" />
    <div class="wrap">
      <table>
        <thead>
          <tr>
            <th>Article / Material</th>
            <th style="text-align:center;">Type</th>
            <th style="background:#f3e8ff; color:#6b21a8;">U Price (€)</th>
            <th>Additional Reqmnt</th>
            <th>Add Cutting Provide</th>
            <th>Scrap</th>
            <th>Add Planing Provide</th>
            <th>Planning Re order</th>
            <th>Requirement Qty</th>
            <th>Shortage</th>
            <th>Qty Withdrawn</th>
            <th style="background:#fef3c7; color:#92400e;">Variance (Req - Withdraw)</th>
            <th style="background:#fef3c7; color:#92400e;">Variance %</th>
            <th style="background:#e0f2fe; color:#075985;">Excess Stock</th>
            <th style="background:#e0f2fe; color:#075985;">Excess Stock Value (€)</th>
          </tr>
        </thead>
        <tbody>${matRows}</tbody>
      </table>
    </div>
  </div>
  <footer>Designed &amp; Developed by <span>Rashmi Peiris</span> | Enterprise Dashboard System</footer>
  <script>
    function showTab(id, btn) {
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.getElementById(id).classList.add('active');
      btn.classList.add('active');
    }
    function toggleBom(id) {
      var el = document.getElementById(id);
      if (el) el.style.display = el.style.display === 'none' ? 'table-row' : 'none';
    }
    function filterMat(q) {
      var term = q.toLowerCase();
      document.querySelectorAll('.mat-row').forEach(r => {
        r.style.display = r.textContent.toLowerCase().includes(term) ? '' : 'none';
      });
    }
  </script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'Production_Material_Report.html';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  return true;
}
