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
  { id: 'new-highs-63', name: 'New Highs (63D)' },
  { id: 'new-highs-252', name: 'New Highs (252D)' },
  { id: 'new-lows-63', name: 'New Lows (63D)' },
  { id: 'new-lows-252', name: 'New Lows (252D)' },
  { id: 'gapup', name: 'Gap Up' },
  { id: 'gapdown', name: 'Gap Down' },
  { id: 'swing-high-cross-up', name: 'Swing High Cross Up' },
  { id: 'swing-high-cross-down', name: 'Swing High Cross Down' },
  { id: 'swing-low-cross-up', name: 'Swing Low Cross Up' },
  { id: 'swing-low-cross-down', name: 'Swing Low Cross Down' },
  { id: 'new-signals', name: 'New Signals' },
  { id: '52-week-rs', name: '52 Week Relative Strength' },
];

interface SidebarWithDateAndWatchlistsProps {
  selectedWatchlistId: string;
  onSelectWatchlist: (id: string) => void;
  date: string;
  setDate: (date: string) => void;
}

export function SidebarWithDateAndWatchlists({
  selectedWatchlistId,
  onSelectWatchlist,
  date,
  setDate,
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
      </SidebarBody>
    </Sidebar>
  );
}
