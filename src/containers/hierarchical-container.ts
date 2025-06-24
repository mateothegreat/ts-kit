/**
 * @description Provides a generic hierarchical container for managing parent-child relationships with nested nodes.
 */

/**
 * HierarchicalContainer class.
 * Manages a tree-like structure where each node is itself a HierarchicalContainer, allowing for infinite nesting.
 * Each container has a unique ID, a value of type T, and child containers.
 * It also maintains a reference to its parent container for easy upward traversal.
 *
 * @template T The type of the value stored within the container.
 */
export class HierarchicalContainer<T> {
  private static nextGlobalId: number = 1;

  public readonly id: string;
  public value: T;
  public readonly children: HierarchicalContainer<T>[] = [];
  public parent: HierarchicalContainer<T> | null = null;

  /**
   * Constructs a new HierarchicalContainer.
   *
   * @param value The value for this container.
   * @param parent The parent container, if any.
   * @throws Error if the value is null or undefined.
   */
  constructor(
    id?: string,
    value?: T,
    parent: HierarchicalContainer<T> | null = null
  ) {
    this.id = id || this.generateUniqueId();
    this.value = value ?? ({} as T);
    this.parent = parent;
  }

  /**
   * Generates a unique ID for a new container.
   * For simplicity, this uses a global counter. For production, consider a robust UUID library.
   * @private
   * @returns A unique string ID.
   */
  private generateUniqueId(): string {
    return `node-${HierarchicalContainer.nextGlobalId++}`;
  }

  /**
   * Returns the root container of the hierarchy.
   * @returns The root HierarchicalContainer<T>.
   */
  public getRoot(): HierarchicalContainer<T> {
    let current: HierarchicalContainer<T> = this;
    while (current.parent !== null) {
      current = current.parent;
    }
    return current;
  }

  /**
   * Adds a new child container to this container.
   *
   * @param newContainerValue The value for the new container.
   * @returns The newly created HierarchicalContainer<T> object.
   */
  public addChild(id: string, newContainerValue: T): HierarchicalContainer<T> {
    const newContainer = new HierarchicalContainer(id, newContainerValue, this);
    this.children.push(newContainer);
    return newContainer;
  }

  /**
   * Adds a new container to the hierarchy by finding the parent by ID.
   * If `parentId` is null, the new container is added as a child of the root.
   *
   * @param parentId The ID of the parent container to attach the new container to. If null, attaches to root.
   * @param newContainerValue The value for the new container.
   * @returns The newly created HierarchicalContainer<T> object, or null if the parent was not found.
   */
  public add(
    parentId: string | null,
    newContainerValue: T
  ): HierarchicalContainer<T> | null {
    const root = this.getRoot();
    const parentContainer = parentId === null ? root : root.findById(parentId);

    if (!parentContainer) {
      console.error(`Parent with ID ${parentId} not found.`);
      return null;
    }

    return parentContainer.addChild(this.generateUniqueId(), newContainerValue);
  }

