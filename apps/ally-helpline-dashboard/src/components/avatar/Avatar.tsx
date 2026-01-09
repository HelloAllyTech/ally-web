import React from "react";

const Avatar: React.FC<{ name: string }> = ({ name }) => {
  const initial = name?.[0]?.toUpperCase() ?? "?";
  return (
    <div className="min-w-[40px] min-h-[40px] rounded-full border border-border-light text-typography-800 flex items-center justify-center mr-3">
      {initial}
    </div>
  );
};

export default Avatar;
