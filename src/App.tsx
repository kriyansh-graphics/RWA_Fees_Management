import { useState, useMemo, useEffect, useCallback } from 'react';
import { LogOut, Building2, Loader2 } from 'lucide-react';
import type {
  ActivityItem,
  CartLineItem,
  ChildParticipant,
  CoachAccount,
  IssuedReceiptRecord,
  MembershipType,
  PaymentSubmissionRecord,
  PricedCartLineItem,
  ResidentProfile,
  UserRole,
} from './types/models';
import { supabase } from './lib/supabase';
import { calculateCartPricing } from './utils/feeCalculator';
import { LoginPage } from './pages/auth/LoginPage';
import { VerificationPendingPage } from './pages/auth/VerificationPendingPage';
import { RoleSwitcher } from './components/RoleSwitcher';
import { ReceiptModal } from './components/ReceiptModal';
import {
  AdminDashboardPage,
  type AdminNavRoute,
} from './pages/admin/AdminDashboardPage';
import { MembersManagerPage } from './pages/admin/MembersManagerPage';
import { ActivitiesManagerPage } from './pages/admin/ActivitiesManagerPage';
import { VerifyAndCashPage } from './pages/admin/VerifyAndCashPage';
import { LedgerAndCancellationsPage } from './pages/admin/LedgerAndCancellationsPage';
import { MemberPortalPage } from './pages/member/MemberPortalPage';
import { CoachRosterPage } from './pages/coach/CoachRosterPage';

/* ---------- Helpers ---------- */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

function createUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function ensureUuid(value: unknown): string {
  if (isValidUuid(value)) return value.trim();
  return createUuid();
}

function requireValidUuid(value: unknown, label: string): string {
  if (isValidUuid(value)) return value.trim();
  throw new Error(
    `Invalid UUID for ${label}: "${String(value ?? '')}". Ensure ${label} uses a valid database UUID.`
  );
}

