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
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);

  // Issues
  const [issues, setIssues] = useState<(LocalVehicleIssue & { vehicleName?: string })[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDesc, setIssueDesc] = useState('');

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
    setEditingVehicleId(null);
  };

  const editVehicle = (v: LocalVehicle) => {
    setName(v.name);
    setRegNo(v.registration_number);
    setInsExpiry(v.insurance_expiry || '');
    setPolExpiry(v.pollution_expiry || '');
    setRcDetails(v.rc_details || '');
    setColor(v.color || '');
    setEditingVehicleId(v.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteVehicle = async (id: string) => {
    await deleteRecord('vehicles', id);
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
      status: 'open',
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
      status: nextStatus as 'open' | 'in_progress' | 'resolved',
      updated_at: new Date().toISOString(),
      _syncStatus: 'pending',
    });
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
              <div>
                <label className={styles.label}>Insurance Expiry</label>
                <input
                  type="date"
                  value={insExpiry}
                  onChange={(e) => setInsExpiry(e.target.value)}
                  className={styles.input}
                />
              </div>
              <div>
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
            {issues.length === 0 ? (
              <p className={styles.emptyState}>No logged issues. All vehicles running smoothly! 🚗</p>
            ) : (
              issues.map(iss => (
                <div key={iss.id} className={styles.issueItem}>
                  <div>
                    <strong className={styles.issueTitle}>{iss.title}</strong>
                    <span className={styles.issueVehicle}>Vehicle: {iss.vehicleName}</span>
                    {iss.description && <p className={styles.issueDesc}>{iss.description}</p>}
                  </div>
                  <button
                    onClick={() => resolveIssue(iss.id, iss.status)}
                    className={styles.resolveBtn}
                    style={{
                      background: iss.status === 'resolved' ? 'var(--accent-success-muted)' : 'var(--bg-tertiary)',
                      color: iss.status === 'resolved' ? 'var(--accent-success)' : 'var(--text-secondary)'
                    }}
                  >
                    {iss.status}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
