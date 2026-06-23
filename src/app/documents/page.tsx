'use client';

import { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, Calendar, ShieldCheck } from 'lucide-react';
import { getDB, type LocalDocument } from '@/lib/db';
import styles from './documents.module.css';

export default function DocumentsPage() {
  const db = getDB();
  const [documents, setDocuments] = useState<LocalDocument[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'aadhaar' | 'passport' | 'pan' | 'rc' | 'insurance' | 'certificate' | 'license' | 'other'>('other');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function loadData() {
      const list = await db.documents.toArray();
      setDocuments(list);
    }
    loadData();
  }, [refreshKey]);

  const addDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const docId = crypto.randomUUID();

    await db.documents.add({
      id: docId,
      user_id: 'local-user',
      name,
      category,
      expiry_date: expiryDate || undefined,
      notes: notes || undefined,
      created_at: new Date().toISOString(),
      _syncStatus: 'pending',
    });

    // Also optionally trigger notification alert if expiry date is set
    if (expiryDate) {
      await db.notifications.add({
        id: crypto.randomUUID(),
        user_id: 'local-user',
        title: `Document expiring soon: ${name}`,
        body: `Category: ${category}. Expiry date: ${expiryDate}`,
        type: 'document_expiry',
        entity_id: docId,
        entity_type: 'document',
        due_date: expiryDate,
        read: false,
        dismissed: false,
        created_at: new Date().toISOString(),
        _syncStatus: 'pending',
      });
    }

    setName('');
    setExpiryDate('');
    setNotes('');
    setRefreshKey(prev => prev + 1);
  };

  const deleteDocument = async (id: string) => {
    if (!(await window.appConfirm('Are you sure you want to delete this item?'))) return;
    // Delete associated notifications first
    const notificationsToDelete = await db.notifications
      .filter(n => n.entity_id === id && n.entity_type === 'document')
      .toArray();
      
    for (const n of notificationsToDelete) {
      await db.notifications.delete(n.id);
    }
    
    await db.documents.delete(id);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="page">
      {/* Add form */}
      <form onSubmit={addDocument} className={styles.formCard}>
        <h4 className={styles.formTitle}>Vault Document</h4>
        <div className={styles.formGroup}>
          <input
            type="text"
            placeholder="Document Name (e.g. Passport, Driver License)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={styles.input}
            required
          />
        </div>
        <div className={styles.formGroupRow}>
          <select
            value={category}
            onChange={(e: any) => setCategory(e.target.value)}
            className={styles.input}
          >
            <option value="aadhaar">Aadhaar Card</option>
            <option value="passport">Passport</option>
            <option value="pan">PAN Card</option>
            <option value="rc">Registration Certificate (RC)</option>
            <option value="insurance">Insurance Policy</option>
            <option value="certificate">Educational Certificate</option>
            <option value="license">Driver License</option>
            <option value="other">Other Document</option>
          </select>

          <input
            type="date"
            placeholder="Expiry Date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className={styles.input}
          />
        </div>
        <div className={styles.formGroup}>
          <input
            type="text"
            placeholder="Ref number or general Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={styles.input}
          />
        </div>
        <button type="submit" className={styles.submitBtn}>
          <ShieldCheck size={16} /> Save Securely to Vault
        </button>
      </form>

      {/* List */}
      <h3 className={styles.sectionHeader}>Stored Documents</h3>
      <div className={styles.documentsList}>
        {documents.length === 0 ? (
          <p className={styles.emptyState}>Your secure Document Vault is empty.</p>
        ) : (
          documents.map(doc => (
            <div key={doc.id} className={styles.documentCard}>
              <div className={styles.docDetails}>
                <div className={styles.docHeader}>
                  <strong className={styles.docName}>{doc.name}</strong>
                  <span className={styles.docBadge}>{doc.category}</span>
                </div>
                {doc.notes && <span className={styles.docNotes}>{doc.notes}</span>}
                {doc.expiry_date && (
                  <span className={styles.docExpiry}>
                    <Calendar size={12} /> Expiry: {doc.expiry_date}
                  </span>
                )}
              </div>
              <button onClick={() => deleteDocument(doc.id)} className={styles.deleteBtn}>
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
