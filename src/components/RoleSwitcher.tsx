import React from 'react';
import { ShieldCheck, User, Award } from 'lucide-react';
import type { UserRole } from '../types/models';

interface RoleSwitcherProps {
  availableRoles: UserRole[];
  activeRole: UserRole;
  onChangeRole: (role: UserRole) => void;
}

const ROLE_LABELS: Record<UserRole, { label: string; icon: React.ReactNode }> = {
  super_admin: { label: 'Super Admin', icon: <ShieldCheck className="w-4 h-4" /> },
  admin: { label: 'RWA Admin', icon: <ShieldCheck className="w-4 h-4" /> },
  member_user: { label: 'Resident / Parent', icon: <User className="w-4 h-4" /> },
  coach: { label: 'Coach View', icon: <Award className="w-4 h-4" /> },
};

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({
  availableRoles,
  activeRole,
  onChangeRole,
}) => {
  if (availableRoles.length <= 1) return null;

  return (
    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
      <span className="text-xs font-medium text-slate-500 px-2 hidden sm:inline">
        Active View:
      </span>
      {availableRoles.map((role) => {
        const meta = ROLE_LABELS[role];
        const isActive = role === activeRole;
        return (
          <button
            key={role}
            type="button"
            onClick={() => onChangeRole(role)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition ${
              isActive
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
            }`}
          >
            {meta.icon}
            <span>{meta.label}</span>
          </button>
        );
      })}
    </div>
  );
};