---
name: High-Efficiency Productivity System
colors:
  surface: '#0f1418'
  surface-dim: '#0f1418'
  surface-bright: '#353a3e'
  surface-container-lowest: '#0a0f13'
  surface-container-low: '#171c20'
  surface-container: '#1b2025'
  surface-container-high: '#262a2f'
  surface-container-highest: '#31353a'
  on-surface: '#dfe3e9'
  on-surface-variant: '#c2c8c2'
  inverse-surface: '#dfe3e9'
  inverse-on-surface: '#2c3136'
  outline: '#8c928d'
  outline-variant: '#424844'
  surface-tint: '#b1cdbb'
  primary: '#b1cdbb'
  on-primary: '#1d3528'
  primary-container: '#0b2418'
  on-primary-container: '#728d7d'
  inverse-primary: '#4a6455'
  secondary: '#d8ff7f'
  on-secondary: '#263500'
  secondary-container: '#afe700'
  on-secondary-container: '#4a6400'
  tertiary: '#ffb3ae'
  on-tertiary: '#68000b'
  tertiary-container: '#480005'
  on-tertiary-container: '#f54647'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#cde9d6'
  primary-fixed-dim: '#b1cdbb'
  on-primary-fixed: '#072014'
  on-primary-fixed-variant: '#334c3e'
  secondary-fixed: '#bcf520'
  secondary-fixed-dim: '#a3d800'
  on-secondary-fixed: '#151f00'
  on-secondary-fixed-variant: '#394d00'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ae'
  on-tertiary-fixed: '#410004'
  on-tertiary-fixed-variant: '#930014'
  background: '#0f1418'
  on-background: '#dfe3e9'
  surface-variant: '#31353a'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-status:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-margin: 1.5rem
  gutter: 1rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 2rem
---

## Brand & Style
This design system focuses on a high-contrast, energetic visual language tailored for peak productivity. The brand personality is professional yet driving, utilizing a "Dark Mode First" aesthetic for deep focus, punctuated by high-visibility accents to denote urgency and action. 

The style merges **Corporate Modern** structure with **High-Contrast** energy. It utilizes deep, dark surfaces to minimize eye strain during long work sessions, while leveraging "Lime Yellow" as a tactical highlighter for primary calls to action and active states. The emotional response should be one of clarity, momentum, and disciplined focus.

## Colors
The palette is anchored by a deep forest green (`#0B2418`) which serves as the primary canvas, providing a more sophisticated and less harsh alternative to pure black. 

- **Primary Canvas**: The dark green background establishes the "Focus Zone."
- **Action Lime**: The secondary color (`#C5FF2D`) is used exclusively for interactive elements, progress indicators, and primary buttons. Its high vibration against the dark green ensures immediate visual hierarchy.
- **Status Indicators**: Red and Amber are reserved for deadline-driven urgency and medium-priority warnings, respectively.
- **Surface Tiers**: Secondary surfaces use a slightly lighter tint (`#122E21`) to create depth without losing the dark-mode focus.

## Typography
The system uses **Inter** for its exceptional legibility and systematic feel. 

- **Headlines**: Use heavy weights (700) with slight negative letter-spacing to create a "dense" and authoritative look.
- **Body**: Standard weight (400) with generous line-height for readability during task management.
- **Labels**: Small caps are used for metadata (e.g., categories like "HỌC TẬP") to differentiate them from actionable task text.
- **Hierarchy**: Use contrast in weight rather than just size to maintain a compact, information-dense UI.

## Layout & Spacing
The layout follows a **Fluid Grid** model with high-density spacing. 

- **Mobile**: 4-column grid with 24px margins. Content is mostly stacked vertically to prioritize the "current task."
- **Desktop**: 12-column grid. Sidebars are used for navigation and calendar overviews, while the central area focuses on the task list.
- **Rhythm**: Use an 8px base unit. Task items should have tight internal padding (12px or 16px) to maximize the number of visible items on screen.

## Elevation & Depth
Depth is created through **Tonal Layers** rather than heavy shadows. 

- **Level 0**: Primary background (`#0B2418`).
- **Level 1**: Cards and Task Items (`#122E21`). These use a subtle 1px border of a slightly lighter green to define edges.
- **Level 2**: Modals and Popovers. These use a "Soft Shadow" (Blur 20px, 15% Opacity, Black) to lift them from the focus area.
- **Glassmorphism**: Use backdrop-blur (12px) on the top navigation bar and horizontal date picker to maintain a sense of context while scrolling content.

## Shapes
The design system employs a "Hyper-Rounded" strategy for containers to contrast with the sharp, professional typography.

- **Main Cards**: Use a fixed `1.5rem` (24px) radius to create a friendly, tactile feel for complex data.
- **Interactive Elements**: Buttons and inputs follow a `0.5rem` (8px) radius for a more precise, tool-like appearance.
- **Pills**: Toggles and Status Tags are always fully rounded (pill-shaped) to distinguish them as atomic, non-container elements.

## Components
- **Task Cards**: Use the Level 1 surface. Feature a high-contrast accent bar on the left side to denote the category color. 
- **Status Labels**: Small, pill-shaped chips with background colors corresponding to the status (e.g., Red for "Deadline"). Text should be high-contrast (White or Dark Green depending on the pill brightness).
- **Toggle Switches**: Pill-shaped tracks. The "On" state uses the Lime Yellow accent for the track to indicate high energy/activity.
- **Date Picker**: A horizontal scrolling strip. The "Selected Day" is encapsulated in a Lime Yellow circle with Dark Green text, while unselected days remain neutral light grey.
- **Buttons**:
  - *Primary*: Solid Lime Yellow with Dark Green text.
  - *Secondary*: Ghost style with Lime Yellow border and text.
- **Input Fields**: Darker surface than the card background, using the Lime Yellow for the focus border.