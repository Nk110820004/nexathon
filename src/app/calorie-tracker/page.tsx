'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { 
  Apple, 
  Droplet, 
  Plus, 
  Trash2, 
  Loader2, 
  Flame, 
  Calendar,
  Sparkles,
  Search
} from 'lucide-react';

interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

// Preset food library derived from legacy calorie_dataset / protein_dataset
const FOOD_DATABASE: FoodItem[] = [
  { id: 'chicken', name: 'Chicken Breast (100g)', calories: 165, protein: 31, carbs: 0, fats: 3.6 },
  { id: 'banana', name: 'Banana (Medium)', calories: 105, protein: 1.3, carbs: 27, fats: 0.3 },
  { id: 'rice', name: 'White Rice (100g cooked)', calories: 130, protein: 2.7, carbs: 28, fats: 0.3 },
  { id: 'apple', name: 'Apple (Medium)', calories: 95, protein: 0.5, carbs: 25, fats: 0.3 },
  { id: 'egg', name: 'Whole Egg (Boiled)', calories: 78, protein: 6.3, carbs: 0.6, fats: 5.3 },
  { id: 'whey', name: 'Whey Protein (1 Scoop)', calories: 120, protein: 24, carbs: 3, fats: 1.5 },
  { id: 'tofu', name: 'Tofu (100g)', calories: 76, protein: 8, carbs: 1.9, fats: 4.8 },
  { id: 'salmon', name: 'Salmon Fillet (100g)', calories: 208, protein: 22, carbs: 0, fats: 13 },
  { id: 'beef', name: 'Lean Beef (100g)', calories: 250, protein: 26, carbs: 0, fats: 15 },
  { id: 'greek-yogurt', name: 'Greek Yogurt (100g)', calories: 59, protein: 10, carbs: 3.6, fats: 0.4 },
  { id: 'lentils', name: 'Lentils (100g cooked)', calories: 116, protein: 9, carbs: 20, fats: 0.4 },
  { id: 'almonds', name: 'Almonds (1oz / 28g)', calories: 164, protein: 6, carbs: 6, fats: 14 }
];

