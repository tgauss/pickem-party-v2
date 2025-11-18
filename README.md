# Pick'em Party v2 🏈

**The Ultimate NFL Survivor Pool Platform**

A complete rebuild of the Pick'em Party platform - a mobile-first NFL Survivor Pool application built with Next.js 15, Supabase, and Tailwind CSS.

## 🚀 Live Demo

Visit: [https://www.pickemparty.app](https://www.pickemparty.app)

## ✨ Recent Updates (November 2025)

### Latest Features (v2.1.0 - Nov 18, 2025) - **AUTOMATED SETTLEMENT** 🤖
- **🤖 Fully Automated Weekly Settlement**: Runs every Monday 10pm PST via Vercel cron
- **📊 ESPN Score Sync**: Automatically fetches live scores before processing picks
- **🎯 Monday Night Games**: No more manual intervention - handles MNF games perfectly
- **🔐 Secure API Endpoint**: Protected with CRON_SECRET authentication
- **🧪 Dry-Run Testing**: Test settlement without affecting database
- **📝 Comprehensive Logging**: Detailed reports with scores synced, picks processed, eliminations
- **⚡ Manual Override**: Helper scripts for emergency manual settlement
- **📖 Complete Documentation**: See [AUTOMATED_SETTLEMENT_v2.md](./AUTOMATED_SETTLEMENT_v2.md)

### Previous Features (v2.0.1 - Sept 9, 2025)
- **🏆 Score Display**: Final scores and winner/loser indicators on completed games
- **⚡ Upset Analysis**: Sophisticated betting line analysis with color-coded alerts
- **🧠 Natural Language Explanations**: Human-readable analysis of betting accuracy
- **📱 Enhanced Dark Theme**: Improved readability with optimized contrast levels
- **🎵 Audio Content**: Week 1 wrap-up analysis audio integration
- **📅 Week Transition**: Fixed automatic progression from Week 1 to Week 2

### Foundation Features (v2.0.0 - Sept 1, 2025)
- **📱 Phone Number Collection**: Optional phone field in user registration for league admin communication
- **👮 Commissioner Controls**: Manual pick revelation system for better league management
- **💰 Enhanced Invite System**: Fixed buy-in calculations and improved mobile experience
- **📊 Admin Dashboard**: Comprehensive league management tools
- **🔐 Commissioner Assignment**: League ownership transfer capabilities
- **💬 League Messaging**: Custom commissioner messages for rules and announcements
- **💳 Payment Tracking**: Member payment status management

## 🎮 Core Features

### For Players
- **Mobile-First Design**: Optimized for smartphones with touch-friendly interfaces
- **Smart Pick System**: One team per week, can't reuse teams
- **Real-Time Updates**: Live game scores and elimination tracking
- **Betting Line Insights**: ESPN odds integration for informed picks
- **Multi-Life Support**: Default 2 lives per player
- **Week Countdown**: Visual timer showing deadline for picks

### For Commissioners
- **League Management**: Full control over league settings and members
- **Manual Pick Reveal**: Control when picks become visible
- **Payment Tracking**: Mark members as paid/unpaid
- **Life Adjustments**: Add/remove lives with audit trail
- **Activity Feed**: Real-time league activity monitoring
- **Member Communication**: Access to email and phone for off-platform contact

### For Super Admins
- **Multi-League Overview**: Monitor all leagues from single dashboard
- **Commissioner Assignment**: Designate league commissioners
- **System Simulation**: Test game outcomes and eliminations
- **Data Management**: Import ESPN data, sync scores

## 🛠 Tech Stack

- **Frontend**: Next.js 15.5.2 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS + shadcn/ui
- **Authentication**: Supabase Auth (simplified for MVP)
- **Deployment**: Vercel
- **APIs**: ESPN (odds), SportsData.io (scores)

## 📱 Mobile Optimizations

- Touch targets minimum 44px height
- Smart keyboard types per input field
- Autofill support for faster form completion
- Auto-capitalization optimized per field
- Responsive design from 320px width

## 🏃 Getting Started

### Prerequisites
- Node.js 18+ (Note: Upgrade to Node.js 20+ recommended)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/tgauss/pickem-party-v2.git
cd pickem-party-v2
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Update `.env.local` with your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SPORTSDATA_API_KEY=your_sportsdata_key
CRON_SECRET=your_secure_random_string
POSTMARK_API_TOKEN=your_postmark_token
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## 📊 Database Schema

### Key Tables
- `users` - Player accounts with contact info
- `leagues` - League configuration and settings
- `league_members` - Membership and elimination status
- `picks` - Weekly team selections
- `games` - NFL game schedule and scores
- `teams` - NFL team data
- `betting_lines` - Odds and spreads

## 🔑 Authentication

Currently using simplified auth for MVP:
- Username + 4-digit PIN
- No email verification required
- localStorage for session management
- Future: Full Supabase Auth implementation

## 🎨 Brand Guidelines

### Color Palette
- **Primary**: `#B0CA47` (Green)
- **Secondary**: `#C38B5A` (Orange)
- **Background**: `#0B0E0C` (Dark)
- **Surface**: `#171A17` (Elevated Dark)
- **Text Primary**: `#E6E8EA` (Light)

### Typography
- **Headings**: Goldman Bold (Google Font)
- **Body**: System font stack

## 📝 API Endpoints

### Admin Routes
- `/api/admin/auto-settle-week` - **NEW** Automated weekly settlement with score sync
- `/api/admin/reveal-picks` - Manual pick revelation
- `/api/admin/adjust-lives` - Life management
- `/api/admin/assign-commissioner` - Commissioner changes
- `/api/admin/sync-scores` - Score updates
- `/api/admin/simulate` - Testing eliminations

### Public Routes
- `/api/betting-lines` - Current week odds
- `/api/league/activity` - League activity feed

## 🚧 Known Issues & Improvements

See [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) for detailed list.

### Priority Fixes Needed
- Node.js version warnings (upgrade to v20+)
- Build manifest errors in development
- Optimize bundle size (currently ~218KB for league page)

### Planned Enhancements
- Email notifications for picks/eliminations
- Push notifications for mobile
- Advanced statistics dashboard
- Playoff bracket support
- Custom scoring rules

## 🧹 Code Cleanup Opportunities

See [UNUSED_CODE.md](./UNUSED_CODE.md) for audit of unused code.

## 📈 Performance

- Lighthouse Mobile Score: ~85 (target: 90+)
- Initial Load: <3s on 3G
- First Contentful Paint: <1.5s
- Bundle Size: ~127KB shared + route-specific

## 🔒 Security

- Row Level Security (RLS) on all tables
- Commissioner-only admin actions
- Super admin hardcoded usernames
- Input validation with Zod
- SQL injection prevention via parameterized queries

## 🧪 Testing

```bash
# Run tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint

# Build for production
npm run build
```

## 📦 Deployment

### Vercel (Recommended)
1. Connect GitHub repository
2. Set environment variables
3. Deploy with one click

### Manual Deployment
```bash
npm run build
npm start
```

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

Private repository - All rights reserved

## 👨‍💻 Development Team

- **Creator**: @tgauss
- **Built with**: ❤️ & 🥃

## 📞 Support

For issues or questions:
- GitHub Issues: [Report Issue](https://github.com/tgauss/pickem-party-v2/issues)
- Email: Contact league commissioner

---

**Last Updated**: November 18, 2025
**Version**: 2.1.0 - Automated Settlement System