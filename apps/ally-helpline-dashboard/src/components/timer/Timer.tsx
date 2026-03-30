import { useState, useEffect } from "react";

import { useTranslation } from "react-i18next";

import { formatRelativeTime } from "@src/utils";

interface TimerProps {
  startTime: string;
}
const TIMER_INTERVAL = 3000;

const Timer = (props: TimerProps) => {
  const { startTime } = props;
  const { t } = useTranslation();
  const [, setTimeTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTick(prev => prev + 1);
    }, TIMER_INTERVAL);
    return () => clearInterval(interval);
  }, []);
  return <div>{formatRelativeTime(startTime, t)}</div>;
};

export default Timer;
