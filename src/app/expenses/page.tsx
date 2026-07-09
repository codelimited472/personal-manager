'use client';

import { useState, useEffect } from 'react';
import { Wallet, Users, Car, Plus, Trash2, CheckCircle2, TrendingUp, Landmark } from 'lucide-react';
import { getDB, type LocalExpense, type LocalEmployeeProfile, type LocalEmployeeExpense, type LocalPetrolExpense, type LocalVehicle } from '@/lib/db';
import { getToday } from '@/lib/utils';
import QuickExpenseLog from '@/components/QuickExpenseLog';
import { deleteRecord } from '@/lib/sync';
import styles from './expenses.module.css';
import pageStyles from '@/app/page.module.css';

export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState<'personal' | 'employee' | 'petrol' | 'analytics'>('personal');
  const db = getDB();

  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'monthly' | 'yearly'>('monthly');

  // Personal Expense State
  const [expenses, setExpenses] = useState<LocalExpense[]>([]);
  const [personalViewTimeframe, setPersonalViewTimeframe] = useState<'monthly' | 'yearly'>('monthly');

  // Employee Expense State
  const [employees, setEmployees] = useState<LocalEmployeeProfile[]>([]);
  const [empExpenses, setEmpExpenses] = useState<(LocalEmployeeExpense & { employeeName?: string })[]>([]);
  const [empName, setEmpName] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [empAmount, setEmpAmount] = useState('');
  const [empCategory, setEmpCategory] = useState('Office');
  const [empDesc, setEmpDesc] = useState('');

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

  useEffect(() => {
    async function loadData() {
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

      // 2. Employee
      const emps = await db.employeeProfiles.toArray();
      setEmployees(emps);
      if (emps.length > 0 && !selectedEmpId) {
        setSelectedEmpId(emps[0].id);
      }
      const claims = await db.employeeExpenses.toArray();
      const claimsWithNames = claims.map(c => ({
        ...c,
        employeeName: emps.find(e => e.id === c.employee_id)?.name || 'Unknown',
      }));
      setEmpExpenses(claimsWithNames);

      // 3. Petrol / Vehicles
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

  // Employee Actions
  const addEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName) return;
    const newEmp = {
      id: crypto.randomUUID(),
      user_id: 'local-user',
      name: empName,
      created_at: new Date().toISOString(),
      _syncStatus: 'pending' as const,
    };
    await db.employeeProfiles.add(newEmp);
    setEmpName('');
    setSelectedEmpId(newEmp.id);
    setRefreshKey(prev => prev + 1);
  };

  const addEmployeeExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empAmount || !selectedEmpId) return;
    await db.employeeExpenses.add({
      id: crypto.randomUUID(),
      user_id: 'local-user',
      employee_id: selectedEmpId,
      amount: parseFloat(empAmount),
      category: empCategory,
      description: empDesc,
      date: getToday(),
      status: 'pending',
      created_at: new Date().toISOString(),
      _syncStatus: 'pending',
    });
    setEmpAmount('');
    setEmpDesc('');
    setRefreshKey(prev => prev + 1);
  };

  const approveClaim = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'pending' ? 'approved' : 'reimbursed';
    await db.employeeExpenses.update(id, { status: nextStatus });
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
          onClick={() => setActiveTab('employee')}
          className={activeTab === 'employee' ? styles.tabActive : styles.tab}
        >
          <Users size={16} /> Employee Claims
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
                <div className={pageStyles.statValue}>₹{todaySpend}</div>
                <div className={pageStyles.statLabel}>Today&apos;s Spend</div>
              </div>
              <div className={pageStyles.statCard}>
                <div className={pageStyles.statValue}>₹{yesterdaySpend}</div>
                <div className={pageStyles.statLabel}>Yesterday&apos;s Spend</div>
              </div>
              <div className={pageStyles.statCard}>
                <div className={pageStyles.statValue}>₹{avgDailyMonthly}</div>
                <div className={pageStyles.statLabel}>Avg. Daily (This Month)</div>
              </div>
              <div className={pageStyles.statCard}>
                <div className={pageStyles.statValue}>₹{monthlySpend}</div>
                <div className={pageStyles.statLabel}>Monthly Spend</div>
              </div>
            </div>
          ) : (
            <div className={pageStyles.statsGrid}>
              <div className={pageStyles.statCard}>
                <div className={pageStyles.statValue}>₹{yearlySpend}</div>
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
                    <div className={pageStyles.statValue}>₹{amount.toFixed(2)}</div>
                    <div className={pageStyles.statLabel}>{method}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <QuickExpenseLog onExpenseAdded={() => setRefreshKey(prev => prev + 1)} />

          <div className={styles.listSection}>
            <h3 className={styles.sectionHeader}>Expense Log</h3>
            {expenses.length === 0 ? (
              <p className={styles.emptyState}>No expenses logged yet.</p>
            ) : (
              Object.entries(
                expenses.reduce((acc, exp) => {
                  if (!acc[exp.date]) acc[exp.date] = [];
                  acc[exp.date].push(exp);
                  return acc;
                }, {} as Record<string, typeof expenses>)
              )
              .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
              .map(([date, dateExpenses]) => (
                <div key={date}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '1.25rem 0 0.5rem 0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {date === getToday() ? 'Today' : new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
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

      {/* 2. Employee tab */}
      {activeTab === 'employee' && (
        <div>
          {/* Add Employee Form */}
          <form onSubmit={addEmployee} className={styles.formCard}>
            <h4 className={styles.formTitle}>Register Employee Profile</h4>
            <div className={styles.formGroupRow}>
              <input
                type="text"
                placeholder="Employee Full Name"
                value={empName}
                onChange={(e) => setEmpName(e.target.value)}
                className={styles.input}
                required
              />
              <button type="submit" className={styles.smallSubmitBtn}>Add</button>
            </div>
          </form>

          {/* Add Claim Form */}
          {employees.length > 0 && (
            <form onSubmit={addEmployeeExpense} className={styles.formCard}>
              <h4 className={styles.formTitle}>Submit Employee Claim</h4>
              <div className={styles.formGroup}>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className={styles.input}
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <input
                  type="number"
                  placeholder="Amount (₹)"
                  value={empAmount}
                  onChange={(e) => setEmpAmount(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <input
                  type="text"
                  placeholder="Category (e.g., Office Supplies, Client Dinner)"
                  value={empCategory}
                  onChange={(e) => setEmpCategory(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <input
                  type="text"
                  placeholder="Purpose details"
                  value={empDesc}
                  onChange={(e) => setEmpDesc(e.target.value)}
                  className={styles.input}
                />
              </div>
              <button type="submit" className={styles.submitBtn}>
                Submit Claim
              </button>
            </form>
          )}

          {/* Claim Logs */}
          <div className={styles.listSection}>
            <h3 className={styles.sectionHeader}>Claims & Approvals</h3>
            {empExpenses.length === 0 ? (
              <p className={styles.emptyState}>No employee claims logged.</p>
            ) : (
              empExpenses.map(claim => (
                <div key={claim.id} className={styles.logItem}>
                  <div>
                    <strong className={styles.logTitle}>{claim.employeeName}</strong>
                    <span className={styles.logSub}>
                      {claim.category} • {claim.date} • {claim.description}
                    </span>
                  </div>
                  <div className={styles.logRight}>
                    <span className={styles.logAmount}>₹{claim.amount}</span>
                    <button
                      onClick={() => approveClaim(claim.id, claim.status)}
                      className={styles.statusBtn}
                      style={{
                        background: claim.status === 'reimbursed' ? 'var(--accent-success-muted)' : 'var(--bg-tertiary)',
                        color: claim.status === 'reimbursed' ? 'var(--accent-success)' : 'var(--text-secondary)'
                      }}
                    >
                      {claim.status}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. Petrol tab */}
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
                {petrolLogs.length === 0 ? (
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className={styles.sectionHeader} style={{ marginBottom: 0 }}>Analytics Overview</h3>
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

          <h4 style={{ marginBottom: '12px', fontSize: '1.05rem', color: 'var(--text-secondary)', fontWeight: 'var(--weight-semibold)' }}>Payment Source Analytics</h4>
          <div className={styles.listSection} style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-primary)', marginBottom: '24px' }}>
            {(() => {
              const currentExps = analyticsTimeframe === 'monthly' ? monthlyExpenses : yearlyExpenses;
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

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {sortedSources.map(([source, amt]) => (
                    <div key={source} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 'var(--weight-medium)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-info)' }}></span>
                          {source}
                        </span>
                        <span>₹{amt.toLocaleString()} <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginLeft: '4px' }}>({(amt / totalSourceAmt * 100).toFixed(1)}%)</span></span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${(amt / maxSourceAmt) * 100}%`, 
                          height: '100%', 
                          background: 'var(--accent-info)',
                          borderRadius: '4px',
                          transition: 'width 0.5s ease-out'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          <h4 style={{ marginBottom: '12px', fontSize: '1.05rem', color: 'var(--text-secondary)', fontWeight: 'var(--weight-semibold)' }}>Category Analytics</h4>
          <div className={styles.listSection} style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-primary)' }}>
            {(() => {
              const currentExps = analyticsTimeframe === 'monthly' ? monthlyExpenses : yearlyExpenses;
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

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {sorted.map(([cat, amt]) => (
                    <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 'var(--weight-medium)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)' }}></span>
                          {cat}
                        </span>
                        <span>₹{amt.toLocaleString()} <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginLeft: '4px' }}>({(amt / totalAmt * 100).toFixed(1)}%)</span></span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${(amt / maxAmt) * 100}%`, 
                          height: '100%', 
                          background: 'var(--accent-primary)',
                          borderRadius: '4px',
                          transition: 'width 0.5s ease-out'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
