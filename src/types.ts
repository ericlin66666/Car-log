export interface FuelRecord {
  id: string;
  date: string;
  amount: number;
  pricePerLiter: number;
  currentMileage: number;
  isFull: boolean;
  fuelLevel: number; // 0.0 to 1.0 (percent after fueling)
  liters: number;
  consumption?: number; // Calculated km/L or similar
}

export interface MaintenanceRecord {
  id: string;
  date: string;
  item: string;
  mileage: number;
  cost: number;
  notes?: string;
}

export type UnitType = 'km/L' | 'L/100km';
export type FuelType = '92無鉛汽油' | '95無鉛汽油' | '98無鉛汽油' | '超級柴油';
