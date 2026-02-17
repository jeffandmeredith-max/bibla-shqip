import { useState } from 'react'
import DayList from './components/DayList'
import DayPlayer from './components/DayPlayer'
import { MONTHS } from './data/months'

// Find the most recent day that has a video (based on today's date)
function getLatestDay() {
  const today = new Date()
  const monthNames = {
    january: 0, february: 1, march: 2, april: 3,
    may: 4, june: 5, july: 6, august: 7,
    september: 8, october: 9, november: 10, december: 11,
  }
  // Walk months in reverse to find the latest available day
  for (let i = MONTHS.length - 1; i >= 0; i--) {
    const m = MONTHS[i]
    const mIndex = monthNames[m.key]
    // Filter days up to today
    const available = m.days.filter((d) => {
      const date = new Date(today.getFullYear(), mIndex, d.day)
      return date <= today
    })
    if (available.length > 0) {
      return { monthKey: m.key, day: available[available.length - 1] }
    }
  }
  // Fallback to very first day
  return { monthKey: MONTHS[0].key, day: MONTHS[0].days[0] }
}

const latest = getLatestDay()

export default function App() {
  const [activeMonth, setActiveMonth] = useState(latest.monthKey)
  const [selectedDay, setSelectedDay] = useState(null)

  const currentMonth = MONTHS.find((m) => m.key === activeMonth)

  function handleMonthChange(key) {
    setActiveMonth(key)
    setSelectedDay(null)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Bibla <span>në Shqip</span></h1>
        <p className="app-subtitle">Plani i Leximit · M'Cheyne</p>
        <p className="app-description">
          Studiojmë së bashku Biblën përmes Kalendarit të autorit Robert Murray M'Cheyne.
          Çdo ditë ndalemi te Fjala e Perëndisë për ta dëgjuar, kuptuar dhe lejuar që ajo
          të formësojë zemrat tona. Le të ecim bashkë në këtë udhëtim të përditshëm
          leximi, lutjeje dhe reflektimi shpirtëror.
        </p>
      </header>

      <main className="app-main">
        <div className="month-tabs">
          {MONTHS.map((m) => (
            <button
              key={m.key}
              className={`month-tab ${activeMonth === m.key ? 'month-tab--active' : ''}`}
              onClick={() => handleMonthChange(m.key)}
            >
              {m.label}
              <span className="month-tab__count">{m.days.length}</span>
            </button>
          ))}
        </div>

        <DayList
          days={currentMonth.days}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          latestDay={activeMonth === latest.monthKey ? latest.day : null}
        />
      </main>

      <DayPlayer day={selectedDay} onClose={() => setSelectedDay(null)} />
    </div>
  )
}
