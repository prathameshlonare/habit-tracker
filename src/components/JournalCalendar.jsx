import React, { useMemo } from 'react';
import { DayPicker } from '@daypicker/react';
import '@daypicker/react/style.css';
import { Link, useNavigate } from 'react-router-dom';

// Journal month grid built on DayPicker. Styling lives in App.css under
// `.journal-cal` (tokens, mood dots, today ring). Past + today cells are
// Links to the entry page; future days are disabled buttons.
export default function JournalCalendar({ journalEntries, month, onMonthChange }) {
  const navigate = useNavigate();
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const goToDay = (date) => {
    if (!date) return;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    navigate(`/journal/${y}-${m}-${d}`);
  };

  const entryDates = useMemo(
    () =>
      Object.keys(journalEntries).map((k) => {
        const [y, m, d] = k.split('-').map(Number);
        return new Date(y, m - 1, d);
      }),
    [journalEntries]
  );

  function EntryDayButton(props) {
    // onClick is the library's selection handler; the Link below owns
    // navigation instead, so it stays detached to avoid double handling.
    const { day, modifiers, disabled, onClick, ...rest } = props;
    const key = day.isoDate; // yyyy-MM-dd, matches journal date keys
    const entry = journalEntries[key];
    const cls = `cal-day${modifiers.today ? ' is-today' : ''}${entry ? ' has-entry' : ''}`;
    const num = <span className="cal-num">{day.date.getDate()}</span>;
    const mood = entry && entry.mood ? <span className="cal-mood">{entry.mood}</span> : null;

    if (disabled || modifiers.disabled) {
      return (
        <button {...rest} type="button" disabled className={cls} tabIndex={-1}>
          {num}
          {mood}
        </button>
      );
    }
    return (
      <Link {...rest} to={`/journal/${key}`} className={cls}>
        {num}
        {mood}
      </Link>
    );
  }

  return (
    <div className="journal-cal">
      <DayPicker
        month={month}
        onMonthChange={onMonthChange}
        // mode="single" makes days render as interactive buttons (which the
        // custom DayButton above turns into entry Links). Selection itself is
        // unused; tapping a day navigates to it.
        mode="single"
        selected={undefined}
        onSelect={goToDay}
        weekStartsOn={1}
        fixedWeeks
        hideNavigation
        disabled={{ after: today }}
        modifiers={{ hasEntry: entryDates }}
        modifiersClassNames={{ hasEntry: 'cal-has-entry' }}
        components={{ DayButton: EntryDayButton }}
      />
    </div>
  );
}
