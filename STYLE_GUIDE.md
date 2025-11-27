# Secular Solstice App - Style Guide

## Design Philosophy
The Secular Solstice aesthetic balances cosmic grandeur with intimate warmth—celebrating human connection under the vastness of space. The design should feel:
- **Elegant & Timeless**: Classic typography, spacious layouts
- **Cosmic & Contemplative**: Deep space imagery, stellar motifs
- **Warm & Intimate**: Golden accents, candlelight warmth
- **Minimalist**: Clean interfaces, purposeful elements only

---

## Typography

### Font Families
```css
--font-title: 'Georgia', serif;           /* Main titles, headers, branding */
--font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;  /* Body text, UI */
--font-mono: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;  /* Code, technical content */
```

### Font Scales
```css
/* Display & Hero */
--text-hero: 4rem;        /* 64px - Main landing page title */
--text-display: 3rem;     /* 48px - Section headers */

/* Headings */
--text-h1: 2rem;          /* 32px */
--text-h2: 1.5rem;        /* 24px */
--text-h3: 1.25rem;       /* 20px */
--text-h4: 1.125rem;      /* 18px */

/* Body */
--text-base: 1rem;        /* 16px - Default body text */
--text-sm: 0.875rem;      /* 14px - Secondary text */
--text-xs: 0.75rem;       /* 12px - Labels, metadata */
```

### Font Weights
```css
--weight-light: 300;
--weight-normal: 400;
--weight-medium: 500;
--weight-semibold: 600;
--weight-bold: 700;
```

### Usage Guidelines
- **Georgia (serif)**: Use for "Secular Solstice" branding, page titles, song titles
- **Sans-serif**: Use for all UI elements, body text, navigation, buttons
- **Line Height**: 1.5 for body text, 1.2 for headings
- **Letter Spacing**: Normal for body, slight increase (0.01em) for all-caps navigation

---

## Color Palette

### Cosmic/Background Colors
```css
--space-black: #000000;       /* Pure black - deep space background with stars */
--space-overlay: rgba(0, 0, 0, 0.7);  /* Dark overlay for text readability over images */
--cosmic-navy: #0f1419;       /* Very dark blue-black for subtle depth */
```

### Primary Button Colors
```css
--bronze-tan: #9b8061;        /* Warm tan/bronze - "Music Album" button */
--bronze-tan-hover: #ab9071;  /* Lighter tan for hover */
--bronze-tan-active: #8b7051; /* Darker tan for active/pressed */

--slate-navy: #3e4a5f;        /* Dark slate/navy - "Run a Solstice" button */
--slate-navy-hover: #4e5a6f;  /* Lighter slate for hover */
--slate-navy-active: #2e3a4f; /* Darker slate for active/pressed */
```

### Secondary Accent Colors
```css
--warm-gold: #c9a678;         /* Lighter gold for subtle highlights */
--candlelight: #d4a574;       /* Warm glow for special emphasis */
--deep-slate: #334155;        /* Darker slate for UI elements */
```

### Neutral Colors
```css
--white: #ffffff;             /* Pure white for text on dark backgrounds */
--off-white: #f9fafb;         /* Very light gray for light backgrounds */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-300: #d1d5db;
--gray-400: #9ca3af;
--gray-500: #6b7280;
--gray-600: #4b5563;
--gray-700: #374151;
--gray-800: #1f2937;
--gray-900: #111827;
--near-black: #0a0a0a;        /* Near-black for content area backgrounds */
```

### Text Colors
```css
--text-on-dark: #ffffff;      /* White text on cosmic/dark backgrounds */
--text-on-light: #1f2937;     /* Dark gray text on light backgrounds */
--text-muted-light: #6b7280;  /* Muted gray for secondary text on light */
--text-muted-dark: #9ca3af;   /* Muted gray for secondary text on dark */
```

### Semantic Colors
```css
--primary: #9b8061;           /* Bronze/tan for primary actions */
--secondary: #3e4a5f;         /* Slate/navy for secondary actions */
--success: #10b981;           /* Green */
--warning: #d4a574;           /* Warm amber/gold */
--error: #ef4444;             /* Red */
--info: #60a5fa;              /* Lighter blue for better visibility */
```

### Usage Guidelines

