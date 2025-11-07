import { userStatus } from "@constants";
import { formatCapitalizedEnum } from "@utils";

export const StatusBadge: React.FC<{ status: userStatus | string }> = ({ status }) => {
  const STATUS_STYLES: Record<string, { dot: string; bg: string; text: string }> = {
    ACTIVE: { dot: "bg-success-400", bg: "bg-success-100", text: "text-typography-900" },
    SUSPENDED: { dot: "bg-destructive-400", bg: "bg-destructive-50", text: "text-typography-900" },
    INACTIVE: { dot: "bg-neutral-400", bg: "bg-neutral-100", text: "text-typography-900" },
    BLOCKED: { dot: "bg-destructive-500", bg: "bg-destructive-100", text: "text-typography-900" },
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
