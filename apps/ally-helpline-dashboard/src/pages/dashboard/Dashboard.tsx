import { FunctionComponent } from "react";
import { ChevronDown } from "lucide-react";
import {
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

import {
  Card,
  Table,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  CardContent,
} from "@/components";
import {
  WorkloadIcon,
  TotalSessionsIcon,
  ClientHandledIcon,
  CounsellorSuccessIcon,
} from "@/assets/icons";

import { DashboardProps } from "./types";
import { AnalyticsStatCard } from "./components";

// Mock data for the line chart
const dailyStats = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(2024, 0, i + 1).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  }),
  calls: Math.floor(Math.random() * 40) + 20,
}));

// Mock data for sessions
const sessionData = [
  {
    id: 1,
    client: "Client 1",
    avatar: "👤",
    location: "6096 Marjolaine Landing",
    dateTime: "12.09.2019 - 12:53 PM",
    sessionTime: "423",
    success: "60%",
    status: "Completed",
  },
  // Add more mock data as needed
];

const Dashboard: FunctionComponent<DashboardProps> = () => {
  const stats = [
    {
      title: "Clients handled per counsellor",
      value: "40,689",
      trend: {
        value: "8.5%",
        type: "up" as const,
        timeframe: "Up from yesterday",
      },
      icon: ClientHandledIcon,
    },
    {
      title: "Total Sessions",
      value: "10293",
      trend: {
        value: "1.3%",
        type: "up" as const,
        timeframe: "Up from past week",
      },
      icon: TotalSessionsIcon,
    },
    {
      title: "Counsellor Success Rate",
      value: "89%",
      trend: {
        value: "4.3%",
        type: "down" as const,
        timeframe: "Down from yesterday",
      },
      icon: CounsellorSuccessIcon,
    },
    {
      title: "Escalations",
      value: "2040",
      trend: {
        value: "1.8%",
        type: "up" as const,
        timeframe: "Up from yesterday",
      },
      icon: WorkloadIcon,
    },
  ];

  return (
    <div className="flex-1 min-h-screen overflow-auto">
      <div className="max-w-screen-xl mx-auto p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <AnalyticsStatCard key={index} {...stat} />
          ))}
        </div>

        {/* Chart Section */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Number of Calls per day</h2>
              <button className="flex items-center px-3 py-1 text-sm border rounded-lg">
                Date <ChevronDown className="ml-2 h-4 w-4" />
              </button>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyStats}>
                  <defs>
                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f0f0f0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis axisLine={false} tickLine={false} dx={-10} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="calls"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorCalls)"
                  />
                  <Line
                    type="monotone"
                    dataKey="calls"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Session Details */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Session Details</h2>
              <button className="flex items-center px-3 py-1 text-sm border rounded-lg">
                January <ChevronDown className="ml-2 h-4 w-4" />
              </button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Client</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Date - Time</TableHead>
                  <TableHead>Session Time</TableHead>
                  <TableHead>Success</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionData.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="flex items-center gap-2">
                      {session.avatar} {session.client}
                    </TableCell>
                    <TableCell>{session.location}</TableCell>
                    <TableCell>{session.dateTime}</TableCell>
                    <TableCell>{session.sessionTime}</TableCell>
                    <TableCell>{session.success}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                        {session.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
