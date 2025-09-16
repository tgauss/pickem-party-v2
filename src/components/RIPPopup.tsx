'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CustomIcon } from '@/components/ui/custom-icon'
import Image from 'next/image'
import { Play, Pause, Music } from 'lucide-react'

interface User {
  id: string
  username: string
  display_name: string
}

interface Member {
  user: User
  lives_remaining: number
  is_eliminated: boolean
  eliminated_week?: number
}

interface RIPPopupProps {
  eliminatedThisWeek: Member[]
  currentWeek: number
  onClose: () => void
}

export function RIPPopup({ eliminatedThisWeek, currentWeek, onClose }: RIPPopupProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlayingRecap, setIsPlayingRecap] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    // Only show popup if there are players eliminated this week
    if (eliminatedThisWeek.length > 0) {
      // Check localStorage to see if we've already shown this week's eliminations
      const shownKey = `rip_shown_week_${currentWeek}`
      const alreadyShown = localStorage.getItem(shownKey)

      if (!alreadyShown) {
        setIsOpen(true)
        // Mark as shown so it doesn't popup again this week
        localStorage.setItem(shownKey, 'true')
      }
    }
  }, [eliminatedThisWeek, currentWeek])

  const handleClose = () => {
    // Stop audio if playing
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlayingRecap(false)
    }
    setIsOpen(false)
    onClose()
  }

  const toggleRecapAudio = () => {
    if (audioRef.current) {
      if (isPlayingRecap) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlayingRecap(!isPlayingRecap)
    }
  }

  const handleNext = () => {
    if (currentIndex < eliminatedThisWeek.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      handleClose()
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  if (!isOpen || eliminatedThisWeek.length === 0) {
    return null
  }

  const currentPlayer = eliminatedThisWeek[currentIndex]
  const isLastPlayer = currentIndex === eliminatedThisWeek.length - 1

  const getRandomRIPMessage = (displayName: string) => {
    const messages = [
      `${displayName} has fallen in battle...`,
      `The arena claims another warrior: ${displayName}`,
      `${displayName}'s journey ends here...`,
      `Rest in peace, brave ${displayName}`,
      `${displayName} fought valiantly but was eliminated`,
      `The survivor pool has claimed ${displayName}`,
      `${displayName}'s picks have run out of luck...`,
    ]
    return messages[Math.floor(Math.random() * messages.length)]
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md bg-gradient-to-b from-slate-800 to-slate-900 border-red-600 text-white">
        <DialogHeader>
          <DialogTitle className="text-center text-red-400 flex items-center justify-center gap-2">
            <CustomIcon name="skull" fallback="💀" alt="RIP" size="lg" />
            R.I.P.
            <CustomIcon name="skull" fallback="💀" alt="RIP" size="lg" />
          </DialogTitle>
        </DialogHeader>

        {/* Hidden audio element for Week 2 recap */}
        <audio
          ref={audioRef}
          src="/music/GRIDIRON GAMBLE - Week 2 wRap.mp3"
          onEnded={() => setIsPlayingRecap(false)}
        />

        <div className="text-center space-y-4">
          {/* Gravestone */}
          <div className="relative mx-auto w-32 h-40">
            <Image
              src="/Kevyn-Gravestone-Small.png"
              alt={`${currentPlayer.user.display_name} eliminated`}
              width={128}
              height={160}
              className="mx-auto filter drop-shadow-lg"
            />
          </div>

          {/* Elimination message */}
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-red-300">
              {getRandomRIPMessage(currentPlayer.user.display_name || currentPlayer.user.username)}
            </h3>
            <p className="text-slate-300 text-sm">
              Eliminated in Week {currentPlayer.eliminated_week}
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
              <CustomIcon name="skull" fallback="⚰️" alt="Coffin" size="sm" />
              Their survivor journey has come to an end
              <CustomIcon name="skull" fallback="⚰️" alt="Coffin" size="sm" />
            </div>
          </div>

          {/* Week 2 Recap Audio Button */}
          {currentPlayer.eliminated_week === 2 && (
            <div className="pt-2">
              <Button
                onClick={toggleRecapAudio}
                variant="outline"
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-purple-500"
              >
                <Music className="w-4 h-4 mr-2" />
                {isPlayingRecap ? (
                  <>
                    <Pause className="w-4 h-4 mr-1" />
                    Pause Week 2 wRap
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-1" />
                    Listen to Week 2 wRap 🎵
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="text-slate-300 border-slate-600"
            >
              Previous
            </Button>

            <div className="text-xs text-slate-400">
              {currentIndex + 1} of {eliminatedThisWeek.length}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              className="text-slate-300 border-slate-600"
            >
              {isLastPlayer ? 'Continue' : 'Next'}
            </Button>
          </div>

          {/* Close button */}
          <div className="pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-slate-400 hover:text-white"
            >
              Pay Respects & Continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}