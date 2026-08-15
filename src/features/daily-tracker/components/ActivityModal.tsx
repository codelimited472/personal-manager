import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { DailyActivity, DailyActivityFormData, ACTIVITY_CATEGORIES, ACTIVITY_COLORS } from '../types';

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
    category: ACTIVITY_CATEGORIES[0],
    color: ACTIVITY_COLORS[0],
    start_time: '09:00',
    end_time: '10:00',
    description: '',
  });

  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      if (initialData) {
        setFormData({
          title: initialData.title || '',
          category: initialData.category || ACTIVITY_CATEGORIES[0],
          color: initialData.color || ACTIVITY_COLORS[0],
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
          category: ACTIVITY_CATEGORIES[0],
          color: ACTIVITY_COLORS[0],
          start_time: selectedTime,
          end_time: `${endH}:${endM}`,
          description: '',
        });
      }
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
    onSave(formData);
    handleClose();
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col justify-end lg:justify-center lg:items-center p-0 lg:p-4 transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
        onClick={handleClose} 
      />
      
      {/* Modal/Bottom Sheet Content */}
      <div className={`relative bg-white dark:bg-gray-900 w-full lg:max-w-md lg:rounded-2xl rounded-t-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl transition-transform duration-200 ${isClosing ? 'translate-y-full lg:scale-95' : 'translate-y-0 lg:scale-100'}`}>
        
        {/* Mobile Pull Indicator */}
        <div className="w-full flex justify-center pt-3 pb-1 lg:hidden">
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full" />
        </div>

        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {initialData?.id ? 'Edit Activity' : 'New Activity'}
          </h2>
          <div className="flex gap-2">
            {initialData?.id && onDelete && (
              <button 
                type="button"
                onClick={() => { onDelete(initialData.id!); handleClose(); }}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                aria-label="Delete"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button 
              onClick={handleClose} 
              className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 overflow-y-auto flex-1 flex flex-col gap-6">
          <div>
            <input
              type="text"
              required
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-transparent text-2xl font-semibold text-gray-900 dark:text-white placeholder-gray-400 border-none outline-none focus:ring-0 px-0 pb-2"
              placeholder="What are you doing?"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700/50 focus-within:ring-2 focus-within:ring-blue-500/50 transition-shadow">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Start Time</label>
              <input
                type="time"
                required
                value={formData.start_time}
                onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full bg-transparent text-gray-900 dark:text-white border-none outline-none font-medium p-0"
              />
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700/50 focus-within:ring-2 focus-within:ring-blue-500/50 transition-shadow">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">End Time</label>
              <input
                type="time"
                required
                value={formData.end_time}
                onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full bg-transparent text-gray-900 dark:text-white border-none outline-none font-medium p-0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Category</label>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: cat })}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    formData.category === cat 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800' 
                      : 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Color</label>
            <div className="flex flex-wrap gap-3">
              {ACTIVITY_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform ${
                    formData.color === color ? 'ring-4 ring-offset-2 dark:ring-offset-gray-900 scale-110' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color, ringColor: `${color}80` }}
                />
              ))}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50 mt-2 mb-4">
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 resize-none p-0"
              placeholder="Add details or notes..."
              rows={2}
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 text-white bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-lg transition-colors shadow-lg shadow-blue-500/30"
          >
            Save Activity
          </button>
        </form>
      </div>
    </div>
  );
}
