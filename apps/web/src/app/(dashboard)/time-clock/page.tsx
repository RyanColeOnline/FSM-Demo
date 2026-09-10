'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  Play, 
  Square, 
  Coffee, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import { useTimeClock } from '@/contexts/time-clock-context';

interface DayData {
  day: string;
  dateStr: string;
  minutes: number;
  isToday?: boolean;
}

interface WeekData {
  weekLabel: string;
  dateRangeLabel: string;
  days: DayData[];
}

export default function PersonalTimeClockPage() {
  const {
    isClockedIn,
    isOnBreak,
    activeShiftSeconds,
    clockInTime,
    toggleClock,
    toggleBreak,
    formatDuration,
    formatMinutesToTime,
  } = useTimeClock();

  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [weekOffset, setWeekOffset] = useState<number>(0);

  useEffect(() => {
    setCurrentTime(new Date());
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(clockTimer);
    };
  }, []);

  const todayMinutes = isClockedIn ? Math.round(activeShiftSeconds / 60) : 0;

  // Fully dynamic week calculation anchored live to the user's real local time
  const currentWeek: WeekData = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday + (weekOffset * 7));
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const days: DayData[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const isToday = weekOffset === 0 && d.toDateString() === now.toDateString();
      const mName = monthNames[d.getMonth()];
      
      // Pure live shift minutes: 0 unless currently clocked in today
      const dayMins = isToday ? todayMinutes : 0;

      days.push({
        day: dayNames[i],
        dateStr: `${mName} ${d.getDate()}`,
        minutes: dayMins,
        isToday,
      });
    }

    const monMonth = monthNames[monday.getMonth()];
    const sunMonth = monthNames[sunday.getMonth()];
    const dateRangeLabel = monMonth === sunMonth
      ? `${monMonth} ${monday.getDate()} – ${sunday.getDate()}, ${sunday.getFullYear()}`
      : `${monMonth} ${monday.getDate()} – ${sunMonth} ${sunday.getDate()}, ${sunday.getFullYear()}`;

    let weekLabel = 'Current Week';
    if (weekOffset === -1) weekLabel = 'Last Week';
    else if (weekOffset < -1) weekLabel = `${Math.abs(weekOffset)} Weeks Ago`;
    else if (weekOffset === 1) weekLabel = 'Next Week';
    else if (weekOffset > 1) weekLabel = `In ${weekOffset} Weeks`;

    return {
      weekLabel,
      dateRangeLabel,
      days,
    };
  }, [weekOffset, todayMinutes]);

  const totalWeeklyMinutes = currentWeek.days.reduce((acc, d) => acc + d.minutes, 0);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header - Subtext removed per user request */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#3f6b35]" />
          <span>My Time Clock</span>
        </h1>
      </div>

      {/* Main Grid: Clock In Action Card (Left) & Weekly Summary (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Clocking Action Card */}
        <div className="md:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-2xs flex flex-col justify-between min-h-[300px] relative overflow-hidden">
          {/* Top Row: Clock In Timestamp / Current Local Time */}
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isClockedIn ? (isOnBreak ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500') : 'bg-slate-300'}`} />
              {isClockedIn ? (isOnBreak ? 'On Break' : 'Clocked In') : 'Clocked Out'}
            </span>
            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
              {currentTime ? currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
            </span>
          </div>

          {/* Center: Shift Elapsed Timer */}
          <div className="py-6 text-center space-y-2">
            <div className="text-4xl font-extrabold tracking-tight text-slate-900">
              {formatDuration(activeShiftSeconds)}
            </div>
            <p className="text-xs text-slate-500">
              {isClockedIn 
                ? `Started shift today at ${clockInTime}`
                : 'No recent shifts recorded'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {isClockedIn ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={toggleBreak}
                  className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                    isOnBreak
                      ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                  }`}
                >
                  <Coffee className="w-3.5 h-3.5" />
                  <span>{isOnBreak ? 'End Break' : 'Take Break'}</span>
                </button>

                <button
                  type="button"
                  onClick={toggleClock}
                  className="w-full py-2.5 px-3 bg-[#be4646] hover:bg-[#a63a3a] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Clock Out</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={toggleClock}
                className="w-full py-3 px-4 bg-[#3f6b35] hover:bg-[#34572c] text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Clock In Now</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Weekly Breakdown Tiles Card */}
        <div className="md:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-2xs flex flex-col justify-between min-h-[300px]">
          {/* Header with Week Range and Pagination Chevrons */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-center">
              <h2 className="text-sm font-bold text-slate-900">
                {currentWeek.dateRangeLabel}
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">
                {currentWeek.weekLabel}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setWeekOffset((prev) => Math.min(0, prev + 1))}
              disabled={weekOffset === 0}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-colors cursor-pointer"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 7-Day Tiles Grid */}
          <div className="grid grid-cols-7 gap-2 my-6">
            {currentWeek.days.map((dayObj) => (
              <div
                key={dayObj.day}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                  dayObj.isToday
                    ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-100 bg-slate-50/70 hover:bg-slate-100/60'
                }`}
              >
                <span className="text-[11px] font-semibold text-slate-500 uppercase">
                  {dayObj.day}
                </span>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {dayObj.dateStr.split(' ')[1] || ''}
                </span>
                <span className={`text-xs font-bold mt-2 ${dayObj.minutes > 0 ? (dayObj.isToday ? 'text-emerald-700 font-extrabold' : 'text-slate-900') : 'text-slate-400 font-normal'}`}>
                  {formatMinutesToTime(dayObj.minutes)}
                </span>
              </div>
            ))}
          </div>

          {/* Footer Total Hours */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Pay Period Summary</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-600 font-medium">Total:</span>
              <span className="text-sm font-bold text-slate-900">
                {formatMinutesToTime(totalWeeklyMinutes)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
