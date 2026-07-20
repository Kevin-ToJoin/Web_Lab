// ─── ISTQB classification ─────────────────────────────────────────────────
// Every curated bug is tagged so the QA Inspector can teach the vocabulary
// while the learner hunts. Four axes, mirroring ISTQB / ISO 25010:
export type TestType = 'Functional' | 'Non-functional';

// Learner-friendly quality characteristics (ISO 25010, lightly renamed).
export type QualityCharacteristic =
  | 'Functional correctness'   // the logic/calculation/rule produces the right result
  | 'Input validation'         // boundaries, equivalence classes, malformed input
  | 'Data integrity'           // data stays correct across time, flow, and state
  | 'Usability'                // clarity, feedback, content, wording, workflow
  | 'Accessibility'            // keyboard, screen-reader, contrast
  | 'Security'                 // privacy, injection, authz, session, abuse
  | 'Performance'              // efficiency, resource use, leaks
  | 'Compatibility'            // responsive, cross-device, layout
  | 'Reliability';             // error handling, races, timing, recovery

// The test-design technique a QA would use to catch it.
export type TestDesign =
  | 'Boundary Value Analysis'
  | 'Equivalence Partitioning'
  | 'Decision Table'
  | 'State Transition'
  | 'Error Guessing'
  | 'Checklist / Heuristic'
  | 'Exploratory';

// Where the defect lives (ISTQB test levels, applied to a front-end sandbox).
export type TestLevel =
  | 'Unit'          // an isolated calculation / validation
  | 'Integration'   // data flowing across components or screens
  | 'System';       // a full user journey

export interface KnownBug {
  id: string;
  appId: string;
  title: string;
  keywords: string[];   // words used for fuzzy matching against user report titles
  level: number;        // difficulty 1–10
  technique: string;    // short defect-type label (headline on the card)
  // ISTQB tags — optional during migration, populated app-by-app.
  testType?: TestType;
  characteristic?: QualityCharacteristic;
  testDesign?: TestDesign;
  testLevel?: TestLevel;
}
