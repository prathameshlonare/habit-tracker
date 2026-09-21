import React, { useState } from 'react';

// Per-habit identity: keyword match on the habit name decides the icon tile.
// One 2px-stroke SVG family (matches the nav icons), tonal tile per bucket.
// No emoji anywhere in this view - tiles carry the identity instead.
const IDENTITY_BUCKETS = [
  { keys: ['water', 'drink', 'hydrat'], icon: 'drop', bg: '#e0f2fe', fg: '#0284c7' },
  { keys: ['read', 'book', 'pages', 'study', 'learn', 'course'], icon: 'book', bg: '#fef3c7', fg: '#b45309' },
  { keys: ['run', 'exercis', 'workout', 'gym', 'walk', 'yoga', 'sport', 'swim', 'cycl', 'stretch', 'push'], icon: 'pulse', bg: '#dcfce7', fg: '#15803d' },
  { keys: ['meditat', 'mindful', 'breath', 'calm', 'pray'], icon: 'wind', bg: '#ede9fe', fg: '#6d28d9' },
  { keys: ['sleep', 'bed', 'wake', 'nap'], icon: 'moon', bg: '#e0e7ff', fg: '#4338ca' },
  { keys: ['writ', 'journal', 'code', 'blog', 'draw', 'paint', 'practic'], icon: 'pen', bg: '#ffedd5', fg: '#c2410c' },
];

const DEFAULT_IDENTITY = { icon: 'ring', bg: '#f1f5f9', fg: '#475569' };

function getHabitIdentity(name = '') {
  const lower = name.toLowerCase();
  const hit = IDENTITY_BUCKETS.find((b) => b.keys.some((k) => lower.includes(k)));
  return hit || DEFAULT_IDENTITY;
}

function HabitGlyph({ icon }) {
  const p = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  switch (icon) {
    case 'drop':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" {...p}>
          <path d="M12 2.7l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>
      );
    case 'book':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" {...p}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      );
    case 'pulse':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" {...p}>
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );
    case 'wind':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" {...p}>
          <path d="M9.59 4.59A2 2 0 1 1 11 8H2" />
          <path d="M12.59 19.41A2 2 0 1 0 14 16H2" />
          <path d="M17.73 7.73A2.5 2.5 0 1 1 19.5 12H2" />
        </svg>
      );
    case 'moon':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" {...p}>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      );
    case 'pen':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" {...p}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
        </svg>
      );
    default:
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" {...p}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}

// Starter list, shown only when the user has zero habits.
const STARTERS = [
  { name: 'Drink 2L water', icon: 'drop', bg: '#e0f2fe', fg: '#0284c7' },
  { name: 'Read 20 pages', icon: 'book', bg: '#fef3c7', fg: '#b45309' },
  { name: 'Move for 30 minutes', icon: 'pulse', bg: '#dcfce7', fg: '#15803d' },
  { name: 'Sit quietly for 10 minutes', icon: 'wind', bg: '#ede9fe', fg: '#6d28d9' },
  { name: 'Lights out by 11', icon: 'moon', bg: '#e0e7ff', fg: '#4338ca' },
];

function ProgressRing({ percent }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" role="img" aria-label={`${percent}% done`}>
      <circle cx="26" cy="26" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
      <circle
        cx="26"
        cy="26"
        r={r}
        fill="none"
        stroke="#4f46e5"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (c * percent) / 100}
        transform="rotate(-90 26 26)"
        style={{ transition: 'stroke-dashoffset 300ms ease' }}
      />
    </svg>
  );
}

