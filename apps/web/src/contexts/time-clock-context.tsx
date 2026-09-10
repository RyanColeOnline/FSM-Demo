'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useDatabaseMode } from '@/contexts/database-mode-context';

interface TimeClockContextType {
  isClockedIn: boolean;
  isOnBreak: boolean;
  activeShiftSeconds: number;
  clockInTime: string;
  toggleClock: () => void;
  toggleBreak: () => void;
  formatDuration: (totalSecs: number) => string;
  formatMinutesToTime: (minutes: number) => string;
}

const TimeClockContext = createContext<TimeClockContextType | undefined>(undefined);

export function TimeClockProvider({ children }: { children: React.ReactNode }) {
  const { databaseMode, client } = useDatabaseMode();
  // Default state for sandbox mode is clocked out at 0:00
  const [isClockedIn, setIsClockedIn] = useState<boolean>(false);
  const [isOnBreak, setIsOnBreak] = useState<boolean>(false);
  const [activeShiftSeconds, setActiveShiftSeconds] = useState<number>(0);
  const [clockInTime, setClockInTime] = useState<string>('');

  const loadLiveTimeClock = useCallback(async () => {
    if (databaseMode === 'live' || databaseMode === 'sandbox') {
      try {
        const entries = await client.fetchTimeClockEntries(databaseMode);
        if (entries && entries.length > 0) {
          // Filter entries for current user (Ryan Cole)
          const userEntries = entries.filter((e) => (e.userName || '').toLowerCase().includes('ryan') || (e.userName || '').toLowerCase().includes('cole'));
          if (userEntries.length > 0) {
            const sorted = [...userEntries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            const latest = sorted[0];
            if (latest.type === 'Clocked In') {
              setIsClockedIn(true);
              setIsOnBreak(false);
              const inTime = new Date(latest.timestamp);
              const now = new Date();
              const elapsed = Math.max(0, Math.floor((now.getTime() - inTime.getTime()) / 1000));
              setActiveShiftSeconds(elapsed);
              setClockInTime(inTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            } else if (latest.type === 'On Break') {
              setIsClockedIn(true);
              setIsOnBreak(true);
            } else if (latest.type === 'Clocked Out') {
              setIsClockedIn(false);
              setIsOnBreak(false);
              setActiveShiftSeconds(0);
              setClockInTime('');
            }
          }
        }
      } catch (err) {
        console.error('Failed to load time clock entries from Firestore:', err);
      }
    }
  }, [client, databaseMode]);

  useEffect(() => {
    loadLiveTimeClock();
  }, [loadLiveTimeClock]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isClockedIn && !isOnBreak) {
      timer = setInterval(() => {
        setActiveShiftSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isClockedIn, isOnBreak]);

  const toggleClock = () => {
    const now = new Date();
    const willClockOut = isClockedIn;
    if (willClockOut) {
      setIsClockedIn(false);
      setIsOnBreak(false);
      setActiveShiftSeconds(0);
      setClockInTime('');
    } else {
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setClockInTime(timeStr);
      setIsClockedIn(true);
      setActiveShiftSeconds(0);
    }

    if (databaseMode !== 'mock') {
      client.saveTimeClockEntry({
        id: `tc-${Date.now()}`,
        type: willClockOut ? 'Clocked Out' : 'Clocked In',
        timestamp: now.toISOString(),
        userName: 'Ryan Cole',
        userId: 'usr-ryan-cole',
        date: now.toISOString().slice(0, 10),
        clockInTime: willClockOut ? clockInTime : now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        clockOutTime: willClockOut ? now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
      }, databaseMode);
    }
  };

  const toggleBreak = () => {
    const nextBreak = !isOnBreak;
    setIsOnBreak(nextBreak);
    if (databaseMode !== 'mock') {
      client.saveTimeClockEntry({
        id: `tc-${Date.now()}`,
        type: nextBreak ? 'On Break' : 'Ended Break',
        timestamp: new Date().toISOString(),
        userName: 'Ryan Cole',
        userId: 'usr-ryan-cole',
        date: new Date().toISOString().slice(0, 10),
      }, databaseMode);
    }
  };

  const formatDuration = (totalSecs: number) => {
    if (!isClockedIn || totalSecs === 0) return '0:00';
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const formatMinutesToTime = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}:${String(mins).padStart(2, '0')}h`;
  };

  return (
    <TimeClockContext.Provider
      value={{
        isClockedIn,
        isOnBreak,
        activeShiftSeconds,
        clockInTime,
        toggleClock,
        toggleBreak,
        formatDuration,
        formatMinutesToTime,
      }}
    >
      {children}
    </TimeClockContext.Provider>
  );
}

export function useTimeClock() {
  const context = useContext(TimeClockContext);
  if (!context) {
    throw new Error('useTimeClock must be used within a TimeClockProvider');
  }
  return context;
}
