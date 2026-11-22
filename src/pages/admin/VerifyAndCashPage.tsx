// import React, { useState, useMemo } from 'react';
// import {
//   CheckCircle2,
//   XCircle,
//   Banknote,
//   ExternalLink,
//   Plus,
//   Trash2,
//   AlertTriangle,
// } from 'lucide-react';
// import type{
//   ActivityItem,
//   CartLineItem,
//   IssuedReceiptRecord,
//   PaymentSubmissionRecord,
//   ResidentProfile,
// } from '../../types/models';

// import { getRollingThreeMonths } from '../../utils/monthWindow';
// import { calculateCartPricing } from '../../utils/feeCalculator';

// interface VerifyAndCashPageProps {
//   pendingSubmissions: PaymentSubmissionRecord[];
//   residents: ResidentProfile[];
//   activities: ActivityItem[];
//   alreadyPaidKeys: Set<string>;
//   onApproveSubmission: (submissionId: string) => Promise<IssuedReceiptRecord>;
//   onRejectSubmission: (submissionId: string, reason: string) => Promise<void>;
//   onRecordCashPayment: (payload: {
//     resident: ResidentProfile;
//     items: CartLineItem[];
//     paymentMode: 'Cash' | 'Cheque';
//     referenceNote?: string;
//     overrideMemberRate: boolean;
//   }) => Promise<IssuedReceiptRecord>;
//   onOpenReceipt: (receipt: IssuedReceiptRecord) => void;
// }

// export const VerifyAndCashPage: React.FC<VerifyAndCashPageProps> = ({
//   pendingSubmissions,
//   residents,
//   activities,
//   alreadyPaidKeys,
//   onApproveSubmission,
//   onRejectSubmission,
//   onRecordCashPayment,
//   onOpenReceipt,
// }) => {
//   const [activeTab, setActiveTab] = useState<'verify_utr' | 'cash_entry'>('verify_utr');
//   const [rejectingId, setRejectingId] = useState<string | null>(null);
//   const [rejectReason, setRejectReason] = useState('');
//   const [processingId, setProcessingId] = useState<string | null>(null);

//   // Cash Entry Form State
//   const [selectedResidentId, setSelectedResidentId] = useState('');
//   const [selectedChildId, setSelectedChildId] = useState('');
//   const [selectedActivityId, setSelectedActivityId] = useState('');
//   const [selectedMonthKey, setSelectedMonthKey] = useState('');
//   const [useHalfMonth, setUseHalfMonth] = useState(false);
//   const [overrideMemberRate, setOverrideMemberRate] = useState(false);
//   const [paymentMode, setPaymentMode] = useState<'Cash' | 'Cheque'>('Cash');
//   const [referenceNote, setReferenceNote] = useState('');
//   const [cashCart, setCashCart] = useState<CartLineItem[]>([]);
//   const [cashSubmitting, setCashSubmitting] = useState(false);

//   const monthOptions = useMemo(() => getRollingThreeMonths(new Date()), []);
//   const activitiesById = useMemo(
//     () => Object.fromEntries(activities.map((a) => [a.id, a])),
//     [activities]
//   );

//   const selectedResident = useMemo(
//     () => residents.find((r) => r.id === selectedResidentId),
//     [residents, selectedResidentId]
//   );

//   const effectiveResidentForPricing = useMemo(() => {
//     if (!selectedResident) return undefined;
//     return {
//       ...selectedResident,
//       memberRateOverride: selectedResident.memberRateOverride || overrideMemberRate,
//     };
//   }, [selectedResident, overrideMemberRate]);

//   const cashPricing = useMemo(() => {
//     if (!effectiveResidentForPricing) {
//       return { pricedItems: [], totalAmount: 0, blockedDuplicateIds: [] };
//     }
//     return calculateCartPricing(
//       effectiveResidentForPricing,
//       activitiesById,
//       cashCart,
//       alreadyPaidKeys
//     );
//   }, [effectiveResidentForPricing, activitiesById, cashCart, alreadyPaidKeys]);

//   const handleAddCashLine = () => {
//     if (!selectedResident || !selectedChildId || !selectedActivityId || !selectedMonthKey) return;
//     const child = selectedResident.children.find((c) => c.id === selectedChildId);
//     const activity = activitiesById[selectedActivityId];
//     const month = monthOptions.find((m) => m.key === selectedMonthKey);
//     if (!child || !activity || !month) return;

