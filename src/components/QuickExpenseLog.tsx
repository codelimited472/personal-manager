'use client';

import { useState, useEffect } from 'react';
import { Wallet, Plus, ChevronDown } from 'lucide-react';
import { getDB } from '@/lib/db';
import { getToday } from '@/lib/utils';
import styles from '@/app/page.module.css';

interface Props {
  onExpenseAdded: () => void;
}

export default function QuickExpenseLog({ onExpenseAdded }: Props) {
  const [payAmount, setPayAmount] = useState('');
  const [payCategory, setPayCategory] = useState('');
  const [payDescription, setPayDescription] = useState('');
  const [payBank, setPayBank] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['Cash', 'Credit Card']);
  const [showNewBankInput, setShowNewBankInput] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  
  const [savedCategories, setSavedCategories] = useState<string[]>(['Food', 'Transport', 'Shopping', 'Bills']);
  const [showCatDropdown, setShowCatDropdown] = useState(false);

  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');

  const getCurrentTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const toggleDateDropdown = () => {
    setShowDateDropdown(prev => {
      const next = !prev;
      if (next) {
        if (!customDate) setCustomDate(getToday());
        if (!customTime) setCustomTime(getCurrentTime());
      }
      return next;
    });
  };

  useEffect(() => {
    async function loadSettings() {
      try {
        const db = getDB();
        const savedBank = await db.settings.get('preferredBank');
        if (savedBank) setPayBank(savedBank.value);

        const storedMethods = await db.settings.get('paymentMethods');
        if (storedMethods) {
          try {
            setPaymentMethods(JSON.parse(storedMethods.value));
          } catch {}
        }

        const allExpenses = await db.expenses.toArray();
        const catCounts: Record<string, number> = {};
        allExpenses.forEach(e => {
          if (e.category) {
            catCounts[e.category] = (catCounts[e.category] || 0) + 1;
          }
        });

        const storedCats = await db.settings.get('savedCategories');
        let parsed: string[] = [];
        if (storedCats) {
          try {
            parsed = JSON.parse(storedCats.value);
          } catch {}
        }
        
        if (parsed.length === 0) {
          parsed = ['Food', 'Transport', 'Shopping', 'Bills'];
        }

        const combinedSet = new Set([...parsed, ...Object.keys(catCounts)]);
        const finalCats = Array.from(combinedSet);
        
        // Sort by frequency (most used first)
        finalCats.sort((a, b) => (catCounts[b] || 0) - (catCounts[a] || 0));
        setSavedCategories(finalCats);
      } catch (err) {
        console.error('Error loading settings for QuickExpenseLog:', err);
      }
    }
    loadSettings();
  }, []);

  const handleQuickPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payAmount || isNaN(Number(payAmount))) return;

    const db = getDB();
    const todayStr = getToday();
    const trimmedBank = payBank.trim();

    const targetDate = (showDateDropdown && customDate) ? customDate : (customDate || todayStr);
    let createdAtIso = new Date().toISOString();

    if ((showDateDropdown || customDate) && targetDate) {
      const [yyyy, mm, dd] = targetDate.split('-').map(Number);
      const timeStr = customTime || getCurrentTime();
      const [hh, min] = timeStr.split(':').map(Number);
      const d = new Date(yyyy, mm - 1, dd, hh || 0, min || 0, 0, 0);
      createdAtIso = d.toISOString();
    }

    await db.expenses.add({
      id: crypto.randomUUID(),
      user_id: 'local-user',
      amount: Number(payAmount),
      category: payCategory || 'General',
      description: payDescription.trim() || undefined,
      payment_method: trimmedBank,
      date: targetDate,
      created_at: createdAtIso,
      updated_at: new Date().toISOString(),
      _syncStatus: 'pending',
    });

    if (trimmedBank) {
      await db.settings.put({ key: 'preferredBank', value: trimmedBank, user_id: 'local-user', _syncStatus: 'pending' });
    }

    if (trimmedBank && !paymentMethods.includes(trimmedBank)) {
      setPaymentMethods(prev => {
        const updated = Array.from(new Set([...prev, trimmedBank]));
        db.settings.put({ key: 'paymentMethods', value: JSON.stringify(updated), user_id: 'local-user', _syncStatus: 'pending' });
        return updated;
      });
    }

    const trimmedCat = payCategory.trim();
    if (trimmedCat && !savedCategories.includes(trimmedCat)) {
      setSavedCategories(prev => {
        const updated = Array.from(new Set([...prev, trimmedCat]));
        db.settings.put({ key: 'savedCategories', value: JSON.stringify(updated), user_id: 'local-user', _syncStatus: 'pending' });
        return updated;
      });
    }

    setPayAmount('');
    setPayCategory('');
    setPayDescription('');
    setShowDateDropdown(false);
    setCustomDate('');
    setCustomTime('');
    onExpenseAdded();
  };

  const handleAddBank = async () => {
    const trimmed = newBankName.trim();
    const db = getDB();
    if (trimmed && !paymentMethods.includes(trimmed)) {
      setPaymentMethods(prev => {
        const updated = [...prev, trimmed];
        db.settings.put({ key: 'paymentMethods', value: JSON.stringify(updated), user_id: 'local-user', _syncStatus: 'pending' });
        return updated;
      });
      setPayBank(trimmed);
      await db.settings.put({ key: 'preferredBank', value: trimmed, user_id: 'local-user', _syncStatus: 'pending' });
    } else if (trimmed) {
      setPayBank(trimmed);
      await db.settings.put({ key: 'preferredBank', value: trimmed, user_id: 'local-user', _syncStatus: 'pending' });
    }
    setNewBankName('');
    setShowNewBankInput(false);
  };

  const handleDeleteMethod = async (methodToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!(await window.appConfirm('Are you sure you want to delete this item?'))) return;
    const db = getDB();
    const updated = paymentMethods.filter(m => m !== methodToDelete);
    setPaymentMethods(updated);
    if (payBank === methodToDelete) setPayBank('');
    await db.settings.put({ key: 'paymentMethods', value: JSON.stringify(updated), user_id: 'local-user', _syncStatus: 'pending' });
  };

  return (
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            <Wallet className={styles.sectionIcon} /> Quick Expense Log
          </h3>
        </div>
        <form onSubmit={handleQuickPayment} className={styles.quickPaymentForm}>
          <div className={styles.qpInputGroup}>
            <span className={styles.currencySymbol}>₹</span>
            <input
              type="number"
              placeholder="0.00"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className={styles.qpAmountInput}
              autoFocus
              required
            />
          </div>
          <div className={styles.qpRow} style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Category (e.g., Food)"
              value={payCategory}
              onChange={(e) => {
                setPayCategory(e.target.value);
                setShowCatDropdown(true);
              }}
              onFocus={() => setShowCatDropdown(true)}
              onBlur={() => setTimeout(() => setShowCatDropdown(false), 200)}
              className={styles.qpInput}
            />
            {showCatDropdown && savedCategories.filter(c => c.toLowerCase().includes(payCategory.toLowerCase())).length > 0 && (
              <ul className={styles.qpDropdown}>
                {savedCategories.filter(c => c.toLowerCase().includes(payCategory.toLowerCase())).map(cat => (
                  <li 
                    key={cat} 
                    className={styles.qpDropdownItem}
                    onMouseDown={() => {
                      setPayCategory(cat);
                      setShowCatDropdown(false);
                    }}
                  >
                    {cat}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={styles.qpRow}>
            <input
              type="text"
              placeholder="Description (Optional)"
              value={payDescription}
              onChange={(e) => setPayDescription(e.target.value)}
              className={styles.qpInput}
            />
          </div>
          <div className={styles.qpChipsRow}>
            {paymentMethods.map(method => (
              <div 
                key={method} 
                className={payBank === method ? styles.qpChipActive : styles.qpChip} 
                onClick={() => setPayBank(method)}
              >
                {method}
                <span 
                  className={styles.qpChipDelete} 
                  onClick={(e) => handleDeleteMethod(method, e)}
                  title="Remove"
                >
                  &times;
                </span>
              </div>
            ))}
            
            {showNewBankInput ? (
              <input
                type="text"
                autoFocus
                placeholder="New Bank"
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                onBlur={handleAddBank}
                onKeyDown={(e) => e.key === 'Enter' && handleAddBank()}
                className={styles.qpChipInput}
              />
            ) : (
              <button 
                type="button" 
                className={styles.qpChipAdd} 
                onClick={() => setShowNewBankInput(true)}
              >
                <Plus size={14} /> Add
              </button>
            )}
          </div>
          <div className={styles.qpSubmitRow}>
            <button type="submit" className={styles.qpSubmitBtn}>
              {customDate && customDate !== getToday()
                ? customDate === getYesterdayStr()
                  ? 'Log Payment (Yesterday)'
                  : `Log Payment (${new Date(customDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})`
                : 'Log Payment'}
            </button>
            <button
              type="button"
              className={`${styles.qpDropdownToggleBtn} ${showDateDropdown ? styles.qpDropdownToggleBtnActive : ''}`}
              onClick={toggleDateDropdown}
              title={showDateDropdown ? 'Hide date & time options' : 'Edit date & time for previous day'}
              aria-label="Toggle date and time menu"
            >
              <ChevronDown size={18} className={`${styles.qpDropdownArrow} ${showDateDropdown ? styles.qpDropdownArrowOpen : ''}`} />
            </button>
          </div>

          {showDateDropdown && (
            <div className={styles.qpDateMenu}>
              <div className={styles.qpDateHeader}>
                <span className={styles.qpDateTitle}>Expense Date &amp; Time</span>
                <div className={styles.qpQuickDates}>
                  <button
                    type="button"
                    className={customDate === getToday() ? styles.qpDatePillActive : styles.qpDatePill}
                    onClick={() => setCustomDate(getToday())}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    className={customDate === getYesterdayStr() ? styles.qpDatePillActive : styles.qpDatePill}
                    onClick={() => setCustomDate(getYesterdayStr())}
                  >
                    Yesterday
                  </button>
                </div>
              </div>
              <div className={styles.qpDateInputsRow}>
                <div className={styles.qpDateGroup}>
                  <label className={styles.qpDateLabel}>Date</label>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className={styles.qpDateInput}
                    required={showDateDropdown}
                  />
                </div>
                <div className={styles.qpDateGroup}>
                  <label className={styles.qpDateLabel}>Time</label>
                  <input
                    type="time"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className={styles.qpDateInput}
                    required={showDateDropdown}
                  />
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
  );
}
