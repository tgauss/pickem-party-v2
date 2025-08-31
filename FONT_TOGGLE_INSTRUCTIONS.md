# Font Toggle Instructions

## Current Font Setup

The application now uses **Press Start 2P** (retro pixel font) for all headlines and branded text.

## How to Switch Back to Goldman (Previous Font)

To revert to the previous Goldman font, simply edit `src/app/globals.css` and change the font references:

**Current (Press Start 2P):**
```css
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-press-start-2p), system-ui, sans-serif;
}

.fight-text {
  font-family: var(--font-press-start-2p), system-ui, sans-serif;
}
```

**To Revert (Goldman):**
```css
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-goldman), system-ui, sans-serif;
  font-weight: 700; /* Goldman needs bold weight */
}

.fight-text {
  font-family: var(--font-goldman), system-ui, sans-serif;
  font-weight: 700; /* Goldman needs bold weight */
}
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