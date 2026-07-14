'use client';

import { useState, useRef, ReactNode } from 'react';

interface SwipeableItemProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftActions?: ReactNode;
  rightActions?: ReactNode;
}

export default function SwipeableItem({ children, onSwipeLeft, onSwipeRight, leftActions, rightActions }: SwipeableItemProps) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const ref = useRef<HTMLDivElement>(null);

  const threshold = 100;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    
    // Dampen if no actions
    if ((diff < 0 && !rightActions) || (diff > 0 && !leftActions)) {
      setOffset(diff * 0.2);
    } else {
      setOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (offset < -threshold && onSwipeLeft) {
      onSwipeLeft();
      setOffset(0); // Snap back or hold based on design. Let's snap back for simplicity.
    } else if (offset > threshold && onSwipeRight) {
      onSwipeRight();
      setOffset(0);
    } else {
      setOffset(0);
    }
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-xl)' }}>
      {/* Background actions */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between', zIndex: 0 }}>
        <div style={{ width: '50%', background: 'var(--accent-success)', display: 'flex', alignItems: 'center', paddingLeft: 'var(--space-4)', opacity: offset > 0 ? 1 : 0 }}>
          {leftActions}
        </div>
        <div style={{ width: '50%', background: 'var(--accent-danger)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 'var(--space-4)', opacity: offset < 0 ? 1 : 0 }}>
          {rightActions}
        </div>
      </div>
      
      {/* Foreground content */}
      <div 
        ref={ref}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          position: 'relative',
          zIndex: 1,
          background: 'var(--bg-secondary)', // Ensures background covers actions
          height: '100%',
          width: '100%',
        }}
      >
        {children}
      </div>
    </div>
  );
}