export default function CalorieTracker() {
  const { user, goals, refreshUser } = useUser();
  const router = useRouter();

  const [logs, setLogs] = useState<any[]>([]);
  const [waterLogs, setWaterLogs] = useState<any[]>([]);
  const [selectedFoodId, setSelectedFoodId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [customFood, setCustomFood] = useState({ name: '', calories: '', protein: '' });
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [submittingFood, setSubmittingFood] = useState(false);
  const [submittingWater, setSubmittingWater] = useState(false);

  // Date selection
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const fetchData = async (date: string) => {
    try {
      setLoadingLogs(true);
      // Fetch Food
      const foodRes = await fetch(`/api/food?date=${date}`);
      if (foodRes.ok) {
        const data = await foodRes.json();
        setLogs(data.logs);
      }

      // Fetch Water
      const waterRes = await fetch(`/api/water?date=${date}`);
      if (waterRes.ok) {
        const data = await waterRes.json();
        setWaterLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData(selectedDate);
    }
  }, [user, selectedDate]);

  // Log food
  const handleAddFood = async (e: React.FormEvent) => {
    e.preventDefault();
    let food_name = '';
    let calories = 0;
    let protein = 0;

    if (showCustomForm) {
      if (!customFood.name || !customFood.calories || !customFood.protein) return;
      food_name = customFood.name;
      calories = parseInt(customFood.calories);
      protein = parseInt(customFood.protein);
    } else {
      const match = FOOD_DATABASE.find(f => f.id === selectedFoodId);
      if (!match) return;
      food_name = match.name;
      calories = match.calories;
      protein = match.protein;
    }

    setSubmittingFood(true);

    try {
      const res = await fetch('/api/food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          food_name,
          calories,
          protein,
          quantity,
          date: selectedDate,
        }),
      });

      if (res.ok) {
        setSelectedFoodId('');
        setQuantity(1);
        setCustomFood({ name: '', calories: '', protein: '' });
        setShowCustomForm(false);
        await fetchData(selectedDate);
        await refreshUser();
      } else {
        alert('Failed to log food entry.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingFood(false);
    }
  };

  // Log water
  const handleAddWater = async (amount: number) => {
    setSubmittingWater(true);
    try {
      const res = await fetch('/api/water', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_ml: amount,
          date: selectedDate,
        }),
      });

      if (res.ok) {
        await fetchData(selectedDate);
        await refreshUser();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingWater(false);
    }
  };

  // Compute aggregations
  let totalCalories = 0;
  let totalProtein = 0;
  logs.forEach(log => {
    totalCalories += (log.calories || 0) * (log.quantity || 1);
    totalProtein += (log.protein || 0) * (log.quantity || 1);
  });

  let totalWater = 0;
  waterLogs.forEach(log => {
    totalWater += log.amount_ml || 0;
  });

  const targetCalories = goals?.target_calories || 2000;
  const targetProtein = goals?.target_protein || 80;
  const targetWater = goals?.target_water || 3000;

  const calPercent = Math.min(100, Math.round((totalCalories / targetCalories) * 100));
  const proteinPercent = Math.min(100, Math.round((totalProtein / targetProtein) * 100));
  const waterPercent = Math.min(100, Math.round((totalWater / targetWater) * 100));

  // Filter food search
  const filteredFoods = FOOD_DATABASE.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight font-display flex items-center gap-3">
            <Apple className="w-8 h-8 text-brand-emerald" />
            Calorie & Hydration
          </h1>
          <p className="text-sm text-slate-400 mt-1">Track macronutrient intake, goals, and water schedules.</p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-bold rounded-lg px-3 py-2 focus:outline-none focus:border-brand-emerald cursor-pointer"
          />
        </div>
      </div>

      {/* Stats Summary Ring Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Calorie Card */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 text-brand-cyan/10">
            <Apple className="w-16 h-16" />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Calories</span>
            <div className="text-3xl font-black text-slate-100 tracking-tight">
              {totalCalories} <span className="text-sm text-slate-400 font-normal">/ {targetCalories} kcal</span>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div 
                className="h-full bg-brand-cyan rounded-full transition-all duration-1000"
                style={{ width: `${calPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>{calPercent}% of target</span>
              <span>{Math.max(0, targetCalories - totalCalories)} kcal left</span>
            </div>
          </div>
        </div>

        {/* Protein Card */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 text-brand-emerald/10">
            <Sparkles className="w-16 h-16" />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Protein Target</span>
            <div className="text-3xl font-black text-slate-100 tracking-tight">
              {totalProtein}g <span className="text-sm text-slate-400 font-normal">/ {targetProtein}g</span>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div 
                className="h-full bg-brand-emerald rounded-full transition-all duration-1000"
                style={{ width: `${proteinPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>{proteinPercent}% of target</span>
              <span>{Math.max(0, targetProtein - totalProtein)}g left</span>
            </div>
          </div>
        </div>

        {/* Hydration Card */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 text-blue-500/10">
            <Droplet className="w-16 h-16" />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Hydration (Water)</span>
            <div className="text-3xl font-black text-slate-100 tracking-tight">
              {totalWater}ml <span className="text-sm text-slate-400 font-normal">/ {targetWater}ml</span>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                style={{ width: `${waterPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>{waterPercent}% of target</span>
              <span>{Math.max(0, targetWater - totalWater)}ml left</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Food Logger & Water UI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Log Input Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* Food entry form */}
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="font-bold text-slate-200 text-sm border-b border-slate-800/60 pb-3 mb-6">Log Food Intake</h3>
            
            <form onSubmit={handleAddFood} className="space-y-4">
              {/* Form type toggler */}
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setShowCustomForm(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    !showCustomForm 
                      ? 'bg-brand-emerald text-slate-950 border-brand-emerald' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Choose Preset Food
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomForm(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    showCustomForm 
                      ? 'bg-brand-emerald text-slate-950 border-brand-emerald' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Custom Meal
                </button>
              </div>

              {!showCustomForm ? (
                /* Choose preset */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Select Food</label>
                    <select
                      value={selectedFoodId}
                      onChange={(e) => setSelectedFoodId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-brand-emerald text-sm"
                      required
                    >
                      <option value="">-- Choose a Preset Food --</option>
                      {FOOD_DATABASE.map((food) => (
                        <option key={food.id} value={food.id}>
                          {food.name} ({food.calories} cal, {food.protein}g P)
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Quantity (Portions)</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-brand-emerald text-sm"
                      required
                    />
                  </div>
                </div>
              ) : (
                /* Custom meal inputs */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Meal Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Protein shake, Salad"
                      value={customFood.name}
                      onChange={(e) => setCustomFood({ ...customFood, name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-brand-emerald text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Calories (kcal)</label>
                    <input
                      type="number"
                      placeholder="350"
                      value={customFood.calories}
                      onChange={(e) => setCustomFood({ ...customFood, calories: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-brand-emerald text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Protein (g)</label>
                    <input
                      type="number"
                      placeholder="25"
                      value={customFood.protein}
                      onChange={(e) => setCustomFood({ ...customFood, protein: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-brand-emerald text-sm"
                      required
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submittingFood || (!showCustomForm && !selectedFoodId)}
                className="w-full py-3 bg-brand-emerald text-slate-950 font-bold rounded-xl hover:bg-brand-emerald-light transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.15)] disabled:opacity-50 text-sm"
              >
                {submittingFood ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding entry...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> Log Meal
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Today's log list */}
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="font-bold text-slate-200 text-sm border-b border-slate-800/60 pb-3 mb-6">Today's Meals Log</h3>

            {loadingLogs ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 text-brand-emerald animate-spin" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                No food items logged for this date. Go ahead and add some above!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="pb-3">Food Item</th>
                      <th className="pb-3">Qty</th>
                      <th className="pb-3">Calories</th>
                      <th className="pb-3">Protein</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {logs.map((log) => (
                      <tr key={log.id} className="text-slate-300 hover:bg-slate-900/10 transition-all">
                        <td className="py-3 font-semibold text-slate-200">{log.food_name}</td>
                        <td className="py-3">{log.quantity}x</td>
                        <td className="py-3 font-mono">{(log.calories || 0) * (log.quantity || 1)} kcal</td>
                        <td className="py-3 font-mono">{(log.protein || 0) * (log.quantity || 1)}g</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 col: Water Hydration Cup UI */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col items-center text-center">
          <h3 className="font-bold text-slate-200 text-sm border-b border-slate-800/60 pb-3 w-full mb-6 text-left">Water Hydration</h3>
          
          {/* Animated Water Cup Cup Shape */}
          <div className="relative w-36 h-56 border-4 border-slate-700/80 rounded-b-3xl rounded-t-lg overflow-hidden bg-slate-900/30 flex items-end justify-center mb-6">
            
            {/* Water volume display wrapper */}
            <div 
              className="w-full bg-blue-500/80 transition-all duration-700 ease-in-out relative flex items-center justify-center"
              style={{ height: `${waterPercent}%`, minHeight: totalWater > 0 ? '5%' : '0%' }}
            >
              {/* Ripple Animation SVG Overlay */}
              <div className="absolute top-0 left-0 right-0 -translate-y-1 h-3 overflow-hidden">
                <svg className="w-[200%] h-full fill-blue-500/80 animate-[wave_6s_linear_infinite]" viewBox="0 0 100 20" preserveAspectRatio="none">
                  <path d="M0,10 C30,10 30,5 60,5 C90,5 90,10 120,10 C150,10 150,5 180,5 C210,5 210,10 240,10 L240,20 L0,20 Z" />
                </svg>
              </div>

              {/* Water Percentage overlay */}
              {totalWater > 0 && (
                <span className="text-white text-xs font-bold font-mono filter drop-shadow">
                  {totalWater} ml
                </span>
              )}
            </div>

            {totalWater === 0 && (
              <span className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs font-semibold font-mono">
                0% Empty
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 max-w-[200px] mb-6 font-light leading-relaxed">
            Drink up! Daily recommendation is 3,000ml to stay hydrated during heavy form workouts.
          </p>

          <div className="grid grid-cols-2 gap-3 w-full">
            <button
              onClick={() => handleAddWater(250)}
              disabled={submittingWater}
              className="py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-blue-400 font-bold hover:bg-blue-950/20 hover:border-blue-900/50 transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Droplet className="w-3.5 h-3.5" /> +250ml Cup
            </button>
            <button
              onClick={() => handleAddWater(500)}
              disabled={submittingWater}
              className="py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-blue-400 font-bold hover:bg-blue-950/20 hover:border-blue-900/50 transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Droplet className="w-3.5 h-3.5" /> +500ml Bottle
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
