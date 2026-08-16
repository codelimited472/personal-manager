import React, { useState, useEffect } from 'react';
import { X, Trash2, ChevronDown } from 'lucide-react';
import { DailyActivity, DailyActivityFormData, ACTIVITY_CATEGORIES, ACTIVITY_COLORS } from '../types';
import { getDB } from '@/lib/db';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: DailyActivityFormData) => void;
  onDelete?: (id: string) => void;
  initialData?: Partial<DailyActivity>;
  selectedTime?: string;
}

export function ActivityModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
  selectedTime,
}: ActivityModalProps) {
  const [formData, setFormData] = useState<DailyActivityFormData>({
    title: '',
    category: '',
    color: '',
    start_time: '09:00',
    end_time: '10:00',
    description: '',
  });

  const [isClosing, setIsClosing] = useState(false);
  const [savedCategories, setSavedCategories] = useState<string[]>([]);
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [colorToCategoryMap, setColorToCategoryMap] = useState<Record<string, string>>({});
  const [categoryToColorMap, setCategoryToColorMap] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadCategories() {
      try {
        const db = getDB();
        const allActivities = await db.dailyActivities.toArray();
        const counts: Record<string, number> = {};
        const colToCat: Record<string, string> = {};
        const catToCol: Record<string, string> = {};
        allActivities.forEach(a => {
          if (a.title) {
            const titles = a.title.split(',').map(s => s.trim()).filter(Boolean);
            titles.forEach(t => {
              counts[t] = (counts[t] || 0) + 1;
              if (a.color && !colToCat[a.color]) {
                colToCat[a.color] = t;
              }
              if (a.color && !catToCol[t]) {
                catToCol[t] = a.color;
              }
            });
          }
        });

        setColorToCategoryMap(colToCat);
        setCategoryToColorMap(catToCol);

        const combined = new Set(Object.keys(counts));
        let finalCats = Array.from(combined);
        
        if (finalCats.length === 0) {
          finalCats = ['Work', 'Sleep', 'Exercise', 'Reading', 'Travel'];
        } else {
          finalCats.sort((a, b) => (counts[b] || 0) - (counts[a] || 0));
        }
        
        setSavedCategories(finalCats);

        // Find latest end_time for today to auto-populate start_time
        const todayStr = new Date().toLocaleDateString('en-CA'); // local YYYY-MM-DD
        const todaysActivities = allActivities.filter(a => a.date === todayStr);
        let latestEndTime = '09:00';
        if (todaysActivities.length > 0) {
          todaysActivities.sort((a, b) => b.end_time.localeCompare(a.end_time));
          latestEndTime = todaysActivities[0].end_time;
        }

        return latestEndTime;

      } catch (err) {
        console.error(err);
        return '09:00';
      }
    }
    
    if (isOpen) {
      setIsClosing(false);
      loadCategories().then(latestEndTime => {
        if (initialData) {
          setFormData({
            title: initialData.title || '',
            category: initialData.category || initialData.title || '',
            color: initialData.color || '',
            start_time: initialData.start_time || '09:00',
            end_time: initialData.end_time || '10:00',
            description: initialData.description || '',
          });
        } else if (selectedTime) {
          // Default to 1 hour duration
          const [h, m] = selectedTime.split(':').map(Number);
          const endH = (h + 1).toString().padStart(2, '0');
          const endM = m.toString().padStart(2, '0');
          
          setFormData({
            title: '',
            category: '',
            color: '',
            start_time: selectedTime,
            end_time: `${endH}:${endM}`,
            description: '',
          });
        } else {
          // New activity with no specific selected time - use latest end time!
          const [h, m] = latestEndTime.split(':').map(Number);
          const endH = ((h + 1) % 24).toString().padStart(2, '0');
          const endM = m.toString().padStart(2, '0');

          setFormData({
            title: '',
            category: '',
            color: '',
            start_time: latestEndTime,
            end_time: `${endH}:${endM}`,
            description: '',
          });
        }
      });
    }
  }, [isOpen, initialData, selectedTime]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200); // match animation duration
  };

  if (!isOpen && !isClosing) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalColor = formData.color;
    
    // For color mapping, use the first category if there are multiple
    const firstCategory = formData.title.split(',')[0]?.trim() || formData.title;

    if (categoryToColorMap[firstCategory]) {
      finalColor = categoryToColorMap[firstCategory];
    } else if (!finalColor || finalColor === '') {
      const usedColors = new Set(Object.values(categoryToColorMap));
      const availableColors = ACTIVITY_COLORS.filter(c => !usedColors.has(c.hex));
      
      if (availableColors.length > 0) {
        finalColor = availableColors[Math.floor(Math.random() * availableColors.length)].hex;
      } else {
        finalColor = ACTIVITY_COLORS[Math.floor(Math.random() * ACTIVITY_COLORS.length)].hex;
      }
    }

    onSave({ ...formData, color: finalColor });
    handleClose();
  };

  const toggleCategory = (cat: string) => {
    const currentCategories = formData.title.split(',').map(s => s.trim()).filter(Boolean);
    let newCategories;
    if (currentCategories.includes(cat)) {
      newCategories = currentCategories.filter(c => c !== cat); // Remove if exists
    } else {
      newCategories = [...currentCategories, cat]; // Append if not exists
    }
    const newTitle = newCategories.join(', ');
    
    setFormData({ 
      ...formData, 
      title: newTitle, 
      category: newTitle,
      color: categoryToColorMap[newCategories[0]] || formData.color 
    });
  };

  const addTimeToEnd = (minutesToAdd: number) => {
    const [h, m] = formData.end_time.split(':').map(Number);
    let newM = m + minutesToAdd;
    let newH = h + Math.floor(newM / 60);
    newM = newM % 60;
    newH = newH % 24;
    
    const formattedH = newH.toString().padStart(2, '0');
    const formattedM = newM.toString().padStart(2, '0');
    
    setFormData(prev => ({ ...prev, end_time: `${formattedH}:${formattedM}` }));
  };

  const resetTime = () => {
    const [h, m] = formData.start_time.split(':').map(Number);
    let newM = m;
    let newH = h + 1;
    newH = newH % 24;
    
    const formattedH = newH.toString().padStart(2, '0');
    const formattedM = newM.toString().padStart(2, '0');
    
    setFormData(prev => ({ ...prev, end_time: `${formattedH}:${formattedM}` }));
  };

  return (
    <>
      {/* Backdrop */}
      <div className="modal-backdrop" onClick={handleClose} />
      
      {/* Modal/Bottom Sheet Content */}
      <div className="bottom-sheet" id="activity-form-sheet">
        <div className="bottom-sheet-handle" />
        <div className="bottom-sheet-content p-4">
          <div 
            className="mb-4 border-b border-gray-100 dark:border-gray-800 pb-3"
            style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap' }}
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {initialData?.id ? 'Edit Activity' : 'New Activity'}
            </h2>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginLeft: '12px' }}>
              {initialData?.id && onDelete && (
                <button 
                  type="button"
                  onClick={() => { onDelete(initialData.id!); handleClose(); }}
                  className="btn-icon btn-ghost text-red-500 hover:text-red-600"
                  aria-label="Delete"
                >
                  <Trash2 size={20} />
                </button>
              )}
              <button 
                onClick={handleClose} 
                className="btn-icon btn-ghost"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="form flex flex-col gap-6">

            <div className="grid grid-cols-2 gap-4">
              <div className="input-group">
                <label className="input-label">Start Time</label>
                <input
                  type="time"
                  required
                  value={formData.start_time}
                  onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                  className="input"
                />
              </div>
              <div className="input-group">
                <label className="input-label">End Time</label>
                <input
                  type="time"
                  required
                  value={formData.end_time}
                  onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            {/* Time Preset Tags */}
            <div className="flex flex-wrap gap-2 -mt-2">
              {[
                { label: '+1 hr', value: 60 },
                { label: '+45 m', value: 45 },
                { label: '+30 m', value: 30 },
                { label: '+15 m', value: 15 },
                { label: '+10 m', value: 10 },
                { label: '+5 m', value: 5 },
              ].map(preset => (
                <div
                  key={preset.label}
                  onClick={() => addTimeToEnd(preset.value)}
                  className="chip"
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  {preset.label}
                </div>
              ))}
              <div
                onClick={resetTime}
                className="chip"
                style={{ padding: '4px 10px', fontSize: '0.75rem', backgroundColor: 'var(--bg-glass-hover)' }}
              >
                Reset
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Category</label>
              
              {/* Relative wrapper specifically for the input and its dropdown */}
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  placeholder="e.g., Work, Sleep, Travel"
                  value={formData.title}
                  onChange={e => {
                    const val = e.target.value;
                    setFormData({ 
                      ...formData, 
                      title: val, 
                      category: val,
                      color: categoryToColorMap[val.split(',')[0]?.trim()] || formData.color
                    });
                  }}
                  onFocus={() => setShowCatDropdown(true)}
                  onClick={() => setShowCatDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCatDropdown(false), 200)}
                  className="input"
                />

                {/* Dropdown Menu - perfectly floats below the input, always shows categories to allow multiple selection */}
                {showCatDropdown && savedCategories.length > 0 && (
                  <ul className="dropdown-menu">
                    {savedCategories.map(cat => {
                      const isSelected = formData.title.split(',').map(s => s.trim()).includes(cat);
                      return (
                        <li 
                          key={cat} 
                          className="dropdown-item"
                          style={{ 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            whiteSpace: 'nowrap',
                            backgroundColor: isSelected ? 'var(--bg-glass)' : 'transparent',
                            color: isSelected ? 'var(--accent-primary)' : 'inherit'
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault(); // Keep input focused
                            toggleCategory(cat);
                            setShowCatDropdown(false);
                          }}
                        >
                          {cat}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Category Tags */}
              {savedCategories.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {savedCategories.map(cat => {
                    const isSelected = formData.title.split(',').map(s => s.trim()).includes(cat);
                    return (
                      <div
                        key={cat}
                        onClick={() => {
                          toggleCategory(cat);
                          setShowCatDropdown(false);
                        }}
                        className={isSelected ? 'chip chip-active' : 'chip'}
                      >
                        {cat}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="input-group">
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="input textarea"
                placeholder="Add details or notes..."
                rows={2}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg mt-2"
            >
              Save Activity
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
