# Changelog

All notable changes to Pick'em Party v2 will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2025-11-18

### Added - Automated Settlement System
- **🤖 Automated Weekly Settlement**: Full auto-settlement system with Vercel cron scheduling (Monday 10pm PST)
- **📊 ESPN Score Sync**: Automatic live score fetching before settlement processing
- **🔄 Smart Game Updates**: Only updates games when scores change or status changes to final
- **🔐 Secure API Endpoint**: `/api/admin/auto-settle-week` with CRON_SECRET authentication
- **🧪 Dry-Run Mode**: Test settlement without making database changes
- **📝 Comprehensive Logging**: Detailed settlement reports with scores synced, picks processed, eliminations
- **⚡ Manual Override**: Helper scripts for manual settlement triggering when needed
- **📖 Documentation**: Complete auto-settlement v2.0 documentation with monitoring guides

### Changed
- **Settlement Process**: Now fully autonomous with no manual intervention required
- **Score Fetching**: Integrated ESPN API directly into settlement workflow
- **Monday Night Games**: Automatically handled with live score updates at 10pm PST

### Fixed
- **Week 9 Settlement**: Processed Jaren Petrusich elimination (2 losses → eliminated)
- **Week 10 Settlement**: Applied life deductions (Amanda G: 2→1, Decks: 1→0 eliminated)
- **Week 11 Settlement**: Perfect week - all 7 players had winning picks (no eliminations)
- **Monday Night Updates**: DAL @ LV final score automatically synced (33-16)

### Technical
- **API Route**: Created `/src/app/api/admin/auto-settle-week/route.ts` with score sync
- **Cron Configuration**: Added `vercel.json` with cron schedule (`0 5 * * 2` = Mon 10pm PST)
- **Score Sync Function**: `syncScoresFromESPN()` fetches and updates all games for specified week
- **Helper Scripts**: `settle-now.sh`, `test-auto-settle.sh`, `monitor-live.sh`, `cron-settlement.js`
- **Type Safety**: Fixed TypeScript errors with explicit type definitions for update operations
- **Environment Variable**: Added `CRON_SECRET` for secure API authentication

### Week-by-Week Results
- **Week 9**: 1 elimination (Jaren Petrusich) - 8 players remaining
- **Week 10**: 2 losing picks, 1 elimination (Decks) - 7 players remaining
- **Week 11**: 7 winning picks, 0 eliminations - 7 players alive entering Week 12

### Documentation Files
- **AUTOMATED_SETTLEMENT_v2.md**: Complete guide to auto-settlement system with score sync
- **Settlement Scripts**: `settle-week9.js`, `settle-week10.js`, `update-week11-dal-game.js`
- **Helper Tools**: Manual override, dry-run testing, and monitoring utilities

## [2.0.1] - 2025-09-09

### Added
- **Score Display**: Final scores and winner indicators on completed games interface
- **Upset Analysis**: Sophisticated betting line analysis with color-coded alerts
- **Natural Language Explanations**: Human-readable analysis of betting line accuracy
- **Game Outcome Analysis**: Detailed spread and moneyline result summaries
- **Audio Content**: Added Week 1 wrap-up audio analysis file
- **Enhanced Dark Theme**: Improved readability with optimized opacity levels

### Changed
- **Week Detection Logic**: Fixed transition from Week 1 to Week 2 based on NFL schedule
- **Game Interface**: Added visual indicators for wins/losses and game completion status
- **Date Calculation**: Corrected week calculation to handle Tuesday-Monday NFL cycles
- **Typography**: Enhanced contrast and visibility in dark mode interface

### Fixed
- **Week Transition Bug**: Resolved issue where league page remained on Week 1 after Monday night games
- **TypeScript Errors**: Fixed type definitions in game outcome analysis functions
- **ESPN API Sync**: Corrected development server port targeting
- **Date Logic**: Fixed incorrect day-of-week calculations affecting week display

### Technical
- **Pick Processing**: Successfully synced Week 1 results (25 correct picks, 1 incorrect)
- **Life Deduction**: Properly processed elimination for incorrect pick (Kevyn R)
- **Score Integration**: Enhanced ESPN API integration with proper error handling
- **Performance**: Maintained bundle size optimization during feature additions

## [2.0.0] - 2025-09-01

### Added
- **Phone Number Field**: Optional phone number collection during user registration for league admin communication
- **Commissioner Pick Reveal**: Manual control over when picks become visible to league members
- **Commissioner Assignment System**: Super admins can transfer league ownership
- **League Messaging**: Commissioners can set custom messages for rules and announcements
- **Payment Tracking**: Mark and track member payment status
- **Life Adjustments**: Add/remove lives with full audit trail
- **Activity Feed**: Real-time league activity monitoring
- **Admin Dashboard**: Comprehensive league management interface
- **Mobile Optimizations**: Smart keyboards, autofill, and touch-friendly interfaces
- **Pick Submission UX**: Prominent sticky footer for pick confirmation
- **Invite System**: Share leagues with custom invite codes and tracking

### Changed
- **Pick Visibility**: Changed from automatic reveal (when all submit) to manual commissioner control
- **Database Field**: Renamed `buy_in` to `buy_in_amount` for consistency
- **Lives System**: Standardized to 2 default lives per player
- **Form Inputs**: Added proper autoComplete, inputMode, and keyboard attributes
- **Touch Targets**: Ensured 44px minimum height for all interactive elements

### Fixed
- **Invite Page Calculations**: Fixed buy-in amount and total pot calculations
- **TypeScript Errors**: Resolved all build-time type issues
- **ESLint Warnings**: Fixed unused variable warnings
- **Database Queries**: Corrected member count queries for leagues
- **Mobile Input Issues**: Fixed keyboard types and auto-capitalization

### Security
- **RLS Policies**: Enhanced Row Level Security on all database tables
- **Authorization**: Added proper commissioner and super admin checks
- **Input Validation**: Implemented Zod schemas for all forms
- **SQL Injection**: All queries use parameterized statements

## [1.0.0] - 2025-08-29

### Initial Release
- **Core Platform**: Complete rebuild with Next.js 15 and Supabase
- **User System**: Simplified auth with username + PIN
- **League Management**: Create and manage survivor pools
- **Pick System**: Weekly team selection with used team tracking
- **Elimination Logic**: Automatic elimination on losses
- **Betting Lines**: ESPN odds integration
- **Mobile Design**: Responsive from 320px width
- **Admin Tools**: Basic league administration

## Migration Notes

### From v1 to v2
1. **Database Migration Required**: New schema with enhanced fields
2. **Auth System Change**: Moved from email/password to username/PIN
3. **Pick Reveal Change**: Now manual instead of automatic
4. **New Required Fields**: Commissioner assignment needed for all leagues

## Upcoming Features (Planned)

### Version 2.1.0
- Email notifications for picks and eliminations
- Push notifications for mobile devices
- Advanced statistics dashboard
- Export league data to CSV

### Version 2.2.0
- Playoff bracket support
- Custom scoring rules per league
- Head-to-head matchups
- Weekly power rankings

### Version 3.0.0
- Full Supabase Auth implementation
- Social login (Google, Apple)
- Real-time chat within leagues
- Machine learning pick suggestions

## Known Issues

See [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) for current bugs and limitations.

## Support

For questions or issues, please open a GitHub issue or contact the development team.

---

**Note**: This changelog starts from the v2 rebuild (August 2025). The original Pick'em Party v1 changelog is archived separately.