import { useState, FormEvent, useEffect } from 'react';
import { FuelRecord, UnitType, FuelType } from '../types.ts';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Fuel, 
  Gauge, 
  DollarSign,
  Info,
  RefreshCw,
  Zap
} from 'lucide-react';
import { cn } from '../lib/utils.ts';
import { motion, AnimatePresence } from 'motion/react';

interface FuelTabProps {
  records: FuelRecord[];
  onAdd: (record: Omit<FuelRecord, 'id' | 'consumption'>) => void;
  onDelete: (id: string) => void;
  unit: UnitType;
  fuelType: FuelType;
  tankCapacity: number;
}

type OilSource = 'CPC' | 'FPCC';

export function FuelTab({ records, onAdd, onDelete, unit, fuelType, tankCapacity }: FuelTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [oilSource, setOilSource] = useState<OilSource>('CPC');
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [fetchedPrices, setFetchedPrices] = useState<{ cpc: number; fpcc: number } | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    pricePerLiter: '',
    currentMileage: '',
    isFull: true,
    fuelLevel: 100 // percent
  });

  const fetchOilPrices = async () => {
    setFetchingPrice(true);
    try {
      const res = await fetch(`/api/oil-price?type=${encodeURIComponent(fuelType)}`);
      const json = await res.json();
      if (json.success) {
        setFetchedPrices(json.data);
        setIsFallback(!!json.data.isFallback);
        // Only update if current price is empty or was from previous fetch
        const currentPrice = json.data[oilSource.toLowerCase()];
        setFormData(prev => ({ ...prev, pricePerLiter: currentPrice.toString() }));
      }
    } catch (error) {
      console.error("Failed to fetch prices", error);
    } finally {
      setFetchingPrice(false);
    }
  };

  useEffect(() => {
    if (showForm && !fetchedPrices) {
      fetchOilPrices();
    }
  }, [showForm]);

  useEffect(() => {
    if (fetchedPrices) {
      const price = oilSource === 'CPC' ? fetchedPrices.cpc : fetchedPrices.fpcc;
      setFormData(prev => ({ ...prev, pricePerLiter: price.toString() }));
    }
  }, [oilSource, fetchedPrices]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formData.amount);
    const priceNum = parseFloat(formData.pricePerLiter);
    const mileageNum = parseFloat(formData.currentMileage);
    const levelNum = formData.isFull ? 1 : formData.fuelLevel / 100;

    if (isNaN(amountNum) || isNaN(priceNum) || isNaN(mileageNum)) return;

    onAdd({
      date: formData.date,
      amount: amountNum,
      pricePerLiter: priceNum,
      currentMileage: mileageNum,
      isFull: formData.isFull,
      fuelLevel: levelNum,
      liters: amountNum / priceNum
    });

    setShowForm(false);
    setFormData({
      ...formData,
      amount: '',
      currentMileage: '', // Keep price and date for convenience
      fuelLevel: 100
    });
  };

  const calculatedLiters = (parseFloat(formData.amount) / parseFloat(formData.pricePerLiter)) || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-surface p-4 rounded-3xl border border-border">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted ml-2">
          加油紀錄 <span className="text-primary/60 ml-1">({records.length})</span>
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className={cn(
            "p-2.5 rounded-2xl transition-all duration-300 shadow-lg",
            showForm ? "bg-red-500/10 text-red-500 rotate-45 border border-red-500/20" : "bg-primary text-white border border-primary/20 shadow-primary/20"
          )}
        >
          <Plus size={24} />
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="bg-surface rounded-3xl p-6 border border-border space-y-5 overflow-hidden"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted">
                  油品來源 ({fuelType})
                </label>
                <button 
                  type="button"
                  onClick={fetchOilPrices}
                  className={cn("text-primary flex items-center gap-1 text-[10px] uppercase font-black transition-all", fetchingPrice && "animate-spin")}
                >
                  <RefreshCw size={12} />
                  {fetchingPrice ? "更新中" : isFallback ? "使用預設價 (點擊重試)" : "同步最新"}
                </button>
              </div>
              {isFallback && !fetchingPrice && (
                <p className="text-[9px] text-red-400 bg-red-400/5 p-2 rounded-lg border border-red-400/10 mb-2">
                  無法連線至中油伺服器，目前顯示預估價。
                </p>
              )}
              <div className="flex p-1 bg-bg rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setOilSource('CPC')}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                    oilSource === 'CPC' ? "bg-primary text-white shadow-lg" : "text-muted hover:text-text"
                  )}
                >
                  <Zap size={14} className={oilSource === 'CPC' ? "text-white" : "text-primary"} />
                  中油 CPC
                </button>
                <button
                  type="button"
                  onClick={() => setOilSource('FPCC')}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                    oilSource === 'FPCC' ? "bg-primary text-white shadow-lg" : "text-muted hover:text-text"
                  )}
                >
                  <Zap size={14} className={oilSource === 'FPCC' ? "text-white" : "text-primary"} />
                  台塑 FPCC
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                icon={<Calendar size={18} />}
                label="日期"
                type="date"
                value={formData.date}
                onChange={v => setFormData({ ...formData, date: v })}
                required
              />
              <Input
                icon={<DollarSign size={18} />}
                label="目前油價 (元/L)"
                type="number"
                step="0.1"
                placeholder={fetchingPrice ? "抓取中..." : ""}
                value={formData.pricePerLiter}
                onChange={v => setFormData({ ...formData, pricePerLiter: v })}
                required
              />
            </div>
            
            <Input
              icon={<DollarSign size={18} />}
              label="總金額 ($)"
              type="number"
              value={formData.amount}
              onChange={v => setFormData({ ...formData, amount: v })}
              required
            />

            <Input
              icon={<Gauge size={18} />}
              label="目前總里程 (km)"
              type="number"
              value={formData.currentMileage}
              onChange={v => setFormData({ ...formData, currentMileage: v })}
              required
            />

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted ml-1">
                油箱狀態
              </label>
              <div className="flex p-1 bg-bg rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isFull: true })}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                    formData.isFull ? "bg-primary text-white shadow-lg" : "text-muted hover:text-text"
                  )}
                >
                  全滿
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isFull: false })}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                    !formData.isFull ? "bg-primary text-white shadow-lg" : "text-muted hover:text-text"
                  )}
                >
                  部分
                </button>
              </div>
            </div>

            {!formData.isFull && (
              <div className="space-y-3 bg-bg/50 p-4 rounded-2xl border border-border/50">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted">
                    加完油後油量概況
                  </label>
                  <span className="text-[10px] font-mono font-bold text-primary">
                    {formData.fuelLevel}%
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={formData.fuelLevel}
                  onChange={(e) => setFormData({ ...formData, fuelLevel: Number(e.target.value) })}
                  className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <p className="text-[9px] text-muted italic text-center">
                  請估計加完油後儀表板顯示的油量百分比
                </p>
              </div>
            )}

            {calculatedLiters > 0 && (
              <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-muted bg-bg/50 p-3 rounded-xl border border-border/50">
                <Info size={14} className="text-primary" />
                預計加入: <span className="text-text font-mono ml-auto">{calculatedLiters.toFixed(2)} L</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-primary text-white font-bold text-sm uppercase tracking-[0.2em] py-4 rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all border border-primary/20"
            >
              儲存紀錄
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {records.map((record) => (
          <div key={record.id} className="bg-surface p-5 rounded-3xl border border-border relative group overflow-hidden border-l-4 border-l-primary transition-all active:scale-[0.98]">
            <div className="flex justify-between items-start">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted flex items-center gap-1.5">
                    <Calendar size={12} className="text-primary/60" />
                    {record.date}
                  </p>
                  <div className="flex items-center gap-2">
                    {record.isFull ? (
                      <span className="text-[9px] font-bold uppercase tracking-widest bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
                        Full
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold uppercase tracking-widest bg-muted/10 text-muted px-2 py-0.5 rounded border border-muted/20">
                        Partial
                      </span>
                    )}
                  </div>
                  {!record.isFull && record.fuelLevel !== undefined && (
                    <span className="text-[9px] font-bold uppercase tracking-widest bg-success/10 text-success px-2 py-0.5 rounded border border-success/20">
                      Level: {Math.round(record.fuelLevel * 100)}%
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-3">
                  <h4 className="text-2xl font-bold text-text font-mono tracking-tight">${record.amount}</h4>
                  <span className="text-[10px] text-muted font-bold uppercase tracking-tighter">
                    {record.liters.toFixed(2)} L • ${record.pricePerLiter}/L
                  </span>
                </div>
                <div className="flex items-center gap-4 pt-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted font-bold tracking-tight">
                    <Gauge size={14} className="text-primary/60" />
                    {record.currentMileage.toLocaleString()} km
                  </div>
                  {record.consumption !== undefined && (
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-success">
                      <TrendingUp size={14} />
                      {unit === 'km/L' ? record.consumption.toFixed(1) : (100 / record.consumption).toFixed(1)} {unit}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => onDelete(record.id)}
                className="p-3 text-muted hover:text-red-500 transition-colors opacity-40 group-hover:opacity-100"
              >
                <Trash2 size={20} />
              </button>
            </div>
            
            {/* Visual Decoration */}
            <div className="absolute -bottom-2 -left-2 rotate-12 opacity-[0.02] pointer-events-none">
              <Fuel size={80} />
            </div>
          </div>
        ))}

        {records.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-surface rounded-3xl shadow-inner border border-border flex items-center justify-center mx-auto text-muted">
              <Fuel size={32} />
            </div>
            <p className="text-muted text-[10px] font-bold uppercase tracking-[0.2em]">尚無加油紀錄</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Input({ icon, label, ...props }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-muted ml-1">
        {label}
      </label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
          {icon}
        </div>
        <input
          {...props}
          className="w-full bg-bg border border-border rounded-xl py-3.5 pl-11 pr-4 text-text font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-muted/30"
          value={props.value}
          onChange={e => props.onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function TrendingUp({ size, className }: { size: number; className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
      <polyline points="17 6 23 6 23 12"></polyline>
    </svg>
  );
}
