import React, { useState, useMemo } from 'react';
import { Download, Search, FileText, ShieldAlert, Ban } from 'lucide-react';
import type { IssuedReceiptRecord } from '../../types/models';

interface LedgerAndCancellationsPageProps {
  receipts: IssuedReceiptRecord[];
  isSuperAdmin: boolean;
  onRequestCancellation: (receiptNumber: string, reason: string) => Promise<void>;
  onApproveCancellation: (receiptNumber: string) => Promise<IssuedReceiptRecord>;
  onOpenReceipt: (receipt: IssuedReceiptRecord) => void;
}

export const LedgerAndCancellationsPage: React.FC<LedgerAndCancellationsPageProps> = ({
  receipts,
  isSuperAdmin,
  onRequestCancellation,
  onApproveCancellation,
  onOpenReceipt,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [requestingReceiptNo, setRequestingReceiptNo] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.receiptNumber.toLowerCase().includes(q) ||
        r.residentName.toLowerCase().includes(q) ||
        r.houseOrFlatNo.toLowerCase().includes(q) ||
        r.items.some(
          (i) =>
            i.childName.toLowerCase().includes(q) || i.activityName.toLowerCase().includes(q)
        )
      );
    });
  }, [receipts, statusFilter, searchQuery]);

  const totalValidCollection = useMemo(
    () =>
      filteredReceipts
        .filter((r) => r.status !== 'cancelled')
        .reduce((sum, r) => sum + r.totalAmount, 0),
    [filteredReceipts]
  );

  const cancellationQueue = useMemo(
    () => receipts.filter((r) => r.status === 'cancellation_requested'),
    [receipts]
  );

  const handleExportCsv = () => {
    const headers = [
      'Receipt No',
      'Date',
      'Flat No',
      'Resident Name',
      'Membership No',
      'Mode',
      'Amount',
      'Status',
      'Cancellation Receipt No',
    ];
    const rows = filteredReceipts.map((r) => [
      r.receiptNumber,
      new Date(r.issuedAt).toLocaleDateString('en-IN'),
      r.houseOrFlatNo,
      `"${r.residentName}"`,
      r.membershipNumber || 'Non-Member',
      r.paymentMode,
      r.totalAmount,
      r.status,
      r.cancellationReceiptNumber || '',
    ]);
    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RWA_Fee_Ledger_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Master Fee Ledger & Cancellation Audit
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Net Valid Collection (Filtered):{' '}
            <strong className="text-slate-900">
              ₹{totalValidCollection.toLocaleString('en-IN')}
            </strong>
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Export CSV / Excel
        </button>
      </div>

      {/* Super Admin Only: Cancellation Approval Panel */}
      {isSuperAdmin && cancellationQueue.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <ShieldAlert className="w-5 h-5 text-amber-700" />
            <span>
              Super Admin Approval Required: Receipt Cancellation Requests (
              {cancellationQueue.length})
            </span>
          </div>
          {cancellationQueue.map((req) => (
            <div
              key={req.receiptNumber}
              className="bg-white border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div>
                <p className="font-bold text-slate-900">
                  {req.receiptNumber} — ₹{req.totalAmount.toLocaleString('en-IN')} ({req.residentName}
                  , Flat {req.houseOrFlatNo})
                </p>
                <p className="text-slate-600 mt-0.5">
                  Requested by <strong>{req.cancellationRequestedBy}</strong> • Reason:{' '}
                  <em>"{req.cancellationReason}"</em>
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const updated = await onApproveCancellation(req.receiptNumber);
                  onOpenReceipt(updated);
                }}
                className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded-lg shrink-0 cursor-pointer"
              >
                Approve & Issue Special Cancellation Receipt
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Receipt No. (RWA/2026-27/...), Flat, Child, or Activity..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 font-medium"
        >
          <option value="all">All Receipt Statuses</option>
          <option value="issued">Issued (Active)</option>
          <option value="cancellation_requested">Cancellation Pending</option>
          <option value="cancelled">Cancelled (Audit Trail)</option>
        </select>
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Receipt No.</th>
              <th className="px-4 py-3 font-semibold">Flat & Resident</th>
              <th className="px-4 py-3 font-semibold">Details</th>
              <th className="px-4 py-3 font-semibold">Mode</th>
              <th className="px-4 py-3 font-semibold text-right">Amount</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredReceipts.map((r) => (
              <tr key={r.receiptNumber} className="hover:bg-slate-50/70">
                <td className="px-4 py-3 font-mono font-bold text-slate-900">
                  {r.receiptNumber}
                  {r.cancellationReceiptNumber && (
                    <span className="block text-[10px] text-rose-700 font-normal">
                      Credit: {r.cancellationReceiptNumber}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-slate-900">{r.residentName}</span>
                  <span className="block text-slate-500">Flat {r.houseOrFlatNo}</span>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {r.items.map((i) => `${i.childName} (${i.activityName} ${i.monthLabel})`).join(', ')}
                </td>
                <td className="px-4 py-3 text-slate-600">{r.paymentMode}</td>
                <td className="px-4 py-3 text-right font-bold text-slate-900">
                  ₹{r.totalAmount.toLocaleString('en-IN')}
                </td>
                <td className="px-4 py-3">
                  {r.status === 'issued' && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                      Issued
                    </span>
                  )}
                  {r.status === 'cancellation_requested' && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                      Cancel Pending
                    </span>
                  )}
                  {r.status === 'cancelled' && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold">
                      Cancelled
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    type="button"
                    onClick={() => onOpenReceipt(r)}
                    className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-semibold cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    View
                  </button>
                  {r.status === 'issued' && (
                    <button
                      type="button"
                      onClick={() => setRequestingReceiptNo(r.receiptNumber)}
                      className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      Request Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal / Inline Prompt for Admin Cancellation Request */}
      {requestingReceiptNo && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 border border-slate-200 shadow-lg">
            <h3 className="text-sm font-bold text-slate-900">
              Request Cancellation for {requestingReceiptNo}
            </h3>
            <p className="text-xs text-slate-600">
              To prevent misuse, receipts cannot be deleted directly. Your request will be sent to
              a <strong>Super Admin</strong> to issue a Special Cancellation Receipt.
            </p>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter mandatory reason (e.g., Entered against wrong child/month)..."
              className="w-full text-xs border border-slate-300 rounded-xl p-3"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRequestingReceiptNo(null);
                  setCancelReason('');
                }}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                disabled={!cancelReason.trim()}
                onClick={async () => {
                  await onRequestCancellation(requestingReceiptNo, cancelReason.trim());
                  setRequestingReceiptNo(null);
                  setCancelReason('');
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
              >
                Submit to Super Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};