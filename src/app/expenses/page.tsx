'use client';

import { useState, useEffect } from 'react';
import { Wallet, Users, Car, Plus, Trash2, CheckCircle2, TrendingUp, Landmark } from 'lucide-react';
import { getDB, type LocalExpense, type LocalEmployeeProfile, type LocalEmployeeExpense, type LocalPetrolExpense, type LocalVehicle } from '@/lib/db';
import QuickExpenseLog from '@/components/QuickExpenseLog';
import styles from './expenses.module.css';

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
  const [petrolLogs, setPetrolLogs] = useState<LocalPetrolExpense[]>([]);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function loadData() {
      // 1. Personal
      const list = await db.expenses.orderBy('date').reverse().toArray();
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
      setPetrolLogs(pLogs);
    }
    loadData();
  }, [refreshKey]);

  const deleteExpense = async (id: string) => {
    await db.expenses.delete(id);
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
      date: new Date().toISOString().split('T')[0],
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
  const addPetrolExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petrolAmount || !selectedVehicleId || !petrolRate || !odometer) return;
    const amt = parseFloat(petrolAmount);
    const rate = parseFloat(petrolRate);
    const ltrs = parseFloat(petrolLiters) || (amt / rate);
    const odo = parseInt(odometer, 10);

    if (ltrs <= 0 || odo < 0) return;

    // Calculate Mileage based on previous odometer reading
    let calculatedMileage = undefined;
    const previousLogs = petrolLogs
      .filter(l => l.vehicle_id === selectedVehicleId)
      .sort((a, b) => b.odometer - a.odometer);
    if (previousLogs.length > 0) {
      const diffKm = odo - previousLogs[0].odometer;
      if (diffKm > 0) {
        calculatedMileage = diffKm / ltrs;
      }
    }

    await db.petrolExpenses.add({
      id: crypto.randomUUID(),
      user_id: 'local-user',
      vehicle_id: selectedVehicleId,
      amount: amt,
      rate,
      liters: ltrs,
      odometer: odo,
      mileage: calculatedMileage,
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      _syncStatus: 'pending',
    });

    // Also store it in the main expenses log
    await db.expenses.add({
      id: crypto.randomUUID(),
      user_id: 'local-user',
      amount: amt,
      category: 'Petrol',
      description: `Fuel for vehicle (Odo: ${odo}km) - ${ltrs.toFixed(2)}L @ ₹${rate}/L`,
      date: new Date().toISOString().split('T')[0],
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
          <QuickExpenseLog onExpenseAdded={() => setRefreshKey(prev => prev + 1)} />

          <div className={styles.listSection}>
            <h3 className={styles.sectionHeader}>Expense Log</h3>
            {expenses.length === 0 ? (
              <p className={styles.emptyState}>No expenses logged yet.</p>
            ) : (
              expenses.map(exp => (
                <div key={exp.id} className={styles.logItem}>
                  <div>
                    <strong className={styles.logCategory}>{exp.category}</strong>
                    <span className={styles.logSub}>{exp.date} {exp.description && `• ${exp.description}`}</span>
                  </div>
                  <div className={styles.logRight}>
                    <span className={styles.logAmount}>₹{exp.amount}</span>
                    <button onClick={() => deleteExpense(exp.id)} className={styles.deleteBtn}>
                      <Trash2 size={16} />
                    </button>
                  </div>
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
                    placeholder="Amount Spent (₹)"
                    value={petrolAmount}
                    onChange={(e) => setPetrolAmount(e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Rate per Liter (₹/L)"
                    value={petrolRate}
                    onChange={(e) => setPetrolRate(e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <input
                    type="number"
                    placeholder="Liters purchased (Optional)"
                    value={petrolLiters}
                    onChange={(e) => setPetrolLiters(e.target.value)}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <input
                    type="number"
                    placeholder="Odometer Reading (km)"
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    className={styles.input}
                    required
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
                        <strong className={styles.logTitle}>
                          Odometer: {log.odometer} km
                        </strong>
                        <span className={styles.logSub}>
                          {log.date} • {log.liters.toFixed(2)}L @ ₹{log.rate}/L
                        </span>
                      </div>
                      <div className={styles.logRight}>
                        <span className={styles.logAmount}>${log.amount}</span>
                        {log.mileage && (
                          <span className={styles.mileageBadge}>
                            {log.mileage.toFixed(1)} km/L
                          </span>
                        )}
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