//     const dupKey = `${child.id}::${activity.id}::${month.key}`;
//     if (alreadyPaidKeys.has(dupKey)) {
//       alert('Duplicate blocked: This child, activity, and month is already paid.');
//       return;
//     }

//     const existsInCart = cashCart.some(
//       (i) => i.childId === child.id && i.activityId === activity.id && i.monthKey === month.key
//     );
//     if (existsInCart) return;

//     setCashCart((prev) => [
//       ...prev,
//       {
//         id: `${Date.now()}-${Math.random()}`,
//         childId: child.id,
//         childName: child.name,
//         activityId: activity.id,
//         activityName: activity.name,
//         monthKey: month.key,
//         monthLabel: month.label,
//         useHalfMonth,
//       },
//     ]);
//     setUseHalfMonth(false);
//   };

//   const handleAcceptCashAndEmail = async () => {
//     if (!selectedResident || cashCart.length === 0) return;
//     setCashSubmitting(true);
//     try {
//       const receipt = await onRecordCashPayment({
//         resident: selectedResident,
//         items: cashCart,
//         paymentMode,
//         referenceNote: referenceNote.trim() || undefined,
//         overrideMemberRate,
//       });
//       setCashCart([]);
//       setReferenceNote('');
//       onOpenReceipt(receipt);
//     } finally {
//       setCashSubmitting(false);
//     }
//   };

//   return (
//     <div className="space-y-6">
//       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//         <div>
//           <h1 className="text-xl font-bold text-slate-900">
//             Payment Verification & Cash Collection
//           </h1>
//           <p className="text-xs text-slate-500 mt-0.5">
//             Verify parent UTR/screenshot submissions before receipt issuance, or accept offline cash
//             with immediate email receipt.
//           </p>
//         </div>

//         <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
//           <button
//             type="button"
//             onClick={() => setActiveTab('verify_utr')}
//             className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
//               activeTab === 'verify_utr'
//                 ? 'bg-slate-900 text-white shadow-xs'
//                 : 'text-slate-600 hover:text-slate-900'
//             }`}
//           >
//             UTR Verification Queue ({pendingSubmissions.length})
//           </button>
//           <button
//             type="button"
//             onClick={() => setActiveTab('cash_entry')}
//             className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
//               activeTab === 'cash_entry'
//                 ? 'bg-slate-900 text-white shadow-xs'
//                 : 'text-slate-600 hover:text-slate-900'
//             }`}
//           >
//             Offline / Cash Receipt Entry
//           </button>
//         </div>
//       </div>

//       {activeTab === 'verify_utr' ? (
//         <div className="space-y-4">
//           {pendingSubmissions.length === 0 ? (
//             <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-500">
//               No pending UTR/screenshot submissions waiting for verification.
//             </div>
//           ) : (
//             pendingSubmissions.map((sub) => (
//               <div
//                 key={sub.id}
//                 className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4"
//               >
//                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
//                   <div>
//                     <div className="flex items-center gap-2">
//                       <span className="font-bold text-slate-900 text-sm">{sub.residentName}</span>
//                       <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
//                         Flat {sub.houseOrFlatNo}
//                       </span>
//                       {sub.membershipNumber && (
//                         <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-medium">
//                           Mem #{sub.membershipNumber}
//                         </span>
//                       )}
//                     </div>
//                     <p className="text-xs text-slate-500 mt-1">
//                       Submitted: {new Date(sub.submittedAt).toLocaleString('en-IN')} • UTR / Ref:{' '}
//                       <span className="font-mono font-bold text-slate-900">{sub.utrReference}</span>
//                     </p>
//                   </div>

//                   {/* <div className="flex items-center gap-3">
//                     {sub.screenshotUrl && (
//                       <a
//                         href={sub.screenshotUrl}
//                         target="_blank"
//                         rel="noreferrer"
//                         className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg border border-blue-200"
//                       >
//                         <ExternalLink className="w-3.5 h-3.5" />
//                         View Payment Screenshot
//                       </a>
//                     )}
//                     <div className="text-right">
//                       <span className="text-[11px] text-slate-500 block">Claimed Amount</span>
//                       <span className="text-base font-bold text-slate-900">
//                         ₹{sub.totalAmount.toLocaleString('en-IN')}
//                       </span>
//                     </div>
//                   </div> */}
//                 </div>