export default function MobileDailyView({ habits, onToggle, onEdit, onAdd }) {
  const tap = (ms = 8) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(ms);
    }
  };
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formatDateKey = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayKey = formatDateKey(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const selectedDateKey = formatDateKey(selectedDate);
  const isSelectedToday = selectedDateKey === todayKey;

  const getWeekDays = () => {
    const days = [];
    const ref = new Date(selectedDate);
    const dayOfWeek = ref.getDay();
    const distToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(ref);
    monday.setDate(ref.getDate() + distToMon);
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      d.setHours(0, 0, 0, 0);
      days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDays();

  const selectedDateLabel = selectedDate.toLocaleDateString('default', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const totalHabits = habits.length;
  const completedCount = habits.filter((h) => h.logs && h.logs[selectedDateKey]).length;
  const completionPercent = totalHabits > 0 ? Math.round((completedCount / totalHabits) * 100) : 0;
  const headline =
    totalHabits === 0
      ? 'Begin'
      : completedCount === totalHabits
        ? 'All done for today'
        : `${completedCount} of ${totalHabits} done`;

  const getStreak = (habit) => {
    if (!habit.logs || typeof habit.logs !== 'object') return 0;
    let streak = 0;
    const check = new Date(today);
    if (!habit.logs[formatDateKey(check)]) {
      check.setDate(check.getDate() - 1);
    }
    while (habit.logs[formatDateKey(check)]) {
      streak++;
      check.setDate(check.getDate() - 1);
    }
    return streak;
  };

  const getLast5Days = () => {
    const days = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push({ key: formatDateKey(d) });
    }
    return days;
  };

  const last5Days = getLast5Days();

  return (
    <div className="mobile-daily-view">
      <div className="daily-head">
        <div className="daily-head-text">
          <span className="daily-eyebrow">{selectedDateLabel}</span>
          <h1 className="daily-title">{headline}</h1>
        </div>
        {totalHabits > 0 ? (
          <ProgressRing percent={completionPercent} />
        ) : (
          !isSelectedToday && (
            <button type="button" className="btn-jump-today" onClick={() => { tap(); setSelectedDate(new Date(today)); }}>
              Today
            </button>
          )
        )}
      </div>
      {totalHabits > 0 && !isSelectedToday && (
        <button type="button" className="btn-jump-today" onClick={() => { tap(); setSelectedDate(new Date(today)); }}>
          Back to today
        </button>
      )}

      <div
        className="daily-week"
        role="radiogroup"
        aria-label="Week"
        onKeyDown={(e) => {
          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
          e.preventDefault();
          const dir = e.key === 'ArrowRight' ? 1 : -1;
          const idx = weekDays.findIndex((d) => formatDateKey(d) === selectedDateKey);
          const next = weekDays[(idx + dir + weekDays.length) % weekDays.length];
          setSelectedDate(next);
          requestAnimationFrame(() => {
            const el = document.querySelector(`[data-day-key="${formatDateKey(next)}"]`);
            if (el) el.focus();
          });
        }}
      >
        {weekDays.map((d) => {
          const key = formatDateKey(d);
          const isSelected = key === selectedDateKey;
          const isTodayItem = key === todayKey;
          const isDoneAll = totalHabits > 0 && habits.every((h) => h.logs && h.logs[key]);
          return (
            <button
              key={key}
              type="button"
              data-day-key={key}
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              aria-label={d.toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric' })}
              className={`day-pill${isSelected ? ' active' : ''}${isTodayItem ? ' today' : ''}`}
              onClick={() => { tap(); setSelectedDate(d); }}
            >
              <span className="day-name">{d.toLocaleDateString('default', { weekday: 'narrow' })}</span>
              <span className="day-num">{d.getDate()}</span>
              <span className={`day-dot${isDoneAll ? ' done' : ''}`} />
            </button>
          );
        })}
      </div>

      {habits.length === 0 ? (
        <div className="daily-empty">
          <h2 className="daily-empty-title">Start your first habit</h2>
          <p>Pick one below to begin. You can edit or remove it later.</p>
          <ul className="starter-list">
            {STARTERS.map((s) => (
              <li key={s.name}>
                <button type="button" className="starter-row" onClick={() => { tap(12); onAdd && onAdd(s.name); }}>
                  <span className="habit-tile" style={{ backgroundColor: s.bg, color: s.fg }}>
                    <HabitGlyph icon={s.icon} />
                  </span>
                  <span className="starter-name">{s.name}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ul className="daily-list">
          {habits.map((habit) => {
            const isCompleted = !!(habit.logs && habit.logs[selectedDateKey]);
            const streak = getStreak(habit);
            const identity = getHabitIdentity(habit.name);
            return (
              <li key={habit.id} className={`daily-row${isCompleted ? ' done' : ''}`}>
                <span className="habit-tile" style={{ backgroundColor: identity.bg, color: identity.fg }} aria-hidden="true">
                  <HabitGlyph icon={identity.icon} />
                </span>
                <button type="button" className="row-main" onClick={() => onEdit && onEdit(habit)} aria-label={`Edit ${habit.name}`}>
                  <span className="row-name">{habit.name}</span>
                  <span className="row-sub">
                    <span className="sub-dots" aria-hidden="true">
                      {last5Days.map((day) => (
                        <span key={day.key} className={`mini-dot${habit.logs && habit.logs[day.key] ? ' on' : ''}`} />
                      ))}
                    </span>
                    {streak > 0 && (
                      <span className="sub-streak">
                        {streak}-{streak === 1 ? 'day' : 'days'} in a row
                      </span>
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  className={`row-check${isCompleted ? ' on' : ''}`}
                  onClick={() => onToggle(habit.id, selectedDateKey)}
                  aria-pressed={isCompleted}
                  aria-label={isCompleted ? `Mark ${habit.name} not done` : `Mark ${habit.name} done`}
                >
                  {isCompleted && (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
