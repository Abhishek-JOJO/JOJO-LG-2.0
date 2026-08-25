export function triggerProfileFlyAnimation(
  avatarUrl: string | null | undefined,
  avatarChar: string,
  fromElement: HTMLElement
) {
  if (typeof window === "undefined" || !fromElement) return;

  // 1. Get starting coordinates
  const fromRect = fromElement.getBoundingClientRect();
  if (fromRect.width === 0 || fromRect.height === 0) return;

  // 2. Create the flying avatar element
  const flyEl = document.createElement("div");
  flyEl.style.position = "fixed";
  flyEl.style.top = `${fromRect.top}px`;
  flyEl.style.left = `${fromRect.left}px`;
  flyEl.style.width = `${fromRect.width}px`;
  flyEl.style.height = `${fromRect.height}px`;
  flyEl.style.zIndex = "99999";
  flyEl.style.pointerEvents = "none";
  flyEl.style.borderRadius = "50%";
  flyEl.style.overflow = "hidden";
  flyEl.style.boxShadow = "0 10px 25px rgba(0, 0, 0, 0.4)";
  flyEl.style.transition = "all 1.4s cubic-bezier(0.25, 1, 0.5, 1)";
  flyEl.style.display = "flex";
  flyEl.style.alignItems = "center";
  flyEl.style.justifyContent = "center";

  if (avatarUrl && avatarUrl.startsWith("http")) {
    const img = document.createElement("img");
    img.src = avatarUrl;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    flyEl.appendChild(img);
  } else {
    flyEl.style.backgroundColor = "var(--theme_13_samecolour, #faaf3f)";
    flyEl.style.color = "white";
    flyEl.style.fontWeight = "bold";
    flyEl.style.fontSize = `${fromRect.width * 0.4}px`;
    flyEl.style.border = "2px solid var(--theme_13_samecolour, #faaf3f)";
    flyEl.innerText = avatarChar.charAt(0).toUpperCase();
  }

  document.body.appendChild(flyEl);

  let attempts = 0;
  const maxAttempts = 40; // 2 seconds maximum (40 * 50ms)

  const findTargetAndAnimate = () => {
    const target = document.getElementById("navbar-profile-avatar");

    if (target) {
      const toRect = target.getBoundingClientRect();
      if (toRect.width > 0 && toRect.height > 0) {
        animateTo(toRect);
        return;
      }
    }

    attempts++;
    if (attempts < maxAttempts) {
      setTimeout(findTargetAndAnimate, 50);
    } else {
      const fallbackRect = {
        left: window.innerWidth - 60,
        top: 20,
        width: 30,
        height: 30
      } as DOMRect;
      animateTo(fallbackRect);
    }
  };

  const animateTo = (toRect: DOMRect | { left: number; top: number; width: number; height: number }) => {
    requestAnimationFrame(() => {
      flyEl.style.top = `${toRect.top}px`;
      flyEl.style.left = `${toRect.left}px`;
      flyEl.style.width = `${toRect.width}px`;
      flyEl.style.height = `${toRect.height}px`;
      flyEl.style.opacity = "0.4";
      flyEl.style.transform = "rotate(360deg)";

      if (!avatarUrl || !avatarUrl.startsWith("http")) {
        flyEl.style.fontSize = `${toRect.width * 0.4}px`;
      }
    });

    // Remove the element and trigger the landing micro-animation
    setTimeout(() => {
      if (flyEl.parentNode) {
        flyEl.parentNode.removeChild(flyEl);
      }

      // Landing scale pulse on the target avatar element
      const target = document.getElementById("navbar-profile-avatar");
      if (target) {
        target.style.transition = "transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
        target.style.transform = "scale(1.25)";
        setTimeout(() => {
          target.style.transform = "scale(1)";
        }, 250);
      }
    }, 1450);
  };

  setTimeout(findTargetAndAnimate, 60);
}
