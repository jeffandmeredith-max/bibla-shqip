import { useRef } from 'react'

export default function DayList({ days, selectedDay, onSelectDay, latestDay, listened }) {
  const latestRef = useRef(null)

  // For the current month, show latest day first (reversed). Otherwise chronological.
  const orderedDays = latestDay
    ? [...days].reverse()
    : days

  return (
    <div className="day-grid">
      {orderedDays.map((entry) => {
        const isLatest = latestDay?.date === entry.date
        const isSelected = selectedDay?.date === entry.date
        const isDone = listened?.includes(entry.date)
        return (
          <button
            key={entry.date}
            ref={isLatest ? latestRef : null}
            className={`day-card ${isSelected ? 'day-card--active' : ''} ${isLatest ? 'day-card--latest' : ''} ${isDone ? 'day-card--done' : ''}`}
            onClick={() => onSelectDay(entry)}
          >
            <div className="day-card__top">
              {isLatest && <span className="day-card__badge">Më e fundit</span>}
              {isDone && <span className="day-card__check">✓</span>}
            </div>
            <span className="day-card__date">{entry.date}</span>
            <ul className="day-card__readings">
              {entry.readings.map((r) => (
                <li key={r.title}>{r.title}</li>
              ))}
            </ul>
          </button>
        )
      })}
    </div>
  )
}
