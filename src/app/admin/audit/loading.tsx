import { LedgerSkeleton } from "@/components/ledger-skeleton";

export default function Loading() {
  return <LedgerSkeleton label="Reading the audit log" rows={8} />;
}
