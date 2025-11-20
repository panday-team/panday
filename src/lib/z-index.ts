/**
 * Centralized z-index management for consistent layering across the app
 *
 * Layers (bottom to top):
 * - Roadmap canvas and background (-1 to 10)
 * - Chat widget (40-50)
 * - Profile card (60)
 * - Node info panel (9000-9001)
 * - Tutorial system (9997-10003)
 */
export const Z_INDEX = {
  // Roadmap canvas layer
  roadmapBackground: -1,
  roadmapCanvas: 0,
  reactFlowControls: 10,

  // Main UI elements (desktop z-indexes when tutorial is not active)
  chatWidget: 40,
  chatWidgetExpanded: 50,
  profileCard: 60,

  // Node info panel
  nodeInfoPanelBackdrop: 8999, // Mobile backdrop
  nodeInfoPanel: 9000,

  // Tutorial system (highest layer)
  tutorialBackdrop: 9997,
  tutorialOverlay: 9998,
  tutorialSpotlight: 9999,
  tutorialCard: 10003,

  // When tutorial is active, other UI elements should be lowered
  chatWidgetDuringTutorial: 90,
  profileCardDuringTutorial: 80,
  nodeInfoPanelDuringTutorial: 100,
} as const;

export type ZIndexKey = keyof typeof Z_INDEX;
