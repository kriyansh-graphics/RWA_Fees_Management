import React from 'react';
import { Clock, PhoneCall, LogOut, Info } from 'lucide-react';
import type { ResidentProfile } from '../../types/models';

interface VerificationPendingPageProps {
  profile: ResidentProfile;
  onLogout: () => void;
}

export const VerificationPendingPage: React.FC<VerificationPendingPageProps> = ({
  profile,
  onLogout,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
              Verification Pending
            </span>
            <h1 className="text-lg font-bold text-slate-900 mt-1">
              Please contact to RWA Office for approval
            </h1>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Registered Account Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-500">Name:</span>{' '}
              <span className="font-medium">{profile.fullName || 'Resident'}</span>
            </div>
            <div>
              <span className="text-slate-500">Flat / House No.:</span>{' '}
              <span className="font-medium">{profile.houseOrFlatNo || 'Not specified'}</span>
            </div>
            <div>
              <span className="text-slate-500">Email:</span>{' '}
              <span className="font-medium">{profile.email || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500">Mobile:</span>{' '}
              <span className="font-medium">{profile.mobile || '—'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2.5 text-xs text-slate-600 bg-blue-50/70 border border-blue-100 p-3.5 rounded-xl">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p>
            Once the RWA Admin verifies your profile (and assigns your Lifetime/Yearly Membership
            Number if applicable, or approves your Non-Member / Not Applicable status), you will
            gain access to fee schedules, deposit submission, and digital email receipts.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <PhoneCall className="w-4 h-4 text-slate-500" />
            <span>RWA Office Hours: 10:00 AM – 6:00 PM</span>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};