# Claude Development Guidelines & Memory Document
# Pickem Party v2

**Last Updated**: September 1, 2025
**Version**: 2.0.0
**Purpose**: This document serves as persistent memory for Claude Code across sessions

## 🎯 Project Overview

**Pickem Party v2** is a complete rebuild of an NFL Survivor Pool platform. Users pick one NFL team per week to win. If their team loses, they're eliminated. Last player standing wins the pot.

### Key URLs
- **Production**: https://www.pickemparty.app
- **Invite Example**: https://www.pickemparty.app/?invite=GRID2025&inviter=taylor%20g
- **GitHub**: https://github.com/tgauss/pickem-party-v2
- **Supabase Project ID**: cggoycedsybrajvdqjjk

## 🚀 Recent Work (September 2025 Session)

### Features Implemented
1. **Phone Number Collection** 
   - Added `phone_number` field to users table
   - Optional field in registration form
   - Mobile-optimized with proper input types
   - Enables league admin off-platform communication

2. **Commissioner-Controlled Pick Revelation**
   - Replaced automatic reveal when all picks submitted
   - Added `picks_revealed_weeks` integer[] to leagues table
   - Created `/api/admin/reveal-picks` endpoint
   - Allows new members to join up to game time

3. **Fixed Invite System**
   - Corrected database field: `buy_in` → `buy_in_amount`
   - Fixed total pot calculations
   - Now shows: $15 buy-in, $165 pot (11 members)

4. **Mobile Optimizations**
   - All inputs have 44px minimum touch targets
   - Smart keyboard types (tel, email, numeric)
   - Proper autoComplete and autoCapitalize per field
   - No spell check on technical fields

5. **Admin Dashboard Enhancements**
   - Payment tracking (mark paid/unpaid)
   - Life adjustments with audit trail
   - Commissioner assignment system
   - League messaging for rules/announcements

## 📊 Current State

### Database Schema Key Points
```sql
-- Important tables and fields
users: id, username, display_name, email, phone_number, pin_hash
leagues: id, name, slug, invite_code, buy_in_amount, commissioner_id, picks_revealed_weeks[]
league_members: league_id, user_id, lives_remaining (default: 2), is_paid, is_eliminated
picks: user_id, league_id, game_id, team_id, week, is_correct
games: season_year, week, home_team_id, away_team_id, home_score, away_score
```

### Authentication Status
- **Current**: Simplified username + 4-digit PIN using localStorage
- **TODO**: Migrate to proper Supabase Auth with JWT tokens
- **Risk**: Sessions don't persist across devices

### Tech Stack
- **Frontend**: Next.js 15.5.2 with App Router
- **Database**: Supabase (PostgreSQL with RLS)
- **Styling**: Tailwind CSS + shadcn/ui
- **Deployment**: Vercel
- **APIs**: ESPN (odds), SportsData.io (scores)

## ⚠️ Critical Information

### Super Admin Users (Hardcoded)
```typescript
const superAdminUsernames = ['admin', 'tgauss', 'pickemking']
```

### Environment Variables Required
```env
NEXT_PUBLIC_SUPABASE_URL=https://cggoycedsybrajvdqjjk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your_key]
SPORTSDATA_API_KEY=[your_key]
```

### Known Issues to Remember
1. **Node.js 18 deprecation warnings** - Need to upgrade to v20+
2. **Build manifest errors** in development (ENOENT errors)
3. **Bundle size** - League page is 218KB (target: <150KB)
4. **No tests** - 0% coverage currently
5. **localStorage auth** - Not secure, needs migration

## 🛠 Development Patterns

### Mobile Form Optimization
```typescript
// Always use these patterns for mobile inputs
<Input
  type="tel"
  inputMode="tel"        // Correct keyboard
  autoComplete="tel"     // Autofill support
  autoCapitalize="none"  // Control capitalization
  autoCorrect="off"      // No autocorrect
  spellCheck="false"     // No spell check
  className="min-h-[44px]" // Touch target
/>
```

### Commissioner Authorization
```typescript
// Pattern for checking commissioner permissions
const canRevealPicks = currentUser && league && (
  league.commissioner_id === currentUser.id || 
  ['admin', 'tgauss', 'pickemking'].includes(currentUser.username.toLowerCase())
)
```

### Database Client Creation
```typescript
// Client-side
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// Server-side
import { createServerClient } from '@/lib/supabase/server'
const supabase = createServerClient()
```

## 🎮 Core Features Status

### Working Features ✅
- User registration with phone numbers
- League creation and management
- Weekly pick submission
- Manual pick revelation by commissioners
- Payment tracking
- Life adjustments
- Betting line integration (ESPN)
- Mobile-optimized interface
- Invite system with proper calculations

### Partially Working ⚠️
- Score syncing (manual trigger needed)
- Elimination logic (needs testing)
- Activity feed (basic implementation)

### Not Implemented ❌
- Email notifications
- Push notifications
- Advanced statistics
- Social features (chat, comments)
- Playoff brackets
- Automated testing

## 📝 Common Tasks & Commands

