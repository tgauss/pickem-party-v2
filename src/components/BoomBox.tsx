'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { parseBlob } from 'music-metadata'
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Shuffle, 
  ChevronUp, 
  ChevronDown,
  Music
} from 'lucide-react'

interface Track {
  url: string
  title: string
  artist: string
  cover?: string
  duration?: number
}

interface PlayerState {
  currentTrackIndex: number
  position: number
  volume: number
  isMuted: boolean
  isShuffled: boolean
  isPlaying: boolean
}

export default function BoomBox() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [isMuted, setIsMuted] = useState(false)
  const [isShuffled, setIsShuffled] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  const audioRef = useRef<HTMLAudioElement>(null)
  const timelineRef = useRef<HTMLInputElement>(null)

  // Load tracks from API and parse metadata
  useEffect(() => {
    const loadTracks = async () => {
      try {
        const response = await fetch('/api/music')
        const data = await response.json()
        
        if (data.success && data.files.length > 0) {
          const trackList: Track[] = []
          
          for (const file of data.files) {
            try {
              // Fetch the MP3 file
              const audioResponse = await fetch(file)
              const blob = await audioResponse.blob()
              
              // Parse metadata
              const metadata = await parseBlob(blob)
              
              // Extract cover art
              let cover: string | undefined
              if (metadata.common.picture && metadata.common.picture.length > 0) {
                const picture = metadata.common.picture[0]
                const uint8Array = new Uint8Array(picture.data)
                const blob = new Blob([uint8Array], { type: picture.format })
                cover = URL.createObjectURL(blob)
              }
              
              trackList.push({
                url: file,
                title: metadata.common.title || file.split('/').pop()?.replace('.mp3', '') || 'Unknown',
                artist: metadata.common.artist || 'Unknown Artist',
                cover,
                duration: metadata.format.duration
              })
            } catch (err) {
              console.warn('Failed to parse metadata for:', file, err)
              // Fallback track info
              trackList.push({
                url: file,
                title: file.split('/').pop()?.replace('.mp3', '') || 'Unknown',
                artist: 'Unknown Artist'
              })
            }
          }
          
          setTracks(trackList)
        }
      } catch (error) {
        console.error('Failed to load tracks:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadTracks()
  }, [])

  // Load saved state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('boombox-state')
    if (savedState) {
      try {
        const state: PlayerState = JSON.parse(savedState)
        setCurrentTrackIndex(state.currentTrackIndex || 0)
        setVolume(state.volume || 0.7)
        setIsMuted(state.isMuted || false)
        setIsShuffled(state.isShuffled || false)
        // Don't restore position and playing state for better UX
      } catch (err) {
        console.warn('Failed to load saved state:', err)
      }
    }
  }, [])

  // Save state to localStorage
  const saveState = useCallback(() => {
    const state: PlayerState = {
      currentTrackIndex,
      position: currentTime,
      volume,
      isMuted,
      isShuffled,
      isPlaying
    }
    localStorage.setItem('boombox-state', JSON.stringify(state))
  }, [currentTrackIndex, currentTime, volume, isMuted, isShuffled, isPlaying])

  useEffect(() => {
    saveState()
  }, [saveState])

  const handleNext = useCallback(() => {
    if (tracks.length === 0) return
    
    let nextIndex
    if (isShuffled) {
      nextIndex = Math.floor(Math.random() * tracks.length)
    } else {
      nextIndex = (currentTrackIndex + 1) % tracks.length
    }
    
    setCurrentTrackIndex(nextIndex)
    setCurrentTime(0)
  }, [tracks.length, isShuffled, currentTrackIndex])

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleDurationChange = () => setDuration(audio.duration)
    const handleEnded = () => handleNext()
    const handleLoadStart = () => setIsLoading(true)
    const handleCanPlay = () => setIsLoading(false)

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('durationchange', handleDurationChange)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('canplay', handleCanPlay)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('durationchange', handleDurationChange)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('canplay', handleCanPlay)
    }
  }, [handleNext])

  // Update audio volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  const handlePlay = async () => {
    if (!audioRef.current || tracks.length === 0) return
    
    try {
      if (isPlaying) {
        await audioRef.current.pause()
        setIsPlaying(false)
      } else {
        await audioRef.current.play()
        setIsPlaying(true)
      }
    } catch (err) {
      console.error('Playback failed:', err)
    }
  }

  const handlePrevious = () => {
    if (tracks.length === 0) return
    
    let prevIndex
    if (currentTime > 3) {
      // If more than 3 seconds in, restart current track
      setCurrentTime(0)
      if (audioRef.current) {
        audioRef.current.currentTime = 0
      }
      return
    }
    
    if (isShuffled) {
      prevIndex = Math.floor(Math.random() * tracks.length)
    } else {
      prevIndex = currentTrackIndex === 0 ? tracks.length - 1 : currentTrackIndex - 1
    }
    
    setCurrentTrackIndex(prevIndex)
    setCurrentTime(0)
  }

  const handleTimelineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    setCurrentTime(newTime)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
    }
  }

  const formatTime = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const currentTrack = tracks[currentTrackIndex]

  if (isLoading && tracks.length === 0) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-gray-800 border-2 border-gray-600 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-400 text-sm font-mono">
            <div className="animate-spin w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full"></div>
            Loading tracks...
          </div>
        </div>
      </div>
    )
  }

  if (tracks.length === 0) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-gray-800 border-2 border-gray-600 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-400 text-sm font-mono">
            <Music className="w-4 h-4" />
            No MP3s found in /public/music
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Audio Element */}
      <audio
        ref={audioRef}
        src={currentTrack?.url}
        preload="metadata"
      />
      
      <div className={`bg-gradient-to-b from-gray-700 to-gray-900 border-4 border-gray-600 rounded-lg shadow-2xl transition-all duration-300 ${
        isExpanded ? 'w-80 h-96' : 'w-64 h-20'
      }`}>
        {/* Mini Player */}
        <div className="p-3">
          <div className="flex items-center gap-2">
            {/* Cover Art / Icon */}
            <div className="w-12 h-12 bg-gray-600 border border-gray-500 rounded flex-shrink-0 overflow-hidden">
              {currentTrack?.cover ? (
                <img 
                  src={currentTrack.cover} 
                  alt="Cover" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-6 h-6 text-gray-400" />
                </div>
              )}
            </div>
            
            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <div className="text-green-400 text-xs font-mono truncate">
                {currentTrack?.title || 'No Track'}
              </div>
              <div className="text-gray-400 text-xs font-mono truncate">
                {currentTrack?.artist || 'Unknown'}
              </div>
            </div>
            
            {/* Mini Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevious}
                className="w-6 h-6 bg-gray-600 hover:bg-gray-500 border border-gray-500 rounded flex items-center justify-center text-green-400"
              >
                <SkipBack className="w-3 h-3" />
              </button>
              
              <button
                onClick={handlePlay}
                className="w-8 h-8 bg-green-600 hover:bg-green-500 border border-green-500 rounded flex items-center justify-center text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" />
                )}
              </button>
              
              <button
                onClick={handleNext}
                className="w-6 h-6 bg-gray-600 hover:bg-gray-500 border border-gray-500 rounded flex items-center justify-center text-green-400"
              >
                <SkipForward className="w-3 h-3" />
              </button>
              
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-6 h-6 bg-gray-600 hover:bg-gray-500 border border-gray-500 rounded flex items-center justify-center text-green-400 ml-1"
              >
                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Player */}
        {isExpanded && (
          <div className="px-3 pb-3">
            {/* Timeline */}
            <div className="mb-3">
              <input
                ref={timelineRef}
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleTimelineChange}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none slider"
                style={{
                  background: `linear-gradient(to right, #10b981 0%, #10b981 ${(currentTime / (duration || 1)) * 100}%, #4b5563 ${(currentTime / (duration || 1)) * 100}%, #4b5563 100%)`
                }}
              />
              <div className="flex justify-between text-xs text-gray-400 font-mono mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setIsShuffled(!isShuffled)}
                className={`w-8 h-8 border border-gray-500 rounded flex items-center justify-center ${
                  isShuffled ? 'bg-green-600 text-white' : 'bg-gray-600 hover:bg-gray-500 text-green-400'
                }`}
              >
                <Shuffle className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="w-8 h-8 bg-gray-600 hover:bg-gray-500 border border-gray-500 rounded flex items-center justify-center text-green-400"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-20 h-1 bg-gray-600 rounded-lg appearance-none slider"
                  style={{
                    background: `linear-gradient(to right, #10b981 0%, #10b981 ${volume * 100}%, #4b5563 ${volume * 100}%, #4b5563 100%)`
                  }}
                />
              </div>
            </div>

            {/* Playlist */}
            <div className="bg-black border border-gray-600 rounded p-2 h-48 overflow-y-auto">
              <div className="text-green-400 text-xs font-mono mb-2">PLAYLIST ({tracks.length})</div>
              {tracks.map((track, index) => (
                <div
                  key={index}
                  onClick={() => setCurrentTrackIndex(index)}
                  className={`flex items-center gap-2 p-1 rounded cursor-pointer hover:bg-gray-800 ${
                    index === currentTrackIndex ? 'bg-gray-700' : ''
                  }`}
                >
                  <div className="w-6 h-6 bg-gray-600 rounded flex-shrink-0 overflow-hidden">
                    {track.cover ? (
                      <img src={track.cover} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-3 h-3 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-mono truncate ${
                      index === currentTrackIndex ? 'text-green-400' : 'text-gray-300'
                    }`}>
                      {track.title}
                    </div>
                    <div className="text-xs text-gray-500 font-mono truncate">
                      {track.artist}
                    </div>
                  </div>
                  {index === currentTrackIndex && isPlaying && (
                    <div className="flex gap-px">
                      <div className="w-1 bg-green-400 animate-pulse" style={{ height: '8px' }}></div>
                      <div className="w-1 bg-green-400 animate-pulse" style={{ height: '12px', animationDelay: '0.1s' }}></div>
                      <div className="w-1 bg-green-400 animate-pulse" style={{ height: '6px', animationDelay: '0.2s' }}></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: #10b981;
          border: 2px solid #065f46;
          border-radius: 50%;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #10b981;
          border: 2px solid #065f46;
          border-radius: 50%;
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}