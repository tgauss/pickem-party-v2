# Font Toggle Instructions

## Current Font Setup

The application now uses **Press Start 2P** (retro pixel font) for all headlines and branded text.

## How to Switch Back to Goldman (Previous Font)

To revert to the previous Goldman font, simply edit `src/app/globals.css` and change these two lines:

**Current (Press Start 2P):**
```css
--font-heading: var(--font-press-start-2p); /* Change this to --font-goldman to revert */
--font-brand: var(--font-press-start-2p);   /* Change this to --font-goldman to revert */
```

**To Revert (Goldman):**
```css
--font-heading: var(--font-goldman); /* Reverted to Goldman */
--font-brand: var(--font-goldman);   /* Reverted to Goldman */
```

## What This Changes

- **All Headlines** (h1, h2, h3, h4, h5, h6)
- **Fight Text** (.fight-text class used for branded buttons and titles)
- **Tutorial Titles**
- **Homepage Hero Text** 
- **Dashboard Welcome Text**

## Font Files

- **Press Start 2P**: Loaded from Google Fonts (retro pixel style)
- **Goldman**: Already loaded (clean modern style)

Both fonts remain loaded, so switching is instant with just the CSS variable change.