  /**
   * Removes this container from its parent, effectively removing it and all its descendants from the hierarchy.
   * If this is the root container, its children are cleared but the root itself remains.
   *
   * @returns True if the container was successfully removed, false otherwise.
   */
  public removeSelf(): boolean {
    if (this.parent === null) {
      // If this is the root, clear its children instead of removing itself
      this.children.length = 0;
      console.warn(
        "Attempted to remove the root container. Its children have been cleared."
      );
      return true;
    }

    const parentChildren = this.parent.children;
    const index = parentChildren.findIndex((child) => child.id === this.id);

    if (index > -1) {
      parentChildren.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Removes a container and all its descendants from the hierarchy by ID.
   * If the root container is specified, the container effectively becomes empty (except for a new root with its original value).
   *
   * @param containerId The ID of the container to remove.
   * @returns True if the container was successfully removed, false otherwise (e.g., container not found).
   */
  public remove(containerId: string): boolean {
    const root = this.getRoot();
    const containerToRemove = root.findById(containerId);

    if (!containerToRemove) {
      console.error(`Container with ID ${containerId} not found.`);
      return false;
    }

    return containerToRemove.removeSelf();
  }

  /**
   * Updates the value of this container.
   *
   * @param newValue The new value (or partial value if T is an object) for this container.
   */
  public updateValue(newValue: Partial<T>): void {
    // Merge partial update for object types, or replace for primitive types
    if (
      typeof this.value === "object" &&
      this.value !== null &&
      typeof newValue === "object" &&
      newValue !== null
    ) {
      this.value = { ...this.value, ...newValue } as T;
    } else {
      this.value = newValue as T;
    }
  }

  /**
   * Updates the value of a specific container by ID.
   *
   * @param containerId The ID of the container to update.
   * @param newValue The new value (or partial value if T is an object) for the container.
   * @returns True if the container was successfully updated, false otherwise.
   */
  public update(containerId: string, newValue: Partial<T>): boolean {
    const root = this.getRoot();
    const containerToUpdate = root.findById(containerId);
    if (containerToUpdate) {
      containerToUpdate.updateValue(newValue);
      return true;
    }
    return false;
  }

  /**
   * Recursively searches for a container by its ID starting from this container.
   *
   * @param containerId The ID of the container to find.
   * @returns The found HierarchicalContainer<T> or null if not found.
   */
  public findById(containerId: string): HierarchicalContainer<T> | null {
    if (this.id === containerId) {
      return this;
    }
    for (const child of this.children) {
      const found = child.findById(containerId);
      if (found) {
        return found;
      }
    }
    return null;
  }

  /**
   * Recursively searches for all containers that satisfy a given predicate function.
   *
   * @param predicate A function that takes a HierarchicalContainer<T> and returns true if the container should be included in the results.
   * @returns An array of HierarchicalContainer<T> objects that match the condition. Returns an empty array if no matches.
   */
  public findByCondition(
    predicate: (container: HierarchicalContainer<T>) => boolean
  ): HierarchicalContainer<T>[] {
    const results: HierarchicalContainer<T>[] = [];
    this.findByConditionRecursive(predicate, results);
    return results;
  }

  /**
   * Recursively finds all containers that satisfy a given predicate function.
   *
   * @param predicate A function that returns true for containers to be included in the results.
   * @param results An array to accumulate the found containers.
   */
  private findByConditionRecursive(
    predicate: (container: HierarchicalContainer<T>) => boolean,
    results: HierarchicalContainer<T>[]
  ): void {
    if (predicate(this)) {
      results.push(this);
    }
    for (const child of this.children) {
      child.findByConditionRecursive(predicate, results);
    }
  }

  /**
   * Traverses the hierarchy starting from this container.
   *
   * @param callback A function to call for each visited container.
   * @param strategy The traversal strategy: 'dfs' (Depth-First Search, default) or 'bfs' (Breadth-First Search).
   */
  public traverse(
    callback: (container: HierarchicalContainer<T>) => void,
    strategy: "dfs" | "bfs" = "dfs"
  ): void {
    if (strategy === "dfs") {
      const dfs = (container: HierarchicalContainer<T>) => {
        callback(container);
        for (const child of container.children) {
          dfs(child);
        }
      };
      dfs(this);
    } else {
      // BFS
      const queue: HierarchicalContainer<T>[] = [this];
      while (queue.length > 0) {
        const container = queue.shift()!;
        callback(container);
        for (const child of container.children) {
          queue.push(child);
        }
      }
    }
  }

  /**
   * Prints a string representation of the hierarchy, useful for debugging and visualization.
   * Each level of nesting is indicated by indentation.
   *
   * @returns A multi-line string representing the tree structure.
   */
  public printHierarchy(): string {
    let result = "";
    const printContainer = (
      container: HierarchicalContainer<T>,
      level: number
    ) => {
      const indent = "  ".repeat(level);
      result += `${indent}- ${container.id}: ${JSON.stringify(
        container.value
      )}\n`;
      for (const child of container.children) {
        printContainer(child, level + 1);
      }
    };
    printContainer(this, 0);
    return result;
  }

  /**
   * Resets the container, effectively clearing all child containers.
   * This is useful for clearing the tree while maintaining the root container.
   */
  public clear(): void {
    this.children.length = 0;
    // Reset global ID counter if desired, or keep incrementing to ensure global uniqueness over time.
    // HierarchicalContainer.nextGlobalId = 1; // Uncomment if you want to reset global counter
  }

  /**
   * Searches for a container using a dot-notation path string.
   * Follows the StyleSet → Package → Variant hierarchy pattern.
   *
   * @param searchPath A dot-separated path string like "accordion.outline.md"
   * @returns The matching container(s) or null if not found
   */
  public searchByPath(searchPath: string): HierarchicalContainer<T> | null {
    if (!searchPath || searchPath.trim() === "") {
      return null;
    }

    const pathSegments = searchPath.split(".");
    let currentContainer: HierarchicalContainer<T> = this.getRoot();

    // Navigate through each path segment
    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i].trim();
      if (!segment) continue;

      // Search for a child container that matches this segment
      const matchingChild = this.findMatchingChild(currentContainer, segment);

      if (!matchingChild) {
        console.warn(
          `Path segment "${segment}" not found at level ${i} in path "${searchPath}"`
        );
        return null;
      }

      currentContainer = matchingChild;
    }

    return currentContainer;
  }

  /**
   * Searches for all containers that match a dot-notation path string.
   * Useful when multiple containers might match the same path pattern.
   *
   * @param searchPath A dot-separated path string like "*.outline.*" (supports wildcards)
   * @returns An array of matching containers
   */
  public searchAllByPath(searchPath: string): HierarchicalContainer<T>[] {
    if (!searchPath || searchPath.trim() === "") {
      return [];
    }

    const pathSegments = searchPath.split(".");
    const results: HierarchicalContainer<T>[] = [];

    this.searchRecursive(this.getRoot(), pathSegments, 0, results);

    return results;
  }

