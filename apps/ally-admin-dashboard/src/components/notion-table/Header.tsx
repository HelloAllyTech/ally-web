import { HeaderProps } from "./types";

export const Header = ({
  column: { label, getResizerProps, getHeaderProps, headerIndex },
}: HeaderProps) => {
  const headerProps = getHeaderProps();
  const { key, ...restHeaderProps } = headerProps;

  return (
    <div
      {...restHeaderProps}
      className={`relative bg-white border-[1px] border-gray-200 select-none ${headerIndex === 0 ? "border-l-1" : "border-l-0"}`}
    >
      <div className="flex items-center p-3 cursor-pointer hover:bg-gray-100 w-full">
        <span className="font-medium text-gray-500 truncate">{label}</span>
      </div>
      <div
        {...getResizerProps()}
        className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-300"
      />
    </div>
  );
};
