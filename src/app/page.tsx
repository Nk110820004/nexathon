'use client';

import React from 'react';
import Link from 'next/link';
import { useUser } from '@/context/UserContext';
import { 
  Activity, 
  Apple, 
  MessageSquare, 
  AlertTriangle, 
  ShieldAlert, 
  ArrowRight,
  TrendingUp,
  Award
} from 'lucide-react';

export default function LandingPage() {
  const { user } = useUser();

  const features = [
    {
      title: 'AI Pose Estimator',
      description: 'Run real-time joint-angle tracking on your webcam or uploaded photos to optimize bicep curls and squat postures without lag.',
      icon: Activity,
      color: 'text-brand-cyan',
      bg: 'bg-brand-cyan/5',
      border: 'border-brand-cyan/20',
      link: '/form-tracker'
    },
    {
      title: 'Calorie & Macronutrient Tracker',
      description: 'Search foods, log meals, count fats/carbs/protein macros, and view historical trend lines. Maintain daily streaks for healthy check-ins.',
      icon: Apple,
      color: 'text-brand-emerald',
      bg: 'bg-brand-emerald/5',
      border: 'border-brand-emerald/20',
      link: '/calorie-tracker'
    },
    {
      title: 'WebSocket Group Chat',
      description: 'Connect with a health community. Earn reward points on the fly by sending appreciative messages, and claim shopping discount coupons.',
      icon: MessageSquare,
      color: 'text-brand-violet',
      bg: 'bg-brand-violet/5',
      border: 'border-brand-violet/20',
      link: '/chat'
    },
    {
      title: 'Emergency SOS Clinic Finder',
      description: 'Instantly find physical therapy centers and emergency rooms within 5km. Features simulated ambulance calling.',
      icon: AlertTriangle,
      color: 'text-brand-red',
      bg: 'bg-brand-red/5',
      border: 'border-brand-red/20',
      link: '/sos'
    }
  ];

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center py-10">
      {/* Radiant Glowing Background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-cyan/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-brand-violet/10 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Hero Header */}
      <div className="text-center max-w-3xl relative z-10 mx-auto px-4 animate-slide-up">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-brand-cyan tracking-wider uppercase mb-6 drop-shadow-[0_0_10px_rgba(6,182,212,0.2)]">
          <Award className="w-4 h-4" /> Next-Gen Health Platform
        </div>
        
        <h1 className="font-extrabold text-4xl md:text-6xl tracking-tight text-slate-100 font-display leading-[1.1] mb-6">
          Optimize Your Form, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-cyan to-brand-violet filter drop-shadow-[0_0_15px_rgba(34,211,238,0.2)]">
            Elevate Your Health
          </span>
        </h1>
        
        <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto mb-8 font-light leading-relaxed">
          PoseParfaite is an interactive portal that merges computer vision pose coaching, food macro logging, and live WebSocket socialization into a rewarding experience.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {user ? (
            <Link
              href="/dashboard"
              className="px-8 py-3.5 bg-brand-cyan text-brand-dark-950 font-semibold rounded-xl hover:bg-brand-cyan-light transition-all duration-300 flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transform hover:-translate-y-0.5"
            >
              Go to Dashboard
              <ArrowRight className="w-5 h-5" />
            </Link>
          ) : (
            <>
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-3.5 bg-brand-cyan text-brand-dark-950 font-semibold rounded-xl hover:bg-brand-cyan-light transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transform hover:-translate-y-0.5"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 text-slate-200 border border-slate-800 rounded-xl hover:bg-slate-800/80 hover:text-slate-100 transition-all duration-300 flex items-center justify-center gap-2"
              >
                Log In
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Feature Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl w-full px-4 mt-20 relative z-10 animate-slide-up animate-delay-200">
        {features.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <div
              key={idx}
              className={`p-6 rounded-2xl glass-panel border ${feature.border} flex gap-5 hover:border-slate-700 hover:bg-slate-900/40 transition-all duration-300 group`}
            >
              <div className={`p-3.5 rounded-xl ${feature.bg} h-fit flex items-center justify-center border border-white/5 shadow-inner`}>
                <Icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-bold text-lg text-slate-200 tracking-tight flex items-center justify-between">
                  {feature.title}
                  <Link href={feature.link} className="opacity-0 group-hover:opacity-100 text-xs text-brand-cyan hover:underline transition-opacity duration-200 flex items-center gap-1">
                    Open <ArrowRight className="w-3 h-3" />
                  </Link>
                </h3>
                <p className="text-sm text-slate-400 font-light leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Stats Row */}
      <div className="w-full max-w-5xl px-4 mt-16 text-center z-10 animate-slide-up animate-delay-300">
        <div className="p-8 rounded-2xl bg-brand-dark-900/30 border border-slate-800/40 flex flex-col md:flex-row items-center justify-around gap-6">
          <div>
            <span className="text-3xl font-extrabold text-brand-cyan">0.0s</span>
            <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">CV Frame Latency</p>
          </div>
          <div className="hidden md:block w-px h-10 bg-slate-800" />
          <div>
            <span className="text-3xl font-extrabold text-brand-emerald">100%</span>
            <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Client Privacy</p>
          </div>
          <div className="hidden md:block w-px h-10 bg-slate-800" />
          <div>
            <span className="text-3xl font-extrabold text-brand-violet">Real-Time</span>
            <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Websocket Delivery</p>
          </div>
        </div>
      </div>
    </div>
  );
}
