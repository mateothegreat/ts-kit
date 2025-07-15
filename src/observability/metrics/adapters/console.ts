import type { MetricsUpdate } from "../types";

export const printer = (update: MetricsUpdate): void => {
  console.group("🔍 Metrics Update");
  update.changes.forEach((change) =>
    console.log(`🟡 ${change.key}: ${change.before} → ${change.after}`)
  );
  console.groupEnd();
};
