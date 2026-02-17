import { useEffect, useRef, useState } from 'react'

export default function DayPlayer({ day, onClose }) {
  const iframeRef = useRef(null)
  const playerRef = useRef(null)
  const [activeReading, setActiveReading] = useState(0)
  const [apiReady, setApiReady] = useState(false)

  // Load YouTube IFrame API once
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setApiReady(true)
      return
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
    window.onYouTubeIframeAPIReady = () => setApiReady(true)
  }, [])

  // Create/recreate player when day changes or API becomes ready
  useEffect(() => {
    if (!day || !apiReady) return

    setActiveReading(0)

    // Destroy previous player instance if it exists
    if (playerRef.current) {
      playerRef.current.destroy()
      playerRef.current = null
    }

    playerRef.current = new window.YT.Player('yt-player', {
      videoId: day.videoId,
      playerVars: {
        autoplay: 1,
        start: day.readings[0].start,
        rel: 0,
      },
    })

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }
    }
  }, [day, apiReady])

  if (!day) return null

  function seekTo(index) {
    setActiveReading(index)
    const start = day.readings[index].start
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(start, true)
      playerRef.current.playVideo()
    }
  }

  return (
    <div className="player-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="player-panel">
        <div className="player-header">
          <h2 className="player-date">{day.date}</h2>
          <button className="player-close" onClick={onClose} aria-label="Mbyll">✕</button>
        </div>

        <div className="player-readings">
          {day.readings.map((r, i) => (
            <button
              key={r.title}
              className={`reading-btn ${activeReading === i ? 'reading-btn--active' : ''}`}
              onClick={() => seekTo(i)}
            >
              {r.title}
            </button>
          ))}
        </div>

        <div className="player-embed">
          <div id="yt-player" ref={iframeRef} />
        </div>
      </div>
    </div>
  )
}
