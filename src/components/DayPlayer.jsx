import { useEffect, useRef, useState } from 'react'

export default function DayPlayer({ day, onClose, mode }) {
  const iframeRef = useRef(null)
  const playerRef = useRef(null)
  const audioRef = useRef(null)
  const wakeLockRef = useRef(null)
  const [activeReading, setActiveReading] = useState(0)
  const [apiReady, setApiReady] = useState(false)
  const [speed, setSpeed] = useState(1)

  const SPEEDS = [0.75, 1, 1.25, 1.5, 2]

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

  // Create/recreate YouTube player when in video mode
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

  // Pause whichever player is not active when mode changes
  useEffect(() => {
    if (mode === 'audio' && playerRef.current?.pauseVideo) {
      playerRef.current.pauseVideo()
    }
    if (mode === 'video' && audioRef.current) {
      audioRef.current.pause()
    }
  }, [mode])

  // Apply speed to whichever player is active
  useEffect(() => {
    if (mode === 'audio' && audioRef.current) {
      audioRef.current.playbackRate = speed
    }
    if (mode === 'video' && playerRef.current?.setPlaybackRate) {
      playerRef.current.setPlaybackRate(speed)
    }
  }, [speed, mode])

  if (!day) return null

  const AUDIO_BASE = 'https://cdn.jsdelivr.net/gh/jeffandmeredith-max/bibla-shqip@master/public/audio'
  const audioFile = day.audioFile ? `${AUDIO_BASE}/${day.audioFile}` : null

  function seekTo(index) {
    setActiveReading(index)
    const start = day.readings[index].start
    if (mode === 'audio') {
      if (audioRef.current) {
        audioRef.current.currentTime = start
        audioRef.current.play()
      }
    } else {
      if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
        playerRef.current.seekTo(start, true)
        playerRef.current.playVideo()
      }
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

        <div className="speed-control">
          {SPEEDS.map((s) => (
            <button
              key={s}
              className={`speed-btn ${speed === s ? 'speed-btn--active' : ''}`}
              onClick={() => setSpeed(s)}
            >
              {s}×
            </button>
          ))}
        </div>

        {mode === 'audio' ? (
          <div className="player-audio">
            {audioFile ? (
              <audio ref={audioRef} src={audioFile} controls autoPlay style={{ width: '100%' }} />
            ) : (
              <p className="player-audio-unavailable">Audio nuk është i disponueshëm për këtë ditë.</p>
            )}
          </div>
        ) : (
          <div className="player-embed">
            <div id="yt-player" ref={iframeRef} />
          </div>
        )}
      </div>
    </div>
  )
}
