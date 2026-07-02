'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { 
  Flame, 
  Award, 
  Target, 
  Apple, 
  Activity, 
  Droplet,
  Plus,
  Loader2,
  TrendingUp,
  ChevronRight,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const { user, goals, loading } = useUser();
  const router = useRouter();

  const [todayCalories, setTodayCalories] = useState(0);
  const [todayProtein, setTodayProtein] = useState(0);
  const [todayWater, setTodayWater] = useState(0);
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([]);
  const [fetchingData, setFetchingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchTodayStats = async () => {
      try {
        setFetchingData(true);
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Fetch Food Logs
        const foodRes = await fetch(`/api/food?date=${todayStr}`);
        if (foodRes.ok) {
          const foodData = await foodRes.json();
          let cal = 0;
          let prot = 0;
          foodData.logs.forEach((log: any) => {
            cal += (log.calories || 0) * (log.quantity || 1);
            prot += (log.protein || 0) * (log.quantity || 1);
          });
          setTodayCalories(cal);
          setTodayProtein(prot);
        }

        // Fetch Water Logs
        const waterRes = await fetch(`/api/water?date=${todayStr}`);
        if (waterRes.ok) {
          const waterData = await waterRes.json();
          let waterSum = 0;
          waterData.logs.forEach((log: any) => {
            waterSum += log.amount_ml || 0;
          });
          setTodayWater(waterSum);
        }

        // Fetch Workouts
        const workoutRes = await fetch('/api/workout');
        if (workoutRes.ok) {
          const workoutData = await workoutRes.json();
          setRecentWorkouts(workoutData.workouts.slice(0, 3)); // show last 3 workouts
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setFetchingData(false);
      }
    };

    fetchTodayStats();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-brand-cyan animate-spin" />
        <span className="text-slate-400 text-sm font-medium">Securing session connection...</span>
      </div>
    );
  }

  // Targets
  const targetCalories = goals?.target_calories || 2000;
  const targetProtein = goals?.target_protein || 80;
  const targetWater = goals?.target_water || 3000;

  // Percentages
  const calPercent = Math.min(100, Math.round((todayCalories / targetCalories) * 100));
  const proteinPercent = Math.min(100, Math.round((todayProtein / targetProtein) * 100));
  const waterPercent = Math.min(100, Math.round((todayWater / targetWater) * 100));

  // SVG Gauge calculations
  const radius = 60;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (calPercent / 100) * circumference;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      {/* Welcome Message */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight font-display">
            Welcome back, {user.name}!
          </h1>
          <p className="text-sm text-slate-400 mt-1">Here is your wellness summary for today.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-bold text-orange-500">
            <Flame className="w-4 h-4" /> Streak: {user.streak} Days
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-bold text-brand-cyan">
            <Award className="w-4 h-4" /> Points: {user.points} pts
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Calorie Progress Ring Card */}
        <div className="glass-panel-glow rounded-2xl p-6 flex flex-col items-center justify-center text-center">
          <div className="w-full flex items-center justify-between border-b border-slate-800/60 pb-3 mb-6">
            <div className="flex items-center gap-2">
              <Apple className="w-5 h-5 text-brand-cyan" />
              <h3 className="font-bold text-slate-200 text-sm">Calorie Budget</h3>
            </div>
            <Link href="/calorie-tracker" className="text-xs text-brand-cyan hover:underline flex items-center gap-0.5">
              Log Food <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* SVG Gauge */}
          <div className="relative w-36 h-36 flex items-center justify-center mb-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="72"
                cy="72"
                r={radius}
                className="stroke-slate-800"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              <circle
                cx="72"
                cy="72"
                r={radius}
                className="stroke-brand-cyan transition-all duration-1000 ease-out"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-slate-100">{todayCalories}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">of {targetCalories}</span>
            </div>
          </div>

          <div className="w-full bg-slate-900/40 border border-slate-800/60 rounded-xl p-3 flex justify-around text-xs mt-2">
            <div>
              <span className="block font-bold text-brand-cyan">{calPercent}%</span>
              <span className="text-slate-400 text-[10px]">Goal Progress</span>
            </div>
            <div className="w-px bg-slate-800" />
            <div>
              <span className="block font-bold text-slate-200">{Math.max(0, targetCalories - todayCalories)} kcal</span>
              <span className="text-slate-400 text-[10px]">Remaining</span>
            </div>
          </div>
        </div>

        {/* Nutritional & Hydration Macros Card */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 mb-6">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-brand-emerald" />
              <h3 className="font-bold text-slate-200 text-sm">Macros & Hydration</h3>
            </div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Today</span>
          </div>

          <div className="space-y-6 flex-1 justify-center flex flex-col">
            {/* Protein Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-300">Protein Intake</span>
                <span className="text-slate-400 font-bold">{todayProtein}g / {targetProtein}g</span>
              </div>
              <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="h-full bg-brand-emerald rounded-full transition-all duration-1000"
                  style={{ width: `${proteinPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>{proteinPercent}% Complete</span>
                <span>{Math.max(0, targetProtein - todayProtein)}g remaining</span>
              </div>
            </div>

            {/* Hydration progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-300">Water Hydration</span>
                <span className="text-slate-400 font-bold">{todayWater}ml / {targetWater}ml</span>
              </div>
              <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                  style={{ width: `${waterPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>{waterPercent}% Complete</span>
                <span>{Math.max(0, targetWater - todayWater)}ml remaining</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links / Community Actions Card */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-violet" />
              <h3 className="font-bold text-slate-200 text-sm">Quick Training</h3>
            </div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">AI Portal</span>
          </div>

          <div className="space-y-3 flex-1 flex flex-col justify-center">
            <Link 
              href="/form-tracker" 
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-brand-cyan hover:bg-brand-cyan/5 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-brand-cyan/15 text-brand-cyan">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-bold text-slate-200">Start Pose Tracking</span>
                  <span className="text-[10px] text-slate-400">Curls, Squats Form Estimator</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-brand-cyan transition-colors" />
            </Link>

            <Link 
              href="/chat" 
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-brand-violet hover:bg-brand-violet/5 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-brand-violet/15 text-brand-violet">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-bold text-slate-200">Open WebSocket Chat</span>
                  <span className="text-[10px] text-slate-400">Socialize and Earn Points</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-brand-violet transition-colors" />
            </Link>
          </div>
        </div>

      </div>

      {/* Recent Workouts Log Table */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 mb-6">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-cyan" />
            <h3 className="font-bold text-slate-200 text-sm">Recent Workouts (AI Coached)</h3>
          </div>
          <Link href="/form-tracker" className="text-xs text-brand-cyan hover:underline flex items-center gap-0.5">
            Train Now <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {fetchingData ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 text-brand-cyan animate-spin" />
          </div>
        ) : recentWorkouts.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm flex flex-col items-center gap-2">
            <svg className="w-10 h-10 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12h8" />
            </svg>
            <span>No workout logs recorded yet. Head over to the Form Tracker!</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                  <th className="pb-3">Exercise</th>
                  <th className="pb-3">Reps</th>
                  <th className="pb-3">Duration</th>
                  <th className="pb-3">Form Accuracy</th>
                  <th className="pb-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {recentWorkouts.map((workout: any) => (
                  <tr key={workout.id} className="text-slate-300 hover:bg-slate-900/20 transition-all">
                    <td className="py-3.5 font-semibold text-slate-200">{workout.exercise_name}</td>
                    <td className="py-3.5">{workout.reps} reps</td>
                    <td className="py-3.5">{Math.floor(workout.duration_seconds / 60)}m {workout.duration_seconds % 60}s</td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                        workout.accuracy_score >= 85 
                          ? 'bg-brand-emerald/10 text-brand-emerald-light' 
                          : workout.accuracy_score >= 70 
                          ? 'bg-yellow-500/10 text-yellow-400' 
                          : 'bg-brand-red/10 text-brand-red'
                      }`}>
                        {workout.accuracy_score}%
                      </span>
                    </td>
                    <td className="py-3.5 text-right text-slate-400">{new Date(workout.log_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
