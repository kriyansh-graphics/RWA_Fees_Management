import React, { useState, useMemo } from 'react';
import {
  Lock,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  FileText,
  Award,
  Ban,
  AlertCircle,
} from 'lucide-react';
import type {
  ActivityItem,
  CartLineItem,
  IssuedReceiptRecord,
  PaymentSubmissionRecord,
  PricedCartLineItem,
  ResidentProfile,
} from '../../types/models';
import { getRollingThreeMonths } from '../../utils/monthWindow';
import { calculateCartPricing, resolveRateTier } from '../../utils/feeCalculator';

interface MemberPortalPageProps {
  resident: ResidentProfile;
  activities: ActivityItem[];
  submissions: PaymentSubmissionRecord[];
  receipts: IssuedReceiptRecord[];
  alreadyPaidKeys: Set<string>;
  upiInstructions?: string;
  currentCalendarYear?: number;
  onSubmitCombinedPayment: (payload: {
    items: PricedCartLineItem[];
    utrReference: string;
    totalAmount: number;
  }) => Promise<void>;
  onOpenReceipt: (receipt: IssuedReceiptRecord) => void;
}

export const MemberPortalPage: React.FC<MemberPortalPageProps> = ({
  resident,
  activities,
  submissions,
  receipts,
  alreadyPaidKeys,
  upiInstructions = 'Pay via UPI to RWA Sports Account (rwa-sports@upi) and enter UTR below.',
  currentCalendarYear = new Date().getFullYear(),
  onSubmitCombinedPayment,
  onOpenReceipt,
}) => {
  const [selectedChildId, setSelectedChildId] = useState(resident.children[0]?.id || '');
  const [selectedActivityId, setSelectedActivityId] = useState(activities[0]?.id || '');
  const monthOptions = useMemo(() => getRollingThreeMonths(new Date()), []);
  const [selectedMonthKey, setSelectedMonthKey] = useState(
    monthOptions[monthOptions.length - 1]?.key || ''
  );
  const [requestHalfMonth, setRequestHalfMonth] = useState(false);

  // Combined Multi-Child / Multi-Activity Cart
  const [cart, setCart] = useState<CartLineItem[]>([]);
  const [utrReference, setUtrReference] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const activitiesById = useMemo(
    () => Object.fromEntries(activities.map((a) => [a.id, a])),
    [activities]
  );

  const pricing = useMemo(
    () => calculateCartPricing(resident, activitiesById, cart, alreadyPaidKeys),
    [resident, activitiesById, cart, alreadyPaidKeys]
  );

  const selectedMonthObj = monthOptions.find((m) => m.key === selectedMonthKey);
  const activeRateTierPreview = resolveRateTier(
    resident,
    selectedMonthObj?.year || currentCalendarYear
  );

  const isYearlyExpired =
    resident.membershipType === 'yearly' && resident.membershipYear !== currentCalendarYear;

  const isNotApplicable = resident.membershipType === 'not_applicable';

  const handleAddItem = () => {
    setFormError(null);
    const child = resident.children.find((c) => c.id === selectedChildId);
    const activity = activitiesById[selectedActivityId];
    const month = selectedMonthObj;

    if (!child || !activity || !month) {
      setFormError('Please select a child, activity, and valid month.');
      return;
    }

    const dupKey = `${child.id}::${activity.id}::${month.key}`;
    if (alreadyPaidKeys.has(dupKey)) {
      setFormError(
        `Already paid/submitted for ${child.name} — ${activity.name} (${month.label}). Duplicate entry blocked.`
      );
      return;
    }

    const alreadyInCart = cart.some(
      (i) => i.childId === child.id && i.activityId === activity.id && i.monthKey === month.key
    );
    if (alreadyInCart) {
      setFormError('This child, activity, and month is already in your payment cart.');
      return;
    }

    setCart((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        childId: child.id,
        childName: child.name,
        activityId: activity.id,
        activityName: activity.name,
        monthKey: month.key,
        monthLabel: month.label,
        useHalfMonth: Boolean(requestHalfMonth && resident.halfMonthAllowed),
      },
    ]);
    setRequestHalfMonth(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (cart.length === 0) {
      setFormError('Add at least one child & activity line item before submitting.');
      return;
    }
    if (!utrReference.trim()) {
      setFormError('Please enter your UPI / Bank Transaction Reference (UTR) number.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitCombinedPayment({
        items: pricing.pricedItems,
        utrReference: utrReference.trim(),
        totalAmount: pricing.totalAmount,
      });
      setCart([]);
      setUtrReference('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to submit payment details.');
    } finally {
      setSubmitting(false);
    }
  };

  const mySubmissions = useMemo(
    () => submissions.filter((s) => s.residentId === resident.id),
    [submissions, resident.id]
  );

  const myReceipts = useMemo(
    () => receipts.filter((r) => r.residentId === resident.id),
    [receipts, resident.id]
  );

  return (
    <div className="space-y-6">
      {/* Household & Membership Status Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              {resident.fullName} — Flat {resident.houseOrFlatNo}
            </h1>
            <p className="text-xs text-slate-500">
              {resident.email} • {resident.mobile}
            </p>
          </div>

          {/* Membership Badge (Hidden for Not Applicable users) */}
          {!isNotApplicable ? (
            <div>
              {resident.membershipType === 'lifetime' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                  <Award className="w-4 h-4" />
                  RWA Lifetime Member (#{resident.membershipNumber || 'Assigned'})
                </span>
              )}
              {resident.membershipType === 'yearly' && (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                    isYearlyExpired
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-blue-50 text-blue-800 border-blue-200'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  Yearly Member (#{resident.membershipNumber}) • Jan–Dec {resident.membershipYear}
                  {isYearlyExpired ? ' (Renewal Due — Non-Member Rate Applies)' : ' (Active)'}
                </span>
              )}
              {resident.membershipType === 'none' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold">
                  Approved Non-Member (Non-Member Fee Rates)
                </span>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold">
              <Ban className="w-3.5 h-3.5" />
              Activity Fee Account
            </span>
          )}
        </div>

        {/* Locked Children / Participants List */}
        <div>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-slate-800">
              Registered Children / Participants ({resident.children.length})
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <Lock className="w-3 h-3" />
              Locked after approval — contact RWA Admin to add/edit
            </span>
          </div>
          {resident.children.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {resident.children.map((child) => (
                <div
                  key={child.id}
                  className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-800 flex items-center gap-1.5"
                >
                  <span>{child.name}</span>
                  {child.ageOrBatchNote && (
                    <span className="text-[11px] font-normal text-slate-500">
                      ({child.ageOrBatchNote})
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
              No children linked to your profile yet. Please contact the RWA Office to add your
              child&apos;s name.
            </p>
          )}
        </div>
      </div>

      {/* Combined Multi-Child / Multi-Activity Deposit Builder (Rolling 3 Months) */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Deposit Activity Fee (Single Combined Payment)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select multiple children, sports, and past/current months (last 3 months window; no
              advance payments).
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
            Applicable Rate:{' '}
            <strong className="uppercase">
              {activeRateTierPreview === 'member' ? 'Member Rate' : 'Non-Member Rate'}
            </strong>
          </span>
        </div>

        {formError && (
          <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {/* Item Selector Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Child</label>
            <select
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2"
            >
              <option value="">-- Child --</option>
              {resident.children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Activity / Sport
            </label>
            <select
              value={selectedActivityId}
              onChange={(e) => setSelectedActivityId(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2"
            >
              <option value="">-- Activity --</option>
              {activities
                .filter((a) => a.isActive)
                .map((a) => {
                  const rate =
                    activeRateTierPreview === 'member' ? a.memberFee : a.nonMemberFee;
                  return (
                    <option key={a.id} value={a.id}>
                      {a.name} (₹{rate})
                    </option>
                  );
                })}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Month (Last 3 Months)
            </label>
            <select
              value={selectedMonthKey}
              onChange={(e) => setSelectedMonthKey(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2"
            >
              {monthOptions.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center h-9">
            {resident.halfMonthAllowed ? (
              <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requestHalfMonth}
                  onChange={(e) => setRequestHalfMonth(e.target.checked)}
                />
                Half Month
              </label>
            ) : (
              <span className="text-[11px] text-slate-400">Full month period</span>
            )}
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add to Payment
          </button>
        </div>

        {/* Cart Summary Table */}
        {cart.length > 0 && (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Child</th>
                  <th className="px-4 py-2.5">Activity &amp; Month</th>
                  <th className="px-4 py-2.5">Rate Tier</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pricing.pricedItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">{item.childName}</td>
                    <td className="px-4 py-2.5 text-slate-700">
                      {item.activityName} — {item.monthLabel}
                      {item.useHalfMonth && (
                        <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold">
                          Half Month
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 capitalize text-slate-600">
                      {item.rateTier === 'member' ? 'Member' : 'Non-Member'}
                      {item.siblingDiscountAmount > 0 && (
                        <span className="block text-[10px] text-emerald-700">
                          Sibling Discount: -₹{item.siblingDiscountAmount}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                      ₹{item.finalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setCart((prev) => prev.filter((c) => c.id !== item.id))}
                        className="text-rose-600 hover:text-rose-800 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200 font-bold text-sm text-slate-900">
                  <td colSpan={3} className="px-4 py-3">
                    Combined Total to Pay
                  </td>
                  <td className="px-4 py-3 text-right">
                    ₹{pricing.totalAmount.toLocaleString('en-IN')}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* UTR Reference Input */}
        <div className="bg-blue-50/50 border border-blue-200/80 rounded-xl p-4 space-y-4">
          <p className="text-xs font-medium text-slate-800">{upiInstructions}</p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              UPI / Bank Transaction Reference (UTR) *
            </label>
            <input
              type="text"
              value={utrReference}
              onChange={(e) => setUtrReference(e.target.value)}
              placeholder="Enter UTR / Transaction Reference No."
              className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Phase 1: Enter your payment reference manually. Screenshot OCR extraction can be added
              in Phase 2.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || cart.length === 0}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
            >
              {submitting
                ? 'Submitting for Verification...'
                : `Submit ₹${pricing.totalAmount.toLocaleString('en-IN')} Payment for Admin Verification`}
            </button>
          </div>
        </div>
      </form>

      {/* Pending UTR Verifications & Issued Receipts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">
            Submitted Payments (Awaiting Admin Verification)
          </h3>
          {mySubmissions
            .filter((s) => s.status === 'pending_verification' || s.status === 'rejected')
            .map((sub) => (
              <div
                key={sub.id}
                className="border border-slate-200 rounded-xl p-3.5 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900">
                    UTR: {sub.utrReference}
                  </span>
                  {sub.status === 'pending_verification' ? (
                    <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-semibold">
                      <Clock className="w-3 h-3" /> Pending Verification
                    </span>
                  ) : (
                    <span className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full font-semibold">
                      Rejected
                    </span>
                  )}
                </div>
                <p className="text-slate-600">
                  Amount: <strong>₹{sub.totalAmount.toLocaleString('en-IN')}</strong> •{' '}
                  {sub.items
                    .map((i) => `${i.childName} (${i.activityName} ${i.monthLabel})`)
                    .join(', ')}
                </p>
                {sub.rejectionReason && (
                  <p className="text-rose-700 text-[11px]">Reason: {sub.rejectionReason}</p>
                )}
              </div>
            ))}
          {mySubmissions.filter(
            (s) => s.status === 'pending_verification' || s.status === 'rejected'
          ).length === 0 && (
            <p className="text-xs text-slate-400 py-4 text-center">
              No pending payment submissions.
            </p>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">
            Verified Receipts (RWA/2026-27/XXXX)
          </h3>
          {myReceipts.map((rcpt) => (
            <div
              key={rcpt.receiptNumber}
              className="border border-slate-200 rounded-xl p-3.5 text-xs flex items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900">{rcpt.receiptNumber}</span>
                  {rcpt.status === 'cancelled' ? (
                    <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      Cancelled
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3" /> Verified &amp; Emailed
                    </span>
                  )}
                </div>
                <p className="text-slate-600 mt-1">
                  ₹{rcpt.totalAmount.toLocaleString('en-IN')} •{' '}
                  {rcpt.items.map((i) => `${i.childName} (${i.monthLabel})`).join(', ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenReceipt(rcpt)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg shrink-0 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                Receipt
              </button>
            </div>
          ))}
          {myReceipts.length === 0 && (
            <p className="text-xs text-slate-400 py-4 text-center">No official receipts yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};