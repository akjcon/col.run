/**
 * Shared animation primitives.
 *
 * Single source of truth for easing curves and timing across the app.
 * Per Emil's design playbook: ease-out for enters/exits, ease-in-out for
 * elements moving on screen, plain `ease` for hover/color transitions.
 *
 * Cubic-bezier values come from the standard "Penner easing" set.
 */

export const easing = {
  // Soft, friendly — good default for entrance/exit transitions
  outQuad: [0.25, 0.46, 0.45, 0.94] as const,
  // Slightly more pronounced — good for cards and accordion content
  outCubic: [0.215, 0.61, 0.355, 1] as const,
  // Stronger settle — good for primary buttons and confirmation states
  outQuart: [0.165, 0.84, 0.44, 1] as const,
  // Most pronounced — for hero/landing page entrances
  outQuint: [0.23, 1, 0.32, 1] as const,
  // For elements that move across the screen rather than entering/exiting
  inOutCubic: [0.645, 0.045, 0.355, 1] as const,
} as const;

export const duration = {
  micro: 0.1, // micro-interactions, e.g. button press
  fast: 0.15, // tooltips, hover transitions
  normal: 0.2, // standard ui transitions
  medium: 0.25, // accordion content, modals
  slow: 0.3, // larger spatial moves
  page: 0.4, // page transitions
} as const;
