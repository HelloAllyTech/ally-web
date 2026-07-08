/**
 * Expression Tree Helpers
 * Utilities for manipulating combination expression trees
 */

import {
  CombinationExpressionNode,
  CombinationOperator,
  EventStatus,
  EVENT_STATUS,
  COMBINATION_OPERATOR,
} from "@types";

/**
 * Get event ID from a node (handles NOT wrapper)
 */
export const getEventIdFromNode = (node: CombinationExpressionNode | undefined): string => {
  if (!node) return "";
  if (node.type === "NOT" && node.left) {
    return node.left.id || "";
  }
  return node.id || "";
};

/**
 * Get event name from a node (handles NOT wrapper)
 */
export const getEventNameFromNode = (node: CombinationExpressionNode | undefined): string => {
  if (!node) return "";
  if (node.type === "NOT" && node.left) {
    return node.left.eventCode
      ? `${node.left.eventCode} - ${node.left.name}`
      : node.left.name || "";
  }
  return node.eventCode ? `${node.eventCode} - ${node.name}` : node.name || "";
};

/**
 * Get status from a node
 */
export const getStatusFromNode = (node: CombinationExpressionNode | undefined): EventStatus => {
  if (!node) return EVENT_STATUS.OCCURRED;
  return node.type === "NOT" ? EVENT_STATUS.NOT_OCCURRED : EVENT_STATUS.OCCURRED;
};

/**
 * Build a condition node (handles NOT status)
 */
export const buildConditionNode = (
  eventId: string,
  status: EventStatus,
  name?: string,
): CombinationExpressionNode => {
  return status === EVENT_STATUS.NOT_OCCURRED
    ? { type: "NOT", left: { id: eventId, name } }
    : { id: eventId, name };
};

/**
 * Check if a node is a leaf (event) node
 */
export const isLeafNode = (node: CombinationExpressionNode | undefined): boolean => {
  if (!node) return false;
  const isOperator =
    node.type === COMBINATION_OPERATOR.AND || node.type === COMBINATION_OPERATOR.OR;
  return !isOperator;
};

/**
 * Check if a node is an operator node
 */
export const isOperatorNode = (node: CombinationExpressionNode | undefined): boolean => {
  if (!node) return false;
  return node.type === COMBINATION_OPERATOR.AND || node.type === COMBINATION_OPERATOR.OR;
};

/**
 * Get all event IDs from an expression tree
 */
export const getAllEventIds = (node: CombinationExpressionNode | undefined): string[] => {
  if (!node) return [];

  const eventIds: string[] = [];

  const traverse = (n: CombinationExpressionNode) => {
    if (isLeafNode(n)) {
      const eventId = getEventIdFromNode(n);
      if (eventId) {
        eventIds.push(eventId);
      }
    } else if (isOperatorNode(n)) {
      if (n.left) traverse(n.left);
      if (n.right) traverse(n.right);
    }
  };

  traverse(node);
  return eventIds;
};

/**
 * Update a node at a specific path in the expression tree
 */
export const updateNodeAtPath = (
  root: CombinationExpressionNode,
  targetPath: string,
  updater: (node: CombinationExpressionNode) => CombinationExpressionNode,
): CombinationExpressionNode => {
  if (targetPath === "root") {
    return updater(root);
  }

  const pathParts = targetPath.split(".").slice(1); // Remove 'root'

  const updateRecursive = (
    node: CombinationExpressionNode,
    parts: string[],
  ): CombinationExpressionNode => {
    if (parts.length === 0) {
      return updater(node);
    }

    const [current, ...rest] = parts;
    if (current === "left" && node.left) {
      return { ...node, left: updateRecursive(node.left, rest) };
    }
    if (current === "right" && node.right) {
      return { ...node, right: updateRecursive(node.right, rest) };
    }

    return node;
  };

  return updateRecursive(root, pathParts);
};

/**
 * Get a node at a specific path
 */
