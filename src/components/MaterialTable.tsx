import { useMemo, useState } from 'react';
import { Database, Search } from 'lucide-react';
import type { MaterialRecord } from '../types/dashboard';
import { isEffectivelyZero } from '../utils/formatters';

interface MaterialTableProps {
  data: MaterialRecord[];
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

export function MaterialTable({ data, onLoadDemo }: MaterialTableProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMaterials = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return data;
    return data.filter(
      (mat) =>
        mat.article.toLowerCase().includes(query) ||
        (mat.type && mat.type.toLowerCase().includes(query)),
    );
  }, [data, searchQuery]);

  const thClass =
    'px-3 py-2.5 bg-[#f8fafc] text-[#64748b] font-bold text-center sticky top-0 z-10 border-b-2 border-[#e2e8f0] uppercase text-[11px] tracking-[0.5px] whitespace-nowrap';

  return (
    <div>
      {/* Search Input */}
      <div className="relative w-[300px] mb-3">
        <Search className="w-3.5 h-3.5 text-[#64748b] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          id="articleSearch"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search Article / Material..."
          className="w-full py-2 pr-3 pl-9 border-[1.5px] border-[#e2e8f0] bg-white rounded-[8px] text-[12px] outline-none transition-all focus:border-[#4f46e5] focus:shadow-[0_0_0_3px_rgba(79,70,229,0.15)]"
        />
      </div>

      {/* Table Wrapper */}
      <div className="overflow-x-auto bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] rounded-[10px] border border-[#e2e8f0] mb-[15px] max-h-[70vh] data-grid-scroll">
        <table className="w-full border-collapse min-w-full">
          <thead>
            <tr>
              <th className={`${thClass} !text-left`}>Article / Material</th>
              <th className={thClass}>Type</th>
              <th className={`${thClass} !bg-[#f3e8ff] !text-[#6b21a8]`}>U Price (€)</th>
              <th className={thClass}>Additional Reqmnt</th>
              <th className={thClass}>Add Cutting Provide</th>
              <th className={thClass}>Scrap</th>
              <th className={thClass}>Add Planing Provide</th>
              <th className={thClass}>Planning Re order</th>
              <th className={thClass}>Requirement Qty</th>
              <th className={thClass}>Shortage</th>
              <th className={thClass}>Qty Withdrawn</th>
              <th className={`${thClass} !bg-[#fef3c7] !text-[#92400e]`}>
                Variance (Req - Withdraw)
              </th>
              <th className={`${thClass} !bg-[#fef3c7] !text-[#92400e]`}>Variance %</th>
              <th className={`${thClass} !bg-[#e0f2fe] !text-[#075985]`}>Excess Stock</th>
              <th className={`${thClass} !bg-[#e0f2fe] !text-[#075985]`}>Excess Stock Value (€)</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={15} className="text-center text-[#64748b] py-[30px] px-3 text-[12px]">
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
            ) : filteredMaterials.length === 0 ? (
              <tr>
                <td colSpan={15} className="text-center text-[#64748b] py-5 px-3 text-[12px]">
                  No data found.
                </td>
              </tr>
            ) : (
              filteredMaterials.map((mat) => {
                const variance = mat.reqQty - mat.withdrawn;
                const varPct = mat.reqQty > 0 ? (variance / mat.reqQty) * 100 : 0;
                const isZeroVar = isEffectivelyZero(variance);
                const varBadgeClass = isZeroVar
                  ? 'text-[#94a3b8] font-medium'
                  : variance >= 0
                    ? 'text-[#047857] bg-[#d1fae5]'
                    : 'text-[#b91c1c] bg-[#fee2e2]';

                return (
                  <tr key={mat.article} className="hover:bg-[#f1f5f9]">
                    <td className="px-3 py-2.5 text-left border-b border-[#e2e8f0] text-[12px] whitespace-nowrap font-semibold text-[#0f172a]">
                      {mat.article}
                    </td>
                    <td className="px-3 py-2.5 text-center border-b border-[#e2e8f0] text-[12px] whitespace-nowrap">
                      {mat.type || <span className="text-[#94a3b8] font-medium">-</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right border-b border-[#e2e8f0] text-[12px] whitespace-nowrap tabular-nums bg-[#faf5ff] font-bold text-[#6b21a8]">
                      {mat.unitPrice > 0 ? (
                        fmtCurrency(mat.unitPrice)
                      ) : (
                        <span className="text-[#94a3b8] font-medium">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right border-b border-[#e2e8f0] text-[12px] whitespace-nowrap tabular-nums">
                      {fmtValue(mat.totalReq)}
                    </td>
                    <td className="px-3 py-2.5 text-right border-b border-[#e2e8f0] text-[12px] whitespace-nowrap tabular-nums">
                      {fmtValue(mat.cutProvide)}
                    </td>
                    <td className="px-3 py-2.5 text-right border-b border-[#e2e8f0] text-[12px] whitespace-nowrap tabular-nums">
                      {fmtValue(mat.scrap)}
                    </td>
                    <td className="px-3 py-2.5 text-right border-b border-[#e2e8f0] text-[12px] whitespace-nowrap tabular-nums">
                      {fmtValue(mat.planProvide)}
                    </td>
                    <td className="px-3 py-2.5 text-right border-b border-[#e2e8f0] text-[12px] whitespace-nowrap tabular-nums">
                      {fmtValue(mat.reorder)}
                    </td>
                    <td className="px-3 py-2.5 text-right border-b border-[#e2e8f0] text-[12px] whitespace-nowrap tabular-nums">
                      {fmtValue(mat.reqQty)}
                    </td>
                    <td className="px-3 py-2.5 text-right border-b border-[#e2e8f0] text-[12px] whitespace-nowrap tabular-nums">
                      {fmtValue(mat.shortage)}
                    </td>
                    <td className="px-3 py-2.5 text-right border-b border-[#e2e8f0] text-[12px] whitespace-nowrap tabular-nums font-bold">
                      {fmtValue(mat.withdrawn)}
                    </td>
                    <td className="px-3 py-2.5 text-right border-b border-[#e2e8f0] text-[12px] whitespace-nowrap tabular-nums bg-[#fefce8]">
                      <span
                        className={`px-2 py-[3px] rounded-[12px] font-bold text-[11px] inline-block ${varBadgeClass}`}
                      >
                        {variance > 0 ? '+' : ''}
                        {fmtValue(variance)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right border-b border-[#e2e8f0] text-[12px] whitespace-nowrap tabular-nums bg-[#fefce8]">
                      <span
                        className={`px-2 py-[3px] rounded-[12px] font-bold text-[11px] inline-block ${varBadgeClass}`}
                      >
                        {isZeroVar ? (
                          <span className="text-[#94a3b8] font-medium">-</span>
                        ) : (
                          `${variance > 0 ? '+' : ''}${varPct.toFixed(2)}%`
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right border-b border-[#e2e8f0] text-[12px] whitespace-nowrap tabular-nums bg-[#f0f9ff] font-bold text-[#0369a1]">
                      {fmtValue(mat.excessStock)}
                    </td>
                    <td className="px-3 py-2.5 text-right border-b border-[#e2e8f0] text-[12px] whitespace-nowrap tabular-nums bg-[#f0f9ff] font-bold text-[#0369a1]">
                      {fmtCurrency(mat.excessStockValue)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
