import { Boxes, Coins, Euro, Percent, Truck, Warehouse } from 'lucide-react';
import type { DashboardKpis } from '../types/dashboard';
import { formatInteger } from '../utils/formatters';

interface KpiStripProps {
  kpis: DashboardKpis;
  hasData: boolean;
}

export function KpiStrip({ kpis, hasData }: KpiStripProps) {
  const formatEuro = (val: number) =>
    '€' +
    val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const savingText = hasData
    ? '+€' +
      kpis.totalSaving.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '€0.00';

  const cards = [
    {
      label: 'Total Order Qty',
      value: formatInteger(kpis.totalOrderQty),
      icon: Boxes,
      iconBg: 'bg-[#e0e7ff]',
      iconColor: 'text-[#4f46e5]',
      valueColor: 'text-[#0f172a]',
    },
    {
      label: 'Total Shipped Qty',
      value: formatInteger(kpis.totalShippedQty),
      icon: Truck,
      iconBg: 'bg-[#d1fae5]',
      iconColor: 'text-[#10b981]',
      valueColor: 'text-[#0f172a]',
    },
    {
      label: 'Total Order Value',
      value: formatEuro(kpis.totalOrderValue),
      icon: Coins,
      iconBg: 'bg-[#e0f2fe]',
      iconColor: 'text-[#0284c7]',
      valueColor: 'text-[#0f172a]',
    },
    {
      label: 'Total Saving',
      value: savingText,
      icon: Euro,
      iconBg: 'bg-[#fef3c7]',
      iconColor: 'text-[#d97706]',
      valueColor: hasData ? 'text-[#10b981]' : 'text-[#0f172a]',
    },
    {
      label: 'Additional Profit %',
      value: `${kpis.additionalProfitPct.toFixed(2)}%`,
      icon: Percent,
      iconBg: 'bg-[#dcfce7]',
      iconColor: 'text-[#16a34a]',
      valueColor: kpis.additionalProfitPct > 0 ? 'text-[#10b981]' : 'text-[#0f172a]',
    },
    {
      label: 'Excess Stock Value',
      value: formatEuro(kpis.excessStockValue),
      icon: Warehouse,
      iconBg: 'bg-[#cff4fc]',
      iconColor: 'text-[#0891b2]',
      valueColor: 'text-[#0f172a]',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-[15px] mb-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white p-4 rounded-[12px] border border-[#e2e8f0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex items-center gap-[15px]"
          >
            <div
              className={`w-[45px] h-[45px] rounded-[10px] flex items-center justify-center shrink-0 ${card.iconBg} ${card.iconColor}`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-[#64748b] uppercase">
                {card.label}
              </div>
              <div className={`text-[18px] font-extrabold mt-0.5 tabular-nums ${card.valueColor}`}>
                {card.value}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
