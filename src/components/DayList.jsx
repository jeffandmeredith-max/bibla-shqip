import { useEffect, useRef } from 'react'

export default function DayList({ days, selectedDay, onSelectDay, latestDay }) {
  const latestRef = useRef(null)

  // Scroll the latest day into view when the component mounts or month changes
  useEffect(() => {
    if (latestRef.current) {
      latestRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [days])

  return (
    <div className="day-grid">
      {days.map((entry) => {
        const isLatest = latestDay?.date === entry.date
        const isSelected = selectedDay?.date === entry.date
        return (
          <button
            key={entry.date}
            ref={isLatest ? latestRef : null}
            className={`day-card ${isSelected ? 'day-card--active' : ''} ${isLatest ? 'day-card--latest' : ''}`}
            onClick={() => onSelectDay(entry)}
          >
            {isLatest && <span className="day-card__badge">Sot</span>}
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
