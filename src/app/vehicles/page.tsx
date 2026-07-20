'use client';

import { useState, useEffect } from 'react';
import { Car, FileText, AlertTriangle, Plus, Trash2, Edit2, CheckCircle2 } from 'lucide-react';
import { getDB, type LocalVehicle, type LocalVehicleIssue } from '@/lib/db';
import { deleteRecord } from '@/lib/sync';
import styles from './vehicles.module.css';

export default function VehiclesPage() {
  const db = getDB();
  const [activeTab, setActiveTab] = useState<'vehicles' | 'issues'>('vehicles');

  // Vehicles
  const [vehicles, setVehicles] = useState<LocalVehicle[]>([]);
  const [name, setName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [insExpiry, setInsExpiry] = useState('');
  const [polExpiry, setPolExpiry] = useState('');
  const [rcDetails, setRcDetails] = useState('');
  const [color, setColor] = useState('');
  const [oilDate, setOilDate] = useState('');
  const [oilMileage, setOilMileage] = useState('');
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);

  // Issues
  const [issues, setIssues] = useState<(LocalVehicleIssue & { vehicleName?: string })[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDesc, setIssueDesc] = useState('');
  
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['Cash', 'Credit Card']);
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseMethod, setExpenseMethod] = useState('');

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function loadData() {
      const allVehicles = await db.vehicles.toArray();
      setVehicles(allVehicles);
      if (allVehicles.length > 0 && !selectedVehicleId) {
        setSelectedVehicleId(allVehicles[0].id);
      }
      const allIssues = await db.vehicleIssues.toArray();
      const issuesWithNames = allIssues.map(i => ({
        ...i,
        vehicleName: allVehicles.find(v => v.id === i.vehicle_id)?.name || 'Unknown Vehicle',
      }));
      setIssues(issuesWithNames);
      
      const storedMethods = await db.settings.get('paymentMethods');
      if (storedMethods) {
        try {
          const parsed = JSON.parse(storedMethods.value);
          setPaymentMethods(parsed);
          if (parsed.length > 0 && !expenseMethod) {
            setExpenseMethod(parsed[0]);
          }
        } catch {}
      } else if (!expenseMethod) {
        setExpenseMethod('Cash');
      }
    }
    loadData();
  }, [refreshKey]);

  const addVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !regNo) return;

    if (editingVehicleId) {
      await db.vehicles.update(editingVehicleId, {
        name,
        registration_number: regNo,
        insurance_expiry: insExpiry || undefined,
        pollution_expiry: polExpiry || undefined,
        rc_details: rcDetails || undefined,
        color: color || undefined,
        last_oil_change_date: oilDate || undefined,
        last_oil_change_mileage: oilMileage || undefined,
        updated_at: new Date().toISOString(),
        _syncStatus: 'pending',
      });
      setEditingVehicleId(null);
    } else {
      await db.vehicles.add({
        id: crypto.randomUUID(),
        user_id: 'local-user',
        name,
        registration_number: regNo,
        insurance_expiry: insExpiry || undefined,
        pollution_expiry: polExpiry || undefined,
        rc_details: rcDetails || undefined,
        color: color || undefined,
        last_oil_change_date: oilDate || undefined,
        last_oil_change_mileage: oilMileage || undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _syncStatus: 'pending',
      });
    }

    resetForm();
    setRefreshKey(prev => prev + 1);
  };

  const resetForm = () => {
    setName('');
    setRegNo('');
    setInsExpiry('');
    setPolExpiry('');
    setRcDetails('');
    setColor('');
    setOilDate('');
    setOilMileage('');
    setEditingVehicleId(null);
  };

  const editVehicle = (v: LocalVehicle) => {
    setName(v.name);
    setRegNo(v.registration_number);
    setInsExpiry(v.insurance_expiry || '');
    setPolExpiry(v.pollution_expiry || '');
    setRcDetails(v.rc_details || '');
    setColor(v.color || '');
    setOilDate(v.last_oil_change_date || '');
    setOilMileage(v.last_oil_change_mileage || '');
    setEditingVehicleId(v.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteVehicle = async (id: string) => {
    if (!(await window.appConfirm('Are you sure you want to delete this item?'))) return;
    await deleteRecord('vehicles', id);
    setRefreshKey(prev => prev + 1);
  };

  const deleteIssue = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!(await window.appConfirm('Are you sure you want to delete this issue?'))) return;
    await deleteRecord('vehicleIssues', id);
    setRefreshKey(prev => prev + 1);
  };

  const addIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueTitle || !selectedVehicleId) return;

    await db.vehicleIssues.add({
      id: crypto.randomUUID(),
      vehicle_id: selectedVehicleId,
      title: issueTitle,
      description: issueDesc,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _syncStatus: 'pending',
    });

    setIssueTitle('');
    setIssueDesc('');
    setRefreshKey(prev => prev + 1);
  };

  const resolveIssue = async (id: string, currentStatus: string) => {
    let nextStatus = 'resolved';
    if (currentStatus === 'open') nextStatus = 'in_progress';
    else if (currentStatus === 'in_progress') nextStatus = 'resolved';
    else if (currentStatus === 'resolved') nextStatus = 'open';

    await db.vehicleIssues.update(id, {
      status: currentStatus === 'pending' ? 'resolved' : 'pending',
      updated_at: new Date().toISOString(),
      _syncStatus: 'pending',
    });
    setRefreshKey(prev => prev + 1);
  };

  const logIssueExpense = async (issueId: string, vehicleName: string, title: string, currentStatus: string) => {
    if (!expenseAmount) return;
    const amountNum = Number(expenseAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    await db.expenses.add({
      id: crypto.randomUUID(),
      user_id: 'local-user', // Will sync correctly if user matches
      amount: amountNum,
      category: 'Vehicle Maintenance',
      description: `Fix: ${title} (${vehicleName})`,
      payment_method: expenseMethod,
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _syncStatus: 'pending'
    });

    if (currentStatus === 'pending') {
      await db.vehicleIssues.update(issueId, {
        status: 'resolved',
        expense_amount: amountNum,
        expense_method: expenseMethod,
        updated_at: new Date().toISOString(),
        _syncStatus: 'pending',
      });
    }

    setExpandedIssueId(null);
    setExpenseAmount('');
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="page">
      <div className={styles.tabBar}>
        <button
          onClick={() => setActiveTab('vehicles')}
          className={activeTab === 'vehicles' ? styles.tabActive : styles.tab}
        >
          <Car size={16} /> Vehicles
        </button>
        <button
          onClick={() => setActiveTab('issues')}
          className={activeTab === 'issues' ? styles.tabActive : styles.tab}
        >
          <AlertTriangle size={16} /> Issue Logger
        </button>
      </div>

      {activeTab === 'vehicles' && (
        <div>
          <form onSubmit={addVehicle} className={styles.formCard}>
            <h4 className={styles.formTitle}>Register Vehicle Details</h4>
            <div className={styles.formGroup}>
              <input
                type="text"
                placeholder="Vehicle Name (e.g. Honda Civic, KTM Duke)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.formGroupRow}>
              <input
                type="text"
                placeholder="Registration Number"
                value={regNo}
                onChange={(e) => setRegNo(e.target.value)}
                className={styles.input}
                required
              />
              <input
                type="text"
                placeholder="Body Color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroupRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Insurance Expiry</label>
                <input
                  type="date"
                  value={insExpiry}
                  onChange={(e) => setInsExpiry(e.target.value)}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Pollution Expiry</label>
                <input
                  type="date"
                  value={polExpiry}
                  onChange={(e) => setPolExpiry(e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>
            <div className={styles.formGroup}>
              <input
                type="text"
                placeholder="RC Details / Notes"
                value={rcDetails}
                onChange={(e) => setRcDetails(e.target.value)}
                className={styles.input}
              />
            </div>
            
            <h4 className={styles.formTitle} style={{ marginTop: '10px' }}>Engine Oil</h4>
            <div className={styles.formGroupRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Last Changed On</label>
                <input
                  type="date"
                  value={oilDate}
                  onChange={(e) => setOilDate(e.target.value)}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Mileage (km)</label>
                <input
                  type="number"
                  placeholder="e.g. 15000"
                  value={oilMileage}
                  onChange={(e) => setOilMileage(e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>
            <div className={styles.formActions}>
              <button type="submit" className={styles.submitBtn}>
                <Plus size={16} /> {editingVehicleId ? 'Update Vehicle' : 'Save Vehicle'}
              </button>
              {editingVehicleId && (
                <button type="button" onClick={resetForm} className={styles.cancelBtn}>
                  Cancel
                </button>
              )}
            </div>
          </form>

          {/* List of vehicles */}
          <h3 className={styles.sectionHeader}>Registered Vehicles</h3>
          <div className={styles.vehiclesList}>
            {vehicles.length === 0 ? (
              <p className={styles.emptyState}>No vehicles registered yet.</p>
            ) : (
              vehicles.map(v => (
                <div key={v.id} className={styles.vehicleItem}>
                  <div>
                    <strong className={styles.vehicleName}>{v.name} {v.color && `(${v.color})`}</strong>
                    <span className={styles.vehicleReg}>Registration: {v.registration_number}</span>
                    <div className={styles.expiryDetails}>
                      {v.insurance_expiry && <span>Insurance Expiry: {v.insurance_expiry}</span>}
                      {v.pollution_expiry && <span>Pollution Expiry: {v.pollution_expiry}</span>}
                      {v.last_oil_change_date && <span>Last Oil Change: {v.last_oil_change_date} {v.last_oil_change_mileage && `(${v.last_oil_change_mileage} km)`}</span>}
                    </div>
                  </div>
                  <div className={styles.actionButtons}>
                    <button onClick={() => editVehicle(v)} className={styles.editBtn}>
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => deleteVehicle(v.id)} className={styles.deleteBtn}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'issues' && (
        <div>
          {vehicles.length === 0 ? (
            <p className={styles.emptyState}>Please register a vehicle before logging issues.</p>
          ) : (
            <form onSubmit={addIssue} className={styles.formCard}>
              <h4 className={styles.formTitle}>Log Maintenance Issue</h4>
              <div className={styles.formGroup}>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className={styles.input}
                >
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <input
                  type="text"
                  placeholder="Issue (e.g. Engine ticking noise, Brakes squealing)"
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <input
                  type="text"
                  placeholder="Describe details"
                  value={issueDesc}
                  onChange={(e) => setIssueDesc(e.target.value)}
                  className={styles.input}
                />
              </div>
              <button type="submit" className={styles.submitBtn}>
                Log Issue
              </button>
            </form>
          )}

          {/* Issue Logs */}
          <h3 className={styles.sectionHeader}>Active Vehicle Issues</h3>
          <div className={styles.issuesList}>
            {issues.filter(i => i.status !== 'resolved').length === 0 ? (
              <p className={styles.emptyState}>No pending issues. All vehicles running smoothly! 🚗</p>
            ) : (
              issues.filter(i => i.status !== 'resolved').map(iss => (
                <div key={iss.id} className={styles.issueItem} style={{ flexDirection: 'column', alignItems: 'stretch' }} onClick={(e) => {
                  // Only expand if clicking the card, not the resolve button
                  if ((e.target as HTMLElement).tagName !== 'BUTTON' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'SELECT') {
                    setExpandedIssueId(expandedIssueId === iss.id ? null : iss.id);
                  }
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                    <div>
                      <strong className={styles.issueTitle}>{iss.title}</strong>
                      <span className={styles.issueVehicle}>Vehicle: {iss.vehicleName}</span>
                      {iss.description && <p className={styles.issueDesc}>{iss.description}</p>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        className={styles.resolveBtn}
                        style={{
                          background: 'var(--bg-tertiary)',
                          color: 'var(--text-secondary)',
                          cursor: 'default'
                        }}
                      >
                        {iss.status === 'open' ? 'pending' : iss.status}
                      </button>
                      <button 
                        onClick={(e) => deleteIssue(iss.id, e)} 
                        className={styles.deleteBtn}
                        style={{ position: 'relative', top: 0, right: 0 }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {expandedIssueId === iss.id && (
                    <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid var(--border-secondary)', display: 'flex', gap: '10px', flexDirection: 'column' }}>
                      <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Log Repair Expense</h4>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                          type="number"
                          placeholder="Cost (₹)"
                          className={styles.input}
                          style={{ flex: 1, padding: '8px' }}
                          value={expenseAmount}
                          onChange={(e) => setExpenseAmount(e.target.value)}
                        />
                        <select 
                          className={styles.select}
                          style={{ flex: 1, padding: '8px' }}
                          value={expenseMethod}
                          onChange={(e) => setExpenseMethod(e.target.value)}
                        >
                          {paymentMethods.map(pm => (
                            <option key={pm} value={pm}>{pm}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => logIssueExpense(iss.id, iss.vehicleName || 'Unknown', iss.title, iss.status)}
                          className={styles.submitBtn}
                          style={{ padding: '8px 16px', margin: 0, width: 'auto' }}
                        >
                          Log Payment
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          
          <h3 className={styles.sectionHeader} style={{ marginTop: '30px' }}>Resolved Issues</h3>
          <div className={styles.issuesList}>
            {issues.filter(i => i.status === 'resolved').length === 0 ? (
              <p className={styles.emptyState}>No resolved issues yet.</p>
            ) : (
              issues.filter(i => i.status === 'resolved').map(iss => (
                <div key={iss.id} className={styles.issueItem}>
                  <div>
                    <strong className={styles.issueTitle}>{iss.title}</strong>
                    <span className={styles.issueVehicle}>Vehicle: {iss.vehicleName}</span>
                    {iss.description && <p className={styles.issueDesc}>{iss.description}</p>}
                    {iss.expense_amount && (
                      <p className={styles.issueDesc} style={{ color: 'var(--text-primary)', marginTop: '4px' }}>
                        Paid ₹{iss.expense_amount} via {iss.expense_method}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resolveIssue(iss.id, iss.status);
                      }}
                      className={styles.resolveBtn}
                      style={{
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      Reopen
                    </button>
                    <button
                      className={styles.resolveBtn}
                      style={{
                        background: 'var(--accent-success-muted)',
                        color: 'var(--accent-success)',
                        cursor: 'default'
                      }}
                    >
                      resolved
                    </button>
                    <button 
                      onClick={(e) => deleteIssue(iss.id, e)} 
                      className={styles.deleteBtn}
                      style={{ position: 'relative', top: 0, right: 0 }}
                    >
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
  );
}
