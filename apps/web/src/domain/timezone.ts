/**
 * Central US Timezone (America/Chicago) Utilities
 * Ensures accurate local Central US date and time computation across Murphy's Home Services application.
 */

export const CENTRAL_TIMEZONE = 'America/Chicago';
export const APP_TIMEZONE = CENTRAL_TIMEZONE;
export const EASTERN_TIMEZONE = CENTRAL_TIMEZONE; // Alias for backward compatibility

/**
 * Returns a YYYY-MM-DD string in America/Chicago timezone for the current time + optional day offset.
 * Example: getCentralDateString(0) -> "2026-08-29"
 * Example: getCentralDateString(-7) -> "2026-08-22"
 */
export function getCentralDateString(offsetDays: number = 0, baseDate: Date = new Date()): string {
  const d = new Date(baseDate);
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CENTRAL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}
export const getEasternDateString = getCentralDateString;

/**
 * Returns M-DD-YYYY string in America/Chicago timezone (e.g., "8-08-2026" or "8-25-2026").
 * Safely preserves explicit calendar dates without timezone-crossing midnight shifts.
 */
export function formatCentralDate(date: Date | string = new Date()): string {
  if (!date) return '';
  if (typeof date === 'string') {
    const s = date.trim();
    const mdy = s.match(/^0?(\d{1,2})[/-]0?(\d{1,2})[/-](\d{4})/);
    if (mdy) {
      return `${parseInt(mdy[1], 10)}-${mdy[2].padStart(2, '0')}-${mdy[3]}`;
    }
    const ymd = s.match(/^(\d{4})[/-]0?(\d{1,2})[/-]0?(\d{1,2})/);
    if (ymd) {
      return `${parseInt(ymd[2], 10)}-${ymd[3].padStart(2, '0')}-${ymd[1]}`;
    }
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const month = d.toLocaleString('en-US', { timeZone: CENTRAL_TIMEZONE, month: 'numeric' });
  const day = d.toLocaleString('en-US', { timeZone: CENTRAL_TIMEZONE, day: '2-digit' });
  const year = d.toLocaleString('en-US', { timeZone: CENTRAL_TIMEZONE, year: 'numeric' });
  return `${month}-${day}-${year}`;
}
export const formatEasternDate = formatCentralDate;

/**
 * Returns M/D/YYYY string preserving the exact calendar date (e.g. "9/11/2026").
 */
export function formatCalendarDateMdy(date?: Date | string | null): string {
  if (!date) return '';
  if (typeof date === 'string') {
    const s = date.trim();
    const mdy = s.match(/^0?(\d{1,2})[/-]0?(\d{1,2})[/-](\d{4})/);
    if (mdy) {
      return `${parseInt(mdy[1], 10)}/${parseInt(mdy[2], 10)}/${mdy[3]}`;
    }
    const ymd = s.match(/^(\d{4})[/-]0?(\d{1,2})[/-]0?(\d{1,2})/);
    if (ymd) {
      return `${parseInt(ymd[2], 10)}/${parseInt(ymd[3], 10)}/${ymd[1]}`;
    }
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return String(date || '');
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

/**
 * Extracts 12-hour formatted time (e.g. "11:30 AM") from ISO strings or time text without timezone skew.
 */
export function extractTime12hFromIsoOrString(val?: string | null): string | null {
  if (!val) return null;
  const s = String(val).trim();
  if (/\b(am|pm)\b/i.test(s)) {
    const match = s.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
    if (match) {
      return `${parseInt(match[1], 10)}:${match[2]} ${match[3].toUpperCase()}`;
    }
  }
  if (s.includes('T')) {
    const timePart = s.split('T')[1];
    const match = timePart.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      const h24 = parseInt(match[1], 10);
      const min = match[2];
      const ampm = h24 >= 12 ? 'PM' : 'AM';
      const h12 = h24 % 12 || 12;
      return `${h12}:${min} ${ampm}`;
    }
  }
  return null;
}

/**
 * Formats appointment scheduled date/time accurately following user input without timezone conversion skew.
 * Example: "9/11/2026, 11:30 AM"
 */
export function formatAppointmentScheduleDisplay(appt: any): string {
  if (!appt) return 'Scheduled';

  let datePart = '';
  if (appt.appointmentDate) {
    datePart = formatCalendarDateMdy(appt.appointmentDate);
  } else if (appt.dateTime) {
    datePart = formatCalendarDateMdy(appt.dateTime);
  } else if (appt.createdDate) {
    datePart = formatCalendarDateMdy(appt.createdDate);
  }

  let timePart = '';
  if (appt.startTime) {
    timePart = appt.startTime;
  } else if (appt.dateTime) {
    timePart = extractTime12hFromIsoOrString(appt.dateTime) || '';
  }

  if (datePart && timePart) {
    return `${datePart}, ${timePart}`;
  }
  if (datePart) return datePart;
  if (timePart) return timePart;
  return 'Scheduled';
}

/**
 * Returns M-DD-YYYY, hh:mm a in America/Chicago timezone.
 */
export function formatCentralDateTime(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const dateStr = formatCentralDate(d);
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: CENTRAL_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${dateStr}, ${timeFormatter.format(d).toLowerCase()}`;
}
export const formatEasternDateTime = formatCentralDateTime;

/**
 * Normalizes any date string (ISO, MM/DD/YYYY, formatted text) into YYYY-MM-DD in Central Time.
 */
export function normalizeToCentralDateString(dateStr?: string | null): string {
  if (!dateStr) return '';
  
  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // If MM/DD/YYYY... (e.g. 08/18/2026, 02:00 PM)
  const mdyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  
  // Try parsing textual format (e.g. Aug 1st 2026 @ 10:41 am)
  const cleanMonthText = dateStr.replace(/(\d+)(st|nd|rd|th)/i, '$1').replace('@', '');
  const parsed = new Date(cleanMonthText);
  if (!isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: CENTRAL_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(parsed);
  }
  
  return dateStr;
}
export const normalizeToEasternDateString = normalizeToCentralDateString;
