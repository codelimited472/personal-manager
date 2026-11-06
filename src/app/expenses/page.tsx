'use client';

import { useState, useEffect } from 'react';
import { Wallet, Car, Trash2, TrendingUp, Edit2, X, Search, ChevronDown } from 'lucide-react';
import { getDB, type LocalExpense, type LocalPetrolExpense, type LocalVehicle } from '@/lib/db';
import { getToday } from '@/lib/utils';
import QuickExpenseLog from '@/components/QuickExpenseLog';
import { deleteRecord } from '@/lib/sync';
import { Skeleton } from '@/components/ui/Skeleton';
import styles from './expenses.module.css';
import pageStyles from '@/app/page.module.css';

export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState<'personal' | 'petrol' | 'analytics'>('personal');
  const db = getDB();

  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'monthly' | 'yearly'>('monthly');
  const [analyticsSelectedMonth, setAnalyticsSelectedMonth] = useState(getToday().substring(0, 7));
  const [analyticsSelectedYear, setAnalyticsSelectedYear] = useState(getToday().substring(0, 4));
  const [selectedAnalyticsCategories, setSelectedAnalyticsCategories] = useState<string[]>([]);
  const [expandedSources, setExpandedSources] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // Personal Expense State
  const [expenses, setExpenses] = useState<LocalExpense[]>([]);
  const [personalViewTimeframe, setPersonalViewTimeframe] = useState<'monthly' | 'yearly'>('monthly');
  const [searchQuery, setSearchQuery] = useState('');

  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editMethod, setEditMethod] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');

  // Petrol State
  const [vehicles, setVehicles] = useState<LocalVehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [petrolAmount, setPetrolAmount] = useState('');
  const [petrolRate, setPetrolRate] = useState('');
  const [petrolLiters, setPetrolLiters] = useState('');
  const [odometer, setOdometer] = useState('');
  const [petrolPaymentMethod, setPetrolPaymentMethod] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['Cash', 'Credit Card']);


  type DisplayFuelLog = {
    id: string;
    isQuickLog: boolean;
    odometer?: number;
    date: string;
    liters?: number;
    rate?: number;
    amount: number;
    mileage?: number;
    description?: string;
  };
  const [petrolLogs, setPetrolLogs] = useState<DisplayFuelLog[]>([]);

  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
      // 1. Personal
      const list = await db.expenses.toArray();
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setExpenses(list);

      const storedMethods = await db.settings.get('paymentMethods');
      if (storedMethods) {
        try {
          const parsed = JSON.parse(storedMethods.value);
          setPaymentMethods(parsed);
          if (parsed.length > 0 && !petrolPaymentMethod) setPetrolPaymentMethod(parsed[0]);
        } catch {}
      } else if (!petrolPaymentMethod) {
        setPetrolPaymentMethod('Cash');
      }

      // 2. Petrol / Vehicles
      const cars = await db.vehicles.toArray();
      setVehicles(cars);
      if (cars.length > 0 && !selectedVehicleId) {
        setSelectedVehicleId(cars[0].id);
      }
      const pLogs = await db.petrolExpenses.toArray();
      const allExps = await db.expenses.toArray();
      const quickPetrol = allExps.filter(e => e.category.toLowerCase() === 'petrol' && !e.description?.startsWith('Fuel for vehicle'));

      const mergedLogs: DisplayFuelLog[] = [
        ...pLogs.map(l => ({
          id: l.id,
          isQuickLog: false,
          odometer: l.odometer,
          date: l.date,
          liters: l.liters,
          rate: l.rate,
          amount: l.amount,
          mileage: l.mileage,
        })),
        ...quickPetrol.map(e => ({
          id: e.id,
          isQuickLog: true,
          date: e.date,
          amount: e.amount,
          description: e.description,
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setPetrolLogs(mergedLogs);
      } catch (err) {
        console.error('Error loading expenses:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [refreshKey]);

  const deleteExpense = async (id: string) => {
    if (!(await window.appConfirm('Are you sure you want to delete this item?'))) return;
    // Check personal expenses
    const expense = await db.expenses.get(id);
    if (expense) {
      if (expense.category.toLowerCase() === 'petrol') {
        const matchingPetrol = await db.petrolExpenses
          .where('date').equals(expense.date)
          .filter(p => p.amount === expense.amount)
          .first();
        if (matchingPetrol) {
          await deleteRecord('petrolExpenses', matchingPetrol.id);
        }
      }
      await deleteRecord('expenses', id);
    }
    
    // Check petrol expenses
    const pExp = await db.petrolExpenses.get(id);
    if (pExp) {
       const matchingExpense = await db.expenses
         .where('date').equals(pExp.date)
         .filter(e => e.amount === pExp.amount && e.category.toLowerCase() === 'petrol')
         .first();
       if (matchingExpense) {
         await deleteRecord('expenses', matchingExpense.id);
       }
       await deleteRecord('petrolExpenses', id);
    }

    // Direct delete fallback (e.g. for unified IDs)
    await deleteRecord('expenses', id);
    await deleteRecord('petrolExpenses', id);
    
    setRefreshKey(prev => prev + 1);
  };

  const openEditModal = (exp: LocalExpense) => {
    setEditingExpenseId(exp.id);
    setEditAmount(exp.amount.toString());
    setEditCategory(exp.category || '');
    setEditDescription(exp.description || '');
    setEditMethod(exp.payment_method || 'Cash');
    setEditDate(exp.date);
    if (exp.created_at) {
      const dateObj = new Date(exp.created_at);
      const hh = String(dateObj.getHours()).padStart(2, '0');
      const mm = String(dateObj.getMinutes()).padStart(2, '0');
      setEditTime(`${hh}:${mm}`);
    } else {
      setEditTime('12:00');
    }
  };

  const saveExpenseEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpenseId) return;
    const amountNum = parseFloat(editAmount);
    if (isNaN(amountNum)) return;

    const expense = await db.expenses.get(editingExpenseId);
    if (!expense) return;

    let newCreatedAt = expense.created_at;
    if (editDate && editTime) {
      const baseDate = new Date(editDate);
      const [hh, mm] = editTime.split(':');
      baseDate.setHours(Number(hh) || 0, Number(mm) || 0, 0, 0);
      newCreatedAt = baseDate.toISOString();
    }

    await db.expenses.update(editingExpenseId, {
      amount: amountNum,
      category: editCategory,
      description: editDescription,
      payment_method: editMethod,
      date: editDate || expense.date,
      created_at: newCreatedAt,
      updated_at: new Date().toISOString(),
      _syncStatus: 'pending'
    });

    // Also update petrol expense if linked
    const pExp = await db.petrolExpenses.get(editingExpenseId);
    if (pExp) {
      await db.petrolExpenses.update(editingExpenseId, {
        amount: amountNum,
        date: editDate || expense.date,
        _syncStatus: 'pending'
      });
    }

    setEditingExpenseId(null);
    setRefreshKey(prev => prev + 1);
  };

  // Petrol Action
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPetrolAmount(val);
    if (val && petrolRate) setPetrolLiters((parseFloat(val) / parseFloat(petrolRate)).toFixed(2));
  };
  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPetrolRate(val);
    if (val && petrolAmount) setPetrolLiters((parseFloat(petrolAmount) / parseFloat(val)).toFixed(2));
    else if (val && petrolLiters) setPetrolAmount((parseFloat(petrolLiters) * parseFloat(val)).toFixed(2));
  };
  const handleLitersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPetrolLiters(val);
    if (val && petrolRate) setPetrolAmount((parseFloat(val) * parseFloat(petrolRate)).toFixed(2));
  };

  const addPetrolExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId) return;
    
    // Require 2 out of 3: Amount, Rate, Liters
    const amt = parseFloat(petrolAmount);
    const rate = parseFloat(petrolRate);
    const ltrs = parseFloat(petrolLiters);
    const odo = parseInt(odometer, 10) || 0; // Odometer is now optional

    if (isNaN(amt) && (isNaN(rate) || isNaN(ltrs))) return;
    if (isNaN(rate) && (isNaN(amt) || isNaN(ltrs))) return;
    if (isNaN(ltrs) && (isNaN(amt) || isNaN(rate))) return;

    const finalAmt = isNaN(amt) ? rate * ltrs : amt;
    const finalRate = isNaN(rate) ? amt / ltrs : rate;
    const finalLtrs = isNaN(ltrs) ? amt / rate : ltrs;

    if (finalLtrs <= 0) return;

    // Calculate Mileage based on previous odometer reading (only if current odo is provided > 0)
    let calculatedMileage = undefined;
    if (odo > 0) {
      const pLogs = await db.petrolExpenses.toArray();
      const previousLogs = pLogs
        .filter(l => l.vehicle_id === selectedVehicleId && l.odometer > 0)
        .sort((a, b) => b.odometer - a.odometer);
      if (previousLogs.length > 0) {
        const diffKm = odo - previousLogs[0].odometer;
        if (diffKm > 0) {
          calculatedMileage = diffKm / finalLtrs;
        }
      }
    }

    const sharedId = crypto.randomUUID();

    await db.petrolExpenses.add({
      id: sharedId,
      user_id: 'local-user',
      vehicle_id: selectedVehicleId,
      amount: finalAmt,
      rate: finalRate,
      liters: finalLtrs,
      odometer: odo,
      mileage: calculatedMileage,
      date: getToday(),
      created_at: new Date().toISOString(),
      _syncStatus: 'pending',
    });

    // Also store it in the main expenses log
    await db.expenses.add({
      id: sharedId,
      user_id: 'local-user',
      amount: finalAmt,
      category: 'Petrol',
      payment_method: petrolPaymentMethod || 'Cash',
      description: `Fuel for vehicle ${odo > 0 ? `(Odo: ${odo}km)` : ''} - ${finalLtrs.toFixed(2)}L @ ₹${finalRate}/L`,
      date: getToday(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _syncStatus: 'pending',
    });

    setPetrolAmount('');
    setPetrolRate('');
    setPetrolLiters('');
    setOdometer('');
    setRefreshKey(prev => prev + 1);
  };

  // Analytics Calculations
  const todayDateObj = new Date();
  const todayStr = getToday();
  const currentMonthStr = todayStr.substring(0, 7);
  const currentYearStr = todayStr.substring(0, 4);

  const yesterdayDateObj = new Date();
  yesterdayDateObj.setDate(yesterdayDateObj.getDate() - 1);
  const yesterdayStr = `${yesterdayDateObj.getFullYear()}-${String(yesterdayDateObj.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDateObj.getDate()).padStart(2, '0')}`;

  const todaySpend = expenses.filter(e => e.date === todayStr).reduce((sum, e) => sum + e.amount, 0);
  const yesterdaySpend = expenses.filter(e => e.date === yesterdayStr).reduce((sum, e) => sum + e.amount, 0);
  
  const monthlyExpenses = expenses.filter(e => e.date.startsWith(currentMonthStr));
  const yearlyExpenses = expenses.filter(e => e.date.startsWith(currentYearStr));

  const monthlySpend = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  const yearlySpend = yearlyExpenses.reduce((sum, e) => sum + e.amount, 0);

  const daysInCurrentMonth = todayDateObj.getDate();
  const daysInCurrentYear = Math.ceil((todayDateObj.getTime() - new Date(todayDateObj.getFullYear(), 0, 1).getTime()) / 86400000) || 1;

  const avgDailyMonthly = (monthlySpend / daysInCurrentMonth).toFixed(0);
  const avgDailyYearly = (yearlySpend / daysInCurrentYear).toFixed(0);

  const currentViewExpenses = personalViewTimeframe === 'monthly' ? monthlyExpenses : yearlyExpenses;

  const spendByMethod = currentViewExpenses.reduce((acc, exp) => {
    const method = exp.payment_method || 'Cash / Other';
    acc[method] = (acc[method] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const filteredExpenses = expenses.filter(exp => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();

    // 1. Amount match
    const amountStr = String(exp.amount);
    if (amountStr.includes(q) || `₹${amountStr}`.toLowerCase().includes(q)) return true;

    // 2. Category match
    if (exp.category && exp.category.toLowerCase().includes(q)) return true;

    // 3. Description match
    if (exp.description && exp.description.toLowerCase().includes(q)) return true;

    // 4. Payment method match
    if (exp.payment_method && exp.payment_method.toLowerCase().includes(q)) return true;

    // 5. Date matching:
    if (exp.date && exp.date.toLowerCase().includes(q)) return true;

    // "today" or "yesterday"
    if (q === 'today' && exp.date === getToday()) return true;
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;
    if (q === 'yesterday' && exp.date === yStr) return true;

    // Formatted dates like "Nov", "November", "Friday", "Nov 6", etc.
    if (exp.date) {
      try {
        const d = new Date(exp.date + 'T00:00:00');
        const longDate = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toLowerCase();
        const shortDate = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).toLowerCase();
        if (longDate.includes(q) || shortDate.includes(q)) return true;
      } catch {}
    }

    // Time matching
    if (exp.created_at) {
      try {
        const timeStr = new Date(exp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
        if (timeStr.includes(q)) return true;
      } catch {}
    }

    return false;
  });

  return (
    <div className="page">
      {/* Tabs */}
      <div className={styles.tabBar}>
        <button
          onClick={() => setActiveTab('personal')}
          className={activeTab === 'personal' ? styles.tabActive : styles.tab}
        >
          <Wallet size={16} /> Personal
        </button>
        <button
          onClick={() => setActiveTab('petrol')}
          className={activeTab === 'petrol' ? styles.tabActive : styles.tab}
        >
          <Car size={16} /> Petrol/Fuel
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={activeTab === 'analytics' ? styles.tabActive : styles.tab}
        >
          <TrendingUp size={16} /> Analytics
        </button>
      </div>

      {/* 1. Personal tab */}
      {activeTab === 'personal' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className={styles.sectionHeader} style={{ marginBottom: 0 }}>Expense Overview</h3>
            <div className={styles.tabBar} style={{ marginBottom: 0, padding: '4px' }}>
              <button
                onClick={() => setPersonalViewTimeframe('monthly')}
                className={personalViewTimeframe === 'monthly' ? styles.tabActive : styles.tab}
                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
              >
                Monthly
              </button>
              <button
                onClick={() => setPersonalViewTimeframe('yearly')}
                className={personalViewTimeframe === 'yearly' ? styles.tabActive : styles.tab}
                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
              >
                Yearly
              </button>
            </div>
          </div>
          
          {personalViewTimeframe === 'monthly' ? (
            <div className={pageStyles.statsGrid}>
              <div className={pageStyles.statCard}>
                <div className={pageStyles.statValue}>₹{Math.round(todaySpend)}</div>
                <div className={pageStyles.statLabel}>Today&apos;s Spend</div>
              </div>
              <div className={pageStyles.statCard}>
                <div className={pageStyles.statValue}>₹{Math.round(yesterdaySpend)}</div>
                <div className={pageStyles.statLabel}>Yesterday&apos;s Spend</div>
              </div>
              <div className={pageStyles.statCard}>
                <div className={pageStyles.statValue}>₹{avgDailyMonthly}</div>
                <div className={pageStyles.statLabel}>Avg. Daily (This Month)</div>
              </div>
              <div className={pageStyles.statCard}>
                <div className={pageStyles.statValue}>₹{Math.round(monthlySpend)}</div>
                <div className={pageStyles.statLabel}>Monthly Spend</div>
              </div>
            </div>
          ) : (
            <div className={pageStyles.statsGrid}>
              <div className={pageStyles.statCard}>
                <div className={pageStyles.statValue}>₹{Math.round(yearlySpend)}</div>
                <div className={pageStyles.statLabel}>Yearly Spend</div>
              </div>
              <div className={pageStyles.statCard}>
                <div className={pageStyles.statValue}>₹{avgDailyYearly}</div>
                <div className={pageStyles.statLabel}>Avg. Daily (This Year)</div>
              </div>
            </div>
          )}

          {Object.keys(spendByMethod).length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 600 }}>
                Spends by Payment Method ({personalViewTimeframe === 'monthly' ? 'This Month' : 'This Year'})
              </h4>
              <div className={pageStyles.statsGrid}>
                {Object.entries(spendByMethod).map(([method, amount]) => (
                  <div key={method} className={pageStyles.statCard}>
                    <div className={pageStyles.statValue}>₹{Math.round(amount)}</div>
                    <div className={pageStyles.statLabel}>{method}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <QuickExpenseLog onExpenseAdded={() => setRefreshKey(prev => prev + 1)} />

          <div className={styles.listSection}>
            <div className={styles.expenseSearchSection}>
              <div className={styles.expenseHeaderRow}>
                <h3 className={styles.sectionHeader} style={{ marginBottom: 0 }}>Expense Log</h3>
                <span className={styles.expenseCountBadge}>
                  {expenses.length} transaction{expenses.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className={styles.searchBox}>
                <div className={styles.searchIconWrapper}>
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Search expenses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className={styles.searchClearButton}
                    onClick={() => setSearchQuery('')}
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              {searchQuery.trim() && (
                <div className={styles.searchResultsSummary}>
                  <div className={styles.searchResultsText}>
                    <span>
                      Found <strong>{filteredExpenses.length}</strong> result{filteredExpenses.length !== 1 ? 's' : ''} for &ldquo;{searchQuery}&rdquo;
                    </span>
                    {filteredExpenses.length > 0 && (
                      <span className={styles.searchResultsTotal}>
                        ₹{Math.round(filteredExpenses.reduce((s, e) => s + e.amount, 0)).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className={styles.searchResultsClear}
                    onClick={() => setSearchQuery('')}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <Skeleton height="60px" borderRadius="var(--radius-md)" />
                <Skeleton height="60px" borderRadius="var(--radius-md)" />
                <Skeleton height="60px" borderRadius="var(--radius-md)" />
              </div>
            ) : filteredExpenses.length === 0 ? (
              <p className={styles.emptyState}>
                {searchQuery.trim() ? `No transactions found matching "${searchQuery}".` : 'No expenses logged yet.'}
              </p>
            ) : (
              Object.entries(
                filteredExpenses.reduce((acc, exp) => {
                  if (!acc[exp.date]) acc[exp.date] = [];
                  acc[exp.date].push(exp);
                  return acc;
                }, {} as Record<string, typeof filteredExpenses>)
              )
              .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
              .map(([date, dateExpenses]) => (
                <div key={date}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '1.25rem 0 0.5rem 0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {date === getToday() ? 'Today' : new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                  </h4>
                  {dateExpenses.map(exp => (
                    <div key={exp.id} className={styles.logItem}>
                      <div>
                        <strong className={styles.logCategory}>{exp.category}</strong>
                        <span className={styles.logSub}>
                          {exp.created_at && `${new Date(exp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`} {exp.description && `• ${exp.description}`}
                        </span>
                      </div>
                      <div className={styles.logRight}>
                        <span className={styles.logAmount}>₹{exp.amount}</span>
                        <button onClick={() => openEditModal(exp)} className={styles.deleteBtn}>
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => deleteExpense(exp.id)} className={styles.deleteBtn}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 2. Petrol tab */}
      {activeTab === 'petrol' && (
        <div>
          {vehicles.length === 0 ? (
            <div className={styles.emptyState}>
              Please register a vehicle in the <strong>Vehicles Manager</strong> first to track mileage and fuel.
            </div>
          ) : (
            <div>
              <form onSubmit={addPetrolExpense} className={styles.formCard}>
                <h4 className={styles.formTitle}>Log Petrol Purchase</h4>
                <div className={styles.formGroup}>
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className={styles.input}
                  >
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.registration_number})</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Amount Spent (₹)"
                    value={petrolAmount}
                    onChange={handleAmountChange}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Rate per Liter (₹/L)"
                    value={petrolRate}
                    onChange={handleRateChange}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Liters purchased"
                    value={petrolLiters}
                    onChange={handleLitersChange}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <input
                    type="number"
                    placeholder="Odometer Reading (km) - Optional"
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <select
                    value={petrolPaymentMethod}
                    onChange={(e) => setPetrolPaymentMethod(e.target.value)}
                    className={styles.input}
                  >
                    <option value="" disabled>Select Payment Method</option>
                    {paymentMethods.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className={styles.submitBtn}>
                  Log Fuel Card
                </button>
              </form>

              {/* Logs */}
              <div className={styles.listSection}>
                <h3 className={styles.sectionHeader}>Fuel Logs</h3>
                {isLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <Skeleton height="60px" borderRadius="var(--radius-md)" />
                    <Skeleton height="60px" borderRadius="var(--radius-md)" />
                  </div>
                ) : petrolLogs.length === 0 ? (
                  <p className={styles.emptyState}>No fuel logs recorded yet.</p>
                ) : (
                  petrolLogs.map(log => (
                    <div key={log.id} className={styles.logItem}>
                      <div>
                        {log.isQuickLog ? (
                          <>
                            <strong className={styles.logTitle}>Quick Fuel Log</strong>
                            <span className={styles.logSub}>
                              {log.date} {log.description && `• ${log.description}`}
                            </span>
                          </>
                        ) : (
                          <>
                            <strong className={styles.logTitle}>
                              Odometer: {log.odometer && log.odometer > 0 ? `${log.odometer} km` : 'Not recorded'}
                            </strong>
                            <span className={styles.logSub}>
                              {log.date} • {log.liters?.toFixed(2)}L @ ₹{log.rate}/L
                            </span>
                          </>
                        )}
                      </div>
                      <div className={styles.logRight}>
                        <span className={styles.logAmount}>₹{log.amount}</span>
                        {!log.isQuickLog && log.mileage && (
                          <span className={styles.mileageBadge}>
                            {log.mileage.toFixed(1)} km/L
                          </span>
                        )}
                        <button onClick={() => deleteExpense(log.id)} className={styles.deleteBtn}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Analytics tab */}
      {activeTab === 'analytics' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 className={styles.sectionHeader} style={{ marginBottom: 0 }}>Analytics Overview</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {analyticsTimeframe === 'monthly' ? (
                <input 
                  type="month" 
                  value={analyticsSelectedMonth} 
                  onChange={(e) => setAnalyticsSelectedMonth(e.target.value)} 
                  className={styles.input} 
                  style={{ width: 'auto', margin: 0, padding: '6px 12px' }} 
                />
              ) : (
                <input 
                  type="number" 
                  min="2000" 
                  max="2100" 
                  value={analyticsSelectedYear} 
                  onChange={(e) => setAnalyticsSelectedYear(e.target.value)} 
                  className={styles.input} 
                  style={{ width: '100px', margin: 0, padding: '6px 12px' }} 
                />
              )}
              <div className={styles.tabBar} style={{ marginBottom: 0, padding: '4px' }}>
                <button
                  onClick={() => setAnalyticsTimeframe('monthly')}
                  className={analyticsTimeframe === 'monthly' ? styles.tabActive : styles.tab}
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setAnalyticsTimeframe('yearly')}
                  className={analyticsTimeframe === 'yearly' ? styles.tabActive : styles.tab}
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  Yearly
                </button>
              </div>
            </div>
          </div>

          <h4 style={{ marginBottom: '12px', fontSize: '1.05rem', color: 'var(--text-secondary)', fontWeight: 'var(--weight-semibold)' }}>Payment Source Analytics</h4>
          <div className={styles.listSection} style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-primary)', marginBottom: '24px' }}>
            {(() => {
              const currentExps = analyticsTimeframe === 'monthly' ? expenses.filter(e => e.date.startsWith(analyticsSelectedMonth)) : expenses.filter(e => e.date.startsWith(analyticsSelectedYear));
              const sourceTotals = currentExps.reduce((acc, exp) => {
                const s = exp.payment_method || 'Unknown';
                acc[s] = (acc[s] || 0) + exp.amount;
                return acc;
              }, {} as Record<string, number>);
              
              const sortedSources = Object.entries(sourceTotals).sort(([, a], [, b]) => b - a);
              const maxSourceAmt = sortedSources.length > 0 ? sortedSources[0][1] : 0;
              const totalSourceAmt = sortedSources.reduce((sum, [, a]) => sum + a, 0);

              if (sortedSources.length === 0) {
                return <p className={styles.emptyState}>No payment sources found for this period.</p>;
              }

              const toggleSource = (source: string) => {
                setExpandedSources(prev => 
                  prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
                );
              };

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {sortedSources.map(([source, amt]) => {
                    const isExpanded = expandedSources.includes(source);
                    const sourceExpenses = currentExps.filter(e => (e.payment_method || 'Unknown') === source);
                    sourceExpenses.sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());

                    return (
                      <div 
                        key={source} 
                        className={`${styles.analyticsItem} ${isExpanded ? styles.analyticsItemSelected : ''}`}
                        style={{ cursor: 'default' }}
                      >
                        <div className={styles.analyticsItemHeader}>
                          <span className={styles.analyticsItemName}>
                            <span className={styles.analyticsItemDot} style={{ background: 'var(--accent-info)' }}></span>
                            {source}
                          </span>
                          <span className={styles.analyticsItemValues}>
                            <span>₹{amt.toLocaleString()} <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginLeft: '4px' }}>({(amt / totalSourceAmt * 100).toFixed(1)}%)</span></span>
                            <button
                              type="button"
                              className={`${styles.analyticsChevronBtn} ${isExpanded ? styles.analyticsChevronBtnActive : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSource(source);
                              }}
                              title={isExpanded ? 'Hide transactions' : 'Show transactions'}
                              aria-label={`${isExpanded ? 'Hide' : 'Show'} transactions for ${source}`}
                            >
                              <ChevronDown size={16} className={`${styles.analyticsChevron} ${isExpanded ? styles.analyticsChevronOpen : ''}`} />
                            </button>
                          </span>
                        </div>
                        <div className={styles.analyticsProgressBar}>
                          <div 
                            className={styles.analyticsProgressFill}
                            style={{ 
                              width: `${(amt / maxSourceAmt) * 100}%`, 
                              background: 'var(--accent-info)',
                            }} 
                          />
                        </div>

                        {isExpanded && (
                          <div className={styles.analyticsDrilldownList} onClick={(e) => e.stopPropagation()}>
                            <div className={styles.analyticsDrilldownHeader}>
                              <span>{sourceExpenses.length} transaction{sourceExpenses.length !== 1 ? 's' : ''}</span>
                              <span>Total: ₹{amt.toLocaleString()}</span>
                            </div>
                            {sourceExpenses.map(exp => (
                              <div key={exp.id} className={styles.analyticsDrilldownItem}>
                                <div className={styles.analyticsDrilldownLeft}>
                                  <div className={styles.analyticsDrilldownDate}>
                                    {new Date(exp.date + 'T00:00:00').toLocaleDateString(undefined, { 
                                      month: 'short', 
                                      day: 'numeric',
                                      year: analyticsTimeframe === 'yearly' ? 'numeric' : undefined 
                                    })}
                                    {exp.created_at && (
                                      <span className={styles.analyticsDrilldownTime}>
                                        {new Date(exp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                      </span>
                                    )}
                                  </div>
                                  <div className={styles.analyticsDrilldownDesc}>
                                    <strong>{exp.category}</strong>
                                    {exp.description ? ` • ${exp.description}` : ''}
                                  </div>
                                </div>
                                <div className={styles.analyticsDrilldownRight}>
                                  <span className={styles.analyticsDrilldownAmount}>₹{exp.amount.toLocaleString()}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditModal(exp);
                                    }}
                                    className={styles.analyticsDrilldownEditBtn}
                                    title="Edit expense"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          <h4 style={{ marginBottom: '12px', fontSize: '1.05rem', color: 'var(--text-secondary)', fontWeight: 'var(--weight-semibold)' }}>Category Analytics</h4>
          <div className={styles.listSection} style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-primary)' }}>
            {(() => {
              const currentExps = analyticsTimeframe === 'monthly' ? expenses.filter(e => e.date.startsWith(analyticsSelectedMonth)) : expenses.filter(e => e.date.startsWith(analyticsSelectedYear));
              const catTotals = currentExps.reduce((acc, exp) => {
                const c = exp.category || 'Other';
                acc[c] = (acc[c] || 0) + exp.amount;
                return acc;
              }, {} as Record<string, number>);
              
              const sorted = Object.entries(catTotals).sort(([, a], [, b]) => b - a);
              const maxAmt = sorted.length > 0 ? sorted[0][1] : 0;
              const totalAmt = sorted.reduce((sum, [, a]) => sum + a, 0);

              if (sorted.length === 0) {
                return <p className={styles.emptyState}>No expenses found for this period.</p>;
              }

              const handleCategoryClick = (cat: string) => {
                setSelectedAnalyticsCategories(prev => 
                  prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                );
              };

              const toggleCategoryExpand = (cat: string) => {
                setExpandedCategories(prev => 
                  prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                );
              };

              const selectedTotal = sorted.filter(([cat]) => selectedAnalyticsCategories.includes(cat)).reduce((sum, [, amt]) => sum + amt, 0);

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {selectedAnalyticsCategories.length > 0 && (
                    <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Selected Total:</span>
                        <strong style={{ fontSize: '1.2rem', marginLeft: '8px' }}>₹{Math.round(selectedTotal).toLocaleString()}</strong>
                      </div>
                      <button 
                        onClick={() => setSelectedAnalyticsCategories([])} 
                        style={{ fontSize: '0.85rem', color: 'var(--accent-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
                      >
                        Clear Selection
                      </button>
                    </div>
                  )}
                  {sorted.map(([cat, amt]) => {
                    const isSelected = selectedAnalyticsCategories.includes(cat);
                    const isExpanded = expandedCategories.includes(cat);
                    const catExpenses = currentExps.filter(e => (e.category || 'Other') === cat);
                    catExpenses.sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());

                    return (
                      <div 
                        key={cat} 
                        className={`${styles.analyticsItem} ${isSelected ? styles.analyticsItemSelected : ''}`}
                        onClick={() => handleCategoryClick(cat)}
                      >
                        <div className={styles.analyticsItemHeader}>
                          <span className={styles.analyticsItemName}>
                            <span 
                              className={styles.analyticsItemDot} 
                              style={{ background: isSelected ? 'var(--accent-info)' : 'var(--accent-primary)' }}
                            ></span>
                            {cat}
                          </span>
                          <span className={styles.analyticsItemValues}>
                            <span>₹{Math.round(amt).toLocaleString()} <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginLeft: '4px' }}>({(amt / totalAmt * 100).toFixed(1)}%)</span></span>
                            <button
                              type="button"
                              className={`${styles.analyticsChevronBtn} ${isExpanded ? styles.analyticsChevronBtnActive : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCategoryExpand(cat);
                              }}
                              title={isExpanded ? 'Hide transactions' : 'Show transactions'}
                              aria-label={`${isExpanded ? 'Hide' : 'Show'} transactions for ${cat}`}
                            >
                              <ChevronDown size={16} className={`${styles.analyticsChevron} ${isExpanded ? styles.analyticsChevronOpen : ''}`} />
                            </button>
                          </span>
                        </div>
                        <div className={styles.analyticsProgressBar}>
                          <div 
                            className={styles.analyticsProgressFill}
                            style={{ 
                              width: `${(amt / maxAmt) * 100}%`, 
                              background: isSelected ? 'var(--accent-info)' : 'var(--accent-primary)',
                            }} 
                          />
                        </div>

                        {isExpanded && (
                          <div className={styles.analyticsDrilldownList} onClick={(e) => e.stopPropagation()}>
                            <div className={styles.analyticsDrilldownHeader}>
                              <span>{catExpenses.length} transaction{catExpenses.length !== 1 ? 's' : ''}</span>
                              <span>Total: ₹{Math.round(amt).toLocaleString()}</span>
                            </div>
                            {catExpenses.map(exp => (
                              <div key={exp.id} className={styles.analyticsDrilldownItem}>
                                <div className={styles.analyticsDrilldownLeft}>
                                  <div className={styles.analyticsDrilldownDate}>
                                    {new Date(exp.date + 'T00:00:00').toLocaleDateString(undefined, { 
                                      month: 'short', 
                                      day: 'numeric',
                                      year: analyticsTimeframe === 'yearly' ? 'numeric' : undefined 
                                    })}
                                    {exp.created_at && (
                                      <span className={styles.analyticsDrilldownTime}>
                                        {new Date(exp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                      </span>
                                    )}
                                  </div>
                                  {exp.description && (
                                    <div className={styles.analyticsDrilldownDesc}>{exp.description}</div>
                                  )}
                                  <div className={styles.analyticsDrilldownMeta}>
                                    {exp.payment_method && (
                                      <span className={styles.analyticsDrilldownTag}>{exp.payment_method}</span>
                                    )}
                                  </div>
                                </div>
                                <div className={styles.analyticsDrilldownRight}>
                                  <span className={styles.analyticsDrilldownAmount}>₹{exp.amount.toLocaleString()}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditModal(exp);
                                    }}
                                    className={styles.analyticsDrilldownEditBtn}
                                    title="Edit expense"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {editingExpenseId && (
        <>
          <div className="modal-backdrop" onClick={() => setEditingExpenseId(null)} />
          <div className="bottom-sheet" style={{ display: 'block', zIndex: 1000 }}>
            <div className="bottom-sheet-handle" />
            <div className="bottom-sheet-content p-4">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Edit Expense</h3>
                <button onClick={() => setEditingExpenseId(null)} className="btn-icon btn-ghost">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={saveExpenseEdit} className="form flex flex-col gap-4">
                <div className="input-group">
                  <label className="input-label">Amount (₹)</label>
                  <input type="number" step="0.01" value={editAmount} onChange={e => setEditAmount(e.target.value)} className="input" required />
                </div>
                <div className="input-group">
                  <label className="input-label">Category</label>
                  <input type="text" value={editCategory} onChange={e => setEditCategory(e.target.value)} className="input" required />
                </div>
                <div className="input-group">
                  <label className="input-label">Description</label>
                  <input type="text" value={editDescription} onChange={e => setEditDescription(e.target.value)} className="input" />
                </div>
                <div className="input-group">
                  <label className="input-label">Bank Details / Payment Method</label>
                  <select value={editMethod} onChange={e => setEditMethod(e.target.value)} className="input">
                    <option value="">Select Method</option>
                    {paymentMethods.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                    {!paymentMethods.includes(editMethod) && editMethod && (
                      <option value={editMethod}>{editMethod}</option>
                    )}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="input-group">
                    <label className="input-label">Date</label>
                    <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="input" required />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Time</label>
                    <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} className="input" required />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-full mt-2">
                  Save Changes
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
