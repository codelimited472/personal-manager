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
  workspace_id?: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
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
  color?: string;
  last_oil_change_date?: string;
  last_oil_change_mileage?: string;
  created_at: string;
  updated_at: string;
}

export interface LocalVehicleIssue extends SyncFields {
  id: string;
  vehicle_id: string;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'pending';
  expense_amount?: number;
  expense_method?: string;
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

// Events / Important Dates
export interface LocalEvent extends SyncFields {
  id: string;
  user_id: string;
  title: string;
  date: string; // Event date (Month and Day are used)
  original_date?: string; // Optional original date for age calculation
  type: 'birthday' | 'anniversary' | 'reminder' | 'other';
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Lists
export interface ListColumn {
  name: string;
  type: 'text' | 'number';
}

export interface LocalList extends SyncFields {
  id: string;
  user_id: string;
  name: string;
  columns?: ListColumn[];
  created_at: string;
}

export interface LocalListItem extends SyncFields {
  id: string;
  list_id: string;
  user_id: string;
  name: string;
  checked: boolean;
  custom_fields?: Record<string, string | number>;
  created_at: string;
}

export interface LocalAppList extends SyncFields {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface LocalAppListItem extends SyncFields {
  id: string;
  list_id: string;
  user_id: string;
  name: string;
  checked: boolean;
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
  type: string; // 'business', 'idea', etc.
  description?: string;
  status?: string;
  priority?: string;
  expected_launch?: string;
  tags?: string[];
  updated_at?: string;
  created_at: string;
}

export interface LocalBusinessLink extends SyncFields {
  id: string;
  workspace_id: string;
  title: string;
  url: string;
  created_at: string;
}

export interface LocalBusinessTimelineEvent extends SyncFields {
  id: string;
  workspace_id: string;
  type: string; // 'created', 'note_added', 'task_completed', 'status_changed', 'edited'
  description: string;
  created_at: string;
}

export interface LocalBusinessChecklistItem extends SyncFields {
  id: string;
  workspace_id: string;
  group_name?: string;
  content: string;
  checked: boolean;
  created_at: string;
}

export interface LocalBusinessChecklist extends SyncFields {
  id: string;
  workspace_id: string;
  title: string;
  tasks: string; // JSON string of items { id, content, checked, due_date, priority, notes }
  progress: number;
  created_at: string;
}

export interface LocalBusinessFuturePlan extends SyncFields {
  id: string;
  workspace_id: string;
  title: string;
  timeline?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  notes?: string;
  tags: string[];
  created_at: string;
}

export interface LocalBusinessGoal extends SyncFields {
  id: string;
  workspace_id: string;
  title: string;
  target_date?: string;
  progress: number;
  status: 'active' | 'completed' | 'on_hold';
  milestones: string; // JSON string of milestones { id, title, completed }
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
  tags: string[];
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

export interface LocalNoteFolder extends SyncFields {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface LocalHaircut extends SyncFields {
  id: string;
  user_id: string;
  date: string;
  description: string;
  location: string;
  cost: number;
  created_at: string;
}

// Notes & Ideas
export interface LocalNote extends SyncFields {
  id: string;
  user_id: string;
  folder_id?: string;
  title: string;
  content: string;
  tags: string[];
  is_deleted?: boolean;
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
  dismissed_date?: string;
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
  noteFolders!: EntityTable<LocalNoteFolder, 'id'>;
  inventoryItems!: EntityTable<LocalInventoryItem, 'id'>;
  expiryItems!: EntityTable<LocalExpiryItem, 'id'>;
  wardrobeItems!: EntityTable<LocalWardrobeItem, 'id'>;
  outfits!: EntityTable<LocalOutfit, 'id'>;
  documents!: EntityTable<LocalDocument, 'id'>;
  businessWorkspaces!: EntityTable<LocalBusinessWorkspace, 'id'>;
  businessChecklists!: EntityTable<LocalBusinessChecklist, 'id'>;
  businessFuturePlans!: EntityTable<LocalBusinessFuturePlan, 'id'>;
  businessGoals!: EntityTable<LocalBusinessGoal, 'id'>;
  businessNotes!: EntityTable<LocalBusinessNote, 'id'>;
  businessIdeas!: EntityTable<LocalBusinessIdea, 'id'>;
  businessDocuments!: EntityTable<LocalBusinessDocument, 'id'>;
  businessContacts!: EntityTable<LocalBusinessContact, 'id'>;
  businessLinks!: EntityTable<LocalBusinessLink, 'id'>;
  businessTimelineEvents!: EntityTable<LocalBusinessTimelineEvent, 'id'>;
  businessChecklistItems!: EntityTable<LocalBusinessChecklistItem, 'id'>;
  notes!: EntityTable<LocalNote, 'id'>;
  ideas!: EntityTable<LocalIdea, 'id'>;
  captures!: EntityTable<LocalCapture, 'id'>;
  settings!: EntityTable<LocalSettings, 'key'>;
  notifications!: EntityTable<LocalNotification, 'id'>;
  haircuts!: EntityTable<LocalHaircut, 'id'>;
  appLists!: EntityTable<LocalAppList, 'id'>;
  appListItems!: EntityTable<LocalAppListItem, 'id'>;
  events!: EntityTable<LocalEvent, 'id'>;

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
      vehicles: 'id, user_id, name, registration_number, insurance_expiry, pollution_expiry, road_tax_expiry, last_oil_change_date, last_oil_change_mileage, _syncStatus',
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

    this.version(4).stores({
      buyItems: null,
      lists: 'id, user_id, name, _syncStatus',
      listItems: 'id, list_id, user_id, checked, _syncStatus',
    });

    this.version(6).stores({
      lists: null,
      listItems: null,
      noteFolders: 'id, user_id, name, _syncStatus',
      notes: 'id, user_id, folder_id, title, _syncStatus',
    });

    this.version(7).stores({
      businessChecklists: 'id, workspace_id, _syncStatus',
      businessFuturePlans: 'id, workspace_id, priority, _syncStatus',
      businessGoals: 'id, workspace_id, status, _syncStatus',
      businessTasks: 'id, workspace_id, status, priority, due_date, _syncStatus',
    });

    this.version(8).stores({
      haircuts: 'id, user_id, date, _syncStatus',
    });

    this.version(9).stores({
      appLists: 'id, user_id, name, _syncStatus',
      appListItems: 'id, list_id, user_id, checked, _syncStatus',
    });

    this.version(10).stores({
      events: 'id, user_id, date, original_date, type, _syncStatus',
    });

    this.version(11).stores({
      businessLinks: 'id, workspace_id, _syncStatus',
      businessTimelineEvents: 'id, workspace_id, type, _syncStatus',
      businessChecklistItems: 'id, workspace_id, _syncStatus',
    });

    this.version(12).stores({
      businessTasks: null,
    });
  }
}

// Singleton database instance
let dbInstance: PersonalManagerDB | null = null;

export function getDB(): PersonalManagerDB {
  if (typeof window === 'undefined') {
    // Return a dummy object during Server-Side Rendering
    // since Dexie cannot be used in Node.js
    return {} as PersonalManagerDB;
  }
  if (!dbInstance) {
    dbInstance = new PersonalManagerDB();
  }
  return dbInstance;
}

export type { PersonalManagerDB };
export default PersonalManagerDB;
