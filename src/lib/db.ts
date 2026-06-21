import Dexie, { type EntityTable } from 'dexie';

// ============================================
// Type Definitions for Local Cache
// ============================================

export type SyncStatus = 'synced' | 'pending' | 'conflict';

interface SyncFields {
  _syncStatus: SyncStatus;
  _lastSyncedAt?: string;
}

// Core
export interface LocalTask extends SyncFields {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'personal' | 'work' | 'business' | 'vehicle' | 'travel' | 'shopping';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  is_recurring: boolean;
  recurrence_rule?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface LocalHabit extends SyncFields {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  target_days?: string[];
  category?: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocalHabitLog extends SyncFields {
  id: string;
  user_id: string;
  habit_id: string;
  date: string;
  completed: boolean;
  notes?: string;
  created_at: string;
}

export interface LocalWaterLog extends SyncFields {
  id: string;
  user_id: string;
  date: string;
  amount: number;
  created_at: string;
}

// Finance
export interface LocalExpense extends SyncFields {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  description?: string;
  date: string;
  payment_method?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LocalEmployeeProfile extends SyncFields {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  created_at: string;
}

export interface LocalEmployeeExpense extends SyncFields {
  id: string;
  user_id: string;
  employee_id: string;
  amount: number;
  category: string;
  description?: string;
  date: string;
  status: 'pending' | 'approved' | 'reimbursed';
  created_at: string;
}

// Petrol & Mileage
export interface LocalPetrolExpense extends SyncFields {
  id: string;
  user_id: string;
  vehicle_id: string;
  amount: number;
  rate: number;
  liters: number;
  odometer: number;
  mileage?: number;
  date: string;
  created_at: string;
}

// Vehicles
export interface LocalVehicle extends SyncFields {
  id: string;
  user_id: string;
  name: string;
  registration_number: string;
  insurance_details?: string;
  insurance_expiry?: string;
  pollution_certificate?: string;
  pollution_expiry?: string;
  rc_details?: string;
  warranty_info?: string;
  road_tax_expiry?: string;
  created_at: string;
  updated_at: string;
}

export interface LocalVehicleIssue extends SyncFields {
  id: string;
  vehicle_id: string;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'resolved';
  created_at: string;
  updated_at: string;
}

// Travel
export interface LocalTrip extends SyncFields {
  id: string;
  user_id: string;
  name: string;
  budget: number;
  start_date: string;
  end_date: string;
  description?: string;
  created_at: string;
}

export interface LocalTripExpense extends SyncFields {
  id: string;
  trip_id: string;
  amount: number;
  category: string;
  description?: string;
  date: string;
  created_at: string;
}

export interface LocalTripPackingItem extends SyncFields {
  id: string;
  trip_id: string;
  name: string;
  quantity: number;
  packed: boolean;
  category: string;
  created_at: string;
}

// Places to Visit
export interface LocalPlace extends SyncFields {
  id: string;
  user_id: string;
  name: string;
  category: 'local' | 'india' | 'international';
  notes?: string;
  maps_link?: string;
  priority: 'low' | 'medium' | 'high';
  visited: boolean;
  created_at: string;
}

// Restaurants
export interface LocalRestaurant extends SyncFields {
  id: string;
  user_id: string;
  name: string;
  location: string;
  recommended_dishes?: string[];
  rating: number;
  notes?: string;
  city: string;
  created_at: string;
}

// Buy List
export interface LocalBuyItem extends SyncFields {
  id: string;
  user_id: string;
  name: string;
  list_type: 'shopping' | 'wishlist';
  priority: 'low' | 'medium' | 'high';
  purchased: boolean;
  created_at: string;
}

// Inventory & Things I Own
export interface LocalInventoryItem extends SyncFields {
  id: string;
  user_id: string;
  name: string;
  category: string;
  purchase_date?: string;
  purchase_price?: number;
  warranty_expiry?: string;
  condition: 'new' | 'good' | 'fair' | 'poor';
  notes?: string;
  created_at: string;
}

// Expiries
export interface LocalExpiryItem extends SyncFields {
  id: string;
  user_id: string;
  name: string;
  category: 'medicine' | 'food' | 'cosmetics' | 'supplements';
  purchase_date?: string;
  expiry_date: string;
  quantity: string;
  created_at: string;
}

// Wardrobe / Fashion
export interface LocalWardrobeItem extends SyncFields {
  id: string;
  user_id: string;
  name: string;
  category: 'formal' | 'casual' | 'party' | 'gym' | 'traditional';
  type: 'clothing' | 'shoes' | 'watches' | 'accessories' | 'bags';
  images: string[];
  tags: string[];
  created_at: string;
}

export interface LocalOutfit extends SyncFields {
  id: string;
  user_id: string;
  name: string;
  notes?: string;
  item_ids: string[];
  images: string[];
  created_at: string;
}

// Document Vault
export interface LocalDocument extends SyncFields {
  id: string;
  user_id: string;
  name: string;
  category: 'aadhaar' | 'passport' | 'pan' | 'rc' | 'insurance' | 'certificate' | 'license' | 'other';
  file_url?: string;
  expiry_date?: string;
  notes?: string;
  created_at: string;
}

// Business Workspace
export interface LocalBusinessWorkspace extends SyncFields {
  id: string;
  user_id: string;
  name: string;
  type: 'clinic' | 'school' | 'annotation' | 'other';
  created_at: string;
}

export interface LocalBusinessTask extends SyncFields {
  id: string;
  workspace_id: string;
  title: string;
  due_date?: string;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
}

export interface LocalBusinessNote extends SyncFields {
  id: string;
  workspace_id: string;
  title: string;
  content: string;
  created_at: string;
}

export interface LocalBusinessIdea extends SyncFields {
  id: string;
  workspace_id: string;
  title: string;
  description?: string;
  status: 'new' | 'exploring' | 'in_progress' | 'implemented';
  created_at: string;
}

export interface LocalBusinessDocument extends SyncFields {
  id: string;
  workspace_id: string;
  name: string;
  file_url?: string;
  created_at: string;
}

export interface LocalBusinessContact extends SyncFields {
  id: string;
  workspace_id: string;
  name: string;
  type: 'client' | 'vendor' | 'employee';
  email?: string;
  phone?: string;
  created_at: string;
}

// Notes & Ideas
export interface LocalNote extends SyncFields {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface LocalIdea extends SyncFields {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category: string;
  tags: string[];
  status: 'new' | 'exploring' | 'in_progress' | 'implemented';
  created_at: string;
}

// Captures
export interface LocalCapture extends SyncFields {
  id: string;
  user_id: string;
  text: string;
  categorized: boolean;
  category?: string;
  entity_id?: string;
  created_at: string;
}

// Settings
export interface LocalSettings extends SyncFields {
  key: string;
  user_id: string;
  value: string;
}

// Notifications
export interface LocalNotification extends SyncFields {
  id: string;
  user_id: string;
  title: string;
  body?: string;
  type?: string;
  entity_type?: string;
  entity_id?: string;
  due_date?: string;
  read: boolean;
  dismissed: boolean;
  created_at: string;
}

// ============================================
// Dexie Database
// ============================================

class PersonalManagerDB extends Dexie {
  tasks!: EntityTable<LocalTask, 'id'>;
  habits!: EntityTable<LocalHabit, 'id'>;
  habitLogs!: EntityTable<LocalHabitLog, 'id'>;
  waterLogs!: EntityTable<LocalWaterLog, 'id'>;
  expenses!: EntityTable<LocalExpense, 'id'>;
  employeeProfiles!: EntityTable<LocalEmployeeProfile, 'id'>;
  employeeExpenses!: EntityTable<LocalEmployeeExpense, 'id'>;
  petrolExpenses!: EntityTable<LocalPetrolExpense, 'id'>;
  vehicles!: EntityTable<LocalVehicle, 'id'>;
  vehicleIssues!: EntityTable<LocalVehicleIssue, 'id'>;
  trips!: EntityTable<LocalTrip, 'id'>;
  tripExpenses!: EntityTable<LocalTripExpense, 'id'>;
  tripPackingItems!: EntityTable<LocalTripPackingItem, 'id'>;
  places!: EntityTable<LocalPlace, 'id'>;
  restaurants!: EntityTable<LocalRestaurant, 'id'>;
  buyItems!: EntityTable<LocalBuyItem, 'id'>;
  inventoryItems!: EntityTable<LocalInventoryItem, 'id'>;
  expiryItems!: EntityTable<LocalExpiryItem, 'id'>;
  wardrobeItems!: EntityTable<LocalWardrobeItem, 'id'>;
  outfits!: EntityTable<LocalOutfit, 'id'>;
  documents!: EntityTable<LocalDocument, 'id'>;
  businessWorkspaces!: EntityTable<LocalBusinessWorkspace, 'id'>;
  businessTasks!: EntityTable<LocalBusinessTask, 'id'>;
  businessNotes!: EntityTable<LocalBusinessNote, 'id'>;
  businessIdeas!: EntityTable<LocalBusinessIdea, 'id'>;
  businessDocuments!: EntityTable<LocalBusinessDocument, 'id'>;
  businessContacts!: EntityTable<LocalBusinessContact, 'id'>;
  notes!: EntityTable<LocalNote, 'id'>;
  ideas!: EntityTable<LocalIdea, 'id'>;
  captures!: EntityTable<LocalCapture, 'id'>;
  settings!: EntityTable<LocalSettings, 'key'>;
  notifications!: EntityTable<LocalNotification, 'id'>;

  constructor() {
    super('PersonalManagerDB');

    this.version(1).stores({
      tasks: 'id, user_id, title, due_date, priority, category, status, is_recurring, created_at, _syncStatus',
      habits: 'id, user_id, name, frequency, category, is_active, created_at, _syncStatus',
      habitLogs: 'id, user_id, habit_id, date, completed, _syncStatus, [habit_id+date]',
      waterLogs: 'id, user_id, date, amount, created_at, _syncStatus',
      expenses: 'id, user_id, amount, category, date, created_at, _syncStatus',
      captures: 'id, user_id, categorized, created_at, _syncStatus',
      settings: 'key',
      notifications: 'id, user_id, type, read, due_date, _syncStatus',
    });

    this.version(2).stores({
      tasks: 'id, user_id, title, due_date, priority, category, status, is_recurring, created_at, _syncStatus',
      habits: 'id, user_id, name, frequency, category, is_active, created_at, _syncStatus',
      habitLogs: 'id, user_id, habit_id, date, completed, _syncStatus, [habit_id+date]',
      waterLogs: 'id, user_id, date, amount, created_at, _syncStatus',
      expenses: 'id, user_id, amount, category, date, created_at, _syncStatus',
      employeeProfiles: 'id, user_id, name, _syncStatus',
      employeeExpenses: 'id, user_id, employee_id, date, status, _syncStatus',
      petrolExpenses: 'id, user_id, vehicle_id, date, _syncStatus',
      vehicles: 'id, user_id, name, registration_number, insurance_expiry, pollution_expiry, road_tax_expiry, _syncStatus',
      vehicleIssues: 'id, vehicle_id, status, _syncStatus',
      trips: 'id, user_id, start_date, end_date, _syncStatus',
      tripExpenses: 'id, trip_id, category, date, _syncStatus',
      tripPackingItems: 'id, trip_id, packed, category, _syncStatus',
      places: 'id, user_id, category, visited, priority, _syncStatus',
      restaurants: 'id, user_id, rating, city, _syncStatus',
      buyItems: 'id, user_id, list_type, priority, purchased, _syncStatus',
      inventoryItems: 'id, user_id, category, condition, _syncStatus',
      expiryItems: 'id, user_id, category, expiry_date, _syncStatus',
      wardrobeItems: 'id, user_id, category, type, _syncStatus',
      outfits: 'id, user_id, name, _syncStatus',
      documents: 'id, user_id, category, expiry_date, _syncStatus',
      businessWorkspaces: 'id, user_id, type, _syncStatus',
      businessTasks: 'id, workspace_id, status, due_date, _syncStatus',
      businessNotes: 'id, workspace_id, _syncStatus',
      businessIdeas: 'id, workspace_id, status, _syncStatus',
      businessDocuments: 'id, workspace_id, _syncStatus',
      businessContacts: 'id, workspace_id, type, _syncStatus',
      notes: 'id, user_id, title, _syncStatus',
      ideas: 'id, user_id, status, category, _syncStatus',
      captures: 'id, user_id, categorized, created_at, _syncStatus',
      settings: 'key',
      notifications: 'id, user_id, type, read, due_date, _syncStatus',
    });

    this.version(3).stores({
      settings: 'key, user_id, _syncStatus'
    }).upgrade(tx => {
      return tx.table('settings').toCollection().modify(setting => {
        if (!setting._syncStatus) setting._syncStatus = 'pending';
        if (!setting.user_id) setting.user_id = 'local-user';
      });
    });
  }
}

// Singleton database instance
let dbInstance: PersonalManagerDB | null = null;

export function getDB(): PersonalManagerDB {
  if (typeof window === 'undefined') {
    throw new Error('Dexie can only be used in the browser');
  }
  if (!dbInstance) {
    dbInstance = new PersonalManagerDB();
  }
  return dbInstance;
}

export type { PersonalManagerDB };
export default PersonalManagerDB;
