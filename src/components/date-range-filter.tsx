'use client';

import { useState, useEffect } from 'react';

export interface DateRange {
  startDate: string | null;
  endDate: string | null;
}

interface DateRangeFilterProps {
  onChange: (dateRange: DateRange) => void;
  disabled?: boolean;
}

export function DateRangeFilter({ onChange, disabled }: DateRangeFilterProps) {
  const [allTime, setAllTime] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (allTime) {
      onChange({ startDate: null, endDate: null });
    } else {
      onChange({
        startDate: startDate || null,
        endDate: endDate || null,
      });
    }
  }, [allTime, startDate, endDate, onChange]);

  return (
    <div className="w-full max-w-xl">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">Date Range:</span>

        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          disabled={disabled || allTime}
          className="px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:border-zinc-600 dark:text-white"
        />

        <span className="text-zinc-500 dark:text-zinc-400">to</span>

        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          disabled={disabled || allTime}
          className="px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:border-zinc-600 dark:text-white"
        />

        <label className="flex items-center gap-2 cursor-pointer ml-2">
          <input
            type="checkbox"
            checked={allTime}
            onChange={(e) => setAllTime(e.target.checked)}
            disabled={disabled}
            className="w-4 h-4 text-orange-500 border-zinc-300 rounded focus:ring-orange-500 disabled:cursor-not-allowed"
          />
          <span className="text-zinc-600 dark:text-zinc-400">All time</span>
        </label>
      </div>
    </div>
  );
}