#### Backgrounds
- **Hero sections**: Pure black (#000000) with cosmic imagery
- **Content areas**: White (#ffffff) or off-white (#f9fafb)
- **Subtle panels**: gray-50 (#f9fafb) for secondary content
- **Dark overlays**: rgba(0, 0, 0, 0.7) when text needs to appear over images

#### Text
- **On cosmic/dark backgrounds**: White (#ffffff)
- **On light backgrounds**: Dark gray (#1f2937)
- **Secondary/muted text on light**: Gray-500 (#6b7280)
- **Secondary/muted text on dark**: Gray-400 (#9ca3af)

#### Buttons & CTAs
- **Primary/Featured actions**: Bronze-tan (#9b8061) - "Music Album", "Save", "Publish"
  - Use for the most important action on a page
  - White text (#ffffff) on this background
- **Secondary actions**: Slate-navy (#3e4a5f) - "Run a Solstice", "Cancel", "Back"
  - Use for important but not primary actions
  - White text (#ffffff) on this background
- **Tertiary/Ghost actions**: Transparent with border or text-only
- **Destructive actions**: Red text (#ef4444) - "Delete", "Remove"

#### Links
- **On light backgrounds**: Blue (#3b82f6) with underline on hover
- **On dark backgrounds**: Light blue (#60a5fa) with underline on hover

#### Interactive States
- **Primary button hover**: #ab9071 (lighter tan)
- **Secondary button hover**: #4e5a6f (lighter slate)
- **Link hover**: Underline appears
- **List item hover**: bg-gray-50 on light, bg-gray-800 on dark

---

## Spacing System

### Base Unit: 4px
```css
--space-0: 0;
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
```

### Component Spacing
- **Padding (buttons)**: px-4 py-2 (16px horizontal, 8px vertical)
- **Padding (cards)**: p-4 to p-6 (16px to 24px)
- **Gap (flex/grid)**: gap-2 to gap-4 (8px to 16px)
- **Section spacing**: mb-8 to mb-12 (32px to 48px)
- **Page margins**: px-4 on mobile, px-8 on desktop

---

## Layout & Grid

### Container Widths
```css
--container-sm: 640px;
--container-md: 768px;
--container-lg: 1024px;
--container-xl: 1280px;
--container-2xl: 1536px;
```

### Breakpoints
```css
--screen-sm: 640px;
--screen-md: 768px;
--screen-lg: 1024px;
--screen-xl: 1280px;
--screen-2xl: 1536px;
```

### Principles
- **Vertical Rhythm**: Maintain consistent vertical spacing (multiples of 8px)
- **Content Width**: Keep text content narrow (~65-75 characters per line)
- **Whitespace**: Embrace generous spacing—don't crowd elements
- **Alignment**: Left-align text, center align hero content
- **Minimal Borders**: Avoid unnecessary borders—use whitespace and subtle backgrounds instead

---

## Components

### Buttons

#### Primary (Bronze/Tan)
```tsx
className="px-6 py-3 bg-[#9b8061] text-white hover:bg-[#ab9071] transition-colors"
```
- Use for: "Music Album", "Save", "Create", "Publish" - the most important action
- No border radius or shadow by default
- Clean, flat appearance
- White text on warm tan/bronze background

#### Secondary (Slate/Navy)
```tsx
className="px-6 py-3 bg-[#3e4a5f] text-white hover:bg-[#4e5a6f] transition-colors"
```
- Use for: "Run a Solstice", "Cancel", "Back"
- Important but not the primary action
- White text on dark slate/navy background

#### Tertiary (Ghost)
```tsx
className="px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
```
- Use for: Less important actions, "View Details"

#### Destructive
```tsx
className="px-4 py-2 text-red-600 hover:text-red-800"
```
- Use for: "Delete", "Remove"
- Text-only, no background

#### Button Sizes
- **Large**: px-6 py-3 (hero CTAs)
- **Medium**: px-4 py-2 (standard actions)
- **Small**: px-2 py-1 text-sm (inline actions)

### Navigation

#### Header
```tsx
<header className="px-4 py-3 flex items-center justify-between">
  <h1 className="font-georgia text-2xl">Secular Solstice</h1>
  <nav className="flex gap-6">
    <Link className="hover:underline">...</Link>
  </nav>
</header>
```
- Simple underline hover effect
- No background colors or borders
- Generous gap between nav items (gap-6)

### Cards & Panels

#### Standard Card
```tsx
className="bg-white border border-gray-200 p-4"
```
- Minimal: no shadow, no border-radius
- Use subtle borders (gray-200) to separate
- White background on light page backgrounds

#### Highlighted Panel
```tsx
className="bg-gray-50 p-4"
```
- Use for: Secondary content, sidebars
- No border needed if using background color

### Forms

#### Input Fields
```tsx
className="border border-gray-300 px-3 py-2 focus:border-gray-500 focus:outline-none"
```
- Clean, flat appearance
- Subtle border color change on focus
- No shadows or border-radius

#### Labels
```tsx
className="text-sm font-medium mb-1"
```
- Small, semibold labels above inputs
- Minimal spacing (mb-1)

### Dropdowns
```tsx
className="border border-gray-300 bg-white shadow-lg"
```
- Can use shadow for depth/hierarchy
- White background
- Hover state: bg-gray-100

### Lists

#### Song/Program Lists
```tsx
className="text-sm px-2 py-1 flex items-center gap-2 hover:bg-gray-50"
```
- Compact: text-sm, minimal padding
- Subtle hover state
- Items on single line when possible

---

## Interactive States

### Hover
- Buttons: Slightly lighter shade of background color
- Links: Underline appears
- List items: bg-gray-50
- Dropdowns: bg-gray-100

### Focus
- Inputs: Border changes from gray-300 to gray-500
- Remove default browser outline
- Consider adding subtle ring if needed

### Active/Selected
- Background: bg-gray-100
- Font weight: font-semibold

### Disabled
- Opacity: opacity-50
- Cursor: cursor-not-allowed
- Remove hover effects

---

## Icons & Graphics

### Icon Style
- Use minimal, line-based icons (no fill)
- Size: 16px or 20px for UI, 24px for emphasis
- Color: Match surrounding text color

### Arrows & Indicators
- Use simple unicode characters when possible: ▼ ▲ ← → ✕
- Font size: text-xs for dropdown arrows

---

## Animations & Transitions

### Transition Speed
```css
--transition-fast: 150ms;
--transition-base: 200ms;
--transition-slow: 300ms;
```

### Easing
```css
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

### Usage
- Hover state changes: transition-colors (200ms)
- Dropdowns opening: transition-all (150ms)
- Avoid over-animating—keep it subtle

---

## Imagery

### Photography Style
- Warm, candlelit scenes
- Intimate group shots
- Natural, documentary style
- Slightly warm color grading

### Backgrounds
- Cosmic/space imagery for hero sections
- Solid colors (white, gray-50) for content areas
- Avoid busy backgrounds behind text

---

## Accessibility

### Color Contrast
- Body text: Minimum 4.5:1 contrast ratio
- Large text (18px+): Minimum 3:1 contrast ratio
- Test gold (#b8976a) text on light backgrounds—may need darker shade

### Interactive Elements
- Minimum touch target: 44x44px
- Visible focus states (not just hover)
- Keyboard navigation support

### Semantic HTML
- Use proper heading hierarchy (h1 → h2 → h3)
- Use `<button>` for actions, `<a>` for navigation
- Alt text for all images

---

## Best Practices

### DO
✓ Use Georgia for titles and branding  
✓ Keep layouts clean and spacious  
✓ Use gold/bronze for primary actions  
✓ Use slate/muted colors for secondary actions  
✓ Maintain vertical rhythm (8px increments)  
✓ Keep items on one line when possible (compact design)  
✓ Use subtle hover states (bg-gray-50, bg-gray-100)  
✓ Use text-sm (14px) for list items and secondary text  
✓ Embrace whitespace—don't crowd elements  

### DON'T
✗ Add unnecessary borders, shadows, or border-radius  
✗ Use bright, saturated colors (keep it muted and elegant)  
✗ Make UI elements overly large or spread out vertically  
✗ Add visual effects without purpose  
✗ Delete comments or unused imports unnecessarily  
✗ Change whitespace/formatting without good reason  
✗ Use one parameter per line if code wasn't already formatted that way  

---

## Quick Reference

### Tailwind Class Patterns

**Headers:**
```
font-georgia text-2xl
```

**Primary Button (Bronze/Tan):**
```
px-6 py-3 bg-[#9b8061] text-white hover:bg-[#ab9071] transition-colors
```

**Secondary Button (Slate/Navy):**
```
px-6 py-3 bg-[#3e4a5f] text-white hover:bg-[#4e5a6f] transition-colors
```

**List Item:**
```
text-sm px-2 py-1 flex items-center gap-2 hover:bg-gray-50
```

**Dropdown:**
```
absolute z-10 mt-1 bg-white border border-gray-300 shadow-lg min-w-[200px]
```

**Input:**
```
border border-gray-300 px-3 py-2 focus:border-gray-500 focus:outline-none
```

**Container:**
```
max-w-6xl mx-auto px-4
```

---

## Implementation Notes

1. **Extend Tailwind Config**: Add custom colors to `tailwind.config.ts`:
```typescript
colors: {
  cosmic: { black: '#0a0a0a', blue: '#1e293b', purple: '#475569' },
  gold: { primary: '#b8976a', hover: '#c9a678', light: '#d4b792' }
}
```

2. **CSS Variables**: Define in `globals.css` for use in both Tailwind and custom CSS

3. **Font Loading**: Georgia is a system font, no need to load externally

4. **Consistency**: Reference this guide when creating new components or modifying existing ones

