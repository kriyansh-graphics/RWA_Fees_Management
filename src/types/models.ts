export type UserRole = 'super_admin' | 'admin' | 'member_user' | 'coach';

export type MembershipType = 'lifetime' | 'yearly' | 'none' | 'not_applicable';

export type AccountApprovalStatus =
  | 'pending_verification'
  | 'approved'
  | 'suspended';

export type PaymentSubmissionStatus =
  | 'pending_verification'
  | 'verified_issued'
  | 'rejected'
  | 'cancellation_requested'
  | 'cancelled';

export interface ChildParticipant {
  id: string;
  householdUserId: string;
  name: string;
  ageOrBatchNote?: string;
  isLocked: boolean;
}

export interface ResidentProfile {
  id: string;
  fullName: string;
  houseOrFlatNo: string;
  email: string;
  mobile: string;
  roles: UserRole[];
  approvalStatus: AccountApprovalStatus;
  membershipType: MembershipType;
  membershipNumber?: string;
  membershipYear?: number; // Calendar year (Jan-Dec) for 'yearly'
  memberRateOverride?: boolean; // Admin override when yearly renewal is pending
  halfMonthAllowed?: boolean; // Admin option to permit half-month fee
  children: ChildParticipant[];
}

export interface ActivityItem {
  id: string;
  name: string;
  scheduleLabel?: string;
  memberFee: number;
  nonMemberFee: number;
  siblingDiscountPercent: number; // Default 0%, configurable per activity for same sport
  isActive: boolean;
  assignedCoachIds: string[];
}

export interface CoachAccount {
  id: string;
  coachName: string;
  loginId: string; // Issued by Admin (e.g., "COACH-BDM-SWM")
  mobile?: string;
  isActive: boolean;
  assignedActivityIds: string[];
}

export interface BillingMonthOption {
  key: string; // e.g., "2026-11"
  label: string; // e.g., "Nov 2026"
  year: number;
  monthIndex: number; // 0 = Jan, 10 = Nov, 11 = Dec
}

export interface CartLineItem {
  id: string;
  childId: string;
  childName: string;
  activityId: string;
  activityName: string;
  monthKey: string;
  monthLabel: string;
  useHalfMonth: boolean;
}

export interface PricedCartLineItem extends CartLineItem {
  rateTier: 'member' | 'non_member';
  baseAmount: number;
  siblingDiscountAmount: number;
  finalAmount: number;
}

export interface PaymentSubmissionRecord {
  id: string;
  submittedAt: string;
  residentId: string;
  residentName: string;
  houseOrFlatNo: string;
  residentEmail: string;
  membershipNumber?: string;
  utrReference: string;
  utrExtractedViaOcr?: boolean; // Ready for Phase 2 OCR plug-in
  screenshotPath?: string; // Retained for future storage expansion
  items: PricedCartLineItem[];
  totalAmount: number;
  status: PaymentSubmissionStatus;
  rejectionReason?: string;
}

export interface IssuedReceiptRecord {
  receiptNumber: string; // e.g., "RWA/2026-27/0001"
  receiptCategory: 'activity_fee' | 'membership_fee' | 'cancellation_credit';
  issuedAt: string;
  issuedByAdminName: string;
  residentId: string;
  residentName: string;
  houseOrFlatNo: string;
  residentEmail: string;
  membershipNumber?: string;
  paymentMode:
    | 'UPI / UTR Verified'
    | 'Cash'
    | 'Cheque'
    | 'Cancellation Credit';
  utrReference?: string;
  items: PricedCartLineItem[];
  totalAmount: number;
  emailSent: boolean;
  status: 'issued' | 'cancellation_requested' | 'cancelled';
  cancellationReason?: string;
  cancellationRequestedBy?: string;
  cancellationApprovedBy?: string;
  cancellationReceiptNumber?: string; // Special Cancellation Receipt
}

// import type { BillingMonthOption } from '../types/models';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function formatMonthKey(year: number, monthIndex: number): string {
  const mm = String(monthIndex + 1).padStart(2, '0');
  return `${year}-${mm}`;
}

/**
 * Returns the rolling last 3 months up to `referenceDate` (default: today).
 * Strictly prevents selecting future/advance months.
 */
export function getRollingThreeMonths(
  referenceDate: Date = new Date()
): BillingMonthOption[] {
  const result: BillingMonthOption[] = [];
  const baseYear = referenceDate.getFullYear();
  const baseMonth = referenceDate.getMonth();

  for (let offset = 2; offset >= 0; offset--) {
    const d = new Date(baseYear, baseMonth - offset, 1);
    const year = d.getFullYear();
    const monthIndex = d.getMonth();
    result.push({
      key: formatMonthKey(year, monthIndex),
      label: `${MONTH_NAMES[monthIndex]} ${year}`,
      year,
      monthIndex,
    });
  }

  return result;
}

export function isFutureMonthKey(
  monthKey: string,
  referenceDate: Date = new Date()
): boolean {
  const currentKey = formatMonthKey(
    referenceDate.getFullYear(),
    referenceDate.getMonth()
  );
  return monthKey > currentKey;
}