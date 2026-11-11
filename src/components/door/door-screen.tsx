"use client";

import {
  ArrowsClockwise,
  ArrowSquareOut,
  DoorOpen,
  ListMagnifyingGlass,
  WarningCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useState } from "react";

import { LiveClock } from "@/components/live-clock";
import type { DoorDirection } from "@/lib/door-token";

type TokenData = {
  token: string;
  scanUrl: string;
  expiresAt: string;
};

type RecentScan = {
  id: string;
  direction: DoorDirection;
  at: string;
  time: string;
  name: string;
  admissionNumber: string | null;
  deviceModel: string | null;
  looseSerial: string | null;
};

type DoorScreenProps = {
  direction: DoorDirection;
  initialToken: TokenData | null;
  demoMode: boolean;
  timeZone: string;
  serverNow: string;
};

export function DoorScreen({
  direction,
  initialToken,
  demoMode,
  timeZone,
  serverNow,
}: DoorScreenProps) {
  const [tokenData, setTokenData] = useState<TokenData | null>(initialToken);
  // Start from the server timestamp so the server HTML and the first client
  // render agree during hydration. The interval takes over after mount.
  const [now, setNow] = useState(() => new Date(serverNow).getTime());
  const [refreshing, setRefreshing] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentScan[]>([]);
  const [recentState, setRecentState] = useState<
    "loading" | "ready" | "error"
  >("loading");

  const refreshToken = useCallback(async () => {
    setRefreshing(true);

    try {
      const response = await fetch(`/api/door/token?dir=${direction}`, {
        cache: "no-store",
      });
      const data = (await response.json().catch(() => ({}))) as Partial<
        TokenData & { error: string }
      >;

      if (
        !response.ok ||
        typeof data.token !== "string" ||
        typeof data.scanUrl !== "string" ||
        typeof data.expiresAt !== "string"
      ) {
        setTokenError(data.error ?? "The door code couldn't be refreshed.");
        return;
      }

      setTokenData({
        token: data.token,
        scanUrl: data.scanUrl,
        expiresAt: data.expiresAt,
      });
      // A fresh token starts a fresh 60-second window. Sync the clock with the
      // response so the countdown never shows more than 60 seconds while the
      // once-a-second tick catches up.
      setNow(Date.now());
      setTokenError(null);
    } catch {
      setTokenError("The door code couldn't be refreshed. Check the connection.");
    } finally {
      setRefreshing(false);
    }
  }, [direction]);

  const loadRecent = useCallback(async () => {
    try {
      const response = await fetch("/api/door/recent", { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as {
        scans?: RecentScan[];
      };

      if (!response.ok || !Array.isArray(data.scans)) {
        setRecentState("error");
        return;
      }

      setRecent(data.scans);
      setRecentState("ready");
    } catch {
      setRecentState("error");
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => {
      if (!initialToken) {
        void refreshToken();
      }
    }, 0);

    const timer = window.setInterval(() => {
      void refreshToken();
    }, 30_000);

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        void refreshToken();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [initialToken, refreshToken]);

  useEffect(() => {
    const initial = window.setTimeout(() => {
      void loadRecent();
    }, 0);

    const timer = window.setInterval(() => {
      void loadRecent();
    }, 4_000);

    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [loadRecent]);

  const expiresAt = tokenData ? new Date(tokenData.expiresAt).getTime() : 0;
  const remaining = tokenData
    ? Math.max(0, Math.ceil((expiresAt - now) / 1000))
    : 0;
  const fraction = tokenData
    ? Math.min(1, Math.max(0, (expiresAt - now) / 60_000))
    : 0;
  const circumference = 2 * Math.PI * 42;
  const ringOffset = circumference * (1 - fraction);
  const qrOpacity = tokenData
    ? remaining <= 10
      ? Math.max(0.18, remaining / 10)
      : 1
    : 0.2;
  const otherDirection: DoorDirection = direction === "in" ? "out" : "in";

  return (
    <div className="door-screen">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1500px] flex-col px-5 py-5 sm:px-8 sm:py-7 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b door-rule pb-4">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="relative grid size-9 place-items-center rounded-xs border door-rule font-display text-xl leading-none text-[var(--door-forest)]"
            >
              V
              <span className="absolute -right-px -top-px size-1.5 bg-[var(--door-vermilion)]" />
            </span>
            <div>
              <p className="door-label">Vulcan · Door</p>
              <p className="mt-0.5 text-sm font-medium text-[var(--door-ink)]">
                {direction === "in" ? "Entry screen" : "Exit screen"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <LiveClock
              initialIso={new Date().toISOString()}
              timeZone={timeZone}
              withSeconds={false}
              className="door-clock text-[1.3rem] leading-none"
            />
            <Link href="/me" className="door-link">
              Leave screen
            </Link>
          </div>
        </header>

        <main className="grid flex-1 gap-8 py-7 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-center lg:gap-12 lg:py-9">
          <section
            aria-labelledby="door-title"
            className="flex flex-col items-center text-center"
          >
            <p className="door-label">
              Scan the code to record your{" "}
              {direction === "in" ? "entry" : "exit"}
            </p>
            <h1
              id="door-title"
              className={`door-screen-title ${
                direction === "in"
                  ? "door-screen-title-in"
                  : "door-screen-title-out"
              }`}
            >
              {direction === "in" ? "ENTRY" : "EXIT"}
            </h1>

            <div className="mt-5 flex w-full flex-col items-center gap-4 sm:flex-row sm:items-end sm:justify-center">
              <div className="door-qr-tile w-full max-w-[26rem]">
                {tokenData ? (
                  <QRCodeSVG
                    value={tokenData.scanUrl}
                    size={360}
                    level="M"
                    marginSize={2}
                    bgColor="#f4efe4"
                    fgColor="#1c211f"
                    title={`Scan to record your ${
                      direction === "in" ? "entry" : "exit"
                    }`}
                    style={{ width: "100%", height: "auto", opacity: refreshing ? 0.45 : qrOpacity }}
                  />
                ) : (
                  <div className="grid aspect-square w-full place-items-center bg-[#f4efe4] text-[#5c5f58]">
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em]">
                      Issuing door code…
                    </p>
                  </div>
                )}
              </div>

              <div
                role="timer"
                aria-label={`Door code refreshes in ${remaining} seconds`}
                className="door-countdown shrink-0"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 96 96"
                  className="absolute inset-0 size-full"
                >
                  <circle
                    cx="48"
                    cy="48"
                    r="42"
                    fill="none"
                    stroke="rgba(242, 236, 221, 0.14)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="42"
                    fill="none"
                    stroke="var(--door-brass)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={ringOffset}
                    transform="rotate(-90 48 48)"
                    className="door-ring-progress"
                  />
                </svg>
                <span className="relative text-center">
                  <span className="block font-display text-[1.65rem] leading-none text-[var(--door-ink)]">
                    {remaining}
                  </span>
                  <span className="door-label mt-1 block">sec</span>
                </span>
              </div>
            </div>

            <p className="door-muted mt-5 max-w-[36ch] text-sm leading-6">
              The code is paper-white so it scans quickly. It rotates every 30
              seconds and stays valid for one minute.
            </p>

            <div className="mt-4 flex flex-wrap justify-center gap-2.5">
              {demoMode && tokenData ? (
                <a
                  href={tokenData.scanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="door-button-secondary"
                >
                  <ArrowSquareOut aria-hidden="true" size={17} weight="regular" />
                  Simulate scan
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => void refreshToken()}
                disabled={refreshing}
                className="door-button-secondary"
              >
                <ArrowsClockwise
                  aria-hidden="true"
                  size={17}
                  weight="regular"
                  className={refreshing ? "animate-spin" : undefined}
                />
                {refreshing ? "Refreshing…" : "New code"}
              </button>
            </div>

            {tokenError ? (
              <div
                role="alert"
                className="door-alert mt-4 max-w-[52ch] text-left"
              >
                <WarningCircle
                  aria-hidden="true"
                  size={18}
                  weight="regular"
                  className="mt-0.5 shrink-0 text-[var(--door-vermilion)]"
                />
                <p>{tokenError}</p>
              </div>
            ) : null}
          </section>

          <aside aria-labelledby="recent-title" className="door-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 id="recent-title" className="door-label">
                Recent scans
              </h2>
              <span className="door-label">
                {recentState === "loading" ? "Updating" : "Live"}
              </span>
            </div>

            {recent.length > 0 ? (
              <ol className="mt-3 border-t door-rule">
                {recent.map((scan) => (
                  <li
                    key={scan.id}
                    className="grid grid-cols-[3.2rem_minmax(0,1fr)_auto] items-baseline gap-3 border-b door-rule py-3"
                  >
                    <span className="door-clock text-[11px]">{scan.time}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-[var(--door-ink)]">
                        {scan.name}
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-[11px] leading-4 text-[var(--door-muted)]">
                        {scan.admissionNumber ? `${scan.admissionNumber} · ` : ""}
                        {scan.deviceModel ??
                          (scan.looseSerial
                            ? `Borrowed ${scan.looseSerial}`
                            : "No device")}
                      </span>
                    </span>
                    <span
                      className={`door-direction ${
                        scan.direction === "in"
                          ? "door-direction-in"
                          : "door-direction-out"
                      }`}
                    >
                      {scan.direction === "in" ? "In" : "Out"}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="door-muted mt-3 border-t door-rule pt-3 text-sm leading-6">
                {recentState === "error"
                  ? "The scan feed is unavailable. Check the connection."
                  : "No scans yet. They will appear here as the door is used."}
              </p>
            )}

            <div className="mt-5 grid gap-2 border-t door-rule pt-4">
              <Link
                href={`/door/manual?dir=${direction}`}
                className="door-button"
              >
                <ListMagnifyingGlass
                  aria-hidden="true"
                  size={18}
                  weight="regular"
                />
                Manual lookup
              </Link>
              <Link
                href={`/door/${otherDirection}`}
                className="door-button-secondary"
              >
                <DoorOpen aria-hidden="true" size={18} weight="regular" />
                Switch to {otherDirection === "in" ? "entry" : "exit"}
              </Link>
            </div>
          </aside>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t door-rule pt-3">
          <p className="door-label">
            One open visit per member · one open visit per laptop
          </p>
          <p className="door-label">
            {direction === "in" ? "Entry" : "Exit"} · door codes rotate
          </p>
        </footer>
      </div>
    </div>
  );
}
