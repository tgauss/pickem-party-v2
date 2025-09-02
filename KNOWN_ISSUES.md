# Known Issues & Areas for Improvement

## 🔴 Critical Issues

### 1. Node.js Version Warning
**Issue**: Constant warnings about Node.js 18 being deprecated
```
⚠️ Node.js 18 and below are deprecated and will no longer be supported
```
**Impact**: Future compatibility issues with Supabase
**Solution**: Upgrade to Node.js 20 or higher
**Priority**: HIGH

### 2. Authentication Security
**Issue**: Using localStorage for session management instead of proper auth
**Impact**: Sessions don't persist across devices, security vulnerabilities
**Solution**: Implement full Supabase Auth with JWT tokens
**Priority**: HIGH

### 3. Development Build Errors
**Issue**: Frequent ENOENT errors for build manifest files in development
```
Error: ENOENT: no such file or directory, open '/_buildManifest.js.tmp'
```
**Impact**: Development experience degraded, requires server restarts
**Solution**: Investigate Next.js Turbopack configuration
**Priority**: MEDIUM

## 🟡 Performance Issues

### 1. Bundle Size
**Current**: League page ~218KB
**Target**: <150KB
**Areas to Optimize**:
- Code splitting for admin components
- Lazy load heavy components
- Optimize image imports
- Remove unused dependencies

### 2. Mobile Performance
**Lighthouse Score**: ~85
**Target**: 90+
**Issues**:
- Large DOM size on league page
- Render-blocking resources
- Unoptimized images (team helmets)

### 3. Database Queries
**Issue**: Multiple sequential queries instead of joins
**Example**: League page makes 5+ separate queries
**Solution**: Optimize with proper joins and views

## 🟠 User Experience Issues

### 1. Error Handling
**Issue**: Generic error messages don't help users
**Examples**:
- "Failed to submit pick" - doesn't explain why
- Network errors show as blank screens
**Solution**: Implement proper error boundaries and user-friendly messages

### 2. Loading States
**Issue**: Inconsistent loading indicators
**Areas Affected**:
- Pick submission (no feedback)
- Page transitions (flash of content)
- Data refreshes (jumpy UI)

### 3. Form Validation
**Issue**: Validation only on submit, not real-time
**Affected Forms**:
- User registration
- Pick selection
- League creation

### 4. Session Management
**Issue**: Users get logged out unexpectedly
**Cause**: localStorage clearing or browser restrictions
**Solution**: Move to proper auth tokens with refresh

## 🔵 Feature Gaps

### 1. Notifications
**Missing**:
- Email notifications for picks
- Reminder emails for deadlines
- Push notifications for mobile
- In-app notification center

### 2. Social Features
**Missing**:
- League chat/comments
- Trash talk board
- Share picks on social media
- League invites via SMS

### 3. Statistics
**Missing**:
- Historical performance data
- Pick trends analysis
- Win probability calculations
- Season-long statistics

### 4. Admin Tools
**Missing**:
- Bulk user management
- League cloning/templates
- Automated scoring rules
- Custom elimination criteria

## 🟣 Code Quality Issues

### 1. TypeScript Coverage
**Issue**: Some `any` types still present
**Files Affected**:
- API route handlers
- Dynamic form components
- Third-party integrations

### 2. Test Coverage
**Current**: ~0% (no tests implemented)
**Needed**:
- Unit tests for utilities
- Integration tests for API routes
- E2E tests for critical flows
- Component tests for UI

### 3. Code Duplication
**Areas**:
- Supabase client creation (multiple implementations)
- Form validation logic
- Date formatting utilities
- API error handling

### 4. Inconsistent Patterns
**Issues**:
- Mix of client/server components without clear strategy
- Inconsistent error handling between routes
- Various state management approaches

## 🟢 Accessibility Issues

### 1. Screen Reader Support
**Missing**:
- ARIA labels on interactive elements
- Proper heading hierarchy
- Form field descriptions
- Status announcements

### 2. Keyboard Navigation
**Issues**:
- Can't tab through pick selection
- Modal dialogs don't trap focus
- No skip navigation links

### 3. Color Contrast
**Some text fails WCAG AA**:
- Muted text on dark backgrounds
- Success/error states
- Disabled button states

## 📱 Mobile-Specific Issues

### 1. iOS Safari
**Issues**:
- 100vh includes browser chrome
- Sticky positioning bugs
- Input zoom on focus

### 2. Android Chrome
**Issues**:
- Keyboard pushes content up
- Touch targets occasionally miss
- Scroll momentum issues

## 🔧 Development Experience

### 1. Hot Reload
**Issue**: Often requires full page refresh
**Cause**: Complex state management
**Impact**: Slower development cycles

### 2. Environment Setup
**Issue**: Complex initial setup
**Missing**:
- Docker configuration
- Seed data scripts
- Development database setup guide

### 3. Documentation
**Missing**:
- API documentation
- Component storybook
- Architecture decisions
- Deployment guide

## 🚀 Deployment Issues

### 1. Environment Variables
**Issue**: Not validated at build time
**Risk**: Runtime failures in production
**Solution**: Add env validation with Zod

### 2. Database Migrations
**Issue**: Manual migration process
**Risk**: Schema drift between environments
**Solution**: Automated migration pipeline

### 3. Monitoring
**Missing**:
- Error tracking (Sentry)
- Performance monitoring
- User analytics
- Uptime monitoring

## 💡 Suggested Improvements

### Immediate (Week 1)
1. Upgrade to Node.js 20
2. Fix build manifest errors
3. Add proper error boundaries
4. Implement loading skeletons

### Short-term (Month 1)
1. Implement proper authentication
2. Add email notifications
3. Optimize bundle size
4. Add basic test coverage

### Medium-term (Quarter 1)
1. Build statistics dashboard
2. Add social features
3. Implement push notifications
4. Create admin dashboard v2

### Long-term (Year 1)
1. Machine learning for pick suggestions
2. Native mobile apps
3. Real-time collaboration features
4. Advanced analytics platform

## 🐛 Bug Tracker

### High Priority
- [ ] Fix localStorage session persistence
- [ ] Resolve build manifest errors
- [ ] Fix invite page redirect loop
- [ ] Handle network errors gracefully

### Medium Priority
- [ ] Fix sticky footer on iOS
- [ ] Resolve timezone display issues
- [ ] Fix form validation feedback
- [ ] Handle concurrent pick submissions

### Low Priority
- [ ] Optimize image loading
- [ ] Add keyboard shortcuts
- [ ] Improve animation performance
- [ ] Fix minor UI inconsistencies

## 📊 Monitoring Metrics

### Current Performance
- **Page Load Time**: 2.5s (3G)
- **Time to Interactive**: 3.2s
- **First Contentful Paint**: 1.4s
- **Largest Contentful Paint**: 2.8s

### Error Rates
- **API Failures**: ~2% of requests
- **Client Errors**: ~5% of sessions
- **Build Failures**: ~10% in development

## 🔄 Update Frequency

This document should be updated:
- Weekly during active development
- After each major release
- When new issues are discovered
- After user feedback sessions

---

**Last Updated**: September 1, 2025
**Maintained By**: Development Team
**Review Cycle**: Weekly