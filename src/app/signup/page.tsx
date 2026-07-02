'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { User, Mail, KeyRound, Eye, EyeOff, Loader2, Info } from 'lucide-react';

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { refreshUser } = useUser();
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      await refreshUser();
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Username or email might be taken.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[85vh] flex items-center justify-center py-10 px-4">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-brand-violet/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="w-full max-w-md glass-panel rounded-2xl border border-slate-800 p-8 shadow-2xl relative z-10 animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-xl bg-brand-violet/10 border border-brand-violet/20 text-brand-violet mb-4">
            <User className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight">Create Account</h2>
          <p className="text-sm text-slate-400 mt-2">Get started with AI fitness coaching today</p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-brand-red/10 border border-brand-red/20 text-brand-red text-sm flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSignup} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-violet focus:ring-1 focus:ring-brand-violet transition-all duration-200 text-sm"
                required
              />
            </div>
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <span className="text-sm font-semibold">@</span>
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
                placeholder="johndoe"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-violet focus:ring-1 focus:ring-brand-violet transition-all duration-200 text-sm"
                required
              />
            </div>
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-violet focus:ring-1 focus:ring-brand-violet transition-all duration-200 text-sm"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <KeyRound className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full pl-11 pr-11 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-violet focus:ring-1 focus:ring-brand-violet transition-all duration-200 text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Confirm Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <KeyRound className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-violet focus:ring-1 focus:ring-brand-violet transition-all duration-200 text-sm"
                required
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-xl bg-brand-violet text-slate-950 font-bold hover:bg-brand-violet-light hover:text-slate-950 transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(139,92,246,0.2)] disabled:opacity-50 disabled:cursor-not-allowed group text-sm cursor-pointer mt-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <span>Sign Up</span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center border-t border-slate-800 pt-6">
          <p className="text-xs text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-violet hover:underline font-semibold transition-all">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
