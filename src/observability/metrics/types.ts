export type MetricsValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | object;

export interface MetricsStateMap {
  [key: string]: MetricsValue;
}

export interface MetricsChange {
  key: string;
  before: MetricsValue;
  after: MetricsValue;
}

export interface MetricsUpdate {
  changes: MetricsChange[];
  snapshot: MetricsStateMap;
}
