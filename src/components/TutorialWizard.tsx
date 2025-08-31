'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CustomIcon } from '@/components/ui/custom-icon'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface TutorialWizardProps {
  isOpen: boolean
  onClose: () => void
  playerName: string
}

const tutorialSteps = [
  {
    title: "WELCOME TO THE ARENA!",
    description: "Ready to become the ultimate NFL survivor?",
    content: (playerName: string) => (
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <CustomIcon name="football" fallback="🏈" alt="Welcome" size="xl" />
        </div>
        <div>
          <h3 className="text-2xl font-bold fight-text mb-2" style={{color: 'var(--primary)'}}>
            FIGHTER {playerName.toUpperCase()}!
          </h3>
          <p className="text-muted-foreground">
            You&apos;ve just entered the most intense NFL survivor pool on the planet. 
            Let&apos;s get you ready for battle!
          </p>
        </div>
        <div className="bg-primary/20 border border-primary/50 rounded-lg p-4">
          <p className="text-sm">
            <strong className="text-primary">Pro Tip:</strong> Only about 2% of fighters survive 
            the entire NFL season. Think you have what it takes?
          </p>
        </div>
      </div>
    )
  },
  {
    title: "THE SURVIVOR RULES",
    description: "Simple to learn, impossible to master",
    content: () => (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          <Card className="bg-surface/50 border-primary/30">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <CustomIcon name="target" fallback="🎯" alt="Pick" size="md" />
              </div>
              <div>
                <h4 className="font-semibold text-primary mb-1">PICK ONE TEAM</h4>
                <p className="text-sm text-muted-foreground">
                  Every week, choose ONE NFL team you think will WIN their game
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface/50 border-secondary/30">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <CustomIcon name="skull" fallback="💀" alt="Elimination" size="md" />
              </div>
              <div>
                <h4 className="font-semibold text-secondary mb-1">WIN OR DIE</h4>
                <p className="text-sm text-muted-foreground">
                  If your team LOSES or TIES, you&apos;re ELIMINATED. No mercy!
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface/50 border-yellow-500/30">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <CustomIcon name="x-wrong" fallback="❌" alt="No Repeats" size="md" />
              </div>
              <div>
                <h4 className="font-semibold text-yellow-400 mb-1">NO REPEATS</h4>
                <p className="text-sm text-muted-foreground">
                  You can only use each team ONCE per season. Choose wisely!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center bg-primary/10 border border-primary/30 rounded-lg p-4">
          <p className="text-sm">
            <strong className="text-primary">The Goal:</strong> Be the last fighter standing 
            after 18 weeks of NFL action!
          </p>
        </div>
      </div>
    )
  },
  {
    title: "YOUR BATTLE STRATEGY",
    description: "Master these tactics to dominate",
    content: () => (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <Badge className="bg-primary text-primary-foreground">TIP 1</Badge>
            </div>
            <div>
              <h4 className="font-semibold mb-1">SAVE THE BEST FOR LAST</h4>
              <p className="text-sm text-muted-foreground">
                Don&apos;t blow your strongest teams early! Save powerhouses like KC and Buffalo 
                for later weeks when fewer fighters remain.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <Badge className="bg-secondary text-secondary-foreground">TIP 2</Badge>
            </div>
            <div>
              <h4 className="font-semibold mb-1">WATCH THE LINES</h4>
              <p className="text-sm text-muted-foreground">
                We show you betting lines for each game. Big favorites usually win, 
                but upsets happen every week!
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <Badge className="bg-primary text-primary-foreground">TIP 3</Badge>
            </div>
            <div>
              <h4 className="font-semibold mb-1">TIMING IS EVERYTHING</h4>
              <p className="text-sm text-muted-foreground">
                Submit picks before games start! Late submissions aren&apos;t allowed. 
                Thursday games count for the week!
              </p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CustomIcon name="hourglass" fallback="⏰" alt="Warning" size="sm" />
            <span className="font-semibold text-yellow-400">DEADLINE WARNING</span>
          </div>
          <p className="text-sm text-muted-foreground">
            All picks must be submitted before the first game of each week kicks off. 
            Miss the deadline = automatic elimination!
          </p>
        </div>
      </div>
    )
  },
  {
    title: "READY TO FIGHT?",
    description: "Your arena awaits, warrior",
    content: (playerName: string) => (
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <CustomIcon name="trophy" fallback="🏆" alt="Victory" size="xl" />
        </div>
        <div>
          <h3 className="text-2xl font-bold fight-text mb-2" style={{color: 'var(--primary)'}}>
            GOOD LUCK, {playerName.toUpperCase()}!
          </h3>
          <p className="text-muted-foreground mb-4">
            You&apos;re now ready to enter the battlefield. Remember:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="flex flex-col items-center gap-2 p-3 bg-surface/50 rounded-lg">
            <CustomIcon name="heart" fallback="❤️" alt="Lives" size="md" />
            <span className="font-medium">Track Your Lives</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-3 bg-surface/50 rounded-lg">
            <CustomIcon name="target" fallback="🎯" alt="Pick Wisely" size="md" />
            <span className="font-medium">Pick Wisely</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-3 bg-surface/50 rounded-lg">
            <CustomIcon name="fire" fallback="🔥" alt="Stay Active" size="md" />
            <span className="font-medium">Stay Active</span>
          </div>
        </div>

        <div className="bg-primary/20 border border-primary/50 rounded-lg p-4">
          <p className="text-sm">
            <strong className="text-primary">Your Mission:</strong> Join or create a league, 
            make your weekly picks, and survive until you&apos;re the last fighter standing!
          </p>
        </div>
      </div>
    )
  }
]

export function TutorialWizard({ isOpen, onClose, playerName }: TutorialWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onClose()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    onClose()
  }

  const currentStepData = tutorialSteps[currentStep]

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-2xl retro-border bg-background border-2"
        showCloseButton={false}
      >
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Badge className="bg-primary text-primary-foreground">
              TUTORIAL {currentStep + 1} / {tutorialSteps.length}
            </Badge>
          </div>
          <DialogTitle className="text-2xl fight-text" style={{color: 'var(--primary)'}}>
            {currentStepData.title}
          </DialogTitle>
          <DialogDescription className="text-base">
            {currentStepData.description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {currentStepData.content(playerName)}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Skip Tutorial
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Progress Dots */}
            <div className="flex gap-1 mr-4">
              {tutorialSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentStep 
                      ? 'bg-primary' 
                      : index < currentStep 
                        ? 'bg-primary/50' 
                        : 'bg-border'
                  }`}
                />
              ))}
            </div>

            <Button
              onClick={handleNext}
              className="fight-text flex items-center gap-2"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)'
              }}
            >
              {currentStep === tutorialSteps.length - 1 ? (
                <>
                  ENTER BATTLE
                  <CustomIcon name="football" fallback="🏈" alt="Enter" size="sm" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}