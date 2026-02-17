import { useState, useEffect } from 'react'
import DayList from './components/DayList'
import DayPlayer from './components/DayPlayer'
import { MONTHS } from './data/months'

function getLatestDay() {
  const today = new Date()
  const monthNames = {
    january: 0, february: 1, march: 2, april: 3,
    may: 4, june: 5, july: 6, august: 7,
    september: 8, october: 9, november: 10, december: 11,
  }
  for (let i = MONTHS.length - 1; i >= 0; i--) {
    const m = MONTHS[i]
    const mIndex = monthNames[m.key]
    const available = m.days.filter((d) => {
      const date = new Date(today.getFullYear(), mIndex, d.day)
      return date <= today
    })
    if (available.length > 0) {
      return { monthKey: m.key, day: available[available.length - 1] }
    }
  }
  return { monthKey: MONTHS[0].key, day: MONTHS[0].days[0] }
}

const latest = getLatestDay()

export default function App() {
  const [activeMonth, setActiveMonth] = useState(latest.monthKey)
  const [selectedDay, setSelectedDay] = useState(null)
  const [mode, setMode] = useState('video')
  const [listened, setListened] = useState(() => {
    try { return JSON.parse(localStorage.getItem('listened') || '[]') }
    catch { return [] }
  })
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)

  // Capture the PWA install prompt event
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
      setShowInstallBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Save listened list to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('listened', JSON.stringify(listened))
  }, [listened])

  function handleMonthChange(key) {
    setActiveMonth(key)
    setSelectedDay(null)
  }

  function handleSelectDay(day) {
    setSelectedDay(day)
    // Mark as listened when opened
    if (!listened.includes(day.date)) {
      setListened((prev) => [...prev, day.date])
    }
  }

  function handleInstall() {
    if (!installPrompt) return
    installPrompt.prompt()
    installPrompt.userChoice.then(() => {
      setInstallPrompt(null)
      setShowInstallBanner(false)
    })
  }

  const currentMonth = MONTHS.find((m) => m.key === activeMonth)

  return (
    <div className="app">
      {showInstallBanner && (
        <div className="install-banner">
          <span>Shto në ekranin kryesor për qasje të shpejtë!</span>
          <div className="install-banner-actions">
            <button className="install-btn" onClick={handleInstall}>Instalo</button>
            <button className="install-dismiss" onClick={() => setShowInstallBanner(false)}>✕</button>
          </div>
        </div>
      )}

      <header className="app-header">
        <img src="/logo.png" alt="Kisha Dishepujt" className="app-logo" />
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
        <div className="controls-row">
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

          <div className="mode-toggle">
            <button
              className={`mode-btn ${mode === 'video' ? 'mode-btn--active' : ''}`}
              onClick={() => setMode('video')}
            >🎬 Video</button>
            <button
              className={`mode-btn ${mode === 'audio' ? 'mode-btn--active' : ''}`}
              onClick={() => setMode('audio')}
            >🎧 Audio</button>
          </div>
        </div>

        {mode === 'audio' && (
          <p className="audio-mode-notice">Modaliteti audio — ekrani mund të fiket gjatë dëgjimit.</p>
        )}

        <DayList
          days={currentMonth.days}
          selectedDay={selectedDay}
          onSelectDay={handleSelectDay}
          latestDay={activeMonth === latest.monthKey ? latest.day : null}
          listened={listened}
        />
      </main>

      <DayPlayer day={selectedDay} onClose={() => setSelectedDay(null)} mode={mode} />
    </div>
  )
}
