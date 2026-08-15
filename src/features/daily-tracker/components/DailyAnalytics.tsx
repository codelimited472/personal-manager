import React from 'react';
import { DailyActivity } from '../types';

interface DailyAnalyticsProps {
  activities: DailyActivity[];
}

export function DailyAnalytics({ activities }: DailyAnalyticsProps) {
  // Calculate total time per category
  const categoryStats = activities.reduce((acc, activity) => {
    const start = new Date(`1970-01-01T${activity.start_time}:00`).getTime();
    const end = new Date(`1970-01-01T${activity.end_time}:00`).getTime();
    
    let durationMins = (end - start) / 1000 / 60;
    if (durationMins < 0) durationMins += 24 * 60; // handle overnight

    if (!acc[activity.category]) {
      acc[activity.category] = {
        duration: 0,
        color: activity.color,
      };
    }
    acc[activity.category].duration += durationMins;
    
    return acc;
  }, {} as Record<string, { duration: number, color: string }>);

  const totalTrackedMins = Object.values(categoryStats).reduce((sum, stat) => sum + stat.duration, 0);
  const totalDayMins = 24 * 60;
  const untrackedMins = Math.max(0, totalDayMins - totalTrackedMins);

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const sortedCategories = Object.entries(categoryStats)
    .sort((a, b) => b[1].duration - a[1].duration);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Tracked Time</h3>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatDuration(totalTrackedMins)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-400 dark:text-gray-500">
            {Math.round((totalTrackedMins / totalDayMins) * 100)}%
          </div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="h-3 w-full bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden flex mb-8">
        {sortedCategories.map(([category, stat]) => (
          <div
            key={category}
            style={{ 
              width: `${(stat.duration / totalDayMins) * 100}%`,
              backgroundColor: stat.color 
            }}
            title={`${category}: ${formatDuration(stat.duration)}`}
            className="h-full transition-all duration-500"
          />
        ))}
      </div>

      {/* Legend & Stats */}
      <div className="space-y-4">
        {sortedCategories.map(([category, stat]) => (
          <div key={category} className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div 
                className="w-4 h-4 rounded-full shadow-inner" 
                style={{ backgroundColor: stat.color }}
              />
              <span className="font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                {category}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatDuration(stat.duration)}
              </span>
              <span className="text-sm font-medium text-gray-400 w-10 text-right">
                {Math.round((stat.duration / totalDayMins) * 100)}%
              </span>
            </div>
          </div>
        ))}

        {untrackedMins > 0 && (
          <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600" />
              <span className="font-medium text-gray-500">Untracked</span>
            </div>
            <div className="flex items-center gap-4 text-gray-500">
              <span className="font-semibold">{formatDuration(untrackedMins)}</span>
              <span className="text-sm font-medium w-10 text-right">
                {Math.round((untrackedMins / totalDayMins) * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
