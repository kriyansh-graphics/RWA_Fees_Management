import React, { useMemo } from 'react';
import {
  IndianRupee,
  Clock,
  UserCheck,
  Award,
  ShieldAlert,
  ArrowRight,
  Banknote,
  Dumbbell,
  FileSpreadsheet,
} from 'lucide-react';
import type {
  ActivityItem,
  IssuedReceiptRecord,
  PaymentSubmissionRecord,
  ResidentProfile,
} from '../../types/models';

export type AdminNavRoute =
  | 'dashboard'
  | 'members'
  | 'activities'
  | 'verify_cash'
  | 'ledger';

interface AdminDashboardPageProps {
  residents: ResidentProfile[];
  activities: ActivityItem[];
  pendingSubmissions: PaymentSubmissionRecord[];
  receipts: IssuedReceiptRecord[];
  isSuperAdmin: boolean;
  currentCalendarYear?: number;
  onNavigate: (route: AdminNavRoute) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  residents,
  activities,
  pendingSubmissions,
  receipts,
  isSuperAdmin,
  currentCalendarYear = new Date().getFullYear(),
  onNavigate,
}) => {
  const stats = useMemo(() => {
    const totalVerifiedCollection = receipts
      .filter((r) => r.status !== 'cancelled')
      .reduce((sum, r) => sum + r.totalAmount, 0);

    const pendingApprovals = residents.filter(
      (r) => r.approvalStatus === 'pending_verification'
    ).length;

    const lifetimeMembers = residents.filter(
      (r) => r.approvalStatus === 'approved' && r.membershipType === 'lifetime'
    ).length;

    const activeYearlyMembers = residents.filter(
      (r) =>
        r.approvalStatus === 'approved' &&
        r.membershipType === 'yearly' &&
        r.membershipYear === currentCalendarYear
    ).length;

    const renewalDueMembers = residents.filter(
      (r) =>
        r.approvalStatus === 'approved' &&
        r.membershipType === 'yearly' &&
        r.membershipYear !== currentCalendarYear
    ).length;

    const cancellationRequests = receipts.filter(
      (r) => r.status === 'cancellation_requested'
    ).length;

    const activeActivitiesCount = activities.filter((a) => a.isActive).length;

    return {
      totalVerifiedCollection,
      pendingApprovals,
      lifetimeMembers,
      activeYearlyMembers,
      renewalDueMembers,
      cancellationRequests,
      activeActivitiesCount,
    };
  }, [residents, activities, receipts, currentCalendarYear]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">RWA Admin Command Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Calendar Year {currentCalendarYear} (Jan–Dec) • Live Fee Verification, Memberships &
            Audit Overview
          </p>
        </div>
      </div>

      {/* Super Admin Alert Banner if Receipt Cancellation Requests Exist */}
      {isSuperAdmin && stats.cancellationRequests > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-amber-950">
                {stats.cancellationRequests} Receipt Cancellation Request(s) Awaiting Super Admin
                Approval
              </p>
              <p className="text-amber-800 mt-0.5">
                Review justification and issue a Special Cancellation Receipt to maintain audit
                trail.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('ledger')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-900 hover:bg-amber-950 text-white text-xs font-semibold rounded-xl shrink-0 cursor-pointer"
          >
            Review Requests
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Verified Collections</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            ₹{stats.totalVerifiedCollection.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {receipts.filter((r) => r.status !== 'cancelled').length} valid receipts issued
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('verify_cash')}
          className="text-left bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-5 shadow-xs transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending UTR Verifications</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{pendingSubmissions.length}</p>
          <p className="text-[11px] text-blue-700 font-medium mt-1">
            Verify screenshots to issue receipts →
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('members')}
          className="text-left bg-white border border-slate-200 hover:border-amber-300 rounded-2xl p-5 shadow-xs transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">New Login Approvals</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats.pendingApprovals}</p>
          <p className="text-[11px] text-amber-700 font-medium mt-1">
            Waiting at RWA Office gate →
          </p>
        </button>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active RWA Members</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {stats.lifetimeMembers + stats.activeYearlyMembers}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {stats.lifetimeMembers} Lifetime • {stats.activeYearlyMembers} Yearly (
            {stats.renewalDueMembers} renewal due)
          </p>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => onNavigate('members')}
          className="flex items-center gap-3 bg-white hover:bg-slate-50 border border-slate-200 p-4 rounded-xl text-left transition cursor-pointer"
        >
          <UserCheck className="w-5 h-5 text-slate-800 shrink-0" />
          <div>
            <p className="text-xs font-bold text-slate-900">Members & Child Profiles</p>
            <p className="text-[11px] text-slate-500">
              Assign Membership No., Jan–Dec renewal & lock kids
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('verify_cash')}
          className="flex items-center gap-3 bg-white hover:bg-slate-50 border border-slate-200 p-4 rounded-xl text-left transition cursor-pointer"
        >
          <Banknote className="w-5 h-5 text-emerald-700 shrink-0" />
          <div>
            <p className="text-xs font-bold text-slate-900">Verify UTR / Accept Cash</p>
            <p className="text-[11px] text-slate-500">
              Approve online screenshots or log instant cash receipt
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('activities')}
          className="flex items-center gap-3 bg-white hover:bg-slate-50 border border-slate-200 p-4 rounded-xl text-left transition cursor-pointer"
        >
          <Dumbbell className="w-5 h-5 text-indigo-700 shrink-0" />
          <div>
            <p className="text-xs font-bold text-slate-900">
              Activities & Coaches ({stats.activeActivitiesCount})
            </p>
            <p className="text-[11px] text-slate-500">
              Member/Non-Member fees, Sibling % & Coach IDs
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('ledger')}
          className="flex items-center gap-3 bg-white hover:bg-slate-50 border border-slate-200 p-4 rounded-xl text-left transition cursor-pointer"
        >
          <FileSpreadsheet className="w-5 h-5 text-slate-800 shrink-0" />
          <div>
            <p className="text-xs font-bold text-slate-900">Master Ledger & Exports</p>
            <p className="text-[11px] text-slate-500">
              CSV export & receipt cancellation governance
            </p>
          </div>
        </button>
      </div>

      {/* Recent Receipts Feed */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Latest Issued Receipts</h2>
          <button
            type="button"
            onClick={() => onNavigate('ledger')}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            View Full Ledger →
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {receipts.slice(0, 5).map((r) => (
            <div
              key={r.receiptNumber}
              className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div>
                <span className="font-mono font-bold text-slate-900">{r.receiptNumber}</span>
                <span className="mx-2 text-slate-300">•</span>
                <span className="font-semibold text-slate-800">{r.residentName}</span>
                <span className="text-slate-500"> (Flat {r.houseOrFlatNo})</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-500">{r.paymentMode}</span>
                <span className="font-bold text-slate-900">
                  ₹{r.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          ))}
          {receipts.length === 0 && (
            <p className="px-5 py-6 text-xs text-slate-500 text-center">
              No receipts issued yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};