import React, { useState } from 'react';
import { Plus, KeyRound, Users, Check, Dumbbell } from 'lucide-react';
import type { ActivityItem, CoachAccount } from '../../types/models';

interface ActivitiesManagerPageProps {
  activities: ActivityItem[];
  coaches: CoachAccount[];
  onSaveActivity: (activity: Omit<ActivityItem, 'id'> & { id?: string }) => Promise<void>;
  onCreateCoachAccount: (payload: {
    coachName: string;
    loginId: string;
    password: string;
    mobile?: string;
    assignedActivityIds: string[];
  }) => Promise<void>;
  onUpdateCoachAssignments: (coachId: string, assignedActivityIds: string[]) => Promise<void>;
}

export const ActivitiesManagerPage: React.FC<ActivitiesManagerPageProps> = ({
  activities,
  coaches,
  onSaveActivity,
  onCreateCoachAccount,
  onUpdateCoachAssignments,
}) => {
  // Activity Form State
  const [activityName, setActivityName] = useState('');
  const [scheduleLabel, setScheduleLabel] = useState('');
  const [memberFee, setMemberFee] = useState('');
  const [nonMemberFee, setNonMemberFee] = useState('');
  const [siblingDiscountPercent, setSiblingDiscountPercent] = useState('0');
  const [selectedCoachesForNewAct, setSelectedCoachesForNewAct] = useState<string[]>([]);
  const [savingAct, setSavingAct] = useState(false);

  // Coach Account Creation State
  const [coachName, setCoachName] = useState('');
  const [coachLoginId, setCoachLoginId] = useState('');
  const [coachPassword, setCoachPassword] = useState('');
  const [coachMobile, setCoachMobile] = useState('');
  const [selectedActsForNewCoach, setSelectedActsForNewCoach] = useState<string[]>([]);
  const [savingCoach, setSavingCoach] = useState(false);

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityName.trim() || !memberFee || !nonMemberFee) return;
    setSavingAct(true);
    try {
      await onSaveActivity({
        name: activityName.trim(),
        scheduleLabel: scheduleLabel.trim() || undefined,
        memberFee: Number(memberFee),
        nonMemberFee: Number(nonMemberFee),
        siblingDiscountPercent: Number(siblingDiscountPercent) || 0,
        isActive: true,
        assignedCoachIds: selectedCoachesForNewAct,
      });
      setActivityName('');
      setScheduleLabel('');
      setMemberFee('');
      setNonMemberFee('');
      setSiblingDiscountPercent('0');
      setSelectedCoachesForNewAct([]);
    } finally {
      setSavingAct(false);
    }
  };

  const handleCreateCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachName.trim() || !coachLoginId.trim() || !coachPassword.trim()) return;
    setSavingCoach(true);
    try {
      await onCreateCoachAccount({
        coachName: coachName.trim(),
        loginId: coachLoginId.trim().toUpperCase(),
        password: coachPassword.trim(),
        mobile: coachMobile.trim() || undefined,
        assignedActivityIds: selectedActsForNewCoach,
      });
      setCoachName('');
      setCoachLoginId('');
      setCoachPassword('');
      setCoachMobile('');
      setSelectedActsForNewCoach([]);
    } finally {
      setSavingCoach(false);
    }
  };

  const toggleCoachActivityLink = async (coach: CoachAccount, activityId: string) => {
    const exists = coach.assignedActivityIds.includes(activityId);
    const updated = exists
      ? coach.assignedActivityIds.filter((id) => id !== activityId)
      : [...coach.assignedActivityIds, activityId];
    await onUpdateCoachAssignments(coach.id, updated);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Activity & Coach Manager</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure Member vs. Non-Member rates, Sibling Discount % (default 0%), and create
          dedicated Coach Login IDs.
        </p>
      </div>

      {/* Section 1: Create Activity & View Configured Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form
          onSubmit={handleCreateActivity}
          className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs"
        >
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Dumbbell className="w-4 h-4 text-indigo-600" />
            <span>Add New Sport / Activity</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Activity / Sport Name *
            </label>
            <input
              type="text"
              required
              value={activityName}
              onChange={(e) => setActivityName(e.target.value)}
              placeholder="e.g., Badminton Coaching"
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Batch / Timing Note
            </label>
            <input
              type="text"
              value={scheduleLabel}
              onChange={(e) => setScheduleLabel(e.target.value)}
              placeholder="e.g., Mon–Fri 6:00 AM – 7:30 AM"
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Member Fee (₹) *
              </label>
              <input
                type="number"
                required
                min={0}
                value={memberFee}
                onChange={(e) => setMemberFee(e.target.value)}
                placeholder="1000"
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Non-Member Fee (₹) *
              </label>
              <input
                type="number"
                required
                min={0}
                value={nonMemberFee}
                onChange={(e) => setNonMemberFee(e.target.value)}
                placeholder="1500"
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Same-Sport Sibling Discount (%) — Default 0%
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={siblingDiscountPercent}
              onChange={(e) => setSiblingDiscountPercent(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>

          {coaches.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assign Coaches (Multiple Allowed)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {coaches.map((c) => {
                  const active = selectedCoachesForNewAct.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        setSelectedCoachesForNewAct((prev) =>
                          active ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                        )
                      }
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                        active
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {c.coachName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={savingAct}
            className="w-full inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {savingAct ? 'Saving Activity...' : 'Save Activity'}
          </button>
        </form>

        {/* Active Activities List */}
        <div className="lg:col-span-2 space-y-3">
          {activities.map((act) => {
            const assignedCoaches = coaches.filter(
              (c) =>
                c.assignedActivityIds.includes(act.id) || act.assignedCoachIds.includes(c.id)
            );
            return (
              <div
                key={act.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">{act.name}</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        act.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {act.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {act.scheduleLabel && (
                    <p className="text-xs text-slate-500 mt-0.5">{act.scheduleLabel}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                    <span className="bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-md font-semibold">
                      Member: ₹{act.memberFee}
                    </span>
                    <span className="bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-md font-semibold">
                      Non-Member: ₹{act.nonMemberFee}
                    </span>
                    <span className="text-slate-500">
                      Sibling Disc: <strong>{act.siblingDiscountPercent}%</strong>
                    </span>
                  </div>
                </div>

                <div className="text-xs sm:text-right">
                  <span className="text-[11px] text-slate-500 block">Assigned Coaches:</span>
                  {assignedCoaches.length > 0 ? (
                    <span className="font-semibold text-slate-800">
                      {assignedCoaches.map((c) => c.coachName).join(', ')}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">None assigned</span>
                  )}
                </div>
              </div>
            );
          })}

          {activities.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500">
              No activities configured yet. Add your first sport on the left.
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Dedicated Coach Login IDs & Many-to-Many Activity Mapping */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-slate-200">
        <form
          onSubmit={handleCreateCoach}
          className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs"
        >
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <KeyRound className="w-4 h-4 text-emerald-600" />
            <span>Create Coach Login Credentials</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Coaches sign in exclusively with these Admin-issued credentials (never self-assigned).
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Coach Full Name *
            </label>
            <input
              type="text"
              required
              value={coachName}
              onChange={(e) => setCoachName(e.target.value)}
              placeholder="e.g., Coach Rajesh Sharma"
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Coach Login ID *
              </label>
              <input
                type="text"
                required
                value={coachLoginId}
                onChange={(e) => setCoachLoginId(e.target.value)}
                placeholder="COACH-BDM-01"
                className="w-full text-xs font-mono border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Initial Password *
              </label>
              <input
                type="text"
                required
                value={coachPassword}
                onChange={(e) => setCoachPassword(e.target.value)}
                placeholder="Temp@2026"
                className="w-full text-xs font-mono border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Assign Activities (Multiple Allowed)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {activities.map((act) => {
                const active = selectedActsForNewCoach.includes(act.id);
                return (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() =>
                      setSelectedActsForNewCoach((prev) =>
                        active ? prev.filter((id) => id !== act.id) : [...prev, act.id]
                      )
                    }
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                      active
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {act.name}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={savingCoach}
            className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer"
          >
            <Users className="w-4 h-4" />
            {savingCoach ? 'Creating Coach ID...' : 'Generate Coach Login ID'}
          </button>
        </form>

        {/* Coach Accounts Matrix (Many-to-Many Toggle) */}
        <div className="lg:col-span-2 space-y-3">
          {coaches.map((coach) => (
            <div
              key={coach.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{coach.coachName}</h3>
                  <p className="text-xs text-slate-500">
                    Login ID:{' '}
                    <span className="font-mono font-bold text-slate-800">{coach.loginId}</span>
                  </p>
                </div>
                <span className="text-[11px] text-slate-500">
                  Click activities below to toggle assignment:
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {activities.map((act) => {
                  const isAssigned = coach.assignedActivityIds.includes(act.id);
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => toggleCoachActivityLink(coach, act.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                        isAssigned
                          ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-800'
                      }`}
                    >
                      {isAssigned && <Check className="w-3.5 h-3.5" />}
                      {act.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {coaches.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500">
              No Coach Login IDs created yet. Issue a Coach ID on the left.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};