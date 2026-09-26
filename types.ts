
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

export enum ClubDisposition {
  SOLD = 'Sold',
  TRADED = 'Traded'
}

export interface PerClubLaunchData {
  carryDistance?: number; // yards
  totalDistance?: number; // yards
  ballSpeed?: number; // mph
  clubSpeed?: number; // mph
  spinRate?: number; // rpm
  launchAngle?: number; // degrees
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
  perClubData?: { [clubLabel: string]: PerClubLaunchData }; // per-iron data for sets
}

export interface Club {
  id: string;
  type: ClubType;
  brand: string;
  model: string;
  loft?: string;
  setComposition?: string[]; // e.g. ["4", "5", "6", "PW"]
  ironNumber?: string; // single iron only, e.g. "7" or "PW"
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
  disposition?: ClubDisposition; // set once the club has left the collection
  soldPrice?: number; // sale price, or trade-in credit received
  soldDate?: string;
  tradedFor?: string; // what the club was traded for
  pendingTransferId?: string; // set while a move to another user awaits acceptance
  pendingTransferTo?: string; // recipient email for the pending move
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