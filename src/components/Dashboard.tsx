import { useMemo, ReactNode } from 'react';
import { FuelRecord, MaintenanceRecord, UnitType } from '../types.ts';
import { cn } from '../lib/utils.ts';
import { 
  TrendingUp, 
  Wallet, 
  Droplets, 
  Activity 
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardProps {
  fuelRecords: FuelRecord[];
  maintenanceRecords: MaintenanceRecord[];
  unit: UnitType;
}

export function Dashboard({ fuelRecords, maintenanceRecords, unit }: DashboardProps) {
  const stats = useMemo(() => {
    const totalFuelCost = fuelRecords.reduce((acc, r) => acc + r.amount, 0);
    const totalMaintCost = maintenanceRecords.reduce((acc, r) => acc + r.cost, 0);
    const totalCost = totalFuelCost + totalMaintCost;

    const fullRecords = fuelRecords.filter(r => r.consumption !== undefined);
    const avgConsumption = fullRecords.length > 0 
      ? fullRecords.reduce((acc, r) => acc + (r.consumption || 0), 0) / fullRecords.length 
      : 0;

    return {
      totalCost,
      avgConsumption,
      totalFuelCost,
      totalMaintCost,
      count: fuelRecords.length
    };
  }, [fuelRecords, maintenanceRecords]);

  const chartData = useMemo(() => {
    const sorted = [...fuelRecords]
      .filter(r => r.consumption !== undefined)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      labels: sorted.map(r => new Date(r.date).toLocaleDateString()),
      datasets: [
        {
          label: `油耗 (${unit})`,
          data: sorted.map(r => {
            if (unit === 'km/L') return r.consumption;
            return r.consumption ? 100 / r.consumption : 0;
          }),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  }, [fuelRecords, unit]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#16161a',
        titleColor: '#fff',
        bodyColor: '#3b82f6',
        borderColor: '#2d2d33',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#a1a1aa',
          font: { size: 10 },
        },
      },
    },
  };

  const formatUnit = (val: number) => {
    if (unit === 'km/L') return val.toFixed(1);
    return (100 / val).toFixed(1);
  };

  return (
    <div className="space-y-6">
      {/* Primary Hero Stat */}
      <div className="bg-surface rounded-3xl p-8 border border-border shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Wallet size={120} />
        </div>
        <div className="relative z-10">
          <p className="text-muted font-bold uppercase tracking-widest text-[10px] mb-1">
            累計總開銷
          </p>
          <h2 className="text-5xl font-bold text-text flex items-baseline gap-2 font-mono">
            <span className="text-xl text-primary">$</span>
            {stats.totalCost.toLocaleString()}
          </h2>
          <div className="mt-6 flex gap-3">
            <div className="bg-bg px-3 py-1.5 rounded-lg border border-border text-[10px] font-bold uppercase tracking-wider text-muted">
              油資: <span className="text-primary">${stats.totalFuelCost.toLocaleString()}</span>
            </div>
            <div className="bg-bg px-3 py-1.5 rounded-lg border border-border text-[10px] font-bold uppercase tracking-wider text-muted">
              保養: <span className="text-success">${stats.totalMaintCost.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard 
          icon={<Droplets className="text-primary" />} 
          label="平均油耗" 
          value={stats.avgConsumption > 0 ? `${formatUnit(stats.avgConsumption)}` : '--'} 
          unit={unit} 
          borderColor="border-b-primary"
        />
        <StatCard 
          icon={<Activity className="text-success" />} 
          label="加油次數" 
          value={stats.count.toString()} 
          unit="次" 
          borderColor="border-b-success"
        />
      </div>

      {/* Chart */}
      <div className="bg-surface rounded-3xl p-6 border border-border">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" />
            油耗趨勢
          </h3>
          <div className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
            {unit}
          </div>
        </div>
        <div className="h-48">
          {fuelRecords.filter(r => r.consumption !== undefined).length > 1 ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className="h-full flex items-center justify-center text-muted text-xs font-medium bg-bg shadow-inner rounded-2xl border border-dashed border-border px-8 text-center leading-relaxed">
              尚未有足夠的加油數據<br/>請先記錄兩次「加滿」里程
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, unit, borderColor }: { icon: ReactNode; label: string; value: string; unit: string; borderColor?: string }) {
  return (
    <div className={cn(
      "bg-surface p-5 rounded-3xl border border-border flex flex-col gap-3 relative transition-transform active:scale-95",
      borderColor ? `border-b-4 ${borderColor}` : ""
    )}>
      <div className="w-9 h-9 bg-bg rounded-xl flex items-center justify-center border border-border">
        {icon}
      </div>
      <div>
        <p className="text-[10px] uppercase font-bold tracking-widest text-muted">
          {label}
        </p>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-2xl font-bold text-text font-mono tracking-tight">{value}</span>
          <span className="text-[10px] text-muted font-bold uppercase">{unit}</span>
        </div>
      </div>
    </div>
  );
}
