import React from 'react';
import { X, Printer, MailCheck, Ban } from 'lucide-react';
import type { IssuedReceiptRecord } from '../types/models';

interface ReceiptModalProps {
  receipt: IssuedReceiptRecord | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, onClose }) => {
  if (!receipt) return null;

  const isCancelled = receipt.status === 'cancelled';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <MailCheck className="w-4 h-4 text-emerald-400" />
            <span>
              {receipt.emailSent
                ? `Auto-emailed to ${receipt.residentEmail}`
                : 'Email dispatch queued'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Receipt Body */}
        <div className="p-6 space-y-5 relative">
          {isCancelled && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs flex items-start gap-2">
              <Ban className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <p className="font-bold">
                  RECEIPT CANCELLED — Special Cancellation Receipt:{' '}
                  {receipt.cancellationReceiptNumber}
                </p>
                <p className="mt-0.5">
                  Reason: {receipt.cancellationReason} (Approved by Super Admin:{' '}
                  {receipt.cancellationApprovedBy})
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Resident Welfare Association (RWA)
              </h2>
              <p className="text-xs text-slate-500">
                Official Sports & Activity Fee Receipt
              </p>
            </div>
            <div className="sm:text-right">
              <span className="inline-block font-mono text-xs font-bold bg-slate-100 text-slate-900 px-2.5 py-1 rounded-md border border-slate-300">
                {receipt.receiptNumber}
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                Date: {new Date(receipt.issuedAt).toLocaleDateString('en-IN')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-500">Resident / Parent:</span>
              <p className="font-semibold text-slate-900">{receipt.residentName}</p>
            </div>
            <div>
              <span className="text-slate-500">Flat / House No.:</span>
              <p className="font-semibold text-slate-900">{receipt.houseOrFlatNo}</p>
            </div>
            <div>
              <span className="text-slate-500">Membership No.:</span>
              <p className="font-semibold text-slate-900">
                {receipt.membershipNumber || 'Non-Member / N.A.'}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Payment Mode:</span>
              <p className="font-semibold text-slate-900">
                {receipt.paymentMode}
                {receipt.utrReference ? ` (UTR: ${receipt.utrReference})` : ''}
              </p>
            </div>
          </div>

          {/* Line Items */}
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 font-semibold">Participant / Child</th>
                <th className="py-2 font-semibold">Activity & Month</th>
                <th className="py-2 font-semibold">Rate Type</th>
                <th className="py-2 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receipt.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2 font-medium text-slate-900">{item.childName}</td>
                  <td className="py-2 text-slate-700">
                    {item.activityName} — {item.monthLabel}
                    {item.useHalfMonth && (
                      <span className="ml-1.5 text-[10px] font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                        Half Month
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-slate-600 capitalize">
                    {item.rateTier === 'member' ? 'Member' : 'Non-Member'}
                    {item.siblingDiscountAmount > 0 && (
                      <span className="block text-[10px] text-emerald-700">
                        Sibling Disc: -₹{item.siblingDiscountAmount}
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right font-semibold text-slate-900">
                    ₹{item.finalAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 font-bold text-sm text-slate-900">
                <td colSpan={3} className="py-3">
                  Total Received
                </td>
                <td className="py-3 text-right">
                  ₹{receipt.totalAmount.toLocaleString('en-IN')}
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span>Verified & Issued by: {receipt.issuedByAdminName}</span>
            <span>System-Generated RWA Audit Receipt</span>
          </div>
        </div>
      </div>
    </div>
  );
};