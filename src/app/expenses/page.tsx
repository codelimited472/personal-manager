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
  const [activeTab, setActiveTab] = useState<'personal' | 'employee' | 'petrol'>('personal');
  const db = getDB();

  // Personal Expense State
  const [expenses, setExpenses] = useState<LocalExpense[]>([]);

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
  const todayStr = getToday();
  const currentMonthStr = todayStr.substring(0, 7);
  const currentYearStr = todayStr.substring(0, 4);

  const todaySpend = expenses.filter(e => e.date === todayStr).reduce((sum, e) => sum + e.amount, 0);
  const monthlySpend = expenses.filter(e => e.date.startsWith(currentMonthStr)).reduce((sum, e) => sum + e.amount, 0);
  const yearlySpend = expenses.filter(e => e.date.startsWith(currentYearStr)).reduce((sum, e) => sum + e.amount, 0);

  const spendByMethod = expenses.reduce((acc, exp) => {
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
      </div>

      {/* 1. Personal tab */}
      {activeTab === 'personal' && (
        <div>
          <h3 className={styles.sectionHeader} style={{ marginBottom: '1rem' }}>Expense Overview</h3>
          <div className={pageStyles.statsGrid}>
            <div className={pageStyles.statCard}>
              <div className={pageStyles.statValue}>₹{todaySpend}</div>
              <div className={pageStyles.statLabel}>Today&apos;s Spend</div>
            </div>
            <div className={pageStyles.statCard}>
              <div className={pageStyles.statValue}>₹{monthlySpend}</div>
              <div className={pageStyles.statLabel}>Monthly Spend</div>
            </div>
            <div className={pageStyles.statCard}>
              <div className={pageStyles.statValue}>₹{yearlySpend}</div>
              <div className={pageStyles.statLabel}>Yearly Spend</div>
            </div>
          </div>

          {Object.keys(spendByMethod).length > 0 && (
            <div className={pageStyles.statsGrid} style={{ marginTop: '-1rem' }}>
              {Object.entries(spendByMethod).map(([method, amount]) => (
                <div key={method} className={pageStyles.statCard}>
                  <div className={pageStyles.statValue}>₹{amount}</div>
                  <div className={pageStyles.statLabel}>{method}</div>
                </div>
              ))}
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
    </div>
  );
}
