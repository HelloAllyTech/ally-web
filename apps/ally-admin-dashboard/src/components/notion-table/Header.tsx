import { HeaderProps } from "./types";

export const Header = ({
  column: { label, getResizerProps, getHeaderProps, hasResizer },
}: HeaderProps) => {
  const headerProps = getHeaderProps();
  const { key, ...restHeaderProps } = headerProps;

  return (
    <div
      key={key}
      {...restHeaderProps}
      style={{ ...restHeaderProps.style, width: "100%" }}
      className={`relative w-full h-full bg-white border-r border-border-light select-none`}
    >
      <div className="flex items-center p-3 cursor-pointer hover:bg-neutral-100 w-full">
        <span className="font-medium text-typography-800 truncate">{label}</span>
      </div>
      {hasResizer && (
        <div
          {...getResizerProps()}
          className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-primary-300"
        />
      )}
    </div>
  );
};
