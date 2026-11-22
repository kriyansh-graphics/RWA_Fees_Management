import React, { useState, useMemo } from 'react';
import {
  Search,
  CheckCircle,
  Lock,
  Plus,
  Trash2,
  Receipt,
  Ban,
  Award,
} from 'lucide-react';
import type{
  IssuedReceiptRecord,
  MembershipType,
  ResidentProfile,
} from '../../types/models';

interface MembersManagerPageProps {
  residents: ResidentProfile[];
  currentCalendarYear?: number;
  onSaveResidentProfile: (updated: ResidentProfile) => Promise<void>;
  onIssueMembershipReceipt: (payload: {
    resident: ResidentProfile;
    membershipType: 'lifetime' | 'yearly';
    membershipNumber: string;
    membershipYear?: number;
    amountPaid: number;
    paymentMode: 'Cash' | 'Cheque' | 'UPI / UTR Verified';
  }) => Promise<IssuedReceiptRecord>;
  onOpenReceipt: (receipt: IssuedReceiptRecord) => void;
}

type MemberFilterTab =
  | 'pending'
  | 'lifetime'
  | 'yearly_active'
  | 'renewal_due'
  | 'non_member'
  | 'not_applicable';

export const MembersManagerPage: React.FC<MembersManagerPageProps> = ({
  residents,
  currentCalendarYear = new Date().getFullYear(),
  onSaveResidentProfile,
  onIssueMembershipReceipt,
  onOpenReceipt,
}) => {
  const [activeTab, setActiveTab] = useState<MemberFilterTab>('pending');
  const [search, setSearch] = useState('');
  const [editingResident, setEditingResident] = useState<ResidentProfile | null>(null);
  const [newChildName, setNewChildName] = useState('');
  const [newChildNote, setNewChildNote] = useState('');

  // Optional Membership Fee Receipt fields inside the editor
  const [collectMembershipFee, setCollectMembershipFee] = useState(false);
  const [membershipFeeAmount, setMembershipFeeAmount] = useState('1000');
  const [membershipPayMode, setMembershipPayMode] = useState<
    'Cash' | 'Cheque' | 'UPI / UTR Verified'
  >('Cash');
  const [saving, setSaving] = useState(false);

  const filteredResidents = useMemo(() => {
    return residents.filter((r) => {
      if (activeTab === 'pending' && r.approvalStatus !== 'pending_verification') return false;
      if (
        activeTab === 'lifetime' &&
        !(r.approvalStatus === 'approved' && r.membershipType === 'lifetime')
      ) {
        return false;
      }
      if (
        activeTab === 'yearly_active' &&
        !(
          r.approvalStatus === 'approved' &&
          r.membershipType === 'yearly' &&
          r.membershipYear === currentCalendarYear
        )
      ) {
        return false;
      }
      if (
        activeTab === 'renewal_due' &&
        !(
          r.approvalStatus === 'approved' &&
          r.membershipType === 'yearly' &&
          r.membershipYear !== currentCalendarYear
        )
      ) {
        return false;
      }
      if (
        activeTab === 'non_member' &&
        !(r.approvalStatus === 'approved' && r.membershipType === 'none')
      ) {
        return false;
      }
      if (
        activeTab === 'not_applicable' &&
        !(r.approvalStatus === 'approved' && r.membershipType === 'not_applicable')
      ) {
        return false;
      }

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        r.fullName.toLowerCase().includes(q) ||
        r.houseOrFlatNo.toLowerCase().includes(q) ||
        r.mobile.includes(q) ||
        (r.membershipNumber || '').toLowerCase().includes(q)
      );
    });
  }, [residents, activeTab, search, currentCalendarYear]);

  const handleOpenEditor = (resident: ResidentProfile) => {
    setEditingResident({
      ...resident,
      children: [...resident.children],
    });
    setNewChildName('');
    setNewChildNote('');
    setCollectMembershipFee(false);
  };

  const handleAddChildToEditor = () => {
    if (!editingResident || !newChildName.trim()) return;
    setEditingResident({
      ...editingResident,
      children: [
        ...editingResident.children,
        {
          id: crypto.randomUUID(),
          householdUserId: editingResident.id,
          name: newChildName.trim(),
          ageOrBatchNote: newChildNote.trim() || undefined,
          isLocked: true, // Locked from individual editing once approved
        },
      ],
    });
    setNewChildName('');
    setNewChildNote('');
  };

  const handleSaveChanges = async () => {
    if (!editingResident) return;
    setSaving(true);
    try {
      const normalized: ResidentProfile = {
        ...editingResident,
        approvalStatus: 'approved',
        membershipNumber:
          editingResident.membershipType === 'lifetime' ||
          editingResident.membershipType === 'yearly'
            ? editingResident.membershipNumber?.trim()
            : undefined,
        membershipYear:
          editingResident.membershipType === 'yearly'
            ? editingResident.membershipYear || currentCalendarYear
            : undefined,
        // Lock all child records once profile is approved
        children: editingResident.children.map((c) => ({ ...c, isLocked: true })),
      };

      await onSaveResidentProfile(normalized);

      if (
        collectMembershipFee &&
        (normalized.membershipType === 'lifetime' || normalized.membershipType === 'yearly') &&
        normalized.membershipNumber
      ) {
        const receipt = await onIssueMembershipReceipt({
          resident: normalized,
          membershipType: normalized.membershipType,
          membershipNumber: normalized.membershipNumber,
          membershipYear: normalized.membershipYear,
          amountPaid: Number(membershipFeeAmount) || 0,
          paymentMode: membershipPayMode,
        });
        setEditingResident(null);
        onOpenReceipt(receipt);
        return;
      }

      setEditingResident(null);
    } finally {
      setSaving(false);
    }
  };

  const TABS: { key: MemberFilterTab; label: string }[] = [
    { key: 'pending', label: 'Pending Approval' },
    { key: 'lifetime', label: 'Lifetime Members' },
    { key: 'yearly_active', label: `Yearly (${currentCalendarYear})` },
    { key: 'renewal_due', label: 'Renewal Due' },
    { key: 'non_member', label: 'Non-Members' },
    { key: 'not_applicable', label: 'Not Applicable' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Member, Non-Member & Verification Manager
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Approve pending logins, assign Lifetime or Jan–Dec Yearly Membership Numbers, mark Not
          Applicable accounts, and manage locked child profiles.
        </p>
      </div>

      {/* Filter Tabs + Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === t.key
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, flat, mobile, mem #..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
          />
        </div>
      </div>

      {/* Resident List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredResidents.map((r) => {
          const isYearlyDue =
            r.membershipType === 'yearly' && r.membershipYear !== currentCalendarYear;

          return (
            <div
              key={r.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{r.fullName}</h3>
                    <p className="text-xs text-slate-500">
                      Flat {r.houseOrFlatNo} • {r.mobile} • {r.email}
                    </p>
                  </div>

                  {/* Membership Status Pill */}
                  {r.approvalStatus === 'pending_verification' ? (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Pending Approval
                    </span>
                  ) : r.membershipType === 'lifetime' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      <Award className="w-3 h-3" />
                      Lifetime #{r.membershipNumber}
                    </span>
                  ) : r.membershipType === 'yearly' ? (
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        isYearlyDue
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      Yearly #{r.membershipNumber} ({r.membershipYear})
                    </span>
                  ) : r.membershipType === 'not_applicable' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      <Ban className="w-3 h-3" />
                      Not Applicable
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      Approved Non-Member
                    </span>
                  )}
                </div>

                {/* Locked Children Chips */}
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                    <span className="font-semibold text-slate-700">
                      Household Children ({r.children.length})
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Admin-Managed
                    </span>
                  </div>
                  {r.children.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {r.children.map((c) => (
                        <span
                          key={c.id}
                          className="text-xs bg-white border border-slate-200 px-2.5 py-1 rounded-lg font-medium text-slate-800"
                        >
                          {c.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">No children added yet.</p>
                  )}
                </div>

                {/* Active Overrides Badges */}
                {(r.memberRateOverride || r.halfMonthAllowed) && (
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    {r.memberRateOverride && (
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                        Member Rate Override Enabled
                      </span>
                    )}
                    {r.halfMonthAllowed && (
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                        Half-Month Fee Allowed
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleOpenEditor(r)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  {r.approvalStatus === 'pending_verification'
                    ? 'Verify & Configure Profile'
                    : 'Edit Membership & Children'}
                </button>
              </div>
            </div>
          );
        })}

        {filteredResidents.length === 0 && (
          <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500">
            No resident profiles found under this filter.
          </div>
        )}
      </div>

      {/* Modal: Approve / Configure Membership, Overrides & Children */}
      {editingResident && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-slate-200 p-6 space-y-5 my-8">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                Configure Resident: {editingResident.fullName} (Flat {editingResident.houseOrFlatNo})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Assign membership eligibility, manage locked child names, and set fee allowances.
              </p>
            </div>

            {/* Membership Category Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Membership Classification
                </label>
                <select
                  value={editingResident.membershipType}
                  onChange={(e) =>
                    setEditingResident({
                      ...editingResident,
                      membershipType: e.target.value as MembershipType,
                    })
                  }
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 font-medium"
                >
                  <option value="lifetime">RWA Lifetime Member (Member Rates)</option>
                  <option value="yearly">RWA Yearly Member (Jan–Dec Calendar Year)</option>
                  <option value="none">Approved Non-Member (Higher Rates)</option>
                  <option value="not_applicable">
                    Not Applicable for Membership (Blocked from Membership/Renewal)
                  </option>
                </select>
              </div>

              {(editingResident.membershipType === 'lifetime' ||
                editingResident.membershipType === 'yearly') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    RWA Membership Number (Admin Assigned)
                  </label>
                  <input
                    type="text"
                    value={editingResident.membershipNumber || ''}
                    onChange={(e) =>
                      setEditingResident({
                        ...editingResident,
                        membershipNumber: e.target.value,
                      })
                    }
                    placeholder="e.g., RWA-LM-104"
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 font-mono"
                  />
                </div>
              )}

              {editingResident.membershipType === 'yearly' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Valid Calendar Year (Jan 1 – Dec 31)
                  </label>
                  <input
                    type="number"
                    value={editingResident.membershipYear || currentCalendarYear}
                    onChange={(e) =>
                      setEditingResident({
                        ...editingResident,
                        membershipYear: Number(e.target.value),
                      })
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              )}
            </div>

            {/* Optional: Issue Membership Fee Receipt Immediately */}
            {(editingResident.membershipType === 'lifetime' ||
              editingResident.membershipType === 'yearly') && (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-3">
                <label className="inline-flex items-center gap-2 text-xs font-bold text-emerald-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={collectMembershipFee}
                    onChange={(e) => setCollectMembershipFee(e.target.checked)}
                  />
                  <Receipt className="w-4 h-4" />
                  Record Membership Fee Payment & Auto-Email Membership Receipt
                </label>

                {collectMembershipFee && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Membership Fee Amount (₹)
                      </label>
                      <input
                        type="number"
                        value={membershipFeeAmount}
                        onChange={(e) => setMembershipFeeAmount(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Payment Mode
                      </label>
                      <select
                        value={membershipPayMode}
                        onChange={(e) =>
                          setMembershipPayMode(
                            e.target.value as 'Cash' | 'Cheque' | 'UPI / UTR Verified'
                          )
                        }
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                        <option value="UPI / UTR Verified">UPI / UTR Verified</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Admin Fee Allowances */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
              <p className="font-bold text-slate-800">Special Fee Allowances (Admin Controlled)</p>
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(editingResident.memberRateOverride)}
                  onChange={(e) =>
                    setEditingResident({
                      ...editingResident,
                      memberRateOverride: e.target.checked,
                    })
                  }
                />
                Allow Member Fee Rate even if Yearly Renewal is pending
              </label>
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(editingResident.halfMonthAllowed)}
                  onChange={(e) =>
                    setEditingResident({
                      ...editingResident,
                      halfMonthAllowed: e.target.checked,
                    })
                  }
                />
                Allow Half-Month Fee option for this household
              </label>
            </div>

            {/* Locked Household Children Editor */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  Children / Participants (Locked from Resident Editing)
                </label>
                <span className="text-[11px] text-slate-500">Only Admin can modify</span>
              </div>

              <div className="space-y-1.5">
                {editingResident.children.map((child) => (
                  <div
                    key={child.id}
                    className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs"
                  >
                    <span>
                      <strong>{child.name}</strong>
                      {child.ageOrBatchNote ? ` (${child.ageOrBatchNote})` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingResident({
                          ...editingResident,
                          children: editingResident.children.filter((c) => c.id !== child.id),
                        })
                      }
                      className="text-rose-600 hover:text-rose-800 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChildName}
                  onChange={(e) => setNewChildName(e.target.value)}
                  placeholder="Child full name"
                  className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2"
                />
                <input
                  type="text"
                  value={newChildNote}
                  onChange={(e) => setNewChildNote(e.target.value)}
                  placeholder="Age / Note (optional)"
                  className="w-36 text-xs border border-slate-300 rounded-lg px-3 py-2"
                />
                <button
                  type="button"
                  onClick={handleAddChildToEditor}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingResident(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveChanges}
                className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                {saving ? 'Saving...' : 'Save & Approve Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};