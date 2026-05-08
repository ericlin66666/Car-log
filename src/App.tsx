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

export default function App() {
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
    
    const fetchRecords = async () => {
      try {
        const res = await fetch('/api/records?userId=default_user');
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
  }, []);

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
    const newRecord: FuelRecord = {
      ...record,
      id: crypto.randomUUID(),
    };
    setFuelRecords(prev => [...prev, newRecord]);
    try {
      await fetch('/api/records/fuel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'default_user', record: newRecord })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const deleteFuelRecord = async (id: string) => {
    setFuelRecords(prev => prev.filter(r => r.id !== id));
    try {
      await fetch(`/api/records/fuel/${id}?userId=default_user`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  };

  const addMaintenanceRecord = async (record: Omit<MaintenanceRecord, 'id'>) => {
    const newRecord: MaintenanceRecord = {
      ...record,
      id: crypto.randomUUID(),
    };
    setMaintenanceRecords(prev => [...prev, newRecord]);
    try {
      await fetch('/api/records/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'default_user', record: newRecord })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const deleteMaintenanceRecord = async (id: string) => {
    setMaintenanceRecords(prev => prev.filter(r => r.id !== id));
    try {
      await fetch(`/api/records/maintenance/${id}?userId=default_user`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  };

  if (!isLoaded) return null;

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
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted border border-border py-1 px-3 rounded-full bg-bg">
            v1.0.0
          </div>
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

