# Claude Development Guidelines & Memory Document
# Pickem Party v2

**Last Updated**: September 15, 2025
**Version**: 2.2.0
**Purpose**: This document serves as persistent memory for Claude Code across sessions

## 🎯 Project Overview

**Pickem Party v2** is a complete rebuild of an NFL Survivor Pool platform. Users pick one NFL team per week to win. If their team loses, they're eliminated. Last player standing wins the pot.

### Key URLs
- **Production**: https://www.pickemparty.app
- **Invite Example**: https://www.pickemparty.app/?invite=GRID2025&inviter=taylor%20g
- **GitHub**: https://github.com/tgauss/pickem-party-v2
- **Supabase Project ID**: cggoycedsybrajvdqjjk

## 🚀 Recent Work (September 15, 2025 Session)

### Major Updates - Week 2 Completion & Cemetery Feature
1. **Cemetery & RIP Popup System**
   - Implemented Cemetery component showing gravestones for eliminated players
   - Added RIP popup that appears once when players are newly eliminated
   - Custom gravestone graphics (Kevyn-Gravestone.png) with player names
   - Removed overlay text from gravestones after feedback
   - Cemetery displays player names, elimination week, and survival days

2. **Week 2 Score Processing & Eliminations**
   - Synced all 16 completed Week 2 games from ESPN API
   - Processed 25 user picks with results:
     - 21 correct picks (players remain at 2 lives)
     - 4 incorrect picks: Dalton, Joe G, Shneebly (down to 1 life), Kevyn R (eliminated)
   - First elimination: Kevyn R (picked Las Vegas, lost to LA Chargers 9-20)
   - Updated all pick statuses with is_correct field

3. **Music Player Improvements**
   - Added session-based mute memory (sessionStorage)
   - Implemented 3-second delay before autoplay prompt
   - Respects user mute preference throughout browser session
   - Less aggressive autoplay behavior

4. **Week 2 Recap Audio Integration**
   - Added "GRIDIRON GAMBLE - Week 2 wRap.mp3" to music directory
   - Integrated play button in RIP popup for eliminated players
   - Purple gradient button with play/pause controls
   - Audio automatically stops when popup closes

5. **Standings & UI Improvements**
   - Fixed standings to show tied positions (22 players tied for 1st with 2 lives)
   - Players with same lives share same position number
   - Week 3 now properly shows as current week for picks
   - Fixed upset detection logic (correct spread interpretation)
   - Enhanced PastWeekResults to show correct/incorrect badges

6. **Email System Implementation** (from earlier in session)
   - Full Postmark integration for email notifications
   - Admin email control center at /league/[slug]/email
   - Templates for pick reminders, weekly results, announcements
   - Commissioner and super admin access controls

## 🚀 Previous Work (September 9, 2025 Session)

### Major Updates - Week 1 to Week 2 Transition
1. **Week 1 Score Sync and Pick Processing**
   - Synced all 15 completed Week 1 NFL games from ESPN API
   - Processed 26 user picks with 96% success rate (25 correct, 1 incorrect)
   - Applied life deduction to Kevyn R (2→1 lives) for incorrect Patriots pick
   - Generated comprehensive Week 1 performance analysis

2. **Enhanced Dark Theme Interface**
   - Improved readability by reducing opacity on completed games (95% vs 75%)
   - Added sophisticated upset detection based on betting lines
   - Replaced betting lines with natural language outcome analysis for completed games
   - Color-coded upset alerts: MAJOR/BIG (orange), SMALL/MINOR (yellow)
   - Enhanced visual indicators while maintaining dark theme aesthetics

3. **Smart Week Detection System**
   - Fixed week calculation logic to properly transition from Week 1 to Week 2
   - Week detection now based on NFL schedule (Tuesday-Monday cycles)
   - Week 2 activated Tuesday Sept 9 after Week 1 MNF completion
   - Dynamic week calculation prevents manual updates going forward

4. **Week 2 Schedule and Odds Integration**
   - Synced complete Week 2 NFL schedule (16 games) from ESPN API
   - Updated all Week 2 betting lines with spreads, totals, and moneylines
   - Games span Thursday Night (WSH @ GB) through Monday Night (TB @ HOU, LAC @ LV)
   - Natural language analysis ready for Week 2 results

5. **Audio Content Management**
   - Added "GRIDIRON GAMBLE - Week 1 Wrap .mp3" to public/music directory
   - Week 1 analysis audio now available via music API

## 🚀 Previous Work (September 2025 Session)

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
POSTMARK_API_TOKEN=[your_postmark_server_token]
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
- **Email notifications system** - Pick reminders, weekly results, admin announcements, league invites
- **Admin email controls** - Full interface for commissioners and super admins
- **Cemetery & RIP popup** - Memorial for eliminated players with audio integration
- **Tied standings** - Proper ranking for players with same lives
- **Week-by-week progression** - Automatic transitions with completed week views

### Partially Working ⚠️
- Score syncing (manual trigger needed)
- Elimination logic (needs testing)
- Activity feed (basic implementation)

### Not Implemented ❌
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

### Current Status After Sept 15 Session
- **Week 1**: ✅ Completed with final scores and analysis
- **Week 2**: ✅ Completed with first elimination (Kevyn R)
- **Week 3**: 🟢 ACTIVE for picks (forced current after Week 2 completion)
- **Players**: 22 with 2 lives (tied 1st), 3 with 1 life (tied 23rd), 1 eliminated
- **Cemetery**: Live with Kevyn R's gravestone and RIP popup
- **Interface**: Enhanced with Cemetery, tied standings, Week 2 recap audio

### Priority Tasks
1. **Week-by-week maintenance** - Monitor score syncing and pick processing
2. **Upgrade to Node.js 20+** - Critical for Supabase compatibility (warnings appearing)
3. **Implement proper auth** - Replace localStorage with Supabase Auth
4. **Add email notifications** - Pick reminders, elimination alerts
5. **Write tests** - Currently 0% coverage
6. **Optimize bundle** - Reduce from 268KB to <150KB (increased slightly)

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

### Current Performance (Sept 9, 2025)
- Page Load: 2.5s on 3G
- Lighthouse Mobile: ~85
- Bundle Size: 176KB shared + 26.1KB route = 268KB total
- Database Size: ~5MB
- Active Users: 27 (live league)
- Week 1 Success Rate: 96% (25/26 picks correct)

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

**Session Summary (Sept 15, 2025)**:
Successfully completed Week 2 with first elimination and comprehensive new features. Added Cemetery system for eliminated players with custom gravestones and RIP popups. Integrated Week 2 recap audio directly into elimination experience. Fixed standings to show proper ties, improved music player behavior, and transitioned to Week 3 as active. Processed 25 Week 2 picks resulting in first elimination (Kevyn R) and 3 players down to 1 life. Enhanced email system with full Postmark integration and admin controls.

**Key Technical Achievements:**
- Cemetery.tsx and RIPPopup.tsx components with audio integration
- Tied standings algorithm for proper ranking display
- Session-based music player mute memory
- Week transition logic with manual override capability
- Full score processing and pick result validation

**Current League Status:**
- 25 players remain (22 tied for 1st, 3 tied for 23rd)
- Week 3 active for picks
- Cemetery live with Kevyn R memorial
- All systems operational in production

The platform now includes the complete elimination experience from RIP notification to cemetery memorial, making the survivor pool more engaging and entertaining for players.