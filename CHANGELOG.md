# Changelog

All notable changes to Pick'em Party v2 will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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