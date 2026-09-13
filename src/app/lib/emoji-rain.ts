// Sample the original rain physics once, then let the browser animate both
// transform and opacity from the start instead of adding style work halfway in.
export const playEmojiRain = (root: HTMLElement, emojis: readonly string[]) => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const particles: { element: HTMLSpanElement; animation: Animation }[] = [];
  const factors = [-0.6, -0.3, 0, 0.3, 0.6];

  for (let index = 0; index < 52; index += 1) {
    const element = document.createElement("span");
    element.textContent = emojis[index % emojis.length] ?? "💛";
    element.style.cssText = `position:absolute;font-size:${36 + Math.floor(Math.random() * 4)}px;will-change:transform,opacity;`;

    const factorIndex = Math.floor(Math.random() * factors.length);
    const wobble = Math.random() * 10;
    let velocity = 10 + Math.random() * 20;
    const angle = -1.5 * Math.PI + (0.5 - Math.random()) * (280 * Math.PI / 180);
    let tilt = Math.random() * Math.PI;
    let x = 0;
    let y = 0;
    const keyframes: Keyframe[] = [];

    for (let frame = 0; frame <= 100; frame += 1) {
      const progress = frame / 100;
      const offsetX = x + factors[factorIndex] * progress * wobble * wobble
        + 20 * Math.sin(wobble / 4);
      keyframes.push({
        offset: progress,
        transform: `translate3d(${offsetX}px, ${y}px, 0) rotate(${factorIndex % 2 ? tilt : -tilt}rad)`,
        opacity: progress <= 0.5 ? 1 : 2 - 2 * progress,
      });
      x += Math.cos(angle) * velocity;
      y += Math.sin(angle) * velocity + 5;
      velocity *= 0.91;
      tilt += 0.05;
    }

    root.appendChild(element);
    const animation = element.animate(keyframes, {
      duration: 100 * 1000 / 60,
      easing: "linear",
      fill: "forwards",
    });
    animation.onfinish = () => {
      element.remove();
      animation.cancel();
    };
    particles.push({ element, animation });
  }

  return () => {
    for (const { element, animation } of particles) {
      animation.cancel();
      element.remove();
    }
  };
};