export const getNodeAtPath = (
  root: CombinationExpressionNode | undefined,
  targetPath: string,
): CombinationExpressionNode | undefined => {
  if (!root) return undefined;
  if (targetPath === "root") return root;

  const pathParts = targetPath.split(".").slice(1); // Remove 'root'

  const getRecursive = (
    node: CombinationExpressionNode,
    parts: string[],
  ): CombinationExpressionNode | undefined => {
    if (parts.length === 0) return node;

    const [current, ...rest] = parts;
    if (current === "left" && node.left) {
      return getRecursive(node.left, rest);
    }
    if (current === "right" && node.right) {
      return getRecursive(node.right, rest);
    }

    return undefined;
  };

  return getRecursive(root, pathParts);
};

/**
 * Delete a node at a specific path
 */
export const deleteNodeAtPath = (
  root: CombinationExpressionNode,
  targetPath: string,
): CombinationExpressionNode => {
  if (targetPath === "root") {
    return { id: "" };
  }

  const pathParts = targetPath.split(".");
  const parentPath = pathParts.slice(0, -1).join(".");
  const side = pathParts[pathParts.length - 1] as "left" | "right";

  return updateNodeAtPath(root, parentPath, node => {
    if (side === "left" && node.right) {
      return node.right;
    }
    if (side === "right" && node.left) {
      return node.left;
    }
    return { id: "" };
  });
};

/**
 * Add a sibling node at a specific path
 * This creates a new operator node with the current node and new sibling
 */
export const addSiblingAtPath = (
  root: CombinationExpressionNode,
  targetPath: string,
  newNode: CombinationExpressionNode,
  operator: CombinationOperator = COMBINATION_OPERATOR.AND,
): CombinationExpressionNode => {
  if (targetPath === "root") {
    // If adding sibling to root, create new root with old root and new node
    return {
      type: operator,
      left: root,
      right: newNode,
    };
  }

  const pathParts = targetPath.split(".");
  const parentPath = pathParts.slice(0, -1).join(".");
  const side = pathParts[pathParts.length - 1] as "left" | "right";

  return updateNodeAtPath(root, parentPath, parentNode => {
    const currentNode = side === "left" ? parentNode.left : parentNode.right;

    // Create new operator node with current node and new sibling
    const newOperatorNode: CombinationExpressionNode = {
      type: operator,
      left: currentNode!,
      right: newNode,
    };

    // Replace the current node with the new operator node in parent
    if (side === "left") {
      return { ...parentNode, left: newOperatorNode };
    } else {
      return { ...parentNode, right: newOperatorNode };
    }
  });
};

/**
 * Node with metadata for rendering
 */
export interface NodeWithMetadata {
  node: CombinationExpressionNode;
  path: string;
  depth: number;
  parentOperator?: CombinationOperator;
  index: number;
}

/**
 * Flatten expression tree into a list of nodes with metadata
 */
export const flattenExpression = (
  node: CombinationExpressionNode | undefined,
  path: string = "root",
  depth: number = 0,
  parentOperator?: CombinationOperator,
  index: number = 0,
): NodeWithMetadata[] => {
  if (!node) return [];

  const isOperator = isOperatorNode(node);
  const isLeaf = isLeafNode(node);

  if (isLeaf) {
    return [{ node, path, depth, parentOperator, index }];
  }

  if (isOperator && node.type) {
    const operatorType = node.type as CombinationOperator;
    const leftNodes = flattenExpression(node.left, `${path}.left`, depth + 1, operatorType, index);
    const rightIndex = index + leftNodes.length + 1;
    const rightNodes = flattenExpression(
      node.right,
      `${path}.right`,
      depth + 1,
      operatorType,
      rightIndex,
    );
    return [{ node, path, depth, parentOperator, index }, ...leftNodes, ...rightNodes];
  }

  return [];
};

/**
 * Get all leaf nodes (events) from expression tree
 */
export const getAllLeafNodes = (
  node: CombinationExpressionNode | undefined,
): CombinationExpressionNode[] => {
  if (!node) return [];

  const leaves: CombinationExpressionNode[] = [];

  const traverse = (n: CombinationExpressionNode) => {
    if (isLeafNode(n)) {
      leaves.push(n);
    } else if (isOperatorNode(n)) {
      if (n.left) traverse(n.left);
      if (n.right) traverse(n.right);
    }
  };

  traverse(node);
  return leaves;
};

/**
 * Group nodes by creating a new operator node
 * Creates a new nested level with selected nodes as children
 */
