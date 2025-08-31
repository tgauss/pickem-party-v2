import Image from 'next/image'

interface CustomIconProps {
  name: string
  fallback: string
  alt: string
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const iconMap: Record<string, string> = {
  'heart': 'Life Heart-pickem-part.png',
  'checkmark': 'green checkmark-pickem-part.png',
  'x-wrong': 'x wrong-pickem-part.png',
  'skull': 'Skull Dead-pickem-part.png',
  'trophy': 'Trophy Icon-pickem-part.png',
  'fire': 'fire-pickem-part.png',
  'football': 'Football Icon-pickem-part.png',
  'hourglass': 'Hourglass Waiting-pickem-part.png',
  'coin': 'Coin Paid-pickem-part.png',
  'target': 'target-pickem-part.png',
  'calendar': 'calendar-pickem-part.png',
  'home': 'home team new-pickem-part.png',
  'away': 'away team-pickem-part.png',
  'unicorn': 'unicorn-pickem-part.png'
}

const sizeMap = {
  sm: { height: 20, width: 20 },    // Small inline icons
  md: { height: 30, width: 30 },    // Medium UI elements  
  lg: { height: 50, width: 50 },    // Large prominent icons
  xl: { height: 75, width: 75 }     // Extra large showcase icons
}

export function CustomIcon({ name, fallback, alt, className = '', size = 'md' }: CustomIconProps) {
  const iconFile = iconMap[name]
  const dimensions = sizeMap[size]
  
  if (!iconFile) {
    // If icon doesn't exist, fall back to emoji
    return <span className={className}>{fallback}</span>
  }

  return (
    <span className={`inline-flex items-center justify-center ${className}`}>
      <Image
        src={`/ui-icons/${iconFile}`}
        alt={alt}
        height={dimensions.height}
        width={dimensions.width}
        style={{ 
          height: `${dimensions.height}px`, 
          width: 'auto',
          maxWidth: `${dimensions.width}px`
        }}
        className="pixelated"
        onError={(e) => {
          // If image fails to load, replace with fallback emoji
          const target = e.target as HTMLElement
          if (target.parentElement) {
            target.parentElement.innerHTML = fallback
          }
        }}
      />
    </span>
  )
}