  /**
   * Helper method to find a child container that matches a given segment.
   * This method should be customized based on how you want to match segments
   * against your container values (StyleSet, Package, Variant).
   */
  private findMatchingChild(
    parent: HierarchicalContainer<T>,
    segment: string
  ): HierarchicalContainer<T> | null {
    for (const child of parent.children) {
      if (this.containerMatchesSegment(child, segment)) {
        return child;
      }
    }
    return null;
  }

  /**
   * Determines if a container matches a path segment.
   * Override this method to customize matching logic for your specific types.
   *
   * @param container The container to check
   * @param segment The path segment to match against
   * @returns True if the container matches the segment
   */
  private containerMatchesSegment(
    container: HierarchicalContainer<T>,
    segment: string
  ): boolean {
    // Default implementation - you should customize this based on your needs

    // If the value is an object with a 'name' property, match against that
    if (typeof container.value === "object" && container.value !== null) {
      const valueObj = container.value as any;

      // Check for common naming properties
      if (valueObj.name === segment) return true;
      if (valueObj.key === segment) return true;
      if (valueObj.id === segment) return true;

      // For StyleSet/Package/Variant pattern, you might want to check specific properties
      // This is where you'd add custom logic for your hierarchy
    }

    // If the value is a string, match directly
    if (typeof container.value === "string" && container.value === segment) {
      return true;
    }

    // Fallback: convert value to string and compare
    try {
      const valueString = JSON.stringify(container.value);
      if (valueString.includes(segment)) {
        return true;
      }
    } catch {
      // Ignore JSON serialization errors
    }

    return false;
  }

  /**
   * Recursive helper for searchAllByPath with wildcard support.
   */
  private searchRecursive(
    currentContainer: HierarchicalContainer<T>,
    pathSegments: string[],
    segmentIndex: number,
    results: HierarchicalContainer<T>[]
  ): void {
    // If we've processed all segments, we found a match
    if (segmentIndex >= pathSegments.length) {
      results.push(currentContainer);
      return;
    }

    const currentSegment = pathSegments[segmentIndex].trim();

    // Handle wildcard segments
    if (currentSegment === "*") {
      // Wildcard matches any child, continue with all children
      for (const child of currentContainer.children) {
        this.searchRecursive(child, pathSegments, segmentIndex + 1, results);
      }
      return;
    }

    // Regular segment matching
    for (const child of currentContainer.children) {
      if (this.containerMatchesSegment(child, currentSegment)) {
        this.searchRecursive(child, pathSegments, segmentIndex + 1, results);
      }
    }
  }

  /**
   * Specialized search method for StyleSet → Package → Variant hierarchy.
   * Assumes the container values follow this specific pattern.
   *
   * @param searchPath Path like "accordion.outline.md"
   * @returns The matching variant container or null
   */
  public searchStyleSetPath(
    searchPath: string
  ): HierarchicalContainer<T> | null {
    const pathSegments = searchPath.split(".");

    if (pathSegments.length !== 3) {
      console.warn(
        "StyleSet search path must have exactly 3 segments: styleset.package.variant"
      );
      return null;
    }

    const [styleSetName, packageName, variantName] = pathSegments;

    // Start from root and find the StyleSet
    const root = this.getRoot();
    const styleSetContainer = this.findChildByName(root, styleSetName);
    if (!styleSetContainer) {
      console.warn(`StyleSet "${styleSetName}" not found`);
      return null;
    }

    // Find the Package within the StyleSet
    const packageContainer = this.findChildByName(
      styleSetContainer,
      packageName
    );
    if (!packageContainer) {
      console.warn(
        `Package "${packageName}" not found in StyleSet "${styleSetName}"`
      );
      return null;
    }

    // Find the Variant within the Package
    const variantContainer = this.findChildByName(
      packageContainer,
      variantName
    );
    if (!variantContainer) {
      console.warn(
        `Variant "${variantName}" not found in Package "${packageName}"`
      );
      return null;
    }

    return variantContainer;
  }

  /**
   * Helper method to find a child by name property.
   * Customize this based on how your objects store their names.
   */
  private findChildByName(
    parent: HierarchicalContainer<T>,
    name: string
  ): HierarchicalContainer<T> | null {
    for (const child of parent.children) {
      // Customize this logic based on how your StyleSet/Package/Variant objects store names
      const value = child.value as any;

      // Check various possible name properties
      if (
        value?.name === name ||
        value?.key === name ||
        value?.id === name ||
        value?.constructor?.name?.toLowerCase() === name.toLowerCase()
      ) {
        return child;
      }
    }
    return null;
  }
}