export const groupNodes = (
  nodes: CombinationExpressionNode[],
  operator: CombinationOperator = COMBINATION_OPERATOR.AND,
): CombinationExpressionNode => {
  if (nodes.length === 0) return { id: "" };
  if (nodes.length === 1) return nodes[0];

  // Create grouped expression
  let groupedNode: CombinationExpressionNode = {
    type: operator,
    left: nodes[0],
    right: nodes[1],
  };

  // Add remaining nodes
  for (let i = 2; i < nodes.length; i++) {
    groupedNode = {
      type: operator,
      left: groupedNode,
      right: nodes[i],
    };
  }

  return groupedNode;
};

/**
 * Get sibling nodes at the same depth
 */
export const getSiblingPaths = (root: CombinationExpressionNode, targetPath: string): string[] => {
  const allNodes = flattenExpression(root);
  const targetNode = allNodes.find(n => n.path === targetPath);

  if (!targetNode) return [];

  return allNodes.filter(n => n.depth === targetNode.depth && isLeafNode(n.node)).map(n => n.path);
};

/**
 * Validate expression tree
 * Ensures all leaf nodes have event IDs and operator nodes have both children
 */
export const validateExpression = (node: CombinationExpressionNode | undefined): boolean => {
  if (!node) return false;

  if (node.type === "NOT") {
    return validateExpression(node.left);
  }

  if (isOperatorNode(node)) {
    return !!(
      node.left &&
      node.right &&
      validateExpression(node.left) &&
      validateExpression(node.right)
    );
  }

  return !!node.id;
};

/**
 * Count total conditions in expression
 */
export const countConditions = (node: CombinationExpressionNode | undefined): number => {
  if (!node) return 0;

  if (isLeafNode(node)) {
    return getEventIdFromNode(node) ? 1 : 0;
  }

  if (isOperatorNode(node)) {
    return countConditions(node.left) + countConditions(node.right);
  }

  return 0;
};

/**
 * Get depth of expression tree
 */
export const getTreeDepth = (node: CombinationExpressionNode | undefined): number => {
  if (!node) return 0;

  if (isLeafNode(node)) {
    return 1;
  }

  if (isOperatorNode(node)) {
    const leftDepth = getTreeDepth(node.left);
    const rightDepth = getTreeDepth(node.right);
    return Math.max(leftDepth, rightDepth) + 1;
  }

  return 0;
};

/**
 * Clone expression tree
 */
export const cloneExpression = (
  node: CombinationExpressionNode | undefined,
): CombinationExpressionNode | undefined => {
  if (!node) return undefined;

  return {
    ...node,
    left: node.left ? cloneExpression(node.left) : undefined,
    right: node.right ? cloneExpression(node.right) : undefined,
  };
};

/**
 * Pretty print expression for debugging
 */
export const printExpression = (
  node: CombinationExpressionNode | undefined,
  indent: number = 0,
): string => {
  if (!node) return "";

  const spacing = "  ".repeat(indent);

  if (isLeafNode(node)) {
    const eventId = getEventIdFromNode(node);
    const status = getStatusFromNode(node);
    return `${spacing}Event: ${eventId} (${status})\n`;
  }

  if (isOperatorNode(node)) {
    let result = `${spacing}${node.type}:\n`;
    if (node.left) {
      result += printExpression(node.left, indent + 1);
    }
    if (node.right) {
      result += printExpression(node.right, indent + 1);
    }
    return result;
  }

  return "";
};

export const renderOperatorColor = (depth: number) => {
  switch (depth) {
    case 4:
      return "bg-orange-50  border-orange-500";
    case 3:
      return "bg-yellow-50  border-yellow-500";
    case 2:
      return "bg-red-50  border-red-500";
    case 1:
      return "bg-[#E8F5E9] border-green-500";
    case 0:
      return "bg-primary-100  border-primary-500";
    default:
      return "bg-primary-50  border-primary-500";
  }
};

export const getBorderColor = (depth: number) => {
  switch (depth) {
    case 4:
      return "border-l-orange-300";
    case 3:
      return "border-l-yellow-400";
    case 2:
      return "border-l-red-300";
    case 1:
      return "border-l-green-500";
    case 0:
      return "border-l-primary-300";
    default:
      return "border-l-primary-300";
  }
};
