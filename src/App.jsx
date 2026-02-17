import { useState } from 'react'
import DayList from './components/DayList'
import DayPlayer from './components/DayPlayer'
import { MONTHS } from './data/months'

export default function App() {
  const [activeMonth, setActiveMonth] = useState(MONTHS[0].key)
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
        />
      </main>

      <DayPlayer day={selectedDay} onClose={() => setSelectedDay(null)} />
    </div>
  )
}