//                 {/* Combined Multi-Child / Multi-Activity Breakdown */}
//                 <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-1.5">
//                   {sub.items.map((item) => (
//                     <div
//                       key={item.id}
//                       className="flex items-center justify-between text-xs text-slate-700"
//                     >
//                       <span>
//                         <strong>{item.childName}</strong> — {item.activityName} ({item.monthLabel})
//                         {item.useHalfMonth ? ' [Half Month]' : ''}
//                       </span>
//                       <span className="font-semibold">
//                         ₹{item.finalAmount.toLocaleString('en-IN')}
//                       </span>
//                     </div>
//                   ))}
//                 </div>

//                 {/* Reject Box or Verify Buttons */}
//                 {rejectingId === sub.id ? (
//                   <div className="flex flex-col sm:flex-row gap-2 bg-rose-50 p-3 rounded-xl border border-rose-200">
//                     <input
//                       type="text"
//                       value={rejectReason}
//                       onChange={(e) => setRejectReason(e.target.value)}
//                       placeholder="Enter reason (e.g., UTR not matched in bank statement)"
//                       className="flex-1 text-xs bg-white border border-rose-300 rounded-lg px-3 py-2"
//                     />
//                     <button
//                       type="button"
//                       disabled={!rejectReason.trim() || processingId === sub.id}
//                       onClick={async () => {
//                         setProcessingId(sub.id);
//                         await onRejectSubmission(sub.id, rejectReason.trim());
//                         setRejectingId(null);
//                         setRejectReason('');
//                         setProcessingId(null);
//                       }}
//                       className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
//                     >
//                       Confirm Reject
//                     </button>
//                     <button
//                       type="button"
//                       onClick={() => {
//                         setRejectingId(null);
//                         setRejectReason('');
//                       }}
//                       className="px-3 py-2 bg-white text-slate-600 text-xs font-semibold rounded-lg border border-slate-200 cursor-pointer"
//                     >
//                       Cancel
//                     </button>
//                   </div>
//                 ) : (
//                   <div className="flex flex-wrap items-center justify-end gap-2.5">
//                     <button
//                       type="button"
//                       onClick={() => setRejectingId(sub.id)}
//                       className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
//                     >
//                       <XCircle className="w-4 h-4" />
//                       Reject / Invalid UTR
//                     </button>
//                     <button
//                       type="button"
//                       disabled={processingId === sub.id}
//                       onClick={async () => {
//                         setProcessingId(sub.id);
//                         try {
//                           const issued = await onApproveSubmission(sub.id);
//                           onOpenReceipt(issued);
//                         } finally {
//                           setProcessingId(null);
//                         }
//                       }}
//                       className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
//                     >
//                       <CheckCircle2 className="w-4 h-4" />
//                       {processingId === sub.id
//                         ? 'Issuing Receipt...'
//                         : 'Verify Payment & Auto-Email Receipt'}
//                     </button>
//                   </div>
//                 )}
//               </div>
//             ))
//           )}
//         </div>
//       ) : (
//         /* Tab B: Offline Cash Entry */
//         <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div>
//               <label className="block text-xs font-semibold text-slate-700 mb-1">
//                 Select Approved Resident (Member / Non-Member)
//               </label>
//               <select
//                 value={selectedResidentId}
//                 onChange={(e) => {
//                   setSelectedResidentId(e.target.value);
//                   setSelectedChildId('');
//                   setCashCart([]);
//                   setOverrideMemberRate(false);
//                 }}
//                 className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
//               >
//                 <option value="">-- Choose Resident / Flat --</option>
//                 {residents
//                   .filter((r) => r.approvalStatus === 'approved')
//                   .map((r) => (
//                     <option key={r.id} value={r.id}>
//                       Flat {r.houseOrFlatNo} — {r.fullName} ({r.membershipType.toUpperCase()})
//                     </option>
//                   ))}
//               </select>
//             </div>

//             {selectedResident && (
//               <div className="flex flex-wrap items-center gap-4 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-xs">
//                 <label className="inline-flex items-center gap-2 font-medium text-slate-800 cursor-pointer">
//                   <input
//                     type="checkbox"
//                     checked={overrideMemberRate}
//                     onChange={(e) => setOverrideMemberRate(e.target.checked)}
//                     className="rounded border-slate-300"
//                   />
//                   Admin Override: Apply Member Fee Rate (for unrenewed yearly member)
//                 </label>
//               </div>
//             )}
//           </div>

