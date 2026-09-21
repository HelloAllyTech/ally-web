/**
 * Decoding a video file in the browser, before anything is uploaded.
 *
 * Its own module rather than a helper inside `QuestionMediaField`: the
 * component imports the `@constants` barrel, which does work at module load
 * and cannot be imported in isolation (see this repo's CLAUDE.md). Nothing
 * here needs it, so keeping the probe separate is what makes it testable.
 */

/** Where in the clip to grab the poster frame. Frame zero is very often a
 *  fade-in, a slate or a black frame, which is exactly the uninformative
 *  thumbnail we are trying to avoid. */
const POSTER_SEEK_SECONDS = 1;
/** Cap on the captured frame's longest side — a poster is a preview, not a
 *  second copy of the video. */
const POSTER_MAX_EDGE = 960;
const POSTER_QUALITY = 0.8;
/**
 * How long to let the browser decode before giving up on both the duration
 * and the poster and uploading anyway.
 *
 * Not a nicety: a `<video>` handed a container it cannot decode does not
 * reliably fire `error` — it can sit at `readyState` 0 with no event at all,
 * which left the upload awaiting a promise that never settled. The trainer
 * picked a file and nothing happened, with nothing to tell them why. The
 * server enforces the duration ceiling on its own, so failing open here
 * costs a poster, not correctness.
 */
const PROBE_TIMEOUT_MS = 10_000;

interface VideoProbe {
  durationSeconds?: number;
  /** A JPEG of one frame, or `undefined` if the browser could not decode. */
  poster?: File;
}

/**
 * Decodes a video file locally to learn two things before anything is
 * uploaded: how long it is (so an over-long clip is refused instantly rather
 * than after a 50MB round trip) and what one frame of it looks like (so the
 * learner gets a real thumbnail instead of whatever their player paints for
 * a paused-at-zero video).
 *
 * Every failure path resolves rather than rejects. A container the browser
 * cannot decode — some MOV/HEVC recordings — or a cross-origin taint on the
 * canvas should cost the trainer a nicety, not the upload: the server
 * enforces the duration ceiling independently, and a missing poster falls
 * back to the player's own behaviour.
 */
export const probeVideo = (file: File): Promise<VideoProbe> =>
  new Promise(resolve => {
    const objectUrl = URL.createObjectURL(file);
    const probe = document.createElement("video");
    let settled = false;

    const finish = (result: VideoProbe) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      URL.revokeObjectURL(objectUrl);
      resolve(result);
    };

    const duration = () =>
      Number.isFinite(probe.duration) && probe.duration > 0 ? probe.duration : undefined;

    const capture = () => {
      try {
        const scale = Math.min(1, POSTER_MAX_EDGE / Math.max(probe.videoWidth, probe.videoHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(probe.videoWidth * scale);
        canvas.height = Math.round(probe.videoHeight * scale);
        const context = canvas.getContext("2d");
        if (!context || !canvas.width || !canvas.height) {
          finish({ durationSeconds: duration() });
          return;
        }
        context.drawImage(probe, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          blob =>
            finish({
              durationSeconds: duration(),
              poster: blob
                ? new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-poster.jpg`, {
                    type: "image/jpeg",
                  })
                : undefined,
            }),
          "image/jpeg",
          POSTER_QUALITY,
        );
      } catch {
        finish({ durationSeconds: duration() });
      }
    };

    // Declared after `finish` on purpose: the two reference each other, and
    // nothing calls `finish` before this line runs.
    const timer = setTimeout(() => finish({ durationSeconds: duration() }), PROBE_TIMEOUT_MS);

    probe.preload = "auto";
    probe.muted = true;
    probe.playsInline = true;
    probe.onloadeddata = () => {
      // Seeking past the clip's own length never fires `seeked`, so a clip
      // shorter than the seek point is captured where it already is.
      const target = Math.min(POSTER_SEEK_SECONDS, Math.max(0, (duration() ?? 0) - 0.1));
      if (target > 0) {
        probe.onseeked = capture;
        probe.currentTime = target;
      } else {
        capture();
      }
    };
    probe.onerror = () => finish({ durationSeconds: undefined });
    probe.src = objectUrl;
  });
