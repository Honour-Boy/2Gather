// A compact, centered modal panel with a blurred backdrop and click-outside to
// close. Shared by the composer popovers (Share a Verse, Prayer templates) so
// they read as premium, constrained centered panels instead of full-width bottom
// sheets. `title` renders the gold eyebrow header + a close button; children are
// the scrollable body. Tapping the backdrop (anywhere outside the panel) closes.
export default function PopoverPanel({ title, onClose, children, maxWidth = "max-w-xs sm:max-w-sm" }) {
  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`w-full ${maxWidth} max-h-[72vh] flex flex-col bg-uni-surface border border-uni-border rounded-3xl shadow-card overflow-hidden animate-fade-in-up`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-uni-border">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-uni-gold">
            {title}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 -mr-1 rounded-lg text-uni-muted hover:text-uni-text hover:bg-uni-surface2 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto uni-scroll p-2">{children}</div>
      </div>
    </div>
  );
}
