/* eslint-disable @next/next/no-img-element */
// SpotOn wordmark + crosshair-football mark (white on transparent).

export function Logo({ className = "h-7" }: { className?: string }) {
  return <img src="/logo.png" alt="SpotOn" className={`${className} w-auto`} />;
}
