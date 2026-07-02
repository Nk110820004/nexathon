'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { 
  User as UserIcon, 
  Settings, 
  Award, 
  Flame, 
  Copy, 
  Check, 
  Ticket, 
  Plus, 
  Loader2,
  Calendar,
  Goal
} from 'lucide-react';

export default function ProfilePage() {
  const { user, goals, refreshUser, updateGoals } = useUser();
  const router = useRouter();

  // Targets form state
  const [targetCalories, setTargetCalories] = useState('2000');
  const [targetProtein, setTargetProtein] = useState('80');
  const [targetWater, setTargetWater] = useState('3000');
  const [targetWorkoutMins, setTargetWorkoutMins] = useState('30');
  const [updatingGoals, setUpdatingGoals] = useState(false);
  const [goalsSuccess, setGoalsSuccess] = useState(false);

  // Rewards state
  const [claimDiscount, setClaimDiscount] = useState(10); // default 10%
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [coupons, setCoupons] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
    } else if (goals) {
      setTargetCalories(goals.target_calories.toString());
      setTargetProtein(goals.target_protein.toString());
      setTargetWater(goals.target_water.toString());
      setTargetWorkoutMins(goals.target_workout_minutes.toString());
    }
  }, [user, goals, router]);

  const fetchCoupons = async () => {
    try {
      const res = await fetch('/api/rewards');
      if (res.ok) {
        const data = await res.json();
        setCoupons(data.coupons || []);
      }
    } catch (err) {
      console.error('Failed to load coupons:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCoupons();
    }
  }, [user]);

  // Update goals submit
  const handleUpdateGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingGoals(true);
    setGoalsSuccess(false);

    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_calories: parseInt(targetCalories),
          target_protein: parseInt(targetProtein),
          target_water: parseInt(targetWater),
          target_workout_minutes: parseInt(targetWorkoutMins),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        updateGoals(data.goals);
        setGoalsSuccess(true);
        setTimeout(() => setGoalsSuccess(false), 3000);
      } else {
        alert('Failed to update goals.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingGoals(false);
    }
  };

  // Claim coupon submit
  const handleClaimCoupon = async () => {
    setClaiming(true);
    setClaimError('');

    try {
      const res = await fetch('/api/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discount_percentage: claimDiscount }),
      });

      const data = await res.json();
      if (res.ok) {
        await fetchCoupons();
        await refreshUser();
      } else {
        setClaimError(data.error || 'Failed to claim coupon.');
      }
    } catch (err) {
      console.error(err);
      setClaimError('Server error claiming reward.');
    } finally {
      setClaiming(false);
    }
  };

  // Copy code helper
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 3000);
  };

  if (!user) return null;

  const pointsCost = claimDiscount * 100;
  const canClaim = (user.points || 0) >= pointsCost;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight font-display flex items-center gap-3">
            <UserIcon className="w-8 h-8 text-brand-violet" />
            User Settings & Rewards
          </h1>
          <p className="text-sm text-slate-400 mt-1">Fine-tune your fitness metrics and claim points rewards.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 columns: Goal configs and profile info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Target Configs */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3 mb-6">
              <Goal className="w-5 h-5 text-brand-cyan" />
              <h3 className="font-bold text-slate-200 text-sm">Update Health Targets</h3>
            </div>

            {goalsSuccess && (
              <div className="mb-6 p-4 rounded-xl bg-brand-emerald/10 border border-brand-emerald/20 text-brand-emerald-light text-xs flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>Daily targets updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleUpdateGoals} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Daily Calorie Target (kcal)</label>
                  <input
                    type="number"
                    value={targetCalories}
                    onChange={(e) => setTargetCalories(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-brand-cyan text-sm"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Daily Protein Target (g)</label>
                  <input
                    type="number"
                    value={targetProtein}
                    onChange={(e) => setTargetProtein(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-brand-cyan text-sm"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Daily Water Target (ml)</label>
                  <input
                    type="number"
                    value={targetWater}
                    onChange={(e) => setTargetWater(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-brand-cyan text-sm"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Daily Workout Target (minutes)</label>
                  <input
                    type="number"
                    value={targetWorkoutMins}
                    onChange={(e) => setTargetWorkoutMins(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-brand-cyan text-sm"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={updatingGoals}
                className="w-full py-3 bg-brand-cyan text-brand-dark-950 font-bold rounded-xl hover:bg-brand-cyan-light transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.15)] text-sm disabled:opacity-50"
              >
                {updatingGoals ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving parameters...
                  </>
                ) : (
                  <>
                    <Settings className="w-4 h-4" /> Save Targets
                  </>
                )}
              </button>
            </form>
          </div>

          {/* User Coupons / Rewards inventory log */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3 mb-6">
              <Ticket className="w-5 h-5 text-brand-violet" />
              <h3 className="font-bold text-slate-200 text-sm">Your Claimed Coupons</h3>
            </div>

            {coupons.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No claimed discount coupons yet. Purchase one on the right!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {coupons.map((coupon) => (
                  /* Premium Coupon ticket design stub */
                  <div
                    key={coupon.id}
                    className="border border-slate-700/50 bg-slate-900/60 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group shadow-md"
                  >
                    {/* Dotted cutting separator line */}
                    <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-slate-700/60 -translate-y-1/2" />

                    <div className="flex items-start justify-between relative z-10">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Discount Coupon</span>
                        <span className="block text-xl font-extrabold text-brand-violet">{coupon.discount_percentage}% OFF</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-brand-violet/10 text-brand-violet text-[9px] font-bold uppercase tracking-wider">
                        {coupon.status}
                      </span>
                    </div>

                    <div className="mt-8 flex items-center justify-between relative z-10 pt-2">
                      <code className="text-xs font-mono font-bold text-slate-200 tracking-wider">
                        {coupon.code}
                      </code>
                      <button
                        onClick={() => handleCopyCode(coupon.code)}
                        className="p-2 rounded bg-slate-800 text-slate-400 hover:text-slate-200 transition-all hover:bg-slate-700"
                        title="Copy Code"
                      >
                        {copiedCode === coupon.code ? <Check className="w-3.5 h-3.5 text-brand-cyan" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 column: Points Reward Store */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3 mb-6">
              <Award className="w-5 h-5 text-brand-cyan" />
              <h3 className="font-bold text-slate-200 text-sm">Gamified Rewards Shop</h3>
            </div>

            <div className="text-center p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 mb-6">
              <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Your Wallet Balance</span>
              <span className="block text-3xl font-black text-slate-100 tracking-tight mt-1">{user.points} pts</span>
            </div>

            {claimError && (
              <div className="mb-4 p-3 rounded-lg bg-brand-red/10 border border-brand-red/20 text-brand-red text-xs">
                {claimError}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-400">
                  <span>Discount Percentage</span>
                  <span className="text-brand-cyan font-bold">{claimDiscount}% Off</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={claimDiscount}
                  onChange={(e) => setClaimDiscount(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-cyan"
                />
              </div>

              <div className="p-3 bg-slate-900/40 border border-slate-800/60 rounded-xl text-xs space-y-1.5 font-light">
                <div className="flex justify-between">
                  <span className="text-slate-500">Points Cost:</span>
                  <span className={`font-bold ${canClaim ? 'text-slate-300' : 'text-brand-red'}`}>{pointsCost} Pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Rate:</span>
                  <span className="text-slate-400">100 pts = 1% discount</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              onClick={handleClaimCoupon}
              disabled={claiming || !canClaim}
              className="w-full py-3.5 rounded-xl bg-brand-cyan text-brand-dark-950 font-bold hover:bg-brand-cyan-light transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.2)] disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-wider"
            >
              {claiming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Promo Code...
                </>
              ) : (
                <>
                  <Ticket className="w-4 h-4" /> Claim {claimDiscount}% Coupon
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
