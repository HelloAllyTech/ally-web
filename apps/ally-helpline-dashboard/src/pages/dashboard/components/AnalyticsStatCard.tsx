import { FunctionComponent } from "react";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";

import { Card, CardContent } from "@/components";

const AnalyticsStatCard: FunctionComponent<StatCardProps> = ({
  icon,
  title,
  value,
  trend,
}: StatCardProps) => (
  <Card className="bg-white">
    <CardContent className="p-6">
      <div className="flex flex-col items-center space-y-4">
        <div className="p-4 rounded-lg bg-gray-50">
          <img src={icon} alt={title} className="w-12 h-12" />
        </div>
        <div className="text-center">
          <h3 className="text-sm text-gray-500 font-medium">{title}</h3>
          <div className="mt-2">
            <p className="text-2xl font-semibold">{value}</p>
          </div>
          <div className="mt-2 flex items-center justify-center">
            {trend.type === "up" ? (
              <ArrowUpIcon className="w-4 h-4 text-green-500 mr-1" />
            ) : (
              <ArrowDownIcon className="w-4 h-4 text-red-500 mr-1" />
            )}
            <span
              className={`text-sm ${
                trend.type === "up" ? "text-green-500" : "text-red-500"
              }`}
            >
              {trend.value}
            </span>
            <span className="text-sm text-gray-500 ml-1">
              {trend.timeframe}
            </span>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

interface StatCardProps {
  title: string;
  value: string | number;
  trend: {
    value: string;
    type: "up" | "down";
    timeframe: string;
  };
  icon: string;
}

export default AnalyticsStatCard;
