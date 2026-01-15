import React from "react";

import { CombinationExpressionNode } from "@types";
import { isOperatorNode, getEventNameFromNode } from "@utils";

interface GeneratedExpressionViewProps {
  node: CombinationExpressionNode;
  leafNodePaths: string[];
}

export const GeneratedExpressionView = ({ node, leafNodePaths }: GeneratedExpressionViewProps) => {
  const renderNode = (
    n: CombinationExpressionNode | undefined,
    path: string = "root",
  ): React.ReactNode => {
    if (!n) {
      return <span className="text-red-500 text-sm mx-1"> ? </span>;
    }

    // Handle NOT wrapper
    if (n.type === "NOT") {
      return (
        <React.Fragment key={path}>
          <span className="text-primary-500 mx-1 text-xs">!</span>
          {renderNode(n.left, path)}
        </React.Fragment>
      );
    }

    // Handle operator nodes (AND/OR)
    if (isOperatorNode(n)) {
      return (
        <span key={path} className="text-typography-900">
          ( {renderNode(n.left, `${path}.left`)}
          <span className="text-primary-500 mx-1 text-xs">{n.type}</span>
          {renderNode(n.right, `${path}.right`)} )
        </span>
      );
    }

    // Handle leaf nodes
    if (!n.id) {
      return (
        <span key={path} className="text-red-500 text-sm mx-1">
          {" "}
          ?{" "}
        </span>
      );
    }

    const leafIndex = leafNodePaths.indexOf(path);

    return (
      <span key={path} className="text-typography-900 text-sm mx-1">
        {leafIndex !== -1 ? `E${leafIndex + 1}` : getEventNameFromNode(n)}
      </span>
    );
  };

  return (
    <div className="mt-[14px] rounded-[2px] min-h-[20px] flex items-center  bg-white border-[0.5px] border-border  font-mono">
      <span className="text-xs px-2 h-full align-middle vertical-align-middle py-2 mr-1 text-typography-900 bg-neutral-100 border-r-[0.5px] border-border">
        Expression
      </span>
      <span className="mr-1 px-2 py-1 text-sm">{renderNode(node)}</span>
    </div>
  );
};
