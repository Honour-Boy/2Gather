// The 2Gather brand emblem (couple in a gold heart, glowing heart + cross above).
// Rendered as a rounded cream chip so it sits cleanly on both cream and white
// surfaces. Size via `className` (default ~36px). Generated from docs/brand.
export default function BrandMark({ className = "w-9 h-9" }) {
  return (
    <img
      src="/logo-mark.png"
      alt="2Gather"
      className={`${className} rounded-xl object-cover bg-uni-bg shrink-0`}
    />
  );
}