### Development
```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Build for production
npm run lint         # Run ESLint
npm run typecheck    # TypeScript checking
```

### Database Migrations
```sql
-- Add new field example
ALTER TABLE users ADD COLUMN new_field TEXT;

-- Add picks revealed tracking
ALTER TABLE leagues ADD COLUMN picks_revealed_weeks integer[] DEFAULT '{}'::integer[];
```

### Testing Invite System
1. Visit: http://localhost:3000/?invite=GRID2025&inviter=taylor%20g
2. Should show: $15 buy-in, $165 pot, 11 members

## 🔄 Workflow Reminders

### When Adding New Features
1. Check KNOWN_ISSUES.md for related problems
2. Update database schema if needed
3. Ensure mobile optimization (44px targets, proper keyboards)
4. Test on actual mobile device
5. Update CHANGELOG.md
6. Commit with descriptive message

### Before Deployment
1. Run `npm run build` - ensure no TypeScript errors
2. Check bundle size hasn't increased significantly
3. Test critical user flows
4. Update version in package.json
5. Document in CHANGELOG.md

## 💡 Future Session Context

### Priority Tasks
1. **Upgrade to Node.js 20+** - Critical for Supabase compatibility
2. **Implement proper auth** - Replace localStorage with Supabase Auth
3. **Add email notifications** - Pick reminders, elimination alerts
4. **Write tests** - Currently 0% coverage
5. **Optimize bundle** - Reduce from 218KB to <150KB

### Code Cleanup Opportunities
- Remove unused `game_odds` table
- Refactor duplicate Supabase client creation
- Extract common error handling patterns
- Lazy load admin components
- Remove TutorialWizard if unused (~15KB)

### Performance Targets
- Lighthouse Mobile: 90+ (currently ~85)
- Bundle size: <150KB (currently 218KB)
- First Contentful Paint: <1.5s
- Time to Interactive: <3s

## 🐛 Quick Debug Reference

### Common Errors & Fixes
1. **"buy_in undefined"** → Use `buy_in_amount` field
2. **"Cannot find user"** → Check localStorage has currentUser
3. **"Picks not showing"** → Check if week is in picks_revealed_weeks
4. **Build errors** → Run `npm run typecheck` for details
5. **Dev server crashes** → Kill port 3000 and restart

### Database Quick Queries
```sql
-- Check league status
SELECT * FROM leagues WHERE invite_code = 'GRID2025';

-- Count members
SELECT COUNT(*) FROM league_members WHERE league_id = '[id]';

-- Check user picks
SELECT * FROM picks WHERE user_id = '[id]' AND week = 1;
```

## 📚 Documentation Files

### For Development Reference
- **README.md** - Project overview and setup
- **CHANGELOG.md** - Version history
- **KNOWN_ISSUES.md** - Bugs and improvements needed
- **UNUSED_CODE.md** - Code cleanup opportunities
- **CLAUDE.md** - This file (Claude's memory)

### Key Insights from Code Audit
- **~43KB bundle savings** available from unused code
- **5 unused database tables** could be removed
- **Duplicate code patterns** need refactoring
- **No test coverage** is biggest technical debt

## 🎯 Success Metrics

### Current Performance
- Page Load: 2.5s on 3G
- Lighthouse Mobile: ~85
- Bundle Size: 127KB shared + 91KB route
- Database Size: ~5MB
- Active Users: 11 (test league)

### Target Performance
- Page Load: <2s on 3G
- Lighthouse Mobile: 90+
- Bundle Size: <150KB total
- Error Rate: <1%
- Test Coverage: >80%

## 🔒 Security Notes

### Current Implementation
- RLS enabled on all tables
- Hardcoded super admin list
- Commissioner-only admin actions
- Input validation with Zod
- Parameterized SQL queries

### Security Risks
- localStorage auth (not secure)
- PIN stored in plain text (MVP only)
- No rate limiting on API routes
- No CSRF protection

## 📞 Contact & Support

- **Creator**: @tgauss
- **GitHub**: https://github.com/tgauss/pickem-party-v2
- **Production**: https://www.pickemparty.app

---

## 🧠 Memory Summary for Next Session

**You are working on Pickem Party v2**, an NFL Survivor Pool app. Recent work includes:
1. Added phone number field to users
2. Implemented manual pick revelation for commissioners
3. Fixed invite page calculations (use `buy_in_amount` not `buy_in`)
4. Optimized all forms for mobile

**Key things to remember**:
- Using Next.js 15.5.2 with Supabase
- Auth is currently localStorage (needs fixing)
- Node.js needs upgrade from v18 to v20+
- Super admins: ['admin', 'tgauss', 'pickemking']
- Default lives: 2 per player
- Bundle size target: <150KB (currently 218KB)
- No tests written yet (0% coverage)

**When you return**, check:
1. KNOWN_ISSUES.md for current problems
2. UNUSED_CODE.md for cleanup opportunities
3. CHANGELOG.md for recent changes
4. This file (CLAUDE.md) for all context

The codebase is well-documented and ready for continued development. All recent features are working in production at https://www.pickemparty.app.