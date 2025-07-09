export * from "./containers";
export * from "./fs";

// Also export as a namespace for compatibility
import { HierarchicalContainer } from "./containers";
import { ensure, write } from "./fs";

export const tskit = {
  HierarchicalContainer,
  fs: {
    ensure,
    write,
  },
};
