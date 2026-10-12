import type { ReactNode } from "react";

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="hairline rounded-[3px] px-4 py-10 text-center text-sm text-dust">{children}</div>;
}
