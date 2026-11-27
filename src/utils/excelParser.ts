import * as XLSX from 'xlsx';
import type {
  AggregatedBase,
  ComputedProductionMetrics,
  DashboardKpis,
  MaterialRecord,
  ParsedDashboardData,
  RawBomEntry,
  SkuRecord,
} from '../types/dashboard';

export function normalizeMatKey(str: unknown): string {
  if (str === undefined || str === null) return '';
  return String(str).trim().toLowerCase().replace(/\s+/g, '');
}

export function safeNum(val: unknown): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'string') {
    const parsed = parseFloat(val.replace(/,/g, '').trim());
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  const num = Number(val);
  return Number.isNaN(num) ? 0 : num;
}

export function getFamilyName(sku: string): string {
  if (typeof sku === 'string' && sku.includes('2592')) return 'Family 2592';
  return 'General Family';
}

export function getStyleName(sku: string): string {
  if (typeof sku === 'string' && sku.trim().length > 0) {
    const firstToken = sku.split(' ')[0];
    return firstToken ? `Style ${firstToken}` : 'General Style';
  }
  return 'General Style';
}

function extractUnitPrice(row: Record<string, unknown>): number {
  for (const key of Object.keys(row)) {
    const normalized = String(key)
      .trim()
      .toLowerCase()
      .replace(/[\s._-]+/g, '');
    if (normalized === 'uprice' || normalized === 'unitprice' || normalized === 'price') {
      const val = safeNum(row[key]);
      if (val > 0) return val;
    }
  }
  return 0;
}

function createEmptySku(skuStr: string): SkuRecord {
  return {
    family: getFamilyName(skuStr),
    style: getStyleName(skuStr),
    sku: skuStr,
    orderQty: 0,
    add5Qty: 0,
    preEstQty: 0,
    actualCut: 0,
    bundleQty: 0,
    actualShip1st: 0,
    actualShip2nd: 0,
    actualShip: 0,
    totalOrderValue: 0,
    savings: 0,
    bom: [],
  };
}

function createEmptyMaterial(articleStr: string, unitPrice = 0): MaterialRecord {
  return {
    article: articleStr,
    type: '',
    unitPrice,
    excessStock: 0,
    excessStockValue: 0,
    totalReq: 0,
    cutProvide: 0,
    scrap: 0,
    planProvide: 0,
    reorder: 0,
    reqQty: 0,
    shortage: 0,
    withdrawn: 0,
  };
}

function readFileAsUint8Array(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(e.target.result));
      } else {
        reject(new Error(`Could not read ${file.name}`));
      }
    };
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsArrayBuffer(file);
  });
}

export function calculateSavingsAndKpis(
  productionData: SkuRecord[],
  materialData: MaterialRecord[],
  skuMaster: Record<string, SkuRecord>,
  materialTypeMap: Record<string, string>,
): DashboardKpis {
  let totalOrderQtySum = 0;
  let totalShippedQtySum = 0;
  let totalSavingsSum = 0;
  let totalOrderValueSum = 0;

  for (const skuItem of productionData) {
    totalOrderQtySum += skuItem.orderQty || 0;
    totalShippedQtySum += skuItem.actualShip || 0;

    const varianceShip = (skuItem.actualShip || 0) - (skuItem.orderQty || 0);
    let skuSaving = 0;
    let skuOrderValue = 0;

    if (skuItem.bom && skuItem.bom.length > 0) {
      for (const bom of skuItem.bom) {
        const uPrice = bom.unitPrice || 0;
        const withdrawn = bom.withdrawn || 0;
        const cutQty = bom.cutQty > 0 ? bom.cutQty : skuItem.actualCut;

        const actualCon =
          cutQty > 0 && withdrawn > 0 ? withdrawn / cutQty : bom.consumption || 0;
        const matSaving = uPrice > 0 ? actualCon * varianceShip * uPrice : 0;
        const matOrderVal = uPrice > 0 ? actualCon * (skuItem.actualShip || 0) * uPrice : 0;

        bom.saving = matSaving;
        bom.orderValue = matOrderVal;
        skuSaving += matSaving;
        skuOrderValue += matOrderVal;
      }
    }

    skuItem.savings = skuSaving;
    skuItem.totalOrderValue = skuOrderValue;
    totalOrderValueSum += skuOrderValue;

    if (skuSaving > 0) {
      totalSavingsSum += skuSaving;
    }
  }

  for (const mat of materialData) {
    const norm = normalizeMatKey(mat.article);
    if (materialTypeMap[norm]) {
      mat.type = materialTypeMap[norm];
    }

    if (!mat.unitPrice || mat.unitPrice === 0) {
      for (const skuKey of Object.keys(skuMaster)) {
        const bomList = skuMaster[skuKey].bom;
        if (bomList) {
          const bomMatch = bomList.find((b) => normalizeMatKey(b.material) === norm);
          if (bomMatch && bomMatch.unitPrice > 0) {
            mat.unitPrice = bomMatch.unitPrice;
            break;
          }
        }
      }
    }

    if (!mat.excessStock || mat.excessStock === 0) {
      if (mat.withdrawn > mat.reqQty && mat.reqQty > 0) {
        mat.excessStock = mat.withdrawn - mat.reqQty;
      }
    }

    mat.excessStockValue = (mat.excessStock || 0) * (mat.unitPrice || 0);
  }

  // Excess Stock Value strictly aggregates items typed as "Unique"
  const totalExcessValueSum = materialData.reduce((acc, curr) => {
    const matType = curr.type ? String(curr.type).trim().toLowerCase() : '';
    return matType === 'unique' ? acc + (curr.excessStockValue || 0) : acc;
  }, 0);

  const additionalProfitPct =
    totalOrderValueSum > 0 ? (totalSavingsSum / totalOrderValueSum) * 100 : 0;

  return {
    totalOrderQty: totalOrderQtySum,
    totalShippedQty: totalShippedQtySum,
    totalOrderValue: totalOrderValueSum,
    totalSaving: totalSavingsSum,
    additionalProfitPct,
    excessStockValue: totalExcessValueSum,
  };
}