//           {selectedResident && (
//             <>
//               <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-200">
//                 <div>
//                   <label className="block text-xs font-semibold text-slate-700 mb-1">
//                     Child / Participant
//                   </label>
//                   <select
//                     value={selectedChildId}
//                     onChange={(e) => setSelectedChildId(e.target.value)}
//                     className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2"
//                   >
//                     <option value="">-- Select Child --</option>
//                     {selectedResident.children.map((c) => (
//                       <option key={c.id} value={c.id}>
//                         {c.name}
//                       </option>
//                     ))}
//                   </select>
//                 </div>

//                 <div>
//                   <label className="block text-xs font-semibold text-slate-700 mb-1">
//                     Activity / Sport
//                   </label>
//                   <select
//                     value={selectedActivityId}
//                     onChange={(e) => setSelectedActivityId(e.target.value)}
//                     className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2"
//                   >
//                     <option value="">-- Select Activity --</option>
//                     {activities
//                       .filter((a) => a.isActive)
//                       .map((a) => (
//                         <option key={a.id} value={a.id}>
//                           {a.name} (Mem ₹{a.memberFee} / Non-Mem ₹{a.nonMemberFee})
//                         </option>
//                       ))}
//                   </select>
//                 </div>

//                 <div>
//                   <label className="block text-xs font-semibold text-slate-700 mb-1">
//                     Month (Past / Current Only)
//                   </label>
//                   <select
//                     value={selectedMonthKey}
//                     onChange={(e) => setSelectedMonthKey(e.target.value)}
//                     className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2"
//                   >
//                     <option value="">-- Select Month --</option>
//                     {monthOptions.map((m) => (
//                       <option key={m.key} value={m.key}>
//                         {m.label}
//                       </option>
//                     ))}
//                   </select>
//                 </div>

//                 <div className="flex items-center justify-between gap-2">
//                   <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
//                     <input
//                       type="checkbox"
//                       checked={useHalfMonth}
//                       onChange={(e) => setUseHalfMonth(e.target.checked)}
//                     />
//                     Half Month
//                   </label>
//                   <button
//                     type="button"
//                     onClick={handleAddCashLine}
//                     className="inline-flex items-center gap-1 px-3 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 cursor-pointer"
//                   >
//                     <Plus className="w-3.5 h-3.5" />
//                     Add
//                   </button>
//                 </div>
//               </div>

//               {cashCart.length > 0 && (
//                 <div className="space-y-4">
//                   <div className="border border-slate-200 rounded-xl overflow-hidden">
//                     <table className="w-full text-xs">
//                       <thead className="bg-slate-50 text-slate-600 text-left">
//                         <tr>
//                           <th className="px-4 py-2.5">Child</th>
//                           <th className="px-4 py-2.5">Activity & Month</th>
//                           <th className="px-4 py-2.5">Applied Rate</th>
//                           <th className="px-4 py-2.5 text-right">Amount</th>
//                           <th className="px-4 py-2.5"></th>
//                         </tr>
//                       </thead>
//                       <tbody className="divide-y divide-slate-100">
//                         {cashPricing.pricedItems.map((item) => (
//                           <tr key={item.id}>
//                             <td className="px-4 py-2.5 font-semibold">{item.childName}</td>
//                             <td className="px-4 py-2.5">
//                               {item.activityName} — {item.monthLabel}{' '}
//                               {item.useHalfMonth && '(Half Month)'}
//                             </td>
//                             <td className="px-4 py-2.5 capitalize">
//                               {item.rateTier === 'member' ? 'Member Rate' : 'Non-Member Rate'}
//                               {item.siblingDiscountAmount > 0 &&
//                                 ` (-₹${item.siblingDiscountAmount} Sibling)`}
//                             </td>
//                             <td className="px-4 py-2.5 text-right font-bold">
//                               ₹{item.finalAmount.toLocaleString('en-IN')}
//                             </td>
//                             <td className="px-4 py-2.5 text-right">
//                               <button
//                                 type="button"
//                                 onClick={() =>
//                                   setCashCart((prev) => prev.filter((c) => c.id !== item.id))
//                                 }
//                                 className="text-rose-600 hover:text-rose-800 cursor-pointer"
//                               >
//                                 <Trash2 className="w-3.5 h-3.5" />
//                               </button>
//                             </td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>

