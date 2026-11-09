/** App scroll lives on `<main>`, not `body` — lock both for modals/lightboxes. */

let lockCount = 0;
let savedScrollTop = 0;
let savedHtmlOverflow = "";
let savedMainOverflow = "";
let savedMainPosition = "";
let savedMainTop = "";
let savedMainLeft = "";
let savedMainRight = "";
let savedMainWidth = "";

function getMain(): HTMLElement | null {
  const main = document.querySelector("main");
  return main instanceof HTMLElement ? main : null;
}

/** Prevent background scroll while overlays are open (iOS-safe). */
export function lockPageScroll(): () => void {
  lockCount += 1;
  if (lockCount > 1) {
    return () => {
      lockCount -= 1;
    };
  }

  const html = document.documentElement;
  const main = getMain();

  savedHtmlOverflow = html.style.overflow;
  savedMainOverflow = main?.style.overflow ?? "";

  html.style.overflow = "hidden";

  if (main) {
    savedScrollTop = main.scrollTop;
    savedMainPosition = main.style.position;
    savedMainTop = main.style.top;
    savedMainLeft = main.style.left;
    savedMainRight = main.style.right;
    savedMainWidth = main.style.width;

    main.style.overflow = "hidden";
    // Pin scroll position while the virtual keyboard opens/closes on mobile Safari.
    main.style.position = "fixed";
    main.style.top = `-${savedScrollTop}px`;
    main.style.left = "0";
    main.style.right = "0";
    main.style.width = "100%";
  }

  return () => {
    lockCount -= 1;
    if (lockCount > 0) return;

    html.style.overflow = savedHtmlOverflow;

    const activeMain = getMain();
    if (activeMain) {
      activeMain.style.overflow = savedMainOverflow;
      activeMain.style.position = savedMainPosition;
      activeMain.style.top = savedMainTop;
      activeMain.style.left = savedMainLeft;
      activeMain.style.right = savedMainRight;
      activeMain.style.width = savedMainWidth;
      activeMain.scrollTop = savedScrollTop;
    }

    // Dismiss the virtual keyboard so iOS doesn't leave the viewport shifted.
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };
}
