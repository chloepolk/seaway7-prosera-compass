export type LeverCategory = "customer-mix" | "pricing" | "fuel" | "nte";

export interface ScenarioState {
  customerMix: { exitDogs: number; addStars: number };
  pricing: { laborMultiplier: number; materialMarkupPct: number };
  fuel: { pricePerGal: number };
  nte: { thresholdMultiplier: number };
}

export interface ScenarioProjection {
  revenueDelta: number;
  marginDelta: number;
  marginPtsDelta: number;
  ebitdaDeltaBps: number;
  freedTruckRolls: number;
  affectedCustomers: string[];
  affectedJobs: number;
}

export interface SavedScenario {
  id: string;
  name: string;
  state: ScenarioState;
  projection: ScenarioProjection;
  agentExplanation: string;
  timestamp: number;
}

export const DEFAULT_SCENARIO: ScenarioState = {
  customerMix: { exitDogs: 0, addStars: 0 },
  pricing: { laborMultiplier: 0, materialMarkupPct: 0 },
  fuel: { pricePerGal: 0 },
  nte: { thresholdMultiplier: 1.0 },
};
