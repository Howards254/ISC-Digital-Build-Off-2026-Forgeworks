"use client";

import { useEffect, useState } from "react";

type LiveClockProps = {
  initialIso: string;
  timeZone: string;
  withSeconds?: boolean;
  className?: string;
};

function format(value: Date, timeZone: string, withSeconds: boolean) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" as const } : {}),
    hourCycle: "h23",
    timeZone,
  }).format(value);
}

export function LiveClock({
  initialIso,
  timeZone,
  withSeconds = true,
  className,
}: LiveClockProps) {
  const [now, setNow] = useState(() => new Date(initialIso));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <time
      dateTime={now.toISOString()}
      className={className}
      suppressHydrationWarning
    >
      {format(now, timeZone, withSeconds)}
    </time>
  );
}
