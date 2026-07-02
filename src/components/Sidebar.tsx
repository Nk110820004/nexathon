'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { 
  LayoutDashboard, 
  Flame, 
  Award, 
  Activity, 
  Apple, 
  MessageSquare, 
  AlertTriangle, 
  User as UserIcon, 
  LogOut, 
  LogIn, 
  UserPlus
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useUser();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Form Tracker', path: '/form-tracker', icon: Activity },
    { name: 'Calorie Tracker', path: '/calorie-tracker', icon: Apple },
    { name: 'WebSocket Chat', path: '/chat', icon: MessageSquare },
    { name: 'SOS Center', path: '/sos', icon: AlertTriangle },
    { name: 'Profile', path: '/profile', icon: UserIcon },
  ];

  return (
    <aside className="w-full md:w-64 bg-brand-dark-950 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col md:h-screen md:sticky md:top-0 z-40 transition-all duration-300">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          {/* Custom SVG Athlete Shield Logo */}
          <svg className="w-8 h-8 text-brand-cyan filter drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="font-bold text-xl tracking-wider text-slate-100 bg-clip-text">
            PoseParfaite
          </span>
        </Link>
      </div>

      {/* User Dashboard Profile summary */}
      {user ? (
        <div className="p-5 border-b border-slate-800 bg-brand-dark-900/50">
          <div className="flex flex-col gap-1">
            <h4 className="font-semibold text-slate-200 text-sm truncate">{user.name}</h4>
            <span className="text-xs text-slate-400">@{user.username}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            {/* Streak Counter */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-brand-dark-800 border border-slate-700/50">
              <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Streak</span>
                <span className="text-xs font-bold text-slate-200">{user.streak} days</span>
              </div>
            </div>
            {/* Points Counter */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-brand-dark-800 border border-slate-700/50">
              <Award className="w-4 h-4 text-brand-cyan" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Points</span>
                <span className="text-xs font-bold text-slate-200">{user.points} pts</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-1">
        {user ? (
          menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-brand-cyan/10 text-brand-cyan-light border-l-2 border-brand-cyan pl-3'
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-105 ${
                  isActive ? 'text-brand-cyan-light' : 'text-slate-400 group-hover:text-slate-300'
                }`} />
                <span>{item.name}</span>
              </Link>
            );
          })
        ) : (
          <div className="p-4 text-center text-xs text-slate-500">
            Please register or sign in to activate dashboard features.
          </div>
        )}
      </nav>

      {/* Footer / Auth Triggers */}
      <div className="p-4 border-t border-slate-800 bg-brand-dark-950">
        {user ? (
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-rose-950/20 hover:text-rose-400 border border-transparent hover:border-rose-900/50 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-brand-cyan text-brand-dark-950 hover:bg-brand-cyan-light font-semibold transition-all duration-200"
            >
              <LogIn className="w-4 h-4" />
              <span>Log In</span>
            </Link>
            <Link
              href="/signup"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800/50 border border-slate-700/50 transition-all duration-200"
            >
              <UserPlus className="w-4 h-4" />
              <span>Sign Up</span>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
