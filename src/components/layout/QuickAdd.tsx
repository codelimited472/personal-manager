'use client';

import { useState } from 'react';
import { Plus, X, CheckSquare, Wallet, Lightbulb, FileText, Car, ShoppingCart, Mic, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { processQuickCapture } from '@/lib/quickCapture';
import { useToast } from '../ui/Toast';
import styles from './QuickAdd.module.css';

const quickActions = [
  { icon: CheckSquare, label: 'Task', href: '/tasks?add=true', color: 'var(--accent-primary)' },
  { icon: Wallet, label: 'Expense', href: '/expenses?add=true', color: 'var(--accent-secondary)' },
  { icon: Lightbulb, label: 'Idea', href: '/ideas?add=true', color: 'var(--accent-warning)' },
  { icon: FileText, label: 'Note', href: '/notes?add=true', color: 'var(--accent-info)' },
  { icon: Car, label: 'Vehicle', href: '/vehicles?add=true', color: 'var(--accent-danger)' },
  { icon: ShoppingCart, label: 'Shopping', href: '/shopping?add=true', color: 'var(--accent-success)' },
];

export default function QuickAdd() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const handleAction = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  const handleQuickCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      const result = await processQuickCapture(inputText);
      showToast(result.message, 'success');
      setInputText('');
      setIsOpen(false);
      // Optional router refresh or redirect depending on parsed type
      router.refresh();
    } catch (err) {
      console.error(err);
      showToast('Failed to process quick capture', 'error');
    }
  };

  const startSpeechToText = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Speech recognition not supported in this browser.', 'error');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onerror = (e: any) => {
      console.error(e);
      setIsListening(false);
      showToast('Speech recognition error.', 'error');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript;
      setInputText(speechToText);
      showToast(`Captured: "${speechToText}"`, 'info');
    };

    recognition.start();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className={styles.backdrop}
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Quick Action Menu */}
      {isOpen && (
        <div className={styles.menu} role="menu" aria-label="Quick actions">
          {/* Universal Capture Input Box */}
          <form onSubmit={handleQuickCapture} className={styles.captureForm}>
            <input
              type="text"
              placeholder="e.g. Buy milk tomorrow, spent 50 on fuel..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className={styles.captureInput}
              autoFocus
            />
            <button
              type="button"
              onClick={startSpeechToText}
              className={cn(styles.micBtn, isListening && styles.listening)}
              title="Speech-to-text"
            >
              <Mic size={18} />
            </button>
            <button type="submit" className={styles.sendBtn} disabled={!inputText.trim()}>
              <Send size={18} />
            </button>
          </form>

          {quickActions.map((action, index) => (
            <button
              key={action.label}
              className={styles.menuItem}
              onClick={() => handleAction(action.href)}
              role="menuitem"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <div className={styles.menuIcon} style={{ background: action.color }}>
                <action.icon size={18} color="white" />
              </div>
              <span className={styles.menuLabel}>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* FAB Button */}
      <button
        className={cn('fab', styles.fab)}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close quick add' : 'Quick add'}
        aria-expanded={isOpen}
        id="quick-add-fab"
      >
        {isOpen ? <X size={24} /> : <Plus size={24} />}
      </button>
    </>
  );
}

