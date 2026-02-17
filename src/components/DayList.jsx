export default function DayList({ days, selectedDay, onSelectDay }) {
  return (
    <div className="day-grid">
      {days.map((entry) => (
        <button
          key={entry.date}
          className={`day-card ${selectedDay?.date === entry.date ? 'day-card--active' : ''}`}
          onClick={() => onSelectDay(entry)}
        >
          <span className="day-card__date">{entry.date}</span>
          <ul className="day-card__readings">
            {entry.readings.map((r) => (
              <li key={r.title}>{r.title}</li>
            ))}
          </ul>
        </button>
      ))}
    </div>
  )
}
