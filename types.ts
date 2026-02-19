
export enum ClubType {
  DRIVER = 'Driver',
  WOOD = 'Fairway Wood',
  HYBRID = 'Hybrid',
  IRON = 'Iron',
  WEDGE = 'Wedge',
  PUTTER = 'Putter',
  ACCESSORY = 'Accessory',
  OTHER = 'Other'
}

export enum ClubStatus {
  BAG = 'In Bag',
  LOCKER = 'Locker Room'
}

export interface LaunchMonitorData {
  carryDistance?: number; // yards
  totalDistance?: number; // yards
  ballSpeed?: number; // mph
  clubSpeed?: number; // mph
  smashFactor?: number;
  spinRate?: number; // rpm
  launchAngle?: number; // degrees
  notes?: string;
}

export interface Club {
  id: string;
  type: ClubType;
  brand: string;
  model: string;
  loft?: string;
  setComposition?: string[]; // e.g. ["4", "5", "6", "PW"]
  shaftMakeModel?: string;
  shaftStiffness?: string;
  photoUrl?: string;
  receiptUrl?: string;
  purchaseDate?: string;
  price?: number;
  notes?: string;
  launchData?: LaunchMonitorData;
  dateAdded: number;
  status: ClubStatus;
  tradeInLow?: number;
  tradeInHigh?: number;
  lastTradeInCheck?: number;
}

export interface AIScanResult {
  brand?: string;
  model?: string;
  type?: ClubType;
  loft?: string;
  setComposition?: string[];
  shaftMakeModel?: string;
  shaftStiffness?: string;
  price?: number;
  purchaseDate?: string;
}

export interface User {
  email: string;
  name: string;
}