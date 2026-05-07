import { ReactNode } from 'react';
import { UnitType, FuelType } from '../types.ts';
import { 
  Settings, 
  HelpCircle, 
  ShieldCheck, 
  Database,
  ArrowRightLeft,
  Fuel,
  Droplets
} from 'lucide-react';
import { cn } from '../lib/utils.ts';

interface SettingsTabProps {
  unit: UnitType;
  setUnit: (unit: UnitType) => void;
  fuelType: FuelType;
  setFuelType: (type: FuelType) => void;
  tankCapacity: number;
  setTankCapacity: (capacity: number) => void;
}

export function SettingsTab({ unit, setUnit, fuelType, setFuelType, tankCapacity, setTankCapacity }: SettingsTabProps) {
  const fuelTypes: FuelType[] = ['92無鉛汽油', '95無鉛汽油', '98無鉛汽油', '超級柴油'];

  return (
    <div className="space-y-6">
      <Section header="偏好設定" icon={<Settings size={14} />}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20">
                <ArrowRightLeft size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-text">油耗單位</p>
                <p className="text-[10px] text-muted uppercase tracking-widest font-bold">切換顯示格式</p>
              </div>
            </div>
            <div className="flex p-1 bg-bg rounded-xl border border-border">
              <button
                onClick={() => setUnit('km/L')}
                className={cn(
                  "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                  unit === 'km/L' ? "bg-primary text-white shadow-lg" : "text-muted hover:text-text"
                )}
              >
                km/L
              </button>
              <button
                onClick={() => setUnit('L/100km')}
                className={cn(
                  "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                  unit === 'L/100km' ? "bg-primary text-white shadow-lg" : "text-muted hover:text-text"
                )}
              >
                L/100km
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 px-1">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20">
                <Droplets size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-text">預設油種</p>
                <p className="text-[10px] text-muted uppercase tracking-widest font-bold">自動抓取此油種價格</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 p-1 bg-bg rounded-2xl border border-border">
              {fuelTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setFuelType(type)}
                  className={cn(
                    "py-2.5 rounded-xl text-[10px] font-bold transition-all border",
                    fuelType === type 
                      ? "bg-primary text-white border-primary shadow-lg" 
                      : "text-muted border-transparent hover:bg-surface"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20">
                <Fuel size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-text">油箱容量</p>
                <p className="text-[10px] text-muted uppercase tracking-widest font-bold">設定車輛油箱大小</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-bg rounded-xl border border-border px-3 py-2">
              <input 
                type="number"
                value={tankCapacity}
                onChange={(e) => setTankCapacity(Number(e.target.value))}
                className="w-12 bg-transparent text-right font-mono font-bold text-sm outline-none text-text"
              />
              <span className="text-[10px] font-bold text-muted uppercase">Liters</span>
            </div>
          </div>
        </div>
      </Section>

      <Section header="資料管理" icon={<Database size={14} />}>
        <div className="space-y-4">
          <div className="p-4 bg-bg rounded-2xl border border-border shadow-inner">
            <p className="text-[11px] font-medium text-muted leading-relaxed">
              資料儲存於您的瀏覽器本地 (localStorage)。<br/>清除瀏覽器快取可能會導致資料遺失。
            </p>
          </div>
          <button 
            disabled
            className="w-full py-4 bg-surface border border-border text-muted rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] cursor-not-allowed opacity-50"
          >
            匯出 CSV (製作中)
          </button>
        </div>
      </Section>

      <Section header="關於" icon={<HelpCircle size={14} />}>
        <div className="bg-bg rounded-3xl p-8 border border-border text-center space-y-4 shadow-inner">
          <div className="w-16 h-16 bg-primary mx-auto rounded-2xl flex items-center justify-center text-white shadow-[0_10px_30px_rgba(59,130,246,0.3)]">
             <ShieldCheck size={32} />
          </div>
          <div>
            <h4 className="text-xl font-bold text-text tracking-tight uppercase">AutoTrack Pro</h4>
            <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-primary mt-1">Version 1.0.0</p>
          </div>
          <p className="text-[11px] text-muted leading-relaxed font-medium px-4">
            專業的高性能車輛管理工具。<br />
            100% 本地運行，您的隱私由您掌控。
          </p>
        </div>
      </Section>
    </div>
  );
}

function Section({ header, icon, children }: { header: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted flex items-center gap-2 ml-4">
        {icon}
        {header}
      </h3>
      <div className="bg-surface rounded-[2rem] p-6 border border-border">
        {children}
      </div>
    </div>
  );
}
