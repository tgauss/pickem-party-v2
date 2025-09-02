# Unused Code Audit

## Overview
This document identifies code that appears to be unused or redundant in the codebase. Removing these items could improve bundle size, maintainability, and build performance.

## 🗑️ Completely Unused Files

### 1. Test/Demo Files
- `create-friends-league.sql` - Old SQL script, functionality now in API
- `TESTING-INSTRUCTIONS.md` - Outdated testing guide from v1

### 2. Unused API Routes
None identified - all API routes appear to be in use

## 🔍 Partially Unused Code

### 1. Database Tables/Columns

#### `game_odds` Table
**Status**: Empty table, never populated
**Purpose**: Was intended for detailed odds tracking
**Recommendation**: Remove or implement
**Location**: Database schema

#### `espn_games_raw` Table
**Status**: Populated but rarely queried
**Purpose**: Raw ESPN data storage
**Recommendation**: Consider archiving old data
**Size Impact**: ~302 rows

#### `user_role_audit` Table
**Status**: Created but never used
**Purpose**: Track role changes
**Recommendation**: Implement or remove
**Location**: Database schema

### 2. Unused Component Features

#### `TutorialWizard` Component
**File**: `/src/components/TutorialWizard.tsx`
**Status**: Imported but conditionally rendered (rarely shown)
**Size**: ~15KB
**Recommendation**: Lazy load or remove if not needed

#### Admin Dashboard Features
**Unused Functions**:
- `reset-everything` endpoint - Too dangerous, never called
- `import-espn` - Manual process, consider automating
- Some SportsData.io integration code

### 3. Unused Imports

#### Multiple Files
```typescript
// Commonly imported but unused
import { useRouter } from 'next/navigation' // In several components
import { format } from 'date-fns' // Imported in 3+ files, used in 1
```

### 4. Unused State Variables

#### League Page (`/league/[slug]/page.tsx`)
- `selectedWeek` state - Set but not fully utilized
- `isRefreshing` - Defined but never toggled

#### Admin Components
- Various loading states that are set but not displayed

## 📦 Unused Dependencies

### Package.json Analysis
```json
{
  // Potentially unused or replaceable
  "@hookform/resolvers": "Used in 2 files only",
  "date-fns": "Could use native Intl.DateTimeFormat",
  "clsx": "Could be replaced with cn() utility",
  "tailwind-merge": "Only used in cn() utility"
}
```

### Development Dependencies
- Some ESLint rules/plugins not configured
- Unused TypeScript configurations

## 🎨 Unused Styles

### 1. CSS Variables
```css
/* Defined but never used */
--quaternary-color: /* In team colors */
--focus-ring: /* Defined but using Tailwind */
--selected-bg: /* Defined but not applied */
```

### 2. Tailwind Classes
- Custom animations defined but not used
- Some responsive variants never applied

## 🔧 Unused Utilities

### 1. Date Utilities
**File**: Would be in `/lib/utils/date.ts`
**Status**: Functions duplicated inline
**Examples**:
- Date formatting repeated in 5+ places
- Timezone conversion logic duplicated

### 2. Validation Schemas
**Unused Zod Schemas**:
- League creation validation (hardcoded instead)
- User update validation (not implemented)

## 📊 Code Duplication (Should be Refactored)

### 1. Supabase Client Creation
**Duplicated in**:
- Every API route
- Multiple components
- Should use single factory function

### 2. Error Handling
**Pattern repeated 20+ times**:
```typescript
try {
  // code
} catch (error) {
  console.error('Error:', error)
  // Same error handling
}
```

### 3. Loading States
**Same skeleton pattern** in:
- League page
- Dashboard
- Admin panel
- Should be extracted to shared component

## 🚫 Dead Code Paths

### 1. Conditional Branches Never Reached
```typescript
// In multiple files
if (process.env.NODE_ENV === 'test') {
  // Never runs - no test environment
}
```

### 2. Unreachable Error Handlers
- Some catch blocks after infallible operations
- Null checks after non-null assertions

## 📈 Size Impact Analysis

### Estimated Savings from Removal

| Item | Current Size | Potential Savings |
|------|-------------|-------------------|
| Unused DB tables | ~5MB data | 5MB storage |
| TutorialWizard | ~15KB | 15KB bundle |
| Unused utilities | ~8KB | 8KB bundle |
| Dead code paths | ~5KB | 5KB bundle |
| Duplicate code | ~20KB | 15KB if refactored |
| **Total** | **~53KB** | **~43KB bundle** |

## 🎯 Recommended Actions

### Immediate (Low Risk)
1. Remove `game_odds` table
2. Delete test SQL files
3. Remove unused CSS variables
4. Clean up unused imports

### Short Term (Medium Risk)
1. Refactor Supabase client creation
2. Extract common error handling
3. Consolidate loading states
4. Remove TutorialWizard if unused

### Long Term (Needs Analysis)
1. Evaluate `espn_games_raw` usage
2. Implement or remove audit tables
3. Optimize dependency usage
4. Code-split admin features

## 🔄 Maintenance Tasks

### Regular Cleanup Needed
1. **Weekly**: Remove unused imports
2. **Monthly**: Audit new unused code
3. **Quarterly**: Review dependencies
4. **Yearly**: Major refactoring

## 🛠️ Tools for Detection

### Recommended Tools
```bash
# Find unused dependencies
npx depcheck

# Find unused exports
npx ts-prune

# Find dead code
npx unimported

# Analyze bundle
npx next-bundle-analyzer
```

## 📝 Notes

### Why This Code Exists
- **Tutorial System**: Built for v1, not fully migrated
- **Audit Tables**: Future-proofing that wasn't implemented
- **ESPN Raw Data**: Kept for debugging/analysis
- **Duplicate Code**: Rapid development, needs refactoring

### Risk Assessment
- **Low Risk**: Removing truly unused code
- **Medium Risk**: Refactoring duplicates
- **High Risk**: Removing "maybe used" features

## 🚀 Implementation Plan

### Phase 1: Clean (Week 1)
- Remove obvious unused files
- Clean up imports
- Delete empty tables

### Phase 2: Refactor (Week 2-3)
- Consolidate duplicate code
- Extract shared utilities
- Optimize imports

### Phase 3: Optimize (Month 2)
- Code splitting
- Lazy loading
- Bundle optimization

## 📊 Metrics to Track

### Before/After Measurements
- Bundle size
- Build time  
- Page load speed
- Memory usage
- Developer experience

---

**Last Audited**: September 1, 2025
**Next Audit Due**: October 1, 2025
**Maintained By**: Development Team