export async function parseExcelFiles(files: File[]): Promise<ParsedDashboardData> {
  const globalSkuMaster: Record<string, SkuRecord> = {};
  const articleMaster: Record<string, MaterialRecord> = {};
  const rawBOMData: RawBomEntry[] = [];
  const materialTypeMap: Record<string, string> = {};

  for (const file of files) {
    const data = await readFileAsUint8Array(file);
    const workbook = XLSX.read(data, { type: 'array' });
    const fileSkuMaster: Record<string, SkuRecord> = {};

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];

      // Pass 1: Structured JSON rows (Material Type map + Pegged Requirements)
      const rowsJSON = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: '',
      });
      for (const row of rowsJSON) {
        const matKey =
          row['Material'] ||
          row['material'] ||
          row['Article'] ||
          row['article'] ||
          row['Item'];
        const typeVal = row['Type'] || row['type'] || row['TYPE'];
        if (matKey && typeVal) {
          const normMat = normalizeMatKey(matKey);
          const cleanType = String(typeVal).trim();
          if (normMat && cleanType && normMat !== 'material' && normMat !== 'article') {
            materialTypeMap[normMat] = cleanType;
          }
        }

        const peggedSku =
          row['Pegged Requirement'] ||
          row['pegged requirement'] ||
          row['Pegged requirement'];
        const matDesc =
          row['Material Description'] || row['Material'] || row['Item component'];
        const reqQ = safeNum(row['Requirement Quantity'] || row['Requirement Qty']);
        const withQ = safeNum(row['Quantity withdrawn'] || row['Qty Withdrawn']);
        const unitP = extractUnitPrice(row);

        if (
          peggedSku &&
          matDesc &&
          String(peggedSku).trim() !== '' &&
          !String(peggedSku).toLowerCase().includes('pegged')
        ) {
          const skuStr = String(peggedSku).trim().replace(/\s+/g, ' ');
          const matStr = String(matDesc).trim().replace(/\s+/g, ' ');
          if (!fileSkuMaster[skuStr]) {
            fileSkuMaster[skuStr] = createEmptySku(skuStr);
          }
          const existingBom = fileSkuMaster[skuStr].bom.find((b) => b.material === matStr);
          if (existingBom) {
            existingBom.reqQty += reqQ;
            existingBom.withdrawn += withQ;
            if (unitP > 0) existingBom.unitPrice = unitP;
          } else {
            fileSkuMaster[skuStr].bom.push({
              material: matStr,
              consumption: 0,
              cutQty: 0,
              unitPrice: unitP,
              reqQty: reqQ,
              withdrawn: withQ,
              saving: 0,
              orderValue: 0,
            });
          }
        }
      }

      // Pass 2: 2D array section detection (Production/Ship, Cut Qty, BOM, Material)
      const rows2D = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: '',
      });
      let inMatSection = false;
      let inBOMSection = false;
      let inCutQtySection = false;
      let inProdShipSection = false;
      let headers: Record<string, number> = {};

      for (const row of rows2D) {
        if (!row || row.length === 0) continue;
        const rowStr = row
          .map((c) => String(c).trim().toLowerCase().replace(/[\r\n]+/g, ' '))
          .join(' ');
        if (rowStr.trim() === '') continue;

        let isHeaderRow = false;

        // A. Detect Prod/Ship Header
        if (
          (rowStr.includes('sku') || rowStr.includes('style') || rowStr.includes('material')) &&
          (rowStr.includes('orderqty') ||
            rowStr.includes('orderquantity') ||
            rowStr.includes('total sku qty') ||
            rowStr.includes('totalskuqty') ||
            rowStr.includes('1stquality') ||
            rowStr.includes('2ndquality') ||
            rowStr.includes('shipped') ||
            rowStr.includes('bundle'))
        ) {
          const tempHeaders: Record<string, number> = {};
          row.forEach((cell, colIdx) => {
            const c = String(cell).toLowerCase().replace(/[^a-z0-9]/g, '');
            if (c === 'sku' || c === 'skuno' || c === 'material') tempHeaders['sku'] = colIdx;
            else if (
              c.includes('orderqty') ||
              c.includes('orderquantity') ||
              c.includes('totalskuqty')
            ) {
              tempHeaders['orderQty'] = colIdx;
            } else if (
              c.includes('1stquality') ||
              c.includes('shippedqty') ||
              c.includes('deliveredquantity') ||
              c === 'actualship'
            ) {
              tempHeaders['ship1'] = colIdx;
            } else if (c.includes('2ndquality') || c === 'secondquality') {
              tempHeaders['ship2'] = colIdx;
            } else if (c.includes('bundleqty') || c.includes('bundlequantity')) {
              tempHeaders['bundleQty'] = colIdx;
            } else if (
              c.includes('actualadditionalcutqty') ||
              c === 'cutqty' ||
              c === 'actualcut' ||
              c === 'cuttingqty'
            ) {
              tempHeaders['actualCut'] = colIdx;
            } else if (c.includes('5additional') || c.includes('additionalqty')) {
              tempHeaders['add5Qty'] = colIdx;
            } else if (c.includes('preest')) {
              tempHeaders['preEstQty'] = colIdx;
            }
          });

          if (
            tempHeaders['sku'] !== undefined &&
            (tempHeaders['orderQty'] !== undefined ||
              tempHeaders['ship1'] !== undefined ||
              tempHeaders['ship2'] !== undefined ||
              tempHeaders['actualCut'] !== undefined ||
              tempHeaders['bundleQty'] !== undefined)
          ) {
            headers = tempHeaders;
            inProdShipSection = true;
            inMatSection = false;
            inBOMSection = false;
            inCutQtySection = false;
            isHeaderRow = true;
          }
        }

        // B. Detect Cut Qty Section
        if (
          !isHeaderRow &&
          (rowStr.includes('sku') || rowStr.includes('style')) &&
          (rowStr.includes('fabric') || rowStr.includes('material')) &&
          (rowStr.includes('cut qty') ||
            rowStr.includes('cut qtys') ||
            rowStr.includes('cutting'))
        ) {
          const tempHeaders: Record<string, number> = {};
          row.forEach((cell, colIdx) => {
            const c = String(cell).toLowerCase().replace(/[^a-z0-9]/g, '');
            if (c === 'sku' || c === 'skuno') tempHeaders['sku'] = colIdx;
            else if (c === 'fabric' || c === 'material' || c === 'materialdescription') {
              tempHeaders['material'] = colIdx;
            } else if (c === 'cutqty' || c === 'cuttingqty') {
              tempHeaders['cutQty'] = colIdx;
            }
          });
          if (
            tempHeaders['sku'] !== undefined &&
            tempHeaders['material'] !== undefined &&
            tempHeaders['cutQty'] !== undefined
          ) {
            headers = tempHeaders;
            inProdShipSection = false;
            inMatSection = false;
            inBOMSection = false;
            inCutQtySection = true;
            isHeaderRow = true;
          }
        }

        // C. Detect BOM Section
        if (
          !isHeaderRow &&
          (rowStr.includes('sku') || rowStr.includes('style')) &&
          rowStr.includes('material') &&
          (rowStr.includes('uprice') ||
            rowStr.includes('consumption') ||
            rowStr.includes('scrap') ||
            rowStr.includes('price'))
        ) {
          const tempHeaders: Record<string, number> = {};
          row.forEach((cell, colIdx) => {
            const c = String(cell).toLowerCase().replace(/[^a-z0-9]/g, '');
            if (c === 'sku' || c === 'skuno') tempHeaders['sku'] = colIdx;
            else if (c === 'material' || c === 'fabric' || c === 'materialdescription') {
              tempHeaders['material'] = colIdx;
            } else if (c === 'uprice' || c === 'unitprice' || c === 'price') {
              tempHeaders['unitPrice'] = colIdx;
            } else if (c === 'conscrap' || c === 'consumption' || c === 'con') {
              tempHeaders['conScrap'] = colIdx;
            }
          });
          if (
            tempHeaders['sku'] !== undefined &&
            tempHeaders['material'] !== undefined &&
            (tempHeaders['conScrap'] !== undefined || tempHeaders['unitPrice'] !== undefined)
          ) {
            headers = tempHeaders;
            inProdShipSection = false;
            inMatSection = false;
            inBOMSection = true;
            inCutQtySection = false;
            isHeaderRow = true;
          }
        }

        // D. Detect Material Section
        if (
          !isHeaderRow &&
          (rowStr.includes('article') || rowStr.includes('material') || rowStr.includes('item')) &&
          (rowStr.includes('reqmnt') ||
            rowStr.includes('total req') ||
            rowStr.includes('withdrawn') ||
            rowStr.includes('shortage') ||
            rowStr.includes('qty') ||
            rowStr.includes('cutting provide') ||
            rowStr.includes('planing') ||
            rowStr.includes('re order') ||
            rowStr.includes('type'))
        ) {
          const tempHeaders: Record<string, number> = {};
          row.forEach((cell, colIdx) => {
            const c = String(cell).toLowerCase().replace(/[^a-z0-9]/g, '');
            if (
              c.includes('article') ||
              c.includes('material') ||
              c === 'item' ||
              c === 'component'
            ) {
              tempHeaders['article'] = colIdx;
            } else if (c.includes('type')) tempHeaders['type'] = colIdx;
            else if (c.includes('uprice') || c.includes('unitprice') || c === 'price') {
              tempHeaders['unitPrice'] = colIdx;
            } else if (
              c.includes('excessstockvalue') ||
              c.includes('valuelkr') ||
              c.includes('valueusd') ||
              c.includes('value')
            ) {
              tempHeaders['excessStockValue'] = colIdx;
            } else if (c.includes('excessstock') || c === 'excess') {
              tempHeaders['excessStock'] = colIdx;
            } else if (
              c.includes('additionalreq') ||
              c.includes('totalreq') ||
              c.includes('addreq')
            ) {
              tempHeaders['totalReq'] = colIdx;
            } else if (
              c.includes('addcutting') ||
              c.includes('cutprovide') ||
              c.includes('cuttingprovide')
            ) {
              tempHeaders['cutProvide'] = colIdx;
            } else if (c === 'scrap' || c.includes('scrapqty')) {
              tempHeaders['scrap'] = colIdx;
            } else if (
              c.includes('addplan') ||
              c.includes('planprovide') ||
              c.includes('planingpr') ||
              c.includes('planningpr')
            ) {
              tempHeaders['planProvide'] = colIdx;
            } else if (
              c.includes('reorder') ||
              c.includes('planingre') ||
              c.includes('planningre')
            ) {
              tempHeaders['reorder'] = colIdx;
            } else if (
              c.includes('reqqty') ||
              c.includes('requirementq') ||
              c.includes('reqmnt')
            ) {
              tempHeaders['reqQty'] = colIdx;
            } else if (c.includes('shortage')) {
              tempHeaders['shortage'] = colIdx;
            } else if (c.includes('withdrawn') || c.includes('qtywithdrawn')) {
              tempHeaders['withdrawn'] = colIdx;
            }
          });

          if (tempHeaders['article'] !== undefined) {
            headers = tempHeaders;
            inProdShipSection = false;
            inMatSection = true;
            inBOMSection = false;
            inCutQtySection = false;
            isHeaderRow = true;
          }
        }

        if (isHeaderRow) continue;

        // E. Extract Data
        if (inProdShipSection) {
          if (String(row[0]).trim().toLowerCase().includes('total') || !row[headers['sku']]) {
            continue;
          }
          const skuStr = String(row[headers['sku']]).trim().replace(/\s+/g, ' ');
          if (
            skuStr &&
            skuStr !== '0' &&
            !skuStr.toLowerCase().includes('total') &&
            skuStr !== 'undefined'
          ) {
            if (!fileSkuMaster[skuStr]) fileSkuMaster[skuStr] = createEmptySku(skuStr);
            const target = fileSkuMaster[skuStr];

            if (headers['orderQty'] !== undefined) target.orderQty += safeNum(row[headers['orderQty']]);
            if (headers['add5Qty'] !== undefined) target.add5Qty += safeNum(row[headers['add5Qty']]);
            if (headers['preEstQty'] !== undefined) target.preEstQty += safeNum(row[headers['preEstQty']]);
            if (headers['actualCut'] !== undefined) target.actualCut += safeNum(row[headers['actualCut']]);
            if (headers['bundleQty'] !== undefined) target.bundleQty += safeNum(row[headers['bundleQty']]);

            const s1 = headers['ship1'] !== undefined ? safeNum(row[headers['ship1']]) : 0;
            const s2 = headers['ship2'] !== undefined ? safeNum(row[headers['ship2']]) : 0;
            target.actualShip1st += s1;
            target.actualShip2nd += s2;
            target.actualShip += s1 + s2;
          }
        }

        if (inCutQtySection) {
          if (
            String(row[0]).trim().toLowerCase().includes('total') ||
            !row[headers['sku']] ||
            !row[headers['material']]
          ) {
            continue;
          }
          const skuStr = String(row[headers['sku']]).trim().replace(/\s+/g, ' ');
          const matStr = String(row[headers['material']]).trim().replace(/\s+/g, ' ');
          const cutVal = safeNum(row[headers['cutQty']]);
          if (skuStr && matStr && skuStr !== '0' && !skuStr.toLowerCase().includes('total')) {
            if (!fileSkuMaster[skuStr]) fileSkuMaster[skuStr] = createEmptySku(skuStr);
            fileSkuMaster[skuStr].actualCut = Math.max(
              fileSkuMaster[skuStr].actualCut || 0,
              cutVal,
            );
            const existing = fileSkuMaster[skuStr].bom.find((b) => b.material === matStr);
            if (existing) existing.cutQty = cutVal;
            else {
              fileSkuMaster[skuStr].bom.push({
                material: matStr,
                consumption: 0,
                cutQty: cutVal,
                unitPrice: 0,
                reqQty: 0,
                withdrawn: 0,
                saving: 0,
                orderValue: 0,
              });
            }
          }
        }

        if (inBOMSection) {
          if (
            String(row[0]).trim().toLowerCase().includes('total') ||
            !row[headers['sku']] ||
            !row[headers['material']]
          ) {
            continue;
          }
          const skuStr = String(row[headers['sku']]).trim().replace(/\s+/g, ' ');
          const matStr = String(row[headers['material']]).trim().replace(/\s+/g, ' ');
          const consVal = headers['conScrap'] !== undefined ? safeNum(row[headers['conScrap']]) : 0;
          const unitP = headers['unitPrice'] !== undefined ? safeNum(row[headers['unitPrice']]) : 0;
          if (skuStr && matStr && skuStr !== '0' && !skuStr.toLowerCase().includes('total')) {
            rawBOMData.push({ sku: skuStr, material: matStr, consumption: consVal, unitPrice: unitP });
          }
        }

        if (inMatSection) {
          if (
            String(row[0]).trim().toLowerCase().includes('total') ||
            !row[headers['article']]
          ) {
            continue;
          }
          const articleStr = String(row[headers['article']]).trim().replace(/\s+/g, ' ');
          if (articleStr && articleStr !== '0' && !articleStr.toLowerCase().includes('total')) {
            if (!articleMaster[articleStr]) {
              articleMaster[articleStr] = createEmptyMaterial(articleStr);
            }
            const am = articleMaster[articleStr];
            if (headers['type'] !== undefined && row[headers['type']]) {
              am.type = String(row[headers['type']]).trim();
            }
            if (headers['unitPrice'] !== undefined) {
              const p = safeNum(row[headers['unitPrice']]);
              if (p > 0) am.unitPrice = p;
            }
            if (headers['excessStock'] !== undefined) {
              const currentStock = safeNum(row[headers['excessStock']]);
              if (currentStock > 0) am.excessStock = Math.max(am.excessStock, currentStock);
            }
            if (headers['totalReq'] !== undefined) am.totalReq += safeNum(row[headers['totalReq']]);
            if (headers['cutProvide'] !== undefined) am.cutProvide += safeNum(row[headers['cutProvide']]);
            if (headers['scrap'] !== undefined) am.scrap += safeNum(row[headers['scrap']]);
            if (headers['planProvide'] !== undefined) am.planProvide += safeNum(row[headers['planProvide']]);
            if (headers['reorder'] !== undefined) am.reorder += safeNum(row[headers['reorder']]);
            if (headers['reqQty'] !== undefined) am.reqQty += safeNum(row[headers['reqQty']]);
            if (headers['shortage'] !== undefined) am.shortage += safeNum(row[headers['shortage']]);
            if (headers['withdrawn'] !== undefined) am.withdrawn += safeNum(row[headers['withdrawn']]);
          }
        }
      }
    }

    // Merge File Data to Global SKU Master
    for (const sku of Object.keys(fileSkuMaster)) {
      if (!globalSkuMaster[sku]) {
        globalSkuMaster[sku] = fileSkuMaster[sku];
      } else {
        const g = globalSkuMaster[sku];
        const f = fileSkuMaster[sku];
        g.orderQty = Math.max(g.orderQty, f.orderQty);
        g.add5Qty = Math.max(g.add5Qty, f.add5Qty);
        g.preEstQty = Math.max(g.preEstQty, f.preEstQty);
        g.actualCut = Math.max(g.actualCut, f.actualCut);
        g.bundleQty = Math.max(g.bundleQty || 0, f.bundleQty || 0);
        g.actualShip1st = Math.max(g.actualShip1st || 0, f.actualShip1st || 0);
        g.actualShip2nd = Math.max(g.actualShip2nd || 0, f.actualShip2nd || 0);
        g.actualShip = Math.max(g.actualShip || 0, f.actualShip || 0);

        if (f.bom && f.bom.length > 0) {
          for (const fb of f.bom) {
            const gb = g.bom.find((b) => b.material === fb.material);
            if (gb) {
              gb.reqQty = (gb.reqQty || 0) + (fb.reqQty || 0);
              gb.withdrawn = (gb.withdrawn || 0) + (fb.withdrawn || 0);
              if (fb.cutQty) gb.cutQty = fb.cutQty;
              if (fb.consumption) gb.consumption = fb.consumption;
              if (fb.unitPrice > 0) gb.unitPrice = fb.unitPrice;
            } else {
              g.bom.push({ ...fb });
            }
          }
        }
      }
    }
  }

  // Apply raw BOM entries
  for (const b of rawBOMData) {
    if (globalSkuMaster[b.sku]) {
      const existing = globalSkuMaster[b.sku].bom.find((item) => item.material === b.material);
      if (existing) {
        existing.consumption = b.consumption;
        if (b.unitPrice > 0) existing.unitPrice = b.unitPrice;
      } else {
        globalSkuMaster[b.sku].bom.push({
          material: b.material,
          consumption: b.consumption,
          cutQty: 0,
          unitPrice: b.unitPrice,
          reqQty: 0,
          withdrawn: 0,
          saving: 0,
          orderValue: 0,
        });
      }
    }

    if (b.material && b.unitPrice > 0) {
      const matKey = String(b.material).trim();
      if (!articleMaster[matKey]) {
        articleMaster[matKey] = createEmptyMaterial(matKey, b.unitPrice);
      } else if (!articleMaster[matKey].unitPrice || articleMaster[matKey].unitPrice === 0) {
        articleMaster[matKey].unitPrice = b.unitPrice;
      }
    }
  }

  // Auto map Type across all materials
  for (const matKey of Object.keys(articleMaster)) {
    const norm = normalizeMatKey(matKey);
    if (materialTypeMap[norm]) {
      articleMaster[matKey].type = materialTypeMap[norm];
    }
  }

  const productionData = Object.values(globalSkuMaster);
  const materialData = Object.values(articleMaster);

  const kpis = calculateSavingsAndKpis(
    productionData,
    materialData,
    globalSkuMaster,
    materialTypeMap,
  );

  // Sort BOM items inside each SKU by unitPrice descending
  for (const sku of productionData) {
    sku.bom.sort((a, b) => (b.unitPrice || 0) - (a.unitPrice || 0));
  }

  // Sort materials by unitPrice descending, then alphabetically
  materialData.sort((a, b) => {
    const priceDiff = (b.unitPrice || 0) - (a.unitPrice || 0);
    if (priceDiff !== 0) return priceDiff;
    return a.article.localeCompare(b.article);
  });

  return {
    productionData,
    materialData,
    kpis,
    fileNames: files.map((f) => f.name),
    processedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

export function aggregateData(
  data: SkuRecord[],
  level: 'family' | 'style',
): Record<string, AggregatedBase> {
  const result: Record<string, AggregatedBase> = {};
  for (const item of data) {
    const key = item[level];
    if (!result[key]) {
      result[key] = {
        orderQty: 0,
        add5Qty: 0,
        preEstQty: 0,
        actualCut: 0,
        bundleQty: 0,
        actualShip1st: 0,
        actualShip2nd: 0,
        actualShip: 0,
        totalOrderValue: 0,
        savings: 0,
      };
    }
    const bucket = result[key];
    bucket.orderQty += item.orderQty;
    bucket.add5Qty += item.add5Qty;
    bucket.preEstQty += item.preEstQty;
    bucket.actualCut += item.actualCut;
    bucket.bundleQty += item.bundleQty || 0;
    bucket.actualShip1st += item.actualShip1st || 0;
    bucket.actualShip2nd += item.actualShip2nd || 0;
    bucket.actualShip += item.actualShip || 0;
    bucket.totalOrderValue += item.totalOrderValue || 0;
    bucket.savings += item.savings || 0;
  }
  return result;
}

export function calculateMetrics(item: AggregatedBase): ComputedProductionMetrics {
  const varianceQty = item.actualShip - item.orderQty;
  const variancePct = item.orderQty > 0 ? (varianceQty / item.orderQty) * 100 : 0;
  const actualAddCut = item.actualCut - item.orderQty;
  const varianceBundleShip = item.actualShip - (item.bundleQty || 0);
  const totalOrderVal = item.totalOrderValue || 0;
  const profitPct = totalOrderVal > 0 ? ((item.savings || 0) / totalOrderVal) * 100 : 0;
  return {
    ...item,
    varianceQty,
    variancePct,
    actualAddCut,
    varianceBundleShip,
    profitPct,
  };
}

export function createSampleDataset(): ParsedDashboardData {
  const sampleSkus: SkuRecord[] = [
    {
      family: 'Family 2592',
      style: 'Style 2592A',
      sku: '2592A BLK M',
      orderQty: 2400,
      add5Qty: 120,
      preEstQty: 2520,
      actualCut: 2495,
      bundleQty: 2480,
      actualShip1st: 2430,
      actualShip2nd: 35,
      actualShip: 2465,
      totalOrderValue: 0,
      savings: 0,
      bom: [
        {
          material: 'FAB-2592-MICRO-BLK',
          consumption: 0.42,
          cutQty: 2495,
          unitPrice: 4.85,
          reqQty: 1050,
          withdrawn: 1018,
          saving: 0,
          orderValue: 0,
        },
        {
          material: 'ELAS-12MM-SOFT-BLK',
          consumption: 1.15,
          cutQty: 2495,
          unitPrice: 0.34,
          reqQty: 2890,
          withdrawn: 2810,
          saving: 0,
          orderValue: 0,
        },
        {
          material: 'LBL-CARE-EU-2592',
          consumption: 1.02,
          cutQty: 2495,
          unitPrice: 0.08,
          reqQty: 2560,
          withdrawn: 2520,
          saving: 0,
          orderValue: 0,
        },
      ],
    },
    {
      family: 'Family 2592',
      style: 'Style 2592A',
      sku: '2592A BLK L',
      orderQty: 1800,
      add5Qty: 90,
      preEstQty: 1890,
      actualCut: 1860,
      bundleQty: 1850,
      actualShip1st: 1825,
      actualShip2nd: 20,
      actualShip: 1845,
      totalOrderValue: 0,
      savings: 0,
      bom: [
        {
          material: 'FAB-2592-MICRO-BLK',
          consumption: 0.46,
          cutQty: 1860,
          unitPrice: 4.85,
          reqQty: 860,
          withdrawn: 842,
          saving: 0,
          orderValue: 0,
        },
        {
          material: 'ELAS-12MM-SOFT-BLK',
          consumption: 1.22,
          cutQty: 1860,
          unitPrice: 0.34,
          reqQty: 2290,
          withdrawn: 2255,
          saving: 0,
          orderValue: 0,
        },
      ],
    },
    {
      family: 'Family 2592',
      style: 'Style 2592B',
      sku: '2592B NVY S',
      orderQty: 1500,
      add5Qty: 75,
      preEstQty: 1575,
      actualCut: 1510,
      bundleQty: 1495,
      actualShip1st: 1460,
      actualShip2nd: 15,
      actualShip: 1475,
      totalOrderValue: 0,
      savings: 0,
      bom: [
        {
          material: 'FAB-2592-LACE-NVY',
          consumption: 0.38,
          cutQty: 1510,
          unitPrice: 6.4,
          reqQty: 580,
          withdrawn: 598,
          saving: 0,
          orderValue: 0,
        },
        {
          material: 'TRM-BOW-SATIN-NVY',
          consumption: 1.0,
          cutQty: 1510,
          unitPrice: 0.14,
          reqQty: 1510,
          withdrawn: 1505,
          saving: 0,
          orderValue: 0,
        },
      ],
    },
    {
      family: 'General Family',
      style: 'Style 3104C',
      sku: '3104C WHT M',
      orderQty: 3200,
      add5Qty: 160,
      preEstQty: 3360,
      actualCut: 3340,
      bundleQty: 3315,
      actualShip1st: 3260,
      actualShip2nd: 30,
      actualShip: 3290,
      totalOrderValue: 0,
      savings: 0,
      bom: [
        {
          material: 'FAB-3104-COTTON-WHT',
          consumption: 0.55,
          cutQty: 3340,
          unitPrice: 3.25,
          reqQty: 1840,
          withdrawn: 1790,
          saving: 0,
          orderValue: 0,
        },
        {
          material: 'THD-CORE-120-WHT',
          consumption: 18.0,
          cutQty: 3340,
          unitPrice: 0.015,
          reqQty: 60120,
          withdrawn: 59400,
          saving: 0,
          orderValue: 0,
        },
      ],
    },
  ];

  const sampleMaterials: MaterialRecord[] = [
    {
      article: 'FAB-2592-LACE-NVY',
      type: 'Unique',
      unitPrice: 6.4,
      excessStock: 42.5,
      excessStockValue: 0,
      totalReq: 25,
      cutProvide: 14,
      scrap: 8,
      planProvide: 6,
      reorder: 0,
      reqQty: 580,
      shortage: 0,
      withdrawn: 598,
    },
    {
      article: 'FAB-2592-MICRO-BLK',
      type: 'Unique',
      unitPrice: 4.85,
      excessStock: 68.0,
      excessStockValue: 0,
      totalReq: 95,
      cutProvide: 45,
      scrap: 22,
      planProvide: 18,
      reorder: 0,
      reqQty: 1910,
      shortage: 0,
      withdrawn: 1860,
    },
    {
      article: 'FAB-3104-COTTON-WHT',
      type: 'Common',
      unitPrice: 3.25,
      excessStock: 110.0,
      excessStockValue: 0,
      totalReq: 80,
      cutProvide: 36,
      scrap: 18,
      planProvide: 12,
      reorder: 0,
      reqQty: 1840,
      shortage: 0,
      withdrawn: 1790,
    },
    {
      article: 'ELAS-12MM-SOFT-BLK',
      type: 'Common',
      unitPrice: 0.34,
      excessStock: 140.0,
      excessStockValue: 0,
      totalReq: 210,
      cutProvide: 95,
      scrap: 32,
      planProvide: 28,
      reorder: 0,
      reqQty: 5180,
      shortage: 0,
      withdrawn: 5065,
    },
    {
      article: 'TRM-BOW-SATIN-NVY',
      type: 'Unique',
      unitPrice: 0.14,
      excessStock: 185.0,
      excessStockValue: 0,
      totalReq: 50,
      cutProvide: 15,
      scrap: 5,
      planProvide: 10,
      reorder: 0,
      reqQty: 1510,
      shortage: 0,
      withdrawn: 1505,
    },
    {
      article: 'LBL-CARE-EU-2592',
      type: 'Unique',
      unitPrice: 0.08,
      excessStock: 240.0,
      excessStockValue: 0,
      totalReq: 60,
      cutProvide: 20,
      scrap: 8,
      planProvide: 12,
      reorder: 0,
      reqQty: 2560,
      shortage: 0,
      withdrawn: 2520,
    },
    {
      article: 'THD-CORE-120-WHT',
      type: 'Common',
      unitPrice: 0.015,
      excessStock: 950.0,
      excessStockValue: 0,
      totalReq: 1200,
      cutProvide: 450,
      scrap: 180,
      planProvide: 120,
      reorder: 0,
      reqQty: 60120,
      shortage: 0,
      withdrawn: 59400,
    },
  ];

  const skuMaster: Record<string, SkuRecord> = {};
  for (const s of sampleSkus) skuMaster[s.sku] = s;

  const kpis = calculateSavingsAndKpis(sampleSkus, sampleMaterials, skuMaster, {});

  for (const sku of sampleSkus) {
    sku.bom.sort((a, b) => (b.unitPrice || 0) - (a.unitPrice || 0));
  }
  sampleMaterials.sort((a, b) => {
    const priceDiff = (b.unitPrice || 0) - (a.unitPrice || 0);
    return priceDiff !== 0 ? priceDiff : a.article.localeCompare(b.article);
  });

  return {
    productionData: sampleSkus,
    materialData: sampleMaterials,
    kpis,
    fileNames: ['Sample_Production_BOM_Dataset.xlsx'],
    processedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}
