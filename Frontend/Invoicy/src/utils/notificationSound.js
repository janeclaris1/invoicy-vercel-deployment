// Use a single AudioContext and resume it on first user gesture (required by browsers)
let sharedContext = null;

function getContext() {
  if (!sharedContext) {
    sharedContext = new (window.AudioContext || window.webkitAudioContext)();
    const resume = () => {
      if (sharedContext?.state === "suspended") sharedContext.resume().catch(() => {});
    };
    ["click", "touchstart", "keydown"].forEach((ev) => {
      document.addEventListener(ev, resume, { once: true, passive: true });
    });
  }
  return sharedContext;
}

export function playNotificationSound(times = 1) {
  const playOne = () => {
    try {
      const audioContext = getContext();
      if (audioContext.state === "suspended") {
        audioContext.resume().then(() => playBeep(audioContext)).catch(() => {});
      } else {
        playBeep(audioContext);
      }
    } catch (_) {}
  };

  function playBeep(ctx) {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
  }

  for (let i = 0; i < Math.min(times, 3); i++) {
    setTimeout(() => playOne(), i * 180);
  }
}
