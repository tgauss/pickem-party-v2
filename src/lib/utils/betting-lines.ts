interface Team {
  key: string
  city: string
  name: string
}

interface BettingLine {
  spread: number
  overUnder?: number
  homeMoneyLine?: number
  awayMoneyLine?: number
}

export function formatSpreadToNaturalLanguage(
  homeTeam: Team, 
  awayTeam: Team, 
  line: BettingLine
): string {
  const spread = line.spread
  
  if (Math.abs(spread) < 0.5) {
    return `${homeTeam.key} and ${awayTeam.key} are evenly matched (Pick'em)`
  }
  
  if (spread < 0) {
    // Home team is favored
    const points = Math.abs(spread)
    return `${homeTeam.key} is favored to win by ${points} point${points !== 1 ? 's' : ''} over ${awayTeam.key}`
  } else {
    // Away team is favored
    const points = spread
    return `${awayTeam.key} is favored to win by ${points} point${points !== 1 ? 's' : ''} over ${homeTeam.key}`
  }
}

export function formatOverUnderToNaturalLanguage(line: BettingLine): string {
  if (!line.overUnder) {
    return `Total points info unavailable`
  }
  return `Total points expected: ${line.overUnder}`
}

export function formatMoneyLineToNaturalLanguage(
  homeTeam: Team,
  awayTeam: Team, 
  line: BettingLine
): string {
  const homeML = line.homeMoneyLine
  const awayML = line.awayMoneyLine
  
  if (!homeML || !awayML) {
    return `Money line betting info unavailable`
  }
  
  if (homeML < 0 && awayML > 0) {
    return `${homeTeam.key} is the betting favorite`
  } else if (awayML < 0 && homeML > 0) {
    return `${awayTeam.key} is the betting favorite`
  }
  
  return `Even money line betting`
}

export function getSpreadConfidenceIndicator(spread: number): {
  level: 'low' | 'medium' | 'high'
  description: string
  color: string
} {
  const absSpread = Math.abs(spread)
  
  if (absSpread <= 1) {
    return {
      level: 'low',
      description: 'Very close game',
      color: 'text-orange-500'
    }
  } else if (absSpread <= 3.5) {
    return {
      level: 'medium', 
      description: 'Slight favorite',
      color: 'text-yellow-500'
    }
  } else if (absSpread <= 7) {
    return {
      level: 'medium',
      description: 'Clear favorite',
      color: 'text-blue-500'
    }
  } else {
    return {
      level: 'high',
      description: 'Heavy favorite',
      color: 'text-green-500'
    }
  }
}