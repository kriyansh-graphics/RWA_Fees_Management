import React, { useState, useMemo } from 'react';
import { Search, CheckCircle2, AlertCircle } from 'lucide-react';
import type { ActivityItem, IssuedReceiptRecord } from '../../types/models';
import { formatMonthKey, getRollingThreeMonths } from '../../utils/monthWindow';

interface CoachRosterPageProps {
  coachName: string;
  assignedActivities: ActivityItem[];
  receipts: IssuedReceiptRecord[];
}

export const CoachRosterPage: React.FC<CoachRosterPageProps> = ({
  coachName,
  assignedActivities,
  receipts,
}) => {
  const [selectedActivityId, setSelectedActivityId] = useState(
    assignedActivities[0]?.id || ''
  );
  const monthOptions = useMemo(() => getRollingThreeMonths(new Date()), []);
  const [selectedMonthKey, setSelectedMonthKey] = useState(
    monthOptions[monthOptions.length - 1]?.key ||
      formatMonthKey(new Date().getFullYear(), new Date().getMonth())
  );
  const [search, setSearch] = useState('');

  const previousMonthKey = useMemo(() => {
    const idx = monthOptions.findIndex((m) => m.key === selectedMonthKey);
    return idx > 0 ? monthOptions[idx - 1].key : null;
  }, [monthOptions, selectedMonthKey]);

  const { paidThisMonth, pendingFromLastMonth } = useMemo(() => {
    const activeReceipts = receipts.filter((r) => r.status !== 'cancelled');

    const currentPaidMap = new Map<
      string,
      {
        childName: string;
        residentName: string;
        houseOrFlatNo: string;
        useHalfMonth: boolean;
      }
    >();

    const prevMonthParticipants = new Map<
      string,
      {
        childName: string;
        residentName: string;
        houseOrFlatNo: string;
      }
    >();

    for (const rcpt of activeReceipts) {
      for (const item of rcpt.items) {
        if (item.activityId !== selectedActivityId) continue;

        if (item.monthKey === selectedMonthKey) {
          currentPaidMap.set(`${item.childId}::${item.activityId}`, {
            childName: item.childName,
            residentName: rcpt.residentName,
            houseOrFlatNo: rcpt.houseOrFlatNo,
            useHalfMonth: item.useHalfMonth,
          });
        } else if (previousMonthKey && item.monthKey === previousMonthKey) {
          prevMonthParticipants.set(`${item.childId}::${item.activityId}`, {
            childName: item.childName,
            residentName: rcpt.residentName,
            houseOrFlatNo: rcpt.houseOrFlatNo,
          });
        }
      }
    }

    const q = search.trim().toLowerCase();
    const matchesSearch = (name: string, flat: string) =>
      !q || name.toLowerCase().includes(q) || flat.toLowerCase().includes(q);

    const paidList = Array.from(currentPaidMap.values()).filter((p) =>
      matchesSearch(p.childName, p.houseOrFlatNo)
    );

    const pendingList = Array.from(prevMonthParticipants.entries())
      .filter(([key]) => !currentPaidMap.has(key))
      .map(([, val]) => val)
      .filter((p) => matchesSearch(p.childName, p.houseOrFlatNo));

    return { paidThisMonth: paidList, pendingFromLastMonth: pendingList };
  }, [receipts, selectedActivityId, selectedMonthKey, previousMonthKey, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Coach Fee Roster</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Coach: <strong>{coachName}</strong> • Read-only fee verification for assigned batches
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={selectedActivityId}
            onChange={(e) => setSelectedActivityId(e.target.value)}
            className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold"
          >
            {assignedActivities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <select
            value={selectedMonthKey}
            onChange={(e) => setSelectedMonthKey(e.target.value)}
            className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold"
          >
            {monthOptions.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search child name or flat no..."
          className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
        />
      </div>

      {/* Two Lists: Paid This Month vs Paid Last Month (Pending This Month) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Paid for Selected Month ({paidThisMonth.length})
              </h2>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {paidThisMonth.map((p, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900">{p.childName}</span>
                  <span className="text-slate-500">
                    {' '}
                    • Flat {p.houseOrFlatNo} ({p.residentName})
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                  {p.useHalfMonth ? 'Half Month Paid' : 'Paid'}
                </span>
              </div>
            ))}
            {paidThisMonth.length === 0 && (
              <p className="py-6 text-xs text-slate-400 text-center">
                No verified fee receipts recorded for this month yet.
              </p>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Paid Previous Month — Pending This Month ({pendingFromLastMonth.length})
              </h2>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {pendingFromLastMonth.map((p, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900">{p.childName}</span>
                  <span className="text-slate-500">
                    {' '}
                    • Flat {p.houseOrFlatNo} ({p.residentName})
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                  Pending
                </span>
              </div>
            ))}
            {pendingFromLastMonth.length === 0 && (
              <p className="py-6 text-xs text-slate-400 text-center">
                No pending reminders from the previous month.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};