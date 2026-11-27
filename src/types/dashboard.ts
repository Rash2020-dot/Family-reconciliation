export type ViewLevel = 'family' | 'style' | 'sku';

export type ActiveTab = 'production' | 'material';

export interface BomItem {
  material: string;
  consumption: number;
  cutQty: number;
  unitPrice: number;
  reqQty: number;
  withdrawn: number;
  saving: number;
  orderValue: number;
}

export interface SkuRecord {
  family: string;
  style: string;
  sku: string;
  orderQty: number;
  add5Qty: number;
  preEstQty: number;
  actualCut: number;
  bundleQty: number;
  actualShip1st: number;
  actualShip2nd: number;
  actualShip: number;
  totalOrderValue: number;
  savings: number;
  bom: BomItem[];
}

export interface MaterialRecord {
  article: string;
  type: string;
  unitPrice: number;
  excessStock: number;
  excessStockValue: number;
  totalReq: number;
  cutProvide: number;
  scrap: number;
  planProvide: number;
  reorder: number;
  reqQty: number;
  shortage: number;
  withdrawn: number;
}

export interface RawBomEntry {
  sku: string;
  material: string;
  consumption: number;
  unitPrice: number;
}

export interface AggregatedBase {
  orderQty: number;
  add5Qty: number;
  preEstQty: number;
  actualCut: number;
  bundleQty: number;
  actualShip1st: number;
  actualShip2nd: number;
  actualShip: number;
  totalOrderValue: number;
  savings: number;
}

export interface ComputedProductionMetrics extends AggregatedBase {
  varianceQty: number;
  variancePct: number;
  actualAddCut: number;
  varianceBundleShip: number;
  profitPct: number;
}

export interface DashboardKpis {
  totalOrderQty: number;
  totalShippedQty: number;
  totalOrderValue: number;
  totalSaving: number;
  additionalProfitPct: number;
  excessStockValue: number;
}

export interface ParsedDashboardData {
  productionData: SkuRecord[];
  materialData: MaterialRecord[];
  kpis: DashboardKpis;
  fileNames: string[];
  processedAt: string;
}

export interface NotificationState {
  type: 'info' | 'success' | 'error';
  message: string;
}
