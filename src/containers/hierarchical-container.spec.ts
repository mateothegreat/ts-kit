import { beforeEach, describe, expect, it } from "vitest";
import { HierarchicalContainer } from "./hierarchical-container";

interface MyData {
  name: string;
  age?: number;
}

describe("HierarchicalContainer", () => {
  let container: HierarchicalContainer<MyData>;
  let rootContainer: HierarchicalContainer<MyData>;
  let child1: HierarchicalContainer<MyData>;
  let child2: HierarchicalContainer<MyData>;
  let nestedChild: HierarchicalContainer<MyData>;

  // Setup a fresh container before each test
  beforeEach(() => {
    container = new HierarchicalContainer<MyData>("root", { name: "Root" });
    rootContainer = container;

    child1 = container.addChild("child1", { name: "Child 1" });
    child2 = container.addChild("child2", { name: "Child 2", age: 30 });
    nestedChild = child1.addChild("nestedChild", {
      name: "Nested Child",
      age: 10,
    });
  });

  it("should initialize with a root container", () => {
    expect(container.getRoot()).toBeDefined();
    expect(container.getRoot().value).toEqual({ name: "Root" });
    expect(container.getRoot().parent).toBeNull();
    expect(container.getRoot().children).toHaveLength(2);
  });

  it("should throw an error if value is null or undefined", () => {
    expect(
      () => new HierarchicalContainer(null as any, { name: "Root" })
    ).toThrow("Container must have a value.");
    expect(
      () => new HierarchicalContainer(undefined as any, { name: "Root" })
    ).toThrow("Container must have a value.");
  });

  describe("addChild method", () => {
    it("should add a child to the root container", () => {
      const newChild = container.addChild("newChild", { name: "New Child" });
      expect(newChild).not.toBeNull();
      expect(newChild.value).toEqual({ name: "New Child" });
      expect(newChild.parent?.id).toBe(container.id);
      expect(container.children).toContain(newChild);
      expect(container.children).toHaveLength(3); // Root + 2 original + 1 new
    });

    it("should add a nested child to an existing container", () => {
      const anotherNested = nestedChild.addChild("anotherNested", {
        name: "Another Nested",
      });
      expect(anotherNested).not.toBeNull();
      expect(anotherNested.value).toEqual({ name: "Another Nested" });
      expect(anotherNested.parent?.id).toBe(nestedChild.id);
      expect(nestedChild.children).toContain(anotherNested);
      expect(nestedChild.children).toHaveLength(1);
    });
  });

  describe("add method (legacy)", () => {
    it("should add a child to the root container", () => {
      const newChild = container.add("newChild", { name: "New Child" });
      expect(newChild).not.toBeNull();
      expect(newChild?.value).toEqual({ name: "New Child" });
      expect(newChild?.parent?.id).toBe(container.id);
      expect(container.children).toContain(newChild);
      expect(container.children).toHaveLength(3); // Root + 2 original + 1 new
    });

    it("should add a nested child to an existing container", () => {
      const anotherNested = container.add("anotherNested", {
        name: "Another Nested",
      });
      expect(anotherNested).not.toBeNull();
      expect(anotherNested?.id).toBe("anotherNested");
      expect(anotherNested?.value).toEqual({ name: "Another Nested" });
      expect(anotherNested?.parent?.id).toBe(nestedChild.id);
      expect(nestedChild.children).toContain(anotherNested);
      expect(nestedChild.children).toHaveLength(1);
    });

    it("should return null if parentId is not found", () => {
      const nonExistentId = "non-existent-id";
      const newChild = container.add("newChild", { name: "Orphan" });
      expect(newChild).toBeNull();
    });
  });

  describe("findById method", () => {
    it("should find the root container", () => {
      const found = container.findById(container.id);
      expect(found).not.toBeNull();
      expect(found?.value).toEqual({ name: "Root" });
    });

    it("should find a direct child container", () => {
      const found = container.findById(child1.id);
      expect(found).not.toBeNull();
      expect(found?.value).toEqual({ name: "Child 1" });
      expect(found?.parent?.id).toBe(container.id);
    });

    it("should find a deeply nested child container", () => {
      const found = container.findById(nestedChild.id);
      expect(found).not.toBeNull();
      expect(found?.value).toEqual({ name: "Nested Child", age: 10 });
      expect(found?.parent?.id).toBe(child1.id);
    });

    it("should return null if the container is not found", () => {
      const found = container.findById("non-existent-id");
      expect(found).toBeNull();
    });
  });

  describe("removeSelf method", () => {
    it("should remove a leaf container", () => {
      const result = child2.removeSelf();
      expect(result).toBe(true);
      expect(container.findById(child2.id)).toBeNull();
      expect(container.children).toHaveLength(1); // Only child1 remains
    });

    it("should remove a parent container and all its descendants", () => {
      const result = child1.removeSelf();
      expect(result).toBe(true);
      expect(container.findById(child1.id)).toBeNull();
      expect(container.findById(nestedChild.id)).toBeNull(); // Descendant also removed
      expect(container.children).toHaveLength(1); // Only child2 remains
    });

    it("should handle removal of the root container by clearing its children", () => {
      const initialRootChildrenCount = container.children.length;
      expect(initialRootChildrenCount).toBeGreaterThan(0); // Ensure there are children initially

      const result = container.removeSelf();
      expect(result).toBe(true);
      expect(container.value).toEqual({ name: "Root" }); // Root value remains
      expect(container.children).toHaveLength(0); // Children are cleared
      expect(container.findById(child1.id)).toBeNull(); // Old children are gone
    });
  });

  describe("remove method (legacy)", () => {
    it("should remove a leaf container", () => {
      const result = container.remove(child2.id);
      expect(result).toBe(true);
      expect(container.findById(child2.id)).toBeNull();
      expect(container.children).toHaveLength(1); // Only child1 remains
    });

    it("should remove a parent container and all its descendants", () => {
      const result = container.remove(child1.id);
      expect(result).toBe(true);
      expect(container.findById(child1.id)).toBeNull();
      expect(container.findById(nestedChild.id)).toBeNull(); // Descendant also removed
      expect(container.children).toHaveLength(1); // Only child2 remains
    });

    it("should return false if the container to remove is not found", () => {
      const result = container.remove("non-existent-id");
      expect(result).toBe(false);
      // Ensure no changes to the tree
      expect(container.children).toHaveLength(2);
      expect(container.findById(child1.id)).not.toBeNull();
    });
  });

  describe("updateValue method", () => {
    it("should update the value of this container (full replacement for primitives)", () => {
      child1.updateValue({ name: "Updated Child 1" });
      expect(child1.value).toEqual({ name: "Updated Child 1" });
    });

    it("should update the value of this container (partial merge for objects)", () => {
      child2.updateValue({ age: 35 }); // child2 was { name: 'Child 2', age: 30 }
      expect(child2.value).toEqual({ name: "Child 2", age: 35 });
    });
  });

  describe("update method (legacy)", () => {
    it("should update the value of an existing container (full replacement for primitives)", () => {
      container.update("child1", { name: "Updated Child 1" });
      const updatedContainer = container.findById(child1.id);
      expect(updatedContainer?.value).toEqual({ name: "Updated Child 1" });
    });

    it("should update the value of an existing container (partial merge for objects)", () => {
      container.update("child2", { age: 35 }); // child2 was { name: 'Child 2', age: 30 }
      const updatedContainer = container.findById(child2.id);
      expect(updatedContainer?.value).toEqual({ name: "Child 2", age: 35 });
    });

    it("should return false if the container to update is not found", () => {
      const result = container.update("non-existent-id", { name: "Fail" });
      expect(result).toBe(false);
    });

    it("should update the root container value", () => {
      container.update(container.id, { name: "New Root Name" });
      expect(container.value).toEqual({ name: "New Root Name" });
    });
  });

  describe("findByCondition method", () => {
    it("should find containers matching a specific name", () => {
      const result = container.findByCondition((cont) =>
        cont.value.name.includes("Child")
      );
      expect(result).toHaveLength(3); // Child 1, Child 2, Nested Child
      expect(result.map((n) => n.id)).toContain(child1.id);
      expect(result.map((n) => n.id)).toContain(child2.id);
      expect(result.map((n) => n.id)).toContain(nestedChild.id);
    });

    it("should find containers matching a specific age", () => {
      const result = container.findByCondition((cont) => cont.value.age === 10);
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(nestedChild.id);
    });

    it("should return an empty array if no containers match the condition", () => {
      const result = container.findByCondition(
        (cont) => cont.value.name === "Non-existent Name"
      );
      expect(result).toHaveLength(0);
    });

    it("should find the root container if it matches the condition", () => {
      const result = container.findByCondition(
        (cont) => cont.value.name === "Root"
      );
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(container.id);
    });
  });

  describe("traverse method", () => {
    it("should traverse in DFS order", () => {
      const visitedIds: string[] = [];
      container.traverse((cont) => visitedIds.push(cont.id), "dfs");

      // Expected DFS order: Root -> Child 1 -> Nested Child -> Child 2
      const expectedOrderPrefix = [
        container.id,
        child1.id,
        nestedChild.id,
        child2.id,
      ];
      expect(visitedIds).toEqual(expect.arrayContaining(expectedOrderPrefix));
      expect(visitedIds).toHaveLength(4);

      // Verify specific order
      expect(visitedIds[0]).toBe(container.id);
      expect(visitedIds[1]).toBe(child1.id);
      expect(visitedIds[2]).toBe(nestedChild.id);
      expect(visitedIds[3]).toBe(child2.id);
    });

    it("should traverse in BFS order", () => {
      const visitedIds: string[] = [];
      container.traverse((cont) => visitedIds.push(cont.id), "bfs");

      // Expected BFS order: Root -> Child 1 -> Child 2 -> Nested Child
      expect(visitedIds).toEqual(
        expect.arrayContaining([
          container.id,
          child1.id,
          child2.id,
          nestedChild.id,
        ])
      );
      expect(visitedIds).toHaveLength(4);

      // Verify specific order
      expect(visitedIds[0]).toBe(container.id);
      expect([visitedIds[1], visitedIds[2]]).toEqual(
        expect.arrayContaining([child1.id, child2.id])
      );
      expect(visitedIds[3]).toBe(nestedChild.id); // Nested child is level 2
    });

    it("should traverse an empty tree (after clearing children)", () => {
      container.clear(); // Clear all children
      const visitedIds: string[] = [];
      container.traverse((cont) => visitedIds.push(cont.id));
      expect(visitedIds).toEqual([container.id]); // Only root remains
    });
  });

  describe("printHierarchy method", () => {
    it("should return a string representation of the hierarchy", () => {
      const hierarchyString = container.printHierarchy();
      expect(hierarchyString).toContain(`- ${container.id}: {"name":"Root"}`);
      expect(hierarchyString).toContain(`  - ${child1.id}: {"name":"Child 1"}`);
      expect(hierarchyString).toContain(
        `    - ${nestedChild.id}: {"name":"Nested Child","age":10}`
      );
      expect(hierarchyString).toContain(
        `  - ${child2.id}: {"name":"Child 2","age":30}`
      );
      expect(
        hierarchyString.split("\n").filter((line) => line.trim() !== "")
      ).toHaveLength(4);
    });

    it("should correctly represent an empty hierarchy (only root)", () => {
      container.clear(); // Clears all children
      const hierarchyString = container.printHierarchy();
      expect(hierarchyString).toBe(`- ${container.id}: {"name":"Root"}\n`);
    });
  });

  describe("clear method", () => {
    it("should clear all children from the root container", () => {
      expect(container.children).toHaveLength(2);
      container.clear();
      expect(container.children).toHaveLength(0);
      expect(container.findById(child1.id)).toBeNull(); // Verify old children are gone
      expect(container.findById(nestedChild.id)).toBeNull();
    });

    it("should maintain ID uniqueness after clearing (global counter continues)", () => {
      // After clearing, the next generated ID should continue the global sequence
      container.clear();
      const firstNewChild = container.addChild("firstNewChild", {
        name: "First after clear",
      });
      const secondNewChild = container.addChild("secondNewChild", {
        name: "Second after clear",
      });

      // IDs should continue from global counter, not reset to 1
      expect(parseInt(firstNewChild.id.split("-")[1])).toBeGreaterThan(4);
      expect(parseInt(secondNewChild.id.split("-")[1])).toBeGreaterThan(
        parseInt(firstNewChild.id.split("-")[1])
      );
    });
  });
});
