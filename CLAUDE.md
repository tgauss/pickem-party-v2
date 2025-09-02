# Claude Development Guidelines
# Pickem Party v2

**Last Updated**: September 1, 2025
**Version**: 2.0.0

## Project Context

You are working on **Pickem Party v2**, a complete rebuild of an NFL Survivor Pool platform. This is a mobile-first web application built with Next.js 15.5.2, Supabase, and Tailwind CSS with shadcn/ui components.

## Recent Changes (September 2025)
- Added phone number field to user registration
- Implemented commissioner-controlled pick revelation
- Enhanced mobile form optimization
- Fixed invite page calculations (buy_in → buy_in_amount)
- Added comprehensive admin dashboard features

## Critical Rules (NEVER VIOLATE THESE)

### 1. Authentication
- **ONLY use Supabase Auth** - never create custom session management
- **NO custom cookies** - let Supabase handle all auth state
- **NO middleware auth checks** - use Supabase RLS and server components
- Always use `createClient()` from `@/lib/supabase/client` for client-side
- Always use `createServerClient()` from `@/lib/supabase/server` for server-side

### 2. Data Access
- **Database**: Supabase PostgreSQL ONLY (no local adapters, no mock data)
- **RLS (Row Level Security)**: All tables must have proper RLS policies
- **Server Components**: Prefer server components for initial data fetching
- **Client Components**: Only when interactivity is required

### 3. Mobile-First Design
- **Always design for mobile first** (320px minimum width)
- **Touch targets minimum 44px**
- **Use shadcn/ui components** exclusively for UI elements
- **Pickem Party color palette** (see brand guidelines below)

### 4. TypeScript
- **Strict TypeScript** - no `any` types
- **Zod schemas** for all form validation and API validation
- **Database types** generated from Supabase CLI

## Brand Guidelines

### Colors (CSS Custom Properties)
```css
:root {
  /* Primary */
  --primary: #B0CA47;
  --primary-hover: #C3D775;
  --primary-active: #95AB3C;
  
  /* Secondary */
  --secondary: #C38B5A;
  --secondary-hover: #D2A883;
  --secondary-active: #A5764C;
  
  /* Neutrals */
  --background-1: #0B0E0C;
  --background-2: #121512;
  --surface: #171A17;
  --border: #2B2A28;
  
  /* Text */
  --text-primary: #E6E8EA;
  --text-secondary: #B7BDC3;
  --text-muted: #8B949E;
  --on-primary: #0B0E0C;
  --on-secondary: #0B0E0C;
  
  /* States */
  --success: #B0CA47;
  --warning: #C38B5A;
  --danger: #E05656;
  --info: #A2A590;
  --focus-ring: rgba(176, 202, 71, 0.55);
  --selected-bg: rgba(176, 202, 71, 0.12);
}
```

### Typography
- **Headings**: Goldman Bold (Google Font)
- **Body**: System font stack
- **Sizing**: H1 32px, H2 24px, H3 20px, Body 16px, Small 14px

### Spacing
- Use Tailwind spacing scale: 4, 8, 12, 16, 24, 32
- Border radius: 12px for buttons/cards, 20px for large cards

## Code Structure

### Directory Structure
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth-related routes
│   ├── league/[slug]/     # League-specific routes
│   └── admin/             # Admin routes
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── forms/             # Form components
│   ├── layout/            # Layout components
│   └── features/          # Feature-specific components
├── lib/
│   ├── supabase/          # Supabase clients
│   ├── validations/       # Zod schemas
│   ├── utils/             # Utility functions
│   └── hooks/             # Custom React hooks
├── types/                 # TypeScript type definitions
└── styles/                # Global CSS
```

### Component Patterns

#### Server Components (Default)
```typescript
// app/league/[slug]/page.tsx
import { createServerClient } from '@/lib/supabase/server'

export default async function LeaguePage({
  params
}: {
  params: { slug: string }
}) {
  const supabase = createServerClient()
  const { data: league } = await supabase
    .from('leagues')
    .select('*')
    .eq('slug', params.slug)
    .single()

  return <LeagueView league={league} />
}
```

#### Client Components
```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/hooks/useUser'

export default function PickForm() {
  const supabase = createClient()
  const { user } = useUser()
  
  // Component logic
}
```

#### Form Components with Zod
```typescript
'use client'

import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const schema = z.object({
  teamId: z.string().min(1, 'Please select a team')
})

export function PickForm() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema)
  })
  
  // Form logic
}
```

## Database Patterns

### RLS Policies
Every table must have RLS enabled and appropriate policies:
```sql
-- Enable RLS
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;

-- Policy for league members
CREATE POLICY "League members can view league"
ON leagues FOR SELECT
USING (
  id IN (
    SELECT league_id 
    FROM league_members 
    WHERE user_id = auth.uid()
  )
);
```

### Query Patterns
```typescript
// Good: Server Component with RLS
const { data: leagues } = await supabase
  .from('leagues')
  .select(`
    *,
    league_members!inner(user_id)
  `)

