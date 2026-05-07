import { useState, FormEvent } from 'react';
import { MaintenanceRecord } from '../types.ts';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Wrench, 
  Gauge, 
  DollarSign,
  FileText
} from 'lucide-react';
import { cn } from '../lib/utils.ts';
import { motion, AnimatePresence } from 'motion/react';

interface MaintenanceTabProps {
  records: MaintenanceRecord[];
  onAdd: (record: Omit<MaintenanceRecord, 'id'>) => void;
  onDelete: (id: string) => void;
}

export function MaintenanceTab({ records, onAdd, onDelete }: MaintenanceTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    item: '',
    mileage: '',
    cost: '',
    notes: ''
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const costNum = parseFloat(formData.cost);
    const mileageNum = parseFloat(formData.mileage);

    if (isNaN(costNum) || isNaN(mileageNum) || !formData.item) return;

    onAdd({
      date: formData.date,
      item: formData.item,
      mileage: mileageNum,
      cost: costNum,
      notes: formData.notes
    });

    setShowForm(false);
    setFormData({
      ...formData,
      item: '',
      cost: '',
      notes: ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-surface p-4 rounded-3xl border border-border">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted ml-2">
          保養紀錄 <span className="text-success/60 ml-1">({records.length})</span>
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className={cn(
            "p-2.5 rounded-2xl transition-all duration-300 shadow-lg",
            showForm ? "bg-red-500/10 text-red-500 rotate-45 border border-red-500/20" : "bg-success text-white border border-success/20 shadow-success/20"
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
             <Input
                icon={<Calendar size={18} />}
                label="日期"
                type="date"
                value={formData.date}
                onChange={(v: string) => setFormData({ ...formData, date: v })}
                required
              />
            
            <Input
              icon={<Wrench size={18} />}
              label="項目名稱"
              placeholder="例如：機油、濾芯..."
              value={formData.item}
              onChange={(v: string) => setFormData({ ...formData, item: v })}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                icon={<Gauge size={18} />}
                label="保養里程 (km)"
                type="number"
                value={formData.mileage}
                onChange={(v: string) => setFormData({ ...formData, mileage: v })}
                required
              />
              <Input
                icon={<DollarSign size={18} />}
                label="費用 ($)"
                type="number"
                value={formData.cost}
                onChange={(v: string) => setFormData({ ...formData, cost: v })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted ml-1">
                故障特徵 / 備註 (選填)
              </label>
              <div className="relative">
                <div className="absolute left-4 top-4 text-muted">
                  <FileText size={18} />
                </div>
                <textarea
                  className="w-full bg-bg border border-border rounded-xl py-3.5 pl-11 pr-4 text-text font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-muted/30 min-h-[100px]"
                  placeholder="輸入詳細資訊..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-success text-white font-bold text-sm uppercase tracking-[0.2em] py-4 rounded-2xl shadow-xl shadow-success/20 hover:scale-[1.02] active:scale-95 transition-all border border-success/20"
            >
              儲存紀錄
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {[...records].reverse().map((record) => (
          <div key={record.id} className="bg-surface p-6 rounded-3xl border border-border relative group overflow-hidden border-l-4 border-l-success transition-all active:scale-[0.98]">
            <div className="flex justify-between items-start">
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted flex items-center gap-1.5">
                  <Calendar size={12} className="text-success/60" />
                  {record.date}
                </p>
                <div>
                  <h4 className="text-lg font-bold text-text uppercase tracking-tight">
                    {record.item}
                  </h4>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-2xl font-bold text-success font-mono tracking-tight">${record.cost.toLocaleString()}</span>
                    <span className="text-[10px] text-muted font-bold uppercase tracking-widest">at {record.mileage.toLocaleString()} km</span>
                  </div>
                </div>
                {record.notes && (
                  <p className="text-[11px] text-muted leading-relaxed bg-bg/50 p-4 rounded-xl border border-border/50 mt-2 font-medium">
                    {record.notes}
                  </p>
                )}
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
              <Wrench size={80} />
            </div>
          </div>
        ))}

        {records.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-surface rounded-3xl shadow-inner border border-border flex items-center justify-center mx-auto text-muted">
              <Wrench size={32} />
            </div>
            <p className="text-muted text-[10px] font-bold uppercase tracking-[0.2em]">尚無保養紀錄</p>
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
