import "./Modal.css";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE =
    'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])';
function Modal({ title, onClose, wide = false, children }) {
    const titleId = useId();
    const dialogRef = useRef(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        const previouslyFocused = document.activeElement;
        const originalOverflow = document.body.style.overflow;

        document.body.style.overflow = "hidden";
        dialogRef.current?.focus();

        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                onCloseRef.current?.();
                return;
            }

            if (e.key !== "Tab" || !dialogRef.current) return;

            const focusable = Array.from(
                dialogRef.current.querySelectorAll(FOCUSABLE)
            ).filter((element) => !element.disabled && element.offsetParent !== null);

            if (!focusable.length) {
                e.preventDefault();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;

            if (e.shiftKey && (active === first || active === dialogRef.current)) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && active === last) {
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = originalOverflow;
            previouslyFocused?.focus?.();
        };
    }, []);

    return createPortal(
        <div
            className="modalOverlay"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                className={wide ? "modalDialog wide" : "modalDialog"}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                ref={dialogRef}
            >
                <div className="modalHeader">
                    <h2 id={titleId}>{title}</h2>

                    <button
                        type="button"
                        className="modalClose"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div className="modalBody">{children}</div>
            </div>
        </div>,
        document.body
    );
}

export default Modal;