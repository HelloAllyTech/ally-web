export interface ButtonProps {
  label?: string;
  className?: string;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
}

export const Button = ({
  label = "My Button",
  className = "",
  type = "button",
  onClick,
}: ButtonProps) => {
  return (
    <button
      type={type}
      className={`bg-red-500 px-4 py-2 rounded-md text-white hover:bg-red-600 ${className}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
};

Button.displayName = "MyButton"; 