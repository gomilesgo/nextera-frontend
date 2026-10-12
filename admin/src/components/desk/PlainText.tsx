import { cx } from "@/lib/cx";

export function PlainText({ text, className }: { text: string; className?: string }) {
  return <p className={cx("whitespace-pre-wrap break-words", className)}>{text}</p>;
}
