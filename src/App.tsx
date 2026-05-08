/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, ReactNode } from 'react';
import { FuelRecord, MaintenanceRecord, UnitType, FuelType } from './types.ts';
import { Dashboard } from './components/Dashboard.tsx';
import { FuelTab } from './components/FuelTab.tsx';
import { MaintenanceTab } from './components/MaintenanceTab.tsx';
import { SettingsTab } from './components/SettingsTab.tsx';
import { 
  Fuel, 
  Wrench, 
  LayoutDashboard, 
  Settings as SettingsIcon,
  PlusCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils.ts';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from "firebase/auth";

// 請在這邊填入你的 Firebase 設定 (從 Firebase Console 的 Project Settings -> Web App 取得)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'fuel' | 'maintenance' | 'settings'>('dashboard');
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [unit, setUnit] = useState<UnitType>('km/L');
  const [fuelType, setFuelType] = useState<FuelType>('超級柴油');
  const [tankCapacity, setTankCapacity] = useState<number>(50);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage and records from Firebase API
  useEffect(() => {
    const savedUnit = localStorage.getItem('carButler_unit');
    const savedFuelType = localStorage.getItem('carButler_fuelType');
    const savedCapacity = localStorage.getItem('carButler_capacity');

    if (savedUnit) setUnit(savedUnit as UnitType);
    if (savedFuelType) setFuelType(savedFuelType as FuelType);
    if (savedCapacity) setTankCapacity(Number(savedCapacity));
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setIsLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  // Fetch data only when user is logged in
  useEffect(() => {
    if (!user) return;
    
    const fetchRecords = async () => {
      try {
        const res = await fetch(`/api/records?userId=${user.uid}`);
        const json = await res.json();
        if (json.success) {
          setFuelRecords(json.data.fuelRecords || []);
          setMaintenanceRecords(json.data.maintenanceRecords || []);
        }
      } catch (err) {
        console.error("Failed to load records from Firebase", err);
      } finally {
        setIsLoaded(true);
      }
    };
    
    fetchRecords();
  }, [user]);

  // Save settings to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('carButler_unit', unit);
    localStorage.setItem('carButler_fuelType', fuelType);
    localStorage.setItem('carButler_capacity', tankCapacity.toString());
  }, [unit, fuelType, tankCapacity, isLoaded]);

  // Calculate fuel consumption logic
  const processedFuelRecords = useMemo(() => {
    const sorted = [...fuelRecords].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.currentMileage - b.currentMileage);
    
    const results: FuelRecord[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      let consumption: number | undefined = undefined;

      // Need at least one previous record to calculate
      if (i > 0) {
        const prev = sorted[i - 1];
        const mileageDiff = current.currentMileage - prev.currentMileage;
        
        // Formula: Consumed Liters = (Prev Level * Capacity) + Liters Added - (Current Level * Capacity)
        // Note: prev.fuelLevel is the level AFTER fueling in the previous step.
        // So liters consumed since then = (Level after last fueling - Level before current fill) * Capacity
        // However, we don't know "Level before current fill".
        // Actually, if we assume the user fills up $L$ liters, then the state before filling was $(F_i \times Capacity) - L_i$.
        // So consumed = (F_{i-1} \times Capacity) - [(F_i \times Capacity) - L_i]
        // This simplifies to: Consumed = (F_{i-1} - F_i) * Capacity + L_i
        
        const prevLevel = prev.fuelLevel !== undefined ? prev.fuelLevel : 1.0;
        const currLevel = current.fuelLevel !== undefined ? current.fuelLevel : 1.0;
        
        const consumedLiters = (prevLevel - currLevel) * tankCapacity + current.liters;

        if (consumedLiters > 0 && mileageDiff > 0) {
          consumption = mileageDiff / consumedLiters;
        }
      }

      results.push({ ...current, consumption });
    }

    return results.reverse(); // Newest first for display
  }, [fuelRecords, tankCapacity]);

  const addFuelRecord = async (record: Omit<FuelRecord, 'id' | 'consumption'>) => {
    if (!user) return;
    const newRecord: FuelRecord = {
      ...record,
      id: crypto.randomUUID(),
    };
    setFuelRecords(prev => [...prev, newRecord]);
    try {
      await fetch('/api/records/fuel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, record: newRecord })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const deleteFuelRecord = async (id: string) => {
    if (!user) return;
    setFuelRecords(prev => prev.filter(r => r.id !== id));
    try {
      await fetch(`/api/records/fuel/${id}?userId=${user.uid}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  };

  const addMaintenanceRecord = async (record: Omit<MaintenanceRecord, 'id'>) => {
    if (!user) return;
    const newRecord: MaintenanceRecord = {
      ...record,
      id: crypto.randomUUID(),
    };
    setMaintenanceRecords(prev => [...prev, newRecord]);
    try {
      await fetch('/api/records/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, record: newRecord })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const deleteMaintenanceRecord = async (id: string) => {
    if (!user) return;
    setMaintenanceRecords(prev => prev.filter(r => r.id !== id));
    try {
      await fetch(`/api/records/maintenance/${id}?userId=${user.uid}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  };

  if (!isLoaded) return null;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg text-text">
        <div className="max-w-sm w-full p-8 bg-surface rounded-2xl shadow-2xl border border-border text-center">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-primary shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            <Fuel size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">AutoTrack Pro</h1>
          <p className="text-muted mb-8 text-sm">請登入以管理您的愛車紀錄</p>
          <button 
            onClick={() => signInWithPopup(auth, provider)}
            className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            使用 Google 帳號登入
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text font-sans pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur-md border-b border-border px-6 py-4">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              <Fuel size={20} />
            </div>
            AutoTrack Pro
          </h1>
          <button 
            onClick={() => signOut(auth)}
            className="text-[10px] font-bold uppercase tracking-widest text-muted border border-border py-1 px-3 rounded-full bg-bg hover:text-white hover:bg-red-500/20 transition-colors"
          >
            登出
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Dashboard 
                fuelRecords={processedFuelRecords} 
                maintenanceRecords={maintenanceRecords} 
                unit={unit}
              />
            </motion.div>
          )}
          {activeTab === 'fuel' && (
            <motion.div
              key="fuel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <FuelTab 
                records={processedFuelRecords} 
                onAdd={addFuelRecord} 
                onDelete={deleteFuelRecord}
                unit={unit}
                fuelType={fuelType}
                tankCapacity={tankCapacity}
              />
            </motion.div>
          )}
          {activeTab === 'maintenance' && (
            <motion.div
              key="maintenance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <MaintenanceTab 
                records={maintenanceRecords} 
                onAdd={addMaintenanceRecord}
                onDelete={deleteMaintenanceRecord}
              />
            </motion.div>
          )}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <SettingsTab 
                unit={unit} 
                setUnit={setUnit} 
                fuelType={fuelType}
                setFuelType={setFuelType}
                tankCapacity={tankCapacity} 
                setTankCapacity={setTankCapacity} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 bg-surface border-t border-border h-20 shadow-2xl">
        <div className="max-w-md mx-auto h-full flex justify-around items-center px-2">
          <NavBtn 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
            icon={<LayoutDashboard size={22} />} 
            label="概覽" 
          />
          <NavBtn 
            active={activeTab === 'fuel'} 
            onClick={() => setActiveTab('fuel')} 
            icon={<Fuel size={22} />} 
            label="加油" 
          />
          <NavBtn 
            active={activeTab === 'maintenance'} 
            onClick={() => setActiveTab('maintenance')} 
            icon={<Wrench size={22} />} 
            label="保養" 
          />
          <NavBtn 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
            icon={<SettingsIcon size={22} />} 
            label="設定" 
          />
        </div>
      </nav>
    </div>
  );
}

function NavBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 transition-all duration-300 w-full h-full",
        active ? "text-primary" : "text-muted hover:text-text"
      )}
    >
      <div className={cn(
        "p-1.5 rounded-xl transition-colors",
        active ? "bg-primary/10 shadow-[0_0_20px_rgba(59,130,246,0.1)]" : "bg-transparent"
      )}>
        {icon}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      {active && (
        <motion.div 
          layoutId="active-dot"
          className="w-4 h-0.5 bg-primary rounded-full mt-0.5"
        />
      )}
    </button>
  );
}

