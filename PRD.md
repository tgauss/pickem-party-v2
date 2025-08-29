# Product Requirements Document (PRD)
# Pickem Party - NFL Survivor Pool Platform v2

## Executive Summary

Pickem Party is a mobile-first web platform for managing NFL Survivor Pools (elimination pools) where participants pick one winning team per week without reusing teams. The platform supports multiple concurrent leagues with simple, PIN-based authentication for quick mobile access.

## Core Value Proposition

- **Simple Access**: PIN-based login for quick mobile entry
- **Multi-League**: Users can participate in multiple pools simultaneously  
- **Mobile-First**: Optimized for smartphone use during games
- **Real-Time**: Live score updates and immediate eliminations
- **Commissioner-Friendly**: Simple admin tools for league management

## User Personas

### 1. Player (Primary User)
- **Profile**: NFL fan participating in 1-3 survivor pools
- **Goals**: Quick pick submission, check standings, see who's eliminated
- **Pain Points**: Complex logins, desktop-only sites, unclear pick deadlines
- **Device**: 95% mobile phone usage

### 2. League Commissioner
- **Profile**: Organizes pool for friends/coworkers, collects buy-ins externally
- **Goals**: Easy setup, track payments, manage weekly scoring
- **Pain Points**: Manual tracking, disputes about picks, payment management
- **Device**: 70% mobile, 30% desktop

### 3. Super Admin
- **Profile**: Platform administrator
- **Goals**: Manage multiple leagues, ensure fair play, resolve issues
- **Pain Points**: Need oversight without micromanagement
- **Device**: Primarily desktop

## Functional Requirements

### 1. Authentication & User Management

#### 1.1 Registration
- **Email + Username + Display Name**
- **4-digit PIN** (instead of password for quick mobile access)
- Email verification via Postmark
- No social logins in MVP

#### 1.2 Login
- **Primary**: Username + PIN (optimized for mobile)
- **Recovery**: Email magic link
- Session persistence for 30 days
- Biometric unlock option (Face ID/Touch ID via Web Authentication API)

#### 1.3 User Profiles
- Display name (shown in standings)
- Avatar (optional)
- League memberships
- Overall statistics

### 2. League Management

#### 2.1 League Creation
- League name
- Buy-in amount (display only, not processed)
- Season year
- Custom URL slug (e.g., `/league/office-pool-2024`)
- Private/Public setting
- Pick deadline rules (first game vs specific game)

#### 2.2 League Membership
- **Invitation System**: Unique invite codes
- **Quick Join**: 6-character alphanumeric codes
- **Payment Tracking**: Manual marking by commissioner
- Max participants limit (optional)

#### 2.3 League Roles (Simple RBAC)
- **Player**: Make picks, view standings
- **Commissioner**: All player rights + admin functions
- **Super Admin**: Platform-wide access

### 3. Game Mechanics

#### 3.1 Pick Submission
- **One team per week** rule
- **No repeat teams** enforcement
- Visual indicator of used teams
- Confirmation required for picks
- Edit until deadline
- Auto-save draft picks

#### 3.2 Pick Deadlines
- Default: Before first Sunday game
- Commissioner configurable per week
- Countdown timer display
- Email reminder 24 hours before

#### 3.3 Elimination Rules
- Eliminated if picked team loses
- Ties configurable (survive/eliminate)
- Commissioner can reverse eliminations
- "Zombie" mode for eliminated players to continue picking for fun

### 4. Scoring & Results

#### 4.1 Automated Scoring
- Scheduled score fetching (every 15 min during games)
- Manual "Sync Scores" button for commissioners
- SportsData.io API integration
- Fallback manual score entry

#### 4.2 Week States
- **Open**: Accepting picks
- **Locked**: No more picks (games started)
- **In Progress**: Games being played
- **Scored**: Winners/losers determined
- **Final**: Week complete, eliminations processed

#### 4.3 Standings Display
- Current survivors
- Eliminated players (grayed out)
- Current week picks (hidden until lock)
- Pick history
- Pot total display

### 5. Communication

#### 5.1 Email Notifications (via Postmark)
- Welcome to league
- Pick reminder (24hr before deadline)
- Pick confirmation
- Elimination notice
- Weekly results summary
- Winner announcement

#### 5.2 In-App Messaging
- League announcements (commissioner)
- System messages
- No player-to-player chat in MVP

### 6. Admin Functions

#### 6.1 Commissioner Tools
- Mark users as paid/unpaid
- Generate/revoke invite codes
- Force pick for absent player
- Reverse eliminations
- Set custom deadlines
- Export pick data

#### 6.2 Super Admin Tools
- View all leagues
- Impersonate users (for support)
- System-wide announcements
- Database management
- Score source management

## Non-Functional Requirements

### Performance
- Page load < 2 seconds on 4G
- Pick submission < 500ms
- Support 10,000 concurrent users
- 99.9% uptime during NFL season

### Security
- All data encrypted in transit (HTTPS)
- PINs hashed with bcrypt
- Session tokens with secure httpOnly cookies
- Rate limiting on auth endpoints
- CORS properly configured

### Accessibility
- WCAG 2.1 AA compliance
- Screen reader compatible
- Keyboard navigation
- High contrast mode support
- Minimum 44px touch targets

### Browser Support
- Chrome 90+ (mobile & desktop)
- Safari 14+ (iOS required)
- Firefox 88+
- Edge 90+
- Progressive Web App capabilities

## Success Metrics

### User Engagement
- 80% weekly active users during season
- < 30 seconds to submit pick
- < 2% pick submission errors
- 90% mobile usage

### Platform Health
- < 1% authentication failures
- Zero data loss incidents
- < 5 support tickets per 100 users per week
- 95% user retention season-over-season

## MVP Scope

### Phase 1: Foundation (Weeks 1-2)
- Supabase Auth implementation
- User registration/login with PIN
- Basic league creation
- Database schema

### Phase 2: Core Game (Weeks 3-4)
- Pick submission flow
- Team selection UI
- Used teams tracking
- Basic standings

### Phase 3: Commissioner (Week 5)
- Invite system
- Payment tracking
- Manual scoring
- Basic admin panel

### Phase 4: Automation (Week 6)
- SportsData.io integration
- Automated scoring
- Email notifications
- PWA features

### Phase 5: Polish (Week 7)
- Mobile optimizations
- Real-time updates
- Error handling
- Performance tuning

## Out of Scope for MVP

- Native mobile apps
- In-app payments
- Advanced statistics
- Player-to-player trading
- Multiple game types
- Confidence pools
- Playoff pools
- Social features
- Betting/gambling features

## Technical Constraints

- Must use Supabase for auth and database
- Must deploy to Vercel
- Must use Next.js 14 App Router
- Must be mobile-first responsive
- Must support offline pick viewing
- No external dependencies for core functionality

## Risk Mitigation

### Risk: Authentication Issues (Our #1 Historical Problem)
**Mitigation**: Use Supabase Auth exclusively, no custom session management

### Risk: Data Loss
**Mitigation**: Database backups, audit logs, soft deletes

### Risk: Score API Failure
**Mitigation**: Manual score entry, multiple data sources

### Risk: Scaling Issues
**Mitigation**: Vercel auto-scaling, Supabase connection pooling

### Risk: User Confusion
**Mitigation**: Onboarding flow, help tooltips, simple UI

## Appendix

### A. User Flow Diagrams
[To be created]

### B. Wireframes
[To be created]

### C. API Specifications
[To be detailed in technical docs]

### D. Database Schema
[See DATABASE_SCHEMA.md]