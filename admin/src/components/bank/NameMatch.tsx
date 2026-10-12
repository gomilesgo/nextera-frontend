import { Badge } from "@/components/ui/Badge";
import { formatScore, isAcceptedMatch, matchLabel } from "@/lib/bank/labels";

export function NameMatch({ result, score }: { result: string | null; score: string | null }) {
  return (
    <div className="grid gap-1">
      <Badge tone={isAcceptedMatch(result) ? "success" : result ? "danger" : "neutral"}>{matchLabel(result)}</Badge>
      <span className="font-mono text-xs text-dust">Score {formatScore(score)}</span>
    </div>
  );
}
