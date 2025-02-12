import { FunctionComponent } from "react";

const TypingIndicator: FunctionComponent = () => {
  return (
    <div className="flex space-x-1">
      <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce delay-0"></span>
      <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
      <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
    </div>
  );
};

export default TypingIndicator;
