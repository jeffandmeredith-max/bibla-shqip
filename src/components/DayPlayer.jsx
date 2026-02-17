import { useEffect, useRef, useState } from 'react'

export default function DayPlayer({ day, onClose }) {
  const iframeRef = useRef(null)
  const playerRef = useRef(null)
  const audioRef = useRef(null)
  const wakeLockRef = useRef(null)
  const [activeReading, setActiveReading] = useState(0)
  const [apiReady, setApiReady] = useState(false)
  const [mode, setMode] = useState('video') // 'video' or 'audio'

  // Acquire wake lock when player opens, release when it closes
  useEffect(() => {
    if (!day) return
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then((lock) => {
        wakeLockRef.current = lock
      }).catch(() => {})
    }
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release()
        wakeLockRef.current = null
      }
    }
  }, [day])

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

  // Create/recreate YouTube player when day changes, API ready, or switching to video mode
  useEffect(() => {
    if (!day || !apiReady || mode !== 'video') return

    setActiveReading(0)

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
  }, [day, apiReady, mode])

  // When switching to audio mode, pause the YouTube player
  useEffect(() => {
    if (mode === 'audio' && playerRef.current?.pauseVideo) {
      playerRef.current.pauseVideo()
    }
    if (mode === 'video' && audioRef.current) {
      audioRef.current.pause()
    }
  }, [mode])

  if (!day) return null

  const audioFile = day.audioFile ? `/audio/${day.audioFile}` : null

  function seekTo(index) {
    setActiveReading(index)
    const start = day.readings[index].start
    if (mode === 'video') {
      if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
        playerRef.current.seekTo(start, true)
        playerRef.current.playVideo()
      }
    } else {
      if (audioRef.current) {
        audioRef.current.currentTime = start
        audioRef.current.play()
      }
    }
  }

  return (
    <div className="player-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="player-panel">
        <div className="player-header">
          <h2 className="player-date">{day.date}</h2>
          <div className="player-header-right">
            {audioFile && (
              <div className="mode-toggle">
                <button
                  className={`mode-btn ${mode === 'video' ? 'mode-btn--active' : ''}`}
                  onClick={() => setMode('video')}
                >Video</button>
                <button
                  className={`mode-btn ${mode === 'audio' ? 'mode-btn--active' : ''}`}
                  onClick={() => setMode('audio')}
                >Audio</button>
              </div>
            )}
            <button className="player-close" onClick={onClose} aria-label="Mbyll">✕</button>
          </div>
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

        {mode === 'video' ? (
          <div className="player-embed">
            <div id="yt-player" ref={iframeRef} />
          </div>
        ) : (
          <div className="player-audio">
            <p className="player-audio-hint">Ekrani mund të fiket — audio vazhdon.</p>
            <audio
              ref={audioRef}
              src={audioFile}
              controls
              autoPlay
              style={{ width: '100%' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
