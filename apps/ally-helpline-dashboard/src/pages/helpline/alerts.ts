/**
 * New-talker alerts for an Available listener. Deliberately content-free: the
 * notification says only that someone is waiting — never a name, a preview, a
 * language or a risk level — because notifications show on lock screens and in
 * OS notification centres that other people can see.
 */

/** Ask once, from a user gesture (turning Available on). Respects an earlier "no". */
export const requestNotificationPermission = async (): Promise<NotificationPermission | null> => {
  if (typeof window === "undefined" || !("Notification" in window)) return null;
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
};

export const notificationPermission = (): NotificationPermission | null =>
  typeof window !== "undefined" && "Notification" in window ? Notification.permission : null;

let audioContext: AudioContext | null = null;

/** A soft two-note chime (~0.35 s) from WebAudio, so there is no asset to ship. */
export const playChime = () => {
  try {
    const Context =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    audioContext ??= new Context();
    const context = audioContext;
    const start = context.currentTime;
    [660, 880].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      const at = start + index * 0.16;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.12, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.2);
    });
  } catch {
    // Autoplay policy or no audio device: the on-screen list is still there.
  }
};

/**
 * A system notification, only when the tab is out of view (in view, the lobby
 * itself and the chime are enough) and only if the listener allowed it.
 */
export const showWaitingNotification = (title: string) => {
  try {
    if (notificationPermission() !== "granted") return;
    if (document.visibilityState === "visible") return;
    const notification = new Notification(title, { tag: "ally-helpline-queue", silent: true });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // Some browsers only allow notifications from a service worker.
  }
};
