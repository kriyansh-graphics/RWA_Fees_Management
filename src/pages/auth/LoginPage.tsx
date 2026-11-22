import React, { useState } from 'react';
import { Building2, ShieldCheck, Dumbbell, UserPlus } from 'lucide-react';

interface LoginPageProps {
  onLoginResident: (identifier: string, secret: string) => Promise<void>;
  onLoginCoach: (coachLoginId: string, password: string) => Promise<void>;
  onSignupResident: (payload: {
    fullName: string;
    houseOrFlatNo: string;
    email: string;
    mobile: string;
  }) => Promise<void>;
}

type AuthMode = 'resident_login' | 'resident_signup' | 'coach_login';

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginResident,
  onLoginCoach,
  onSignupResident,
}) => {
  const [mode, setMode] = useState<AuthMode>('resident_login');

  // Resident Sign-In state
  const [identifier, setIdentifier] = useState('');
  const [secret, setSecret] = useState('');

  // New Resident Sign-Up state
  const [fullName, setFullName] = useState('');
  const [houseOrFlatNo, setHouseOrFlatNo] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');

  // Coach Login state
  const [coachLoginId, setCoachLoginId] = useState('');
  const [coachPassword, setCoachPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
  };

  const handleResidentLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onLoginResident(identifier.trim(), secret);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResidentSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim() || !houseOrFlatNo.trim() || !email.trim() || !mobile.trim()) {
      setError('Please fill in your name, flat/house number, email, and mobile number.');
      return;
    }

    setLoading(true);
    try {
      await onSignupResident({
        fullName: fullName.trim(),
        houseOrFlatNo: houseOrFlatNo.trim().toUpperCase(),
        email: email.trim().toLowerCase(),
        mobile: mobile.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCoachLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onLoginCoach(coachLoginId.trim(), coachPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Coach login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="w-11 h-11 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">RWA Sports &amp; Activity Portal</h1>
          <p className="text-xs text-slate-500">
            Resident fee deposits, RWA office verification &amp; coach fee rosters
          </p>
        </div>

        {/* 3-Tab Mode Switcher: Sign In | Sign Up | Coach ID */}
        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => switchMode('resident_login')}
            className={`py-2 rounded-lg transition cursor-pointer ${
              mode === 'resident_login'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode('resident_signup')}
            className={`py-2 rounded-lg transition cursor-pointer ${
              mode === 'resident_signup'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => switchMode('coach_login')}
            className={`py-2 rounded-lg transition cursor-pointer ${
              mode === 'coach_login'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Coach ID
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-3">
            {error}
          </div>
        )}

        {/* Tab 1: Resident / Admin Sign In */}
        {mode === 'resident_login' && (
          <form onSubmit={handleResidentLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email or Mobile Number
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g., admin@rwa.local or 9810000002"
                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password / Passcode
              </label>
              <input
                type="password"
                required
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Enter password"
                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              {loading ? 'Signing In...' : 'Sign In to Portal'}
            </button>

            <p className="text-[11px] text-center text-slate-500">
              New resident without an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('resident_signup')}
                className="font-semibold text-slate-900 underline cursor-pointer"
              >
                Create an account for RWA approval
              </button>
            </p>
          </form>
        )}

        {/* Tab 2: New Resident Sign Up -> Pending Verification */}
        {mode === 'resident_signup' && (
          <form onSubmit={handleResidentSignupSubmit} className="space-y-3.5">
            <div className="bg-amber-50 border border-amber-200 text-amber-900 text-[11px] rounded-xl p-3">
              New resident registrations start as <strong>Pending Verification</strong> until approved
              at the RWA Office.
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g., Priya Nair"
                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Flat / House Number *
              </label>
              <input
                type="text"
                required
                value={houseOrFlatNo}
                onChange={(e) => setHouseOrFlatNo(e.target.value)}
                placeholder="e.g., B-502"
                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 uppercase"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="priya@example.com"
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="9811122233"
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              {loading ? 'Submitting Request...' : 'Sign Up & Request RWA Approval'}
            </button>
          </form>
        )}

        {/* Tab 3: Coach Dedicated Login */}
        {mode === 'coach_login' && (
          <form onSubmit={handleCoachLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Coach Login ID
              </label>
              <input
                type="text"
                required
                value={coachLoginId}
                onChange={(e) => setCoachLoginId(e.target.value)}
                placeholder="e.g., COACH-BDM-SWM"
                className="w-full text-xs font-mono border border-slate-300 rounded-xl px-3 py-2.5 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Coach Password
              </label>
              <input
                type="password"
                required
                value={coachPassword}
                onChange={(e) => setCoachPassword(e.target.value)}
                placeholder="Enter coach password"
                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer"
            >
              <Dumbbell className="w-4 h-4" />
              {loading ? 'Signing In...' : 'Sign In as Coach'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};