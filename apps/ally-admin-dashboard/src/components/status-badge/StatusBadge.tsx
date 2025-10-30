import { userStatus } from "@constants";
import { formatCapitalizedEnum } from "@utils";

export const StatusBadge: React.FC<{ status: userStatus | string }> = ({ status }) => {
  const STATUS_STYLES: Record<string, { dot: string; bg: string; text: string }> = {
    ACTIVE: { dot: "bg-[#66BB6A]", bg: "bg-[#E8F5E9]", text: "text-black-700" },
    SUSPENDED: { dot: "bg-[#FE6F64]", bg: "bg-[#FBE9E7]", text: "text-black-700" },
    INACTIVE: { dot: "bg-gray-400", bg: "bg-gray-100", text: "text-black-700" },
    BLOCKED: { dot: "bg-red-500", bg: "bg-red-100", text: "text-black-700" },
  };

  const key = String(status).toUpperCase();
  const { dot, bg, text } = STATUS_STYLES[key] ?? STATUS_STYLES.ACTIVE;

  return (
    <span className={`inline-flex items-center px-[8px] py-[2px] rounded-full ${bg} ${text}`}>
      <span className={`w-2 h-2 rounded-full mr-1 ${dot}`} />
      {formatCapitalizedEnum(status)}
    </span>
  );
};
