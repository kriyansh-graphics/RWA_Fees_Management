import type{
  ActivityItem,
  CartLineItem,
  PricedCartLineItem,
  ResidentProfile,
} from '../types/models';

export function isYearlyMembershipActive(
  resident: ResidentProfile,
  targetYear: number
): boolean {
  if (resident.membershipType !== 'yearly') return false;
  return resident.membershipYear === targetYear;
}

export function resolveRateTier(
  resident: ResidentProfile,
  targetYear: number
): 'member' | 'non_member' {
  if (resident.membershipType === 'not_applicable' || resident.membershipType === 'none') {
    return 'non_member';
  }

  if (resident.memberRateOverride) {
    return 'member';
  }

  if (resident.membershipType === 'lifetime') {
    return 'member';
  }

  // Yearly membership is strictly calendar-year (Jan - Dec)
  if (isYearlyMembershipActive(resident, targetYear)) {
    return 'member';
  }

  return 'non_member';
}

/**
 * Prices a combined multi-child / multi-activity cart.
 * Applies sibling discount (%) when 2+ children from the same household
 * are billed for the same activity in the same month (or already paid/in cart).
 */
export function calculateCartPricing(
  resident: ResidentProfile,
  activitiesById: Record<string, ActivityItem>,
  items: CartLineItem[],
  alreadyPaidKeys: Set<string> // format: `${childId}::${activityId}::${monthKey}`
): {
  pricedItems: PricedCartLineItem[];
  totalAmount: number;
  blockedDuplicateIds: string[];
} {
  const blockedDuplicateIds: string[] = [];

  // Count how many children in the same activity + month appear in this cart
  const groupCounts = new Map<string, number>();
  for (const item of items) {
    const dupKey = `${item.childId}::${item.activityId}::${item.monthKey}`;
    if (alreadyPaidKeys.has(dupKey)) {
      blockedDuplicateIds.push(item.id);
    }
    const sportMonthKey = `${item.activityId}::${item.monthKey}`;
    groupCounts.set(sportMonthKey, (groupCounts.get(sportMonthKey) ?? 0) + 1);
  }

  // Track first child per (activityId + monthKey) so sibling discount applies to 2nd+ sibling
  const seenFirstForSportMonth = new Set<string>();
  let totalAmount = 0;

  const pricedItems: PricedCartLineItem[] = items.map((item) => {
    const activity = activitiesById[item.activityId];
    const itemYear = Number(item.monthKey.split('-')[0]) || new Date().getFullYear();
    const rateTier = resolveRateTier(resident, itemYear);

    const rawRate = activity
      ? rateTier === 'member'
        ? activity.memberFee
        : activity.nonMemberFee
      : 0;

    const canUseHalfMonth = Boolean(item.useHalfMonth && resident.halfMonthAllowed);
    const baseAmount = canUseHalfMonth ? Math.round(rawRate * 0.5) : rawRate;

    const sportMonthKey = `${item.activityId}::${item.monthKey}`;
    const discountPct = activity?.siblingDiscountPercent ?? 0;
    let siblingDiscountAmount = 0;

    if (!seenFirstForSportMonth.has(sportMonthKey)) {
      seenFirstForSportMonth.add(sportMonthKey);
    } else if (discountPct > 0) {
      siblingDiscountAmount = Math.round((baseAmount * discountPct) / 100);
    }

    const finalAmount = Math.max(0, baseAmount - siblingDiscountAmount);
    totalAmount += finalAmount;

    return {
      ...item,
      useHalfMonth: canUseHalfMonth,
      rateTier,
      baseAmount,
      siblingDiscountAmount,
      finalAmount,
    };
  });

  return { pricedItems, totalAmount, blockedDuplicateIds };
}