//                   <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl">
//                     <div className="flex flex-wrap items-center gap-3">
//                       <select
//                         value={paymentMode}
//                         onChange={(e) => setPaymentMode(e.target.value as 'Cash' | 'Cheque')}
//                         className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 font-semibold"
//                       >
//                         <option value="Cash">Cash Received</option>
//                         <option value="Cheque">Cheque Received</option>
//                       </select>
//                       <input
//                         type="text"
//                         value={referenceNote}
//                         onChange={(e) => setReferenceNote(e.target.value)}
//                         placeholder="Optional cheque no. / note"
//                         className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-2"
//                       />
//                     </div>

//                     <button
//                       type="button"
//                       disabled={cashSubmitting}
//                       onClick={handleAcceptCashAndEmail}
//                       className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
//                     >
//                       <Banknote className="w-4 h-4" />
//                       {cashSubmitting
//                         ? 'Generating Receipt...'
//                         : `Accept ₹${cashPricing.totalAmount.toLocaleString('en-IN')} & Email Receipt Immediately`}
//                     </button>
//                   </div>
//                 </div>
//               )}
//             </>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };




import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  Banknote,
  Plus,
  Trash2,
} from 'lucide-react';
import type {
  ActivityItem,
  CartLineItem,
  IssuedReceiptRecord,
  PaymentSubmissionRecord,
  ResidentProfile,
} from '../../types/models';
import { getRollingThreeMonths } from '../../utils/monthWindow';
import { calculateCartPricing } from '../../utils/feeCalculator';

interface VerifyAndCashPageProps {
  pendingSubmissions: PaymentSubmissionRecord[];
  residents: ResidentProfile[];
  activities: ActivityItem[];
  alreadyPaidKeys: Set<string>;
  onApproveSubmission: (submissionId: string) => Promise<IssuedReceiptRecord>;
  onRejectSubmission: (submissionId: string, reason: string) => Promise<void>;
  onRecordCashPayment: (payload: {
    resident: ResidentProfile;
    items: CartLineItem[];
    paymentMode: 'Cash' | 'Cheque';
    referenceNote?: string;
    overrideMemberRate: boolean;
  }) => Promise<IssuedReceiptRecord>;
  onOpenReceipt: (receipt: IssuedReceiptRecord) => void;
}

