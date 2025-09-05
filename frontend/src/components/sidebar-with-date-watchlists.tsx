'use client';

import React, { useEffect } from 'react';
import {
  Sidebar,
  SidebarHeader,
  SidebarBody,
  SidebarSection,
  SidebarHeading,
  SidebarItem,
  SidebarLabel
} from './catalyst/sidebar';
import { Input } from './catalyst/input';

export interface Watchlist {
  id: string;
  name: string;
}

export const mockWatchlists: Watchlist[] = [
  { id: 'swing-high-cross-up', name: 'Swing High Cross Up' },
  { id: 'swing-high-cross-down', name: 'Swing High Cross Down' },
  { id: 'swing-low-cross-down', name: 'Swing Low Cross Down' },
  { id: 'swing-low-cross-up', name: 'Swing Low Cross Up' },
  { id: '52-week-rs', name: '52 Week High RS' },
  { id: 'gapup', name: 'Gap Up' },
  { id: 'gapdown', name: 'Gap Down' },
  { id: 'new-highs-63', name: 'Three Month High' },
  { id: 'new-lows-63', name: 'Three Month Low' },
  { id: 'new-highs-252', name: 'One Year High' },
  { id: 'new-lows-252', name: 'One Year Low' },
  { id: 'new-buys', name: 'New Buys' },
  { id: 'new-sells', name: 'New Sells' },
];

interface SidebarWithDateAndWatchlistsProps {
  selectedWatchlistId: string;
  onSelectWatchlist: (id: string) => void;
  date: string;
  setDate: (date: string) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export function SidebarWithDateAndWatchlists({
  selectedWatchlistId,
  onSelectWatchlist,
  date,
  setDate,
  isDarkMode,
  toggleTheme,
}: SidebarWithDateAndWatchlistsProps) {
  useEffect(() => {
    // Only fetch max date if not already set
    if (!date) {
      fetch('http://127.0.0.1:8080/maxdate')
        .then(res => res.json())
        .then(data => {
          // Assume the API returns a string or an object with a date property
          let maxDate = "";
          if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
            maxDate = data;
          } else if (data && typeof data === 'object' && 'date' in data) {
            maxDate = data.date;
          }
          if (maxDate) setDate(maxDate);
        });
    }
  }, [date, setDate]);

  return (
    <Sidebar>
      <SidebarHeader>
        <Input
          type="date"
          className="mb-4"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      </SidebarHeader>
      <SidebarBody>
        <SidebarSection>
          <SidebarHeading>Watchlists</SidebarHeading>
          {mockWatchlists.map(watchlist => (
            <SidebarItem
              key={watchlist.id}
              current={selectedWatchlistId === watchlist.id}
              onClick={() => onSelectWatchlist(watchlist.id)}
            >
              <SidebarLabel>{watchlist.name}</SidebarLabel>
            </SidebarItem>
          ))}
        </SidebarSection>
        
        {/* Theme Toggle at bottom */}
        <div className="mt-auto pt-4 px-4 border-t border-zinc-200 dark:border-zinc-700">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-center gap-2 p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-sm"
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Light Mode
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                Dark Mode
              </>
            )}
          </button>
        </div>
      </SidebarBody>
    </Sidebar>
  );
}
