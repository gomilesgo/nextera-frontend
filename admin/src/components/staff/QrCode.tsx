import type { QrMatrix } from "@/lib/team/qr";

const QUIET_ZONE = 4;

export function QrCode({ qr, label }: { qr: QrMatrix; label: string }) {
  const extent = qr.size + QUIET_ZONE * 2;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`${-QUIET_ZONE} ${-QUIET_ZONE} ${extent} ${extent}`}
      shapeRendering="crispEdges"
      className="size-44 rounded-[3px]"
    >
      <rect x={-QUIET_ZONE} y={-QUIET_ZONE} width={extent} height={extent} fill="#ffffff" />
      <path d={qr.path} fill="#000000" />
    </svg>
  );
}