async function hashSecret(rawValue: string): Promise<string> {
  const normalized = rawValue.trim();
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function formatMonthLabelFromKey(monthKey: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey.trim());
  if (!match) return monthKey;
  const year = Number(match[1]);
  const monthIdx = Number(match[2]) - 1;
  const dt = new Date(Date.UTC(year, monthIdx, 1));
  return dt.toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/* ---------- DB Row -> Frontend Model Mappers ---------- */

function mapChildRow(row: Record<string, unknown>): ChildParticipant {
  return {
    id: String(row.id),
    householdUserId: String(row.household_user_id),
    name: String(row.full_name ?? row.name ?? ''),
    ageOrBatchNote:
      row.age_or_batch_note != null ? String(row.age_or_batch_note) : undefined,
    isLocked: Boolean(row.is_locked ?? true),
  };
}

function mapResidentRow(
  row: Record<string, unknown>,
  childRows: Record<string, unknown>[]
): ResidentProfile {
  const id = String(row.id);
  const children = childRows
    .filter((c) => String(c.household_user_id) === id)
    .map(mapChildRow);

  return {
    id,
    fullName: String(row.full_name ?? ''),
    houseOrFlatNo: String(row.house_or_flat_no ?? ''),
    email: String(row.email ?? ''),
    mobile: String(row.mobile ?? ''),
    roles: Array.isArray(row.roles)
      ? (row.roles as UserRole[])
      : (['member_user'] as UserRole[]),
    approvalStatus:
      (row.approval_status as ResidentProfile['approvalStatus']) ||
      'pending_verification',
    membershipType: (row.membership_type as MembershipType) || 'none',
    membershipNumber:
      row.membership_number != null
        ? String(row.membership_number)
        : undefined,
    membershipYear:
      row.membership_year != null ? Number(row.membership_year) : undefined,
    memberRateOverride: Boolean(row.member_rate_override ?? false),
    halfMonthAllowed: Boolean(row.half_month_allowed ?? false),
    children,
  };
}

function mapActivityRow(
  row: Record<string, unknown>,
  coaches: CoachAccount[]
): ActivityItem {
  const id = String(row.id);
  const assignedCoachIds = coaches
    .filter((c) => c.assignedActivityIds.includes(id))
    .map((c) => c.id);

  return {
    id,
    name: String(row.name ?? ''),
    scheduleLabel:
      row.schedule_label != null ? String(row.schedule_label) : undefined,
    memberFee: Number(row.member_fee ?? 0),
    nonMemberFee: Number(row.non_member_fee ?? 0),
    siblingDiscountPercent: Number(row.sibling_discount_percent ?? 0),
    isActive: Boolean(row.is_active ?? true),
    assignedCoachIds,
  };
}

function mapLineItemRow(
  row: Record<string, unknown>,
  residents: ResidentProfile[],
  activities: ActivityItem[]
): PricedCartLineItem {
  const childId = String(row.child_id ?? '');
  const activityId = String(row.activity_id ?? '');
  const monthKey = String(row.month_key ?? '');

  let childName = 'Participant';
  for (const r of residents) {
    const foundChild = r.children.find((c) => c.id === childId);
    if (foundChild) {
      childName = foundChild.name;
      break;
    }
    if (r.id === childId) {
      childName = r.fullName;
      break;
    }
  }

  const act = activities.find((a) => a.id === activityId);
  const baseAmount = Number(row.base_amount ?? 0);
  const siblingDiscountAmount = Number(row.sibling_discount_amount ?? 0);
  const finalAmount = Number(
    row.final_amount ?? Math.max(0, baseAmount - siblingDiscountAmount)
  );

  return {
    id: String(row.id ?? createUuid()),
    childId,
    childName,
    activityId,
    activityName: act?.name ?? 'Activity Fee',
    monthKey,
    monthLabel: formatMonthLabelFromKey(monthKey),
    useHalfMonth: Boolean(row.use_half_month ?? false),
    rateTier:
      (row.rate_tier as PricedCartLineItem['rateTier']) || 'non_member',
    baseAmount,
    siblingDiscountAmount,
    finalAmount,
  };
}

function mapSubmissionRow(
  row: Record<string, unknown>,
  lineItemRows: Record<string, unknown>[],
  residents: ResidentProfile[],
  activities: ActivityItem[]
): PaymentSubmissionRecord {
  const id = String(row.id);
  const residentId = String(row.resident_id ?? '');
  const resident = residents.find((r) => r.id === residentId);

  const items = lineItemRows
    .filter((li) => String(li.submission_id ?? '') === id)
    .map((li) => mapLineItemRow(li, residents, activities));

  const computedTotal = items.reduce(
    (sum, item) => sum + Number(item.finalAmount ?? 0),
    0
  );

  return {
    id,
    submittedAt: String(row.submitted_at ?? new Date().toISOString()),
    residentId,
    residentName: resident?.fullName ?? '',
    houseOrFlatNo: resident?.houseOrFlatNo ?? '',
    residentEmail: resident?.email ?? '',
    membershipNumber: resident?.membershipNumber,
    utrReference: String(row.utr_reference ?? ''),
    utrExtractedViaOcr: Boolean(row.utr_extracted_via_ocr ?? false),
    screenshotPath:
      row.screenshot_path != null ? String(row.screenshot_path) : undefined,
    items,
    totalAmount: items.length > 0 ? computedTotal : Number(row.total_amount ?? 0),
    status:
      (row.status as PaymentSubmissionRecord['status']) ||
      'pending_verification',
    rejectionReason:
      row.rejection_reason != null ? String(row.rejection_reason) : undefined,
  };
}

function mapReceiptRow(
  row: Record<string, unknown>,
  lineItemRows: Record<string, unknown>[],
  residents: ResidentProfile[],
  activities: ActivityItem[],
  fallbackItems?: PricedCartLineItem[]
): IssuedReceiptRecord {
  const id = String(row.id);
  const residentId = String(row.resident_id ?? '');
  const resident = residents.find((r) => r.id === residentId);

  const dbItems = lineItemRows
    .filter((li) => String(li.receipt_id ?? '') === id)
    .map((li) => mapLineItemRow(li, residents, activities));

  const items = dbItems.length > 0 ? dbItems : fallbackItems ?? [];
  const computedTotal = items.reduce(
    (sum, item) => sum + Number(item.finalAmount ?? 0),
    0
  );

  return {
    receiptNumber: String(row.receipt_number),
    receiptCategory:
      (row.receipt_category as IssuedReceiptRecord['receiptCategory']) ||
      'activity_fee',
    issuedAt: String(row.issued_at ?? new Date().toISOString()),
    issuedByAdminName: String(row.issued_by_name ?? 'RWA Admin'),
    residentId,
    residentName: resident?.fullName ?? '',
    houseOrFlatNo: resident?.houseOrFlatNo ?? '',
    residentEmail: resident?.email ?? '',
    membershipNumber: resident?.membershipNumber,
    paymentMode:
      (row.payment_mode as IssuedReceiptRecord['paymentMode']) || 'Cash',
    utrReference:
      row.utr_reference != null ? String(row.utr_reference) : undefined,
    items,
    totalAmount: items.length > 0 ? computedTotal : Number(row.total_amount ?? 0),
    emailSent: Boolean(row.email_sent ?? false),
    status: (row.status as IssuedReceiptRecord['status']) || 'issued',
    cancellationReason:
      row.cancellation_reason != null
        ? String(row.cancellation_reason)
        : undefined,
    cancellationRequestedBy:
      row.cancellation_requested_by != null
        ? String(row.cancellation_requested_by)
        : undefined,
    cancellationApprovedBy:
      row.cancellation_approved_by != null
        ? String(row.cancellation_approved_by)
        : undefined,
    cancellationReceiptNumber:
      row.cancellation_receipt_number != null
        ? String(row.cancellation_receipt_number)
        : undefined,
  };
}

export function App() {
  const [currentUser, setCurrentUser] = useState<ResidentProfile | null>(null);
  const [activeCoach, setActiveCoach] = useState<CoachAccount | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole>('member_user');
  const [adminRoute, setAdminRoute] = useState<AdminNavRoute>('dashboard');

  const [residents, setResidents] = useState<ResidentProfile[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [coaches, setCoaches] = useState<CoachAccount[]>([]);
  const [submissions, setSubmissions] = useState<PaymentSubmissionRecord[]>([]);
  const [receipts, setReceipts] = useState<IssuedReceiptRecord[]>([]);
  const [viewingReceipt, setViewingReceipt] =
    useState<IssuedReceiptRecord | null>(null);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const loadAllFromSupabase = useCallback(async () => {
    setLoadingData(true);
    setDataError(null);

    try {
      const [
        resResidents,
        resChildren,
        resActivities,
        resCoaches,
        resAssignments,
        resSubmissions,
        resReceipts,
        resLineItems,
      ] = await Promise.all([
        supabase
          .from('residents')
          .select('*')
          .order('full_name', { ascending: true }),
        supabase.from('children').select('*'),
        supabase
          .from('activities')
          .select('*')
          .order('name', { ascending: true }),
        supabase
          .from('coaches')
          .select('*')
          .order('coach_name', { ascending: true }),
        supabase.from('coach_activity_assignments').select('*'),
        supabase
          .from('payment_submissions')
          .select('*')
          .order('submitted_at', { ascending: false }),
        supabase
          .from('receipts')
          .select('*')
          .order('issued_at', { ascending: false }),
        supabase.from('payment_line_items').select('*'),
      ]);

      if (resResidents.error) throw resResidents.error;
      if (resChildren.error) throw resChildren.error;
      if (resActivities.error) throw resActivities.error;
      if (resCoaches.error) throw resCoaches.error;
      if (resSubmissions.error) throw resSubmissions.error;
      if (resReceipts.error) throw resReceipts.error;
      if (resLineItems.error) throw resLineItems.error;

      const assignmentRows = resAssignments.data ?? [];
      const mappedCoaches: CoachAccount[] = (resCoaches.data ?? []).map(
        (c) => {
          const cid = String(c.id);
          const assignedIds = assignmentRows
            .filter((a) => String(a.coach_id) === cid)
            .map((a) => String(a.activity_id));

          return {
            id: cid,
            coachName: String(c.coach_name ?? ''),
            loginId: String(c.login_id ?? ''),
            mobile: c.mobile != null ? String(c.mobile) : undefined,
            isActive: Boolean(c.is_active ?? true),
            assignedActivityIds: assignedIds,
          };
        }
      );

      const mappedActivities: ActivityItem[] = (resActivities.data ?? []).map(
        (act) => mapActivityRow(act, mappedCoaches)
      );

      const mappedResidents: ResidentProfile[] = (resResidents.data ?? []).map(
        (r) => mapResidentRow(r, resChildren.data ?? [])
      );

      const lineItemRows = (resLineItems.data ?? []) as Record<
        string,
        unknown
      >[];

      setCoaches(mappedCoaches);
      setActivities(mappedActivities);
      setResidents(mappedResidents);
      setSubmissions(
        (resSubmissions.data ?? []).map((s) =>
          mapSubmissionRow(s, lineItemRows, mappedResidents, mappedActivities)
        )
      );
      setReceipts(
        (resReceipts.data ?? []).map((r) =>
          mapReceiptRow(r, lineItemRows, mappedResidents, mappedActivities)
        )
      );

      setCurrentUser((prev) => {
        if (!prev) return null;
        return mappedResidents.find((item) => item.id === prev.id) ?? prev;
      });
    } catch (err) {
      setDataError(
        err instanceof Error
          ? err.message
          : 'Failed to load data from Supabase.'
      );
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadAllFromSupabase();
  }, [loadAllFromSupabase]);

  const generateReceiptNumber = async (
    prefix = 'RWA/2026-27'
  ): Promise<string> => {
    const { data, error } = await supabase.rpc('generate_next_receipt_number', {
      p_prefix: prefix,
    });
    if (error || !data) {
      throw new Error(
        error?.message || 'Failed to generate sequential receipt number.'
      );
    }
    return String(data);
  };

  const alreadyPaidKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const r of receipts) {
      if (r.status === 'cancelled') continue;
      for (const item of r.items) {
        keys.add(`${item.childId}::${item.activityId}::${item.monthKey}`);
      }
    }
    for (const s of submissions) {
      if (
        s.status === 'pending_verification' ||
        s.status === 'verified_issued'
      ) {
        for (const item of s.items) {
          keys.add(`${item.childId}::${item.activityId}::${item.monthKey}`);
        }
      }
    }
    return keys;
  }, [receipts, submissions]);

  const assertNoDuplicateItems = (
    items: PricedCartLineItem[],
    ignoreKeys?: Set<string>
  ) => {
    const seen = new Set<string>();
    const conflicts: string[] = [];

    for (const item of items) {
      if (!item.childId || !item.activityId || !item.monthKey) continue;
      const key = `${item.childId}::${item.activityId}::${item.monthKey}`;
      const isAlreadyPaid = alreadyPaidKeys.has(key) && !ignoreKeys?.has(key);
      if (isAlreadyPaid || seen.has(key)) {
        conflicts.push(
          `${item.childName || 'Child'} — ${item.activityName || 'Activity'} (${
            item.monthLabel || item.monthKey
          })`
        );
      }
      seen.add(key);
    }

    if (conflicts.length > 0) {
      throw new Error(
        `Duplicate fee payment not allowed for: ${conflicts.join(', ')}`
      );
    }
  };

  const buildLineItemPayloads = (
    items: PricedCartLineItem[],
    opts: { submissionId: string | null; receiptId: string | null }
  ) => {
    return items.map((item, idx) => {
      const validChildId = requireValidUuid(
        item.childId,
        `line item #${idx + 1} child_id`
      );
      const validActivityId = requireValidUuid(
        item.activityId,
        `line item #${idx + 1} activity_id`
      );

      return {
        id: ensureUuid(item.id),
        submission_id: opts.submissionId
          ? requireValidUuid(opts.submissionId, 'submission_id')
          : null,
        receipt_id: opts.receiptId
          ? requireValidUuid(opts.receiptId, 'receipt_id')
          : null,
        child_id: validChildId,
        activity_id: validActivityId,
        month_key: String(item.monthKey ?? '').trim(),
        use_half_month: Boolean(item.useHalfMonth),
        rate_tier: item.rateTier === 'member' ? 'member' : 'non_member',
        base_amount: Math.max(0, Math.round(Number(item.baseAmount ?? 0))),
        sibling_discount_amount: Math.max(
          0,
          Math.round(Number(item.siblingDiscountAmount ?? 0))
        ),
        final_amount: Math.max(0, Math.round(Number(item.finalAmount ?? 0))),
        is_active_claim: true,
      };
    });
  };

  const handleLoginResident = async (identifier: string, _secret: string) => {
    const normalized = identifier.trim().toLowerCase();
    const found = residents.find(
      (r) =>
        r.email.toLowerCase() === normalized ||
        r.mobile.trim() === identifier.trim()
    );

    if (!found) {
      throw new Error(
        'No resident account found with this email or mobile. Please use the Sign Up tab to request RWA approval.'
      );
    }

    setActiveCoach(null);
    setCurrentUser(found);
    const primaryRole: UserRole = found.roles.includes('super_admin')
      ? 'super_admin'
      : found.roles.includes('admin')
      ? 'admin'
      : found.roles[0] || 'member_user';
    setActiveRole(primaryRole);
  };

  const handleSignupResident = async (payload: {
    fullName: string;
    houseOrFlatNo: string;
    email: string;
    mobile: string;
  }) => {
    const newId = createUuid();
    const { data, error } = await supabase
      .from('residents')
      .insert({
        id: newId,
        full_name: payload.fullName.trim(),
        house_or_flat_no: payload.houseOrFlatNo.trim(),
        email: payload.email.trim().toLowerCase(),
        mobile: payload.mobile.trim(),
        roles: ['member_user'],
        approval_status: 'pending_verification',
        membership_type: 'none',
        member_rate_override: false,
        half_month_allowed: false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Could not create resident account.');
    }

    const createdProfile = mapResidentRow(data, []);
    setResidents((prev) => [createdProfile, ...prev]);
    setActiveCoach(null);
    setCurrentUser(createdProfile);
    setActiveRole('member_user');
  };

  const handleLoginCoach = async (coachLoginId: string, password: string) => {
    const coach = coaches.find(
      (c) =>
        c.loginId.toUpperCase() === coachLoginId.trim().toUpperCase() &&
        c.isActive
    );
    if (!coach) {
      throw new Error(
        'Invalid Coach Login ID or inactive account. Contact RWA Admin.'
      );
    }

    const { data: coachRow, error } = await supabase
      .from('coaches')
      .select('password_hash')
      .eq('id', coach.id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const storedHash = String(coachRow?.password_hash ?? '');
    if (storedHash) {
      const enteredHash = await hashSecret(password);
      if (storedHash !== enteredHash && storedHash !== password.trim()) {
        throw new Error('Incorrect coach password.');
      }
    }

    setCurrentUser(null);
    setActiveCoach(coach);
    setActiveRole('coach');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveCoach(null);
  };

  if (loadingData && residents.length === 0 && activities.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-slate-600 text-xs gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading RWA Sports &amp; Fee Portal from Supabase...</span>
      </div>
    );
  }

  if (!currentUser && !activeCoach) {
    return (
      <div className="space-y-2">
        {dataError && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-xs px-4 py-2 text-center">
            Supabase connection notice: {dataError}
          </div>
        )}
        <LoginPage
          onLoginResident={handleLoginResident}
          onLoginCoach={handleLoginCoach}
          onSignupResident={handleSignupResident}
        />
      </div>
    );
  }

  if (currentUser && currentUser.approvalStatus === 'pending_verification') {
    return (
      <VerificationPendingPage profile={currentUser} onLogout={handleLogout} />
    );
  }

  const isSuperAdmin = Boolean(currentUser?.roles.includes('super_admin'));
  const isAdminView =
    Boolean(currentUser) &&
    (activeRole === 'admin' || activeRole === 'super_admin');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-emerald-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm tracking-tight">
              RWA Sports &amp; Fee Portal
            </span>
          </div>

          <div className="flex items-center gap-3">
            {currentUser && (
              <RoleSwitcher
                availableRoles={currentUser.roles}
                activeRole={activeRole}
                onChangeRole={(r) => {
                  setActiveRole(r);
                  setAdminRoute('dashboard');
                }}
              />
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {isAdminView && (
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-2 overflow-x-auto pb-2.5 pt-0.5">
            {(
              [
                ['dashboard', 'Overview'],
                ['members', 'Members & Kids'],
                ['activities', 'Activities & Coaches'],
                [
                  'verify_cash',
                  `Verify UTR & Cash (${submissions.filter((s) => s.status === 'pending_verification').length})`,
                ],
                ['ledger', 'Master Ledger'],
              ] as [AdminNavRoute, string][]
            ).map(([route, label]) => (
              <button
                key={route}
                type="button"
                onClick={() => setAdminRoute(route)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  adminRoute === route
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 print:p-0">
        {activeCoach ? (
          <CoachRosterPage
            coachName={activeCoach.coachName}
            assignedActivities={activities.filter((a) =>
              activeCoach.assignedActivityIds.includes(a.id)
            )}
            receipts={receipts}
          />
        ) : isAdminView && currentUser ? (
          <>
            {adminRoute === 'dashboard' && (
              <AdminDashboardPage
                residents={residents}
                activities={activities}
                pendingSubmissions={submissions.filter(
                  (s) => s.status === 'pending_verification'
                )}
                receipts={receipts}
                isSuperAdmin={isSuperAdmin}
                onNavigate={setAdminRoute}
              />
            )}

            {adminRoute === 'members' && (
              <MembersManagerPage
                residents={residents}
                onSaveResidentProfile={async (updated) => {
                  const { error: resErr } = await supabase
                    .from('residents')
                    .update({
                      full_name: updated.fullName,
                      house_or_flat_no: updated.houseOrFlatNo,
                      email: updated.email,
                      mobile: updated.mobile,
                      roles: updated.roles,
                      approval_status: updated.approvalStatus,
                      membership_type: updated.membershipType,
                      membership_number: updated.membershipNumber ?? null,
                      membership_year: updated.membershipYear ?? null,
                      member_rate_override: Boolean(
                        updated.memberRateOverride
                      ),
                      half_month_allowed: Boolean(updated.halfMonthAllowed),
                    })
                    .eq('id', requireValidUuid(updated.id, 'resident id'));

                  if (resErr) throw new Error(resErr.message);

                  if (updated.children.length > 0) {
                    const childPayloads = updated.children.map((ch) => ({
                      id: ensureUuid(ch.id),
                      household_user_id: requireValidUuid(
                        updated.id,
                        'resident id'
                      ),
                      full_name: ch.name,
                      age_or_batch_note: ch.ageOrBatchNote ?? null,
                      is_locked: ch.isLocked ?? true,
                    }));

                    const { error: chErr } = await supabase
                      .from('children')
                      .upsert(childPayloads, { onConflict: 'id' });

                    if (chErr) throw new Error(chErr.message);
                  }

                  setResidents((prev) =>
                    prev.map((r) => (r.id === updated.id ? updated : r))
                  );
                }}
                onIssueMembershipReceipt={async ({
                  resident,
                  membershipType,
                  // membershipNumber,
                  membershipYear,
                  amountPaid,
                  paymentMode,
                }) => {
                  const receiptNo = await generateReceiptNumber('RWA/2026-27');
                  const financialYear =
                    receiptNo.match(/(\d{4}-\d{2})/)?.[1] ?? '2026-27';

                  const items: PricedCartLineItem[] = [
                    {
                      id: createUuid(),
                      childId: resident.id,
                      childName: resident.fullName,
                      activityId: 'membership',
                      activityName:
                        membershipType === 'lifetime'
                          ? 'RWA Lifetime Membership'
                          : `RWA Yearly Membership (${membershipYear})`,
                      monthKey: `${membershipYear || new Date().getFullYear()}-01`,
                      monthLabel:
                        membershipType === 'lifetime'
                          ? 'Lifetime'
                          : `Jan–Dec ${membershipYear}`,
                      useHalfMonth: false,
                      rateTier: 'member',
                      baseAmount: amountPaid,
                      siblingDiscountAmount: 0,
                      finalAmount: amountPaid,
                    },
                  ];

                  const { data, error } = await supabase
                    .from('receipts')
                    .insert({
                      id: createUuid(),
                      receipt_number: receiptNo,
                      financial_year: financialYear,
                      receipt_category: 'membership_fee',
                      issued_at: new Date().toISOString(),
                      issued_by_name: currentUser.fullName,
                      resident_id: requireValidUuid(
                        resident.id,
                        'resident_id'
                      ),
                      payment_mode: paymentMode,
                      total_amount: Math.round(Number(amountPaid)),
                      email_sent: false,
                      status: 'issued',
                    })
                    .select()
                    .single();

                  if (error) throw new Error(error.message);

                  const issued = mapReceiptRow(
                    data,
                    [],
                    residents,
                    activities,
                    items
                  );
                  setReceipts((prev) => [issued, ...prev]);
                  return issued;
                }}
                onOpenReceipt={setViewingReceipt}
              />
            )}

            {adminRoute === 'activities' && (
              <ActivitiesManagerPage
                activities={activities}
                coaches={coaches}
                onSaveActivity={async (actData) => {
                  const actId = ensureUuid(actData.id);
                  const { data, error } = await supabase
                    .from('activities')
                    .upsert(
                      {
                        id: actId,
                        name: actData.name,
                        schedule_label: actData.scheduleLabel ?? null,
                        member_fee: actData.memberFee,
                        non_member_fee: actData.nonMemberFee,
                        sibling_discount_percent:
                          actData.siblingDiscountPercent,
                        is_active: actData.isActive,
                      },
                      { onConflict: 'id' }
                    )
                    .select()
                    .single();

                  if (error) throw new Error(error.message);

                  const savedAct = mapActivityRow(data, coaches);
                  setActivities((prev) => {
                    const exists = prev.some((a) => a.id === actId);
                    return exists
                      ? prev.map((a) => (a.id === actId ? savedAct : a))
                      : [...prev, savedAct];
                  });
                }}
                onCreateCoachAccount={async (payload: {
                  coachName: string;
                  loginId: string;
                  password?: string;
                  mobile?: string;
                  assignedActivityIds: string[];
                }) => {
                  const trimmedPassword =
                    payload.password?.trim() || 'rwa-coach-123';
                  const coachId = createUuid();
                  const passwordHash = await hashSecret(trimmedPassword);

                  const { data: insertedCoach, error: coachErr } = await supabase
                    .from('coaches')
                    .insert({
                      id: coachId,
                      coach_name: payload.coachName.trim(),
                      login_id: payload.loginId.trim().toUpperCase(),
                      mobile: payload.mobile?.trim() || null,
                      password_hash: passwordHash,
                      is_active: true,
                    })
                    .select()
                    .single();

                  if (coachErr) throw new Error(coachErr.message);

                  if (payload.assignedActivityIds.length > 0) {
                    const { error: assignErr } = await supabase
                      .from('coach_activity_assignments')
                      .insert(
                        payload.assignedActivityIds.map((activityId) => ({
                          coach_id: insertedCoach.id,
                          activity_id: requireValidUuid(
                            activityId,
                            'assigned activity_id'
                          ),
                        }))
                      );
                    if (assignErr) throw new Error(assignErr.message);
                  }

                  const newCoach: CoachAccount = {
                    id: String(insertedCoach.id),
                    coachName: String(
                      insertedCoach.coach_name ?? payload.coachName
                    ),
                    loginId: String(insertedCoach.login_id ?? payload.loginId),
                    mobile:
                      insertedCoach.mobile != null
                        ? String(insertedCoach.mobile)
                        : payload.mobile,
                    isActive: Boolean(insertedCoach.is_active ?? true),
                    assignedActivityIds: payload.assignedActivityIds,
                  };
                  setCoaches((prev) => [...prev, newCoach]);
                }}
                onUpdateCoachAssignments={async (coachId, ids) => {
                  const validCoachId = requireValidUuid(coachId, 'coach_id');
                  const { error: delErr } = await supabase
                    .from('coach_activity_assignments')
                    .delete()
                    .eq('coach_id', validCoachId);

                  if (delErr) throw new Error(delErr.message);

                  if (ids.length > 0) {
                    const { error: insErr } = await supabase
                      .from('coach_activity_assignments')
                      .insert(
                        ids.map((activityId) => ({
                          coach_id: validCoachId,
                          activity_id: requireValidUuid(
                            activityId,
                            'activity_id'
                          ),
                        }))
                      );
                    if (insErr) throw new Error(insErr.message);
                  }

                  setCoaches((prev) =>
                    prev.map((c) =>
                      c.id === coachId ? { ...c, assignedActivityIds: ids } : c
                    )
                  );
                }}
              />
            )}

            {adminRoute === 'verify_cash' && (
              <VerifyAndCashPage
                pendingSubmissions={submissions.filter(
                  (s) => s.status === 'pending_verification'
                )}
                residents={residents}
                activities={activities}
                alreadyPaidKeys={alreadyPaidKeys}
                onApproveSubmission={async (subId) => {
                  const sub = submissions.find((s) => s.id === subId);
                  if (!sub) throw new Error('Submission not found');

                  if (sub.items.length === 0) {
                    throw new Error('Submission has no line items.');
                  }

                  const subOwnKeys = new Set(
                    sub.items.map(
                      (i) => `${i.childId}::${i.activityId}::${i.monthKey}`
                    )
                  );
                  assertNoDuplicateItems(sub.items, subOwnKeys);

                  const computedTotal = sub.items.reduce(
                    (sum, item) => sum + Number(item.finalAmount ?? 0),
                    0
                  );
                  const verifiedAt = new Date().toISOString();
                  const receiptNo = await generateReceiptNumber('RWA/2026-27');
                  const financialYear =
                    receiptNo.match(/(\d{4}-\d{2})/)?.[1] ?? '2026-27';
                  const receiptId = createUuid();

                  const { data: rcptData, error: rcptErr } = await supabase
                    .from('receipts')
                    .insert({
                      id: receiptId,
                      receipt_number: receiptNo,
                      financial_year: financialYear,
                      receipt_category: 'activity_fee',
                      resident_id: requireValidUuid(
                        sub.residentId,
                        'resident_id'
                      ),
                      submission_id: requireValidUuid(
                        sub.id,
                        'submission_id'
                      ),
                      payment_mode: 'UPI / UTR Verified',
                      utr_reference: sub.utrReference,
                      total_amount: Math.round(computedTotal),
                      email_sent: false,
                      status: 'issued',
                      issued_by_name: currentUser.fullName,
                      issued_at: verifiedAt,
                    })
                    .select()
                    .single();

                  if (rcptErr) throw new Error(rcptErr.message);

                  const { error: liErr } = await supabase
                    .from('payment_line_items')
                    .update({ receipt_id: receiptId, is_active_claim: true })
                    .eq('submission_id', requireValidUuid(sub.id, 'submission_id'));

                  if (liErr) throw new Error(liErr.message);

                  const { error: updErr } = await supabase
                    .from('payment_submissions')
                    .update({
                      status: 'verified_issued',
                      verified_at: verifiedAt,
                      verified_by_resident_id: requireValidUuid(
                        currentUser.id,
                        'verified_by_resident_id'
                      ),
                    })
                    .eq('id', requireValidUuid(subId, 'submission id'));

                  if (updErr) throw new Error(updErr.message);

                  setSubmissions((prev) =>
                    prev.map((s) =>
                      s.id === subId
                        ? { ...s, status: 'verified_issued' }
                        : s
                    )
                  );

                  const issued = mapReceiptRow(
                    rcptData,
                    [],
                    residents,
                    activities,
                    sub.items
                  );
                  setReceipts((prev) => [issued, ...prev]);
                  return issued;
                }}
                onRejectSubmission={async (subId, reason) => {
                  const validSubId = requireValidUuid(subId, 'submission id');
                  const { error } = await supabase
                    .from('payment_submissions')
                    .update({
                      status: 'rejected',
                      rejection_reason: reason,
                    })
                    .eq('id', validSubId);

                  if (error) throw new Error(error.message);

                  await supabase
                    .from('payment_line_items')
                    .update({ is_active_claim: false })
                    .eq('submission_id', validSubId);

                  setSubmissions((prev) =>
                    prev.map((s) =>
                      s.id === subId
                        ? { ...s, status: 'rejected', rejectionReason: reason }
                        : s
                    )
                  );
                }}
                onRecordCashPayment={async ({
                  resident,
                  items,
                  paymentMode,
                  referenceNote,
                  overrideMemberRate,
                }: {
                  resident: ResidentProfile;
                  items: CartLineItem[];
                  paymentMode: 'Cash' | 'Cheque';
                  referenceNote?: string;
                  overrideMemberRate: boolean;
                }) => {
                  const effectiveRes: ResidentProfile = {
                    ...resident,
                    memberRateOverride:
                      resident.memberRateOverride || overrideMemberRate,
                  };
                  const actsMap = Object.fromEntries(
                    activities.map((a) => [a.id, a])
                  );
                  const { pricedItems, totalAmount } = calculateCartPricing(
                    effectiveRes,
                    actsMap,
                    items,
                    alreadyPaidKeys
                  );

                  if (pricedItems.length === 0) {
                    throw new Error('No eligible line items to record.');
                  }
                  assertNoDuplicateItems(pricedItems);

                  const computedTotal = pricedItems.reduce(
                    (sum, item) => sum + Number(item.finalAmount ?? 0),
                    0
                  );
                  const finalTotal = Math.round(
                    computedTotal > 0 ? computedTotal : totalAmount
                  );
                  const lineItemPayloads = buildLineItemPayloads(pricedItems, {
                    submissionId: null,
                    receiptId: null,
                  });

                  const issuedAt = new Date().toISOString();
                  const receiptNo = await generateReceiptNumber('RWA/2026-27');
                  const financialYear =
                    receiptNo.match(/(\d{4}-\d{2})/)?.[1] ?? '2026-27';
                  const receiptId = createUuid();

                  const { data, error } = await supabase
                    .from('receipts')
                    .insert({
                      id: receiptId,
                      receipt_number: receiptNo,
                      financial_year: financialYear,
                      receipt_category: 'activity_fee',
                      resident_id: requireValidUuid(
                        resident.id,
                        'resident_id'
                      ),
                      payment_mode: paymentMode,
                      utr_reference: referenceNote ?? null,
                      total_amount: finalTotal,
                      email_sent: false,
                      status: 'issued',
                      issued_by_name: currentUser.fullName,
                      issued_at: issuedAt,
                    })
                    .select()
                    .single();

                  if (error) throw new Error(error.message);

                  const rowsWithReceiptId = lineItemPayloads.map((row) => ({
                    ...row,
                    receipt_id: receiptId,
                  }));

                  const { error: liErr } = await supabase
                    .from('payment_line_items')
                    .insert(rowsWithReceiptId);

                  if (liErr) throw new Error(liErr.message);

                  const issued = mapReceiptRow(
                    data,
                    [],
                    residents,
                    activities,
                    pricedItems
                  );
                  setReceipts((prev) => [issued, ...prev]);
                  return issued;
                }}
                onOpenReceipt={setViewingReceipt}
              />
            )}

            {adminRoute === 'ledger' && (
              <LedgerAndCancellationsPage
                receipts={receipts}
                isSuperAdmin={isSuperAdmin}
                onRequestCancellation={async (receiptNumber, reason) => {
                  const { error } = await supabase
                    .from('receipts')
                    .update({
                      status: 'cancellation_requested',
                      cancellation_reason: reason,
                      cancellation_requested_by: currentUser.fullName,
                      cancellation_requested_at: new Date().toISOString(),
                    })
                    .eq('receipt_number', receiptNumber);

                  if (error) throw new Error(error.message);

                  setReceipts((prev) =>
                    prev.map((r) =>
                      r.receiptNumber === receiptNumber
                        ? {
                            ...r,
                            status: 'cancellation_requested',
                            cancellationReason: reason,
                            cancellationRequestedBy: currentUser.fullName,
                          }
                        : r
                    )
                  );
                }}
                onApproveCancellation={async (receiptNumber) => {
                  const creditNo = await generateReceiptNumber('CN/RWA/2026-27');
                  const { data, error } = await supabase
                    .from('receipts')
                    .update({
                      status: 'cancelled',
                      cancellation_approved_by: currentUser.fullName,
                      cancellation_approved_at: new Date().toISOString(),
                      cancellation_receipt_number: creditNo,
                    })
                    .eq('receipt_number', receiptNumber)
                    .select()
                    .single();

                  if (error || !data) {
                    throw new Error(error?.message || 'Receipt not found');
                  }

                  await supabase
                    .from('payment_line_items')
                    .update({ is_active_claim: false })
                    .eq(
                      'receipt_id',
                      String((data as Record<string, unknown>).id)
                    );

                  const existing = receipts.find(
                    (r) => r.receiptNumber === receiptNumber
                  );
                  const updatedRecord = mapReceiptRow(
                    data,
                    [],
                    residents,
                    activities,
                    existing?.items
                  );
                  setReceipts((prev) =>
                    prev.map((r) =>
                      r.receiptNumber === receiptNumber ? updatedRecord : r
                    )
                  );
                  return updatedRecord;
                }}
                onOpenReceipt={setViewingReceipt}
              />
            )}
          </>
        ) : (
          currentUser && (
            <MemberPortalPage
              resident={currentUser}
              activities={activities}
              submissions={submissions}
              receipts={receipts}
              alreadyPaidKeys={alreadyPaidKeys}
              onSubmitCombinedPayment={async ({
                items,
                utrReference,
                totalAmount,
              }: {
                items: PricedCartLineItem[];
                utrReference: string;
                totalAmount: number;
              }) => {
                if (!items || items.length === 0) {
                  throw new Error(
                    'Please add at least one activity line item before submitting.'
                  );
                }
                assertNoDuplicateItems(items);

                const computedTotal = items.reduce(
                  (sum, item) => sum + Number(item.finalAmount ?? 0),
                  0
                );
                const finalTotal = Math.round(
                  computedTotal > 0 ? computedTotal : totalAmount
                );

                const newSubId = createUuid();
                const lineItemPayloads = buildLineItemPayloads(items, {
                  submissionId: newSubId,
                  receiptId: null,
                });

                const { data, error } = await supabase
                  .from('payment_submissions')
                  .insert({
                    id: newSubId,
                    submitted_at: new Date().toISOString(),
                    resident_id: requireValidUuid(
                      currentUser.id,
                      'resident_id'
                    ),
                    utr_reference: utrReference.trim(),
                    utr_extracted_via_ocr: false,
                    total_amount: finalTotal,
                    status: 'pending_verification',
                  })
                  .select()
                  .single();

                if (error) throw new Error(error.message);

                const { error: liErr } = await supabase
                  .from('payment_line_items')
                  .insert(lineItemPayloads);

                if (liErr) {
                  await supabase
                    .from('payment_submissions')
                    .delete()
                    .eq('id', newSubId);
                  throw new Error(liErr.message);
                }

                const createdSub: PaymentSubmissionRecord = {
                  ...mapSubmissionRow(data, [], residents, activities),
                  residentName: currentUser.fullName,
                  houseOrFlatNo: currentUser.houseOrFlatNo,
                  residentEmail: currentUser.email,
                  membershipNumber: currentUser.membershipNumber,
                  items,
                  totalAmount: finalTotal,
                };
                setSubmissions((prev) => [createdSub, ...prev]);
              }}
              onOpenReceipt={setViewingReceipt}
            />
          )
        )}
      </main>

      <ReceiptModal
        receipt={viewingReceipt}
        onClose={() => setViewingReceipt(null)}
      />
    </div>
  );
}

export default App;