// Good: Client Component with real-time
const { data: picks } = useQuery({
  queryKey: ['picks', weekId],
  queryFn: async () => {
    const { data } = await supabase
      .from('picks')
      .select('*')
      .eq('week_id', weekId)
    return data
  }
})
```

## Mobile Form Optimization (NEW)

### Input Field Best Practices
```typescript
// Always include these attributes for mobile optimization
<Input
  type="tel"
  inputMode="tel"        // Triggers correct keyboard
  autoComplete="tel"     // Enables autofill
  autoCapitalize="none"  // Prevents unwanted caps
  autoCorrect="off"      // Disables autocorrect
  spellCheck="false"     // No spell checking
  className="min-h-[44px]" // Touch target size
/>
```

### Field-Specific Settings
- **Username**: `autoCapitalize="none"`, `autoCorrect="off"`
- **Display Name**: `autoCapitalize="words"`
- **Email**: `autoCapitalize="none"`, `type="email"`
- **Phone**: `type="tel"`, `inputMode="tel"`
- **PIN**: `inputMode="numeric"`, `pattern="[0-9]{4}"`

## Commissioner Features (NEW)

### Manual Pick Revelation
```typescript
// Check if user can reveal picks
const canRevealPicks = currentUser && league && (
  league.commissioner_id === currentUser.id || 
  ['admin', 'tgauss', 'pickemking'].includes(currentUser.username.toLowerCase())
)

// Check if picks are revealed
const picksRevealed = league?.picks_revealed_weeks?.includes(week)
```

### Database Fields Update
- `leagues.buy_in_amount` (not `buy_in`)
- `leagues.picks_revealed_weeks` (integer array)
- `users.phone_number` (optional text field)

## Common Patterns

### Error Handling
```typescript
import { toast } from 'sonner'

try {
  const { error } = await supabase.from('picks').insert(pick)
  if (error) throw error
  toast.success('Pick submitted successfully!')
} catch (error) {
  toast.error('Failed to submit pick')
  console.error('Pick submission error:', error)
}
```

### Loading States
```typescript
'use client'

import { Skeleton } from '@/components/ui/skeleton'

export function LeagueStandings({ leagueId }: { leagueId: string }) {
  const { data: standings, isLoading } = useStandings(leagueId)
  
  if (isLoading) {
    return <Skeleton className="h-48 w-full" />
  }
  
  return <StandingsTable standings={standings} />
}
```

### Responsive Design
```typescript
// Always mobile-first, use Tailwind responsive prefixes
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {/* Cards */}
</div>

// Touch targets
<Button className="min-h-[44px] min-w-[44px]">
  Submit Pick
</Button>
```

## Security Checklist

Before implementing any auth-related feature:
- [ ] Are you using Supabase Auth (not custom sessions)?
- [ ] Do all database queries use RLS?
- [ ] Are sensitive operations server-side only?
- [ ] Is user input validated with Zod?
- [ ] Are error messages user-friendly (not exposing internals)?

## Testing Guidelines

### Unit Tests (Vitest)
```typescript
import { render, screen } from '@testing-library/react'
import { PickForm } from '@/components/forms/PickForm'

test('renders pick form with teams', () => {
  render(<PickForm teams={mockTeams} />)
  expect(screen.getByText('Select your pick')).toBeInTheDocument()
})
```

### E2E Tests (Playwright)
```typescript
import { test, expect } from '@playwright/test'

test('user can submit a pick', async ({ page }) => {
  await page.goto('/league/test-league')
  await page.click('[data-testid="team-select-KC"]')
  await page.click('[data-testid="submit-pick"]')
  await expect(page.locator('.success-message')).toBeVisible()
})
```

## Performance Guidelines

### Code Splitting
```typescript
// Dynamic imports for large components
const AdminPanel = dynamic(() => import('@/components/AdminPanel'), {
  loading: () => <Skeleton className="h-96" />
})
```

### Image Optimization
```typescript
import Image from 'next/image'

<Image
  src="/team-logos/KC.svg"
  alt="Kansas City Chiefs"
  width={40}
  height={40}
  className="rounded-full"
/>
```

### Bundle Analysis
```bash
# Analyze bundle size regularly
npm run build
npm run analyze
```

## Deployment Checklist

Before pushing to production:
- [ ] All TypeScript errors resolved
- [ ] All tests passing
- [ ] Bundle size under 300KB initial load
- [ ] Lighthouse score > 90 on mobile
- [ ] No console errors
- [ ] Environment variables set in Vercel
- [ ] Database migrations run
- [ ] RLS policies tested

## Debugging

### Common Issues
1. **Auth not working**: Check if using `createServerClient` vs `createClient` correctly
2. **RLS denying queries**: Verify policies and user context
3. **Hydration errors**: Check server/client state mismatch
4. **Mobile layout issues**: Test on actual device, not just browser DevTools

### Logging
```typescript
// Structured logging for debugging
import { logger } from '@/lib/logger'

logger.info('Pick submitted', {
  userId: user.id,
  teamId: pick.teamId,
  week: currentWeek
})
```

## When to Ask for Help

Ask me for clarification if:
- Authentication flow seems complex
- Database query involves multiple tables
- Mobile UX pattern is unclear
- Performance optimization is needed
- Error boundaries need implementation

Remember: This rebuild exists because we had authentication and session management issues. When in doubt, keep it simple and let Supabase handle the complexity.