export const VerifyAndCashPage: React.FC<VerifyAndCashPageProps> = ({
  pendingSubmissions,
  residents,
  activities,
  alreadyPaidKeys,
  onApproveSubmission,
  onRejectSubmission,
  onRecordCashPayment,
  onOpenReceipt,
}) => {
  const [activeTab, setActiveTab] = useState<'verify_utr' | 'cash_entry'>('verify_utr');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Cash Entry Form State
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [selectedChildId, setSelectedChildId] = useState('');
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [selectedMonthKey, setSelectedMonthKey] = useState('');
  const [useHalfMonth, setUseHalfMonth] = useState(false);
  const [overrideMemberRate, setOverrideMemberRate] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Cheque'>('Cash');
  const [referenceNote, setReferenceNote] = useState('');
  const [cashCart, setCashCart] = useState<CartLineItem[]>([]);
  const [cashSubmitting, setCashSubmitting] = useState(false);

  const monthOptions = useMemo(() => getRollingThreeMonths(new Date()), []);
  const activitiesById = useMemo(
    () => Object.fromEntries(activities.map((a) => [a.id, a])),
    [activities]
  );

  const selectedResident = useMemo(
    () => residents.find((r) => r.id === selectedResidentId),
    [residents, selectedResidentId]
  );

  const effectiveResidentForPricing = useMemo(() => {
    if (!selectedResident) return undefined;
    return {
      ...selectedResident,
      memberRateOverride: selectedResident.memberRateOverride || overrideMemberRate,
    };
  }, [selectedResident, overrideMemberRate]);

  const cashPricing = useMemo(() => {
    if (!effectiveResidentForPricing) {
      return { pricedItems: [], totalAmount: 0, blockedDuplicateIds: [] };
    }
    return calculateCartPricing(
      effectiveResidentForPricing,
      activitiesById,
      cashCart,
      alreadyPaidKeys
    );
  }, [effectiveResidentForPricing, activitiesById, cashCart, alreadyPaidKeys]);

  const handleAddCashLine = () => {
    if (!selectedResident || !selectedChildId || !selectedActivityId || !selectedMonthKey) return;
    const child = selectedResident.children.find((c) => c.id === selectedChildId);
    const activity = activitiesById[selectedActivityId];
    const month = monthOptions.find((m) => m.key === selectedMonthKey);
    if (!child || !activity || !month) return;

    const dupKey = `${child.id}::${activity.id}::${month.key}`;
    if (alreadyPaidKeys.has(dupKey)) {
      alert('Duplicate blocked: This child, activity, and month is already paid.');
      return;
    }

    const existsInCart = cashCart.some(
      (i) => i.childId === child.id && i.activityId === activity.id && i.monthKey === month.key
    );
    if (existsInCart) return;

    setCashCart((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        childId: child.id,
        childName: child.name,
        activityId: activity.id,
        activityName: activity.name,
        monthKey: month.key,
        monthLabel: month.label,
        useHalfMonth,
      },
    ]);
    setUseHalfMonth(false);
  };

  const handleAcceptCashAndEmail = async () => {
    if (!selectedResident || cashCart.length === 0) return;
    setCashSubmitting(true);
    try {
      const receipt = await onRecordCashPayment({
        resident: selectedResident,
        items: cashCart,
        paymentMode,
        referenceNote: referenceNote.trim() || undefined,
        overrideMemberRate,
      });
      setCashCart([]);
      setReferenceNote('');
      onOpenReceipt(receipt);
    } finally {
      setCashSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Payment Verification &amp; Cash Collection
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verify parent UTR submissions before receipt issuance, or accept offline cash with
            immediate email receipt.
          </p>
        </div>

        <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('verify_utr')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'verify_utr'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            UTR Verification Queue ({pendingSubmissions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cash_entry')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'cash_entry'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Offline / Cash Receipt Entry
          </button>
        </div>
      </div>

      {activeTab === 'verify_utr' ? (
        <div className="space-y-4">
          {pendingSubmissions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-500">
              No pending UTR submissions waiting for verification.
            </div>
          ) : (
            pendingSubmissions.map((sub) => (
              <div
                key={sub.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{sub.residentName}</span>
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                        Flat {sub.houseOrFlatNo}
                      </span>
                      {sub.membershipNumber && (
                        <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-medium">
                          Mem #{sub.membershipNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Submitted: {new Date(sub.submittedAt).toLocaleString('en-IN')} • UTR / Ref:{' '}
                      <span className="font-mono font-bold text-slate-900">{sub.utrReference}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-500 block">Claimed Amount</span>
                    <span className="text-base font-bold text-slate-900">
                      ₹{sub.totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Combined Multi-Child / Multi-Activity Breakdown */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-1.5">
                  {sub.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs text-slate-700"
                    >
                      <span>
                        <strong>{item.childName}</strong> — {item.activityName} ({item.monthLabel})
                        {item.useHalfMonth ? ' [Half Month]' : ''}
                      </span>
                      <span className="font-semibold">
                        ₹{item.finalAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Reject Box or Verify Buttons */}
                {rejectingId === sub.id ? (
                  <div className="flex flex-col sm:flex-row gap-2 bg-rose-50 p-3 rounded-xl border border-rose-200">
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Enter reason (e.g., UTR not matched in bank statement)"
                      className="flex-1 text-xs bg-white border border-rose-300 rounded-lg px-3 py-2"
                    />
                    <button
                      type="button"
                      disabled={!rejectReason.trim() || processingId === sub.id}
                      onClick={async () => {
                        setProcessingId(sub.id);
                        await onRejectSubmission(sub.id, rejectReason.trim());
                        setRejectingId(null);
                        setRejectReason('');
                        setProcessingId(null);
                      }}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      Confirm Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingId(null);
                        setRejectReason('');
                      }}
                      className="px-3 py-2 bg-white text-slate-600 text-xs font-semibold rounded-lg border border-slate-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setRejectingId(sub.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject / Invalid UTR
                    </button>
                    <button
                      type="button"
                      disabled={processingId === sub.id}
                      onClick={async () => {
                        setProcessingId(sub.id);
                        try {
                          const issued = await onApproveSubmission(sub.id);
                          onOpenReceipt(issued);
                        } finally {
                          setProcessingId(null);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {processingId === sub.id
                        ? 'Issuing Receipt...'
                        : 'Verify Payment & Auto-Email Receipt'}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        /* Tab B: Offline Cash Entry */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Approved Resident (Member / Non-Member)
              </label>
              <select
                value={selectedResidentId}
                onChange={(e) => {
                  setSelectedResidentId(e.target.value);
                  setSelectedChildId('');
                  setCashCart([]);
                  setOverrideMemberRate(false);
                }}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
              >
                <option value="">-- Choose Resident / Flat --</option>
                {residents
                  .filter((r) => r.approvalStatus === 'approved')
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      Flat {r.houseOrFlatNo} — {r.fullName} ({r.membershipType.toUpperCase()})
                    </option>
                  ))}
              </select>
            </div>

            {selectedResident && (
              <div className="flex flex-wrap items-center gap-4 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-xs">
                <label className="inline-flex items-center gap-2 font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overrideMemberRate}
                    onChange={(e) => setOverrideMemberRate(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Admin Override: Apply Member Fee Rate (for unrenewed yearly member)
                </label>
              </div>
            )}
          </div>

          {selectedResident && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Child / Participant
                  </label>
                  <select
                    value={selectedChildId}
                    onChange={(e) => setSelectedChildId(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2"
                  >
                    <option value="">-- Select Child --</option>
                    {selectedResident.children.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Activity / Sport
                  </label>
                  <select
                    value={selectedActivityId}
                    onChange={(e) => setSelectedActivityId(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2"
                  >
                    <option value="">-- Select Activity --</option>
                    {activities
                      .filter((a) => a.isActive)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} (Mem ₹{a.memberFee} / Non-Mem ₹{a.nonMemberFee})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Month (Past / Current Only)
                  </label>
                  <select
                    value={selectedMonthKey}
                    onChange={(e) => setSelectedMonthKey(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2"
                  >
                    <option value="">-- Select Month --</option>
                    {monthOptions.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useHalfMonth}
                      onChange={(e) => setUseHalfMonth(e.target.checked)}
                    />
                    Half Month
                  </label>
                  <button
                    type="button"
                    onClick={handleAddCashLine}
                    className="inline-flex items-center gap-1 px-3 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              </div>

              {cashCart.length > 0 && (
                <div className="space-y-4">
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-600 text-left">
                        <tr>
                          <th className="px-4 py-2.5">Child</th>
                          <th className="px-4 py-2.5">Activity &amp; Month</th>
                          <th className="px-4 py-2.5">Applied Rate</th>
                          <th className="px-4 py-2.5 text-right">Amount</th>
                          <th className="px-4 py-2.5"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cashPricing.pricedItems.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-2.5 font-semibold">{item.childName}</td>
                            <td className="px-4 py-2.5">
                              {item.activityName} — {item.monthLabel}{' '}
                              {item.useHalfMonth && '(Half Month)'}
                            </td>
                            <td className="px-4 py-2.5 capitalize">
                              {item.rateTier === 'member' ? 'Member Rate' : 'Non-Member Rate'}
                              {item.siblingDiscountAmount > 0 &&
                                ` (-₹${item.siblingDiscountAmount} Sibling)`}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold">
                              ₹{item.finalAmount.toLocaleString('en-IN')}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  setCashCart((prev) => prev.filter((c) => c.id !== item.id))
                                }
                                className="text-rose-600 hover:text-rose-800 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl">
                    <div className="flex flex-wrap items-center gap-3">
                      <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value as 'Cash' | 'Cheque')}
                        className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 font-semibold"
                      >
                        <option value="Cash">Cash Received</option>
                        <option value="Cheque">Cheque Received</option>
                      </select>
                      <input
                        type="text"
                        value={referenceNote}
                        onChange={(e) => setReferenceNote(e.target.value)}
                        placeholder="Optional cheque no. / note"
                        className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-2"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={cashSubmitting}
                      onClick={handleAcceptCashAndEmail}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                    >
                      <Banknote className="w-4 h-4" />
                      {cashSubmitting
                        ? 'Generating Receipt...'
                        : `Accept ₹${cashPricing.totalAmount.toLocaleString('en-IN')} & Email Receipt Immediately`}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};