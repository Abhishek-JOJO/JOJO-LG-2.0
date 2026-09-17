"use client";

import { appConfig } from "@/lib/config/app.config";

/**
 * TV UI select/confirm sound, tuned around webOS TV's specific Web Audio quirks:
 *
 * - LG's own webOS TV docs recommend the Web Audio API for sound effects (only
 *   one <audio> element is allowed per app, reserved for background music) but
 *   flag a "~500-millisecond latency issue" on webOS TV. There's no documented
 *   fix — the mitigation here is to create the AudioContext once, up front, on
 *   the very first remote keypress (see RemoteManager.ts), and immediately fire
 *   an inaudible priming tick through it. That absorbs the platform's warm-up
 *   cost right there instead of on the user's first real Enter press, and the
 *   context is then kept alive (not recreated) for the rest of the session.
 * - Sounds are synthesized with an OscillatorNode + GainNode envelope rather
 *   than decoded from an audio file — zero asset bytes to ship/fetch/decode,
 *   nothing held in heap between plays, and each node is short-lived and
 *   garbage-collected right after it stops.
 * - The platform does not auto-stop Web Audio playback on app suspend, so this
 *   suspends/resumes the shared context on visibilitychange — the same signal
 *   PalmSystem.deactivate() drives (see lib/webos.ts).
 * - "nav" (focus-move, wired to every ArrowPress) is deliberately much shorter
 *   and quieter than "select" — a remote can repeat-fire every ~100-150ms, so
 *   this has to survive being retriggered that fast without stacking audible
 *   garble: each tone is ~45ms/low-gain, `play()`'s own 60ms de-dupe guard
 *   collapses any same-tick double-fires, and nodes are always short-lived and
 *   GC'd right after they stop — there's never more than one or two oscillator
 *   nodes alive at once even under a held-down key.
 */

type SoundName = "select" | "back" | "nav";

class TVSoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initStarted = false;
  private lastPlayedAt = 0;

  private createContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;

    // This entire block is best-effort UI polish, never a requirement for the
    // app to function — a throw here (unseen so far, but this runs on a wide
    // spread of TV hardware/firmware) must never escape into a caller like
    // onArrowPress/onEnterPress and break real navigation or selection.
    try {
      const ctx = new Ctor();
      const gain = ctx.createGain();
      gain.gain.value = 0.5;
      gain.connect(ctx.destination);

      this.ctx = ctx;
      this.masterGain = gain;
      return ctx;
    } catch {
      this.ctx = null;
      this.masterGain = null;
      return null;
    }
  }

  /**
   * Creates (once) and primes the shared AudioContext. Call this from the
   * earliest reliable user-gesture point in the app (first remote keydown) —
   * NOT eagerly on mount — so context creation itself counts as a user
   * gesture under autoplay policy, and the ~500ms webOS TV warm-up happens on
   * a silent tick nobody hears instead of the first real select sound.
   */
  init(): void {
    if (this.initStarted || !appConfig.flags.enableTvUiSound) return;
    this.initStarted = true;

    const ctx = this.createContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    document.addEventListener("visibilitychange", () => {
      if (!this.ctx) return;
      if (document.hidden) {
        this.ctx.suspend().catch(() => {});
      } else {
        this.ctx.resume().catch(() => {});
      }
    });

    // Inaudible priming tick — absorbs webOS TV's first-play latency here.
    this.playTone({ freq: 440, duration: 0.02, peakGain: 0.0001 });
  }

  private playTone(opts: { freq: number; duration: number; peakGain: number; freqEnd?: number }): void {
    const ctx = this.ctx;
    const master = this.masterGain;
    if (!ctx || !master) return;

    // Same rationale as createContext(): this is cosmetic, never load-bearing
    // for the caller — swallow, don't propagate.
    try {
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(opts.freq, now);
      if (opts.freqEnd) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(opts.freqEnd, 1), now + opts.duration);
      }

      // Quick attack, exponential decay — exponentialRampToValueAtTime can't
      // target exactly 0, so 0.0001 is the effective "silent" floor.
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(opts.peakGain, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + opts.duration);

      osc.connect(gain);
      gain.connect(master);

      osc.start(now);
      osc.stop(now + opts.duration + 0.02);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    } catch {
      // Best-effort sound only — never let a Web Audio failure affect navigation/selection.
    }
  }

  play(name: SoundName): void {
    if (!appConfig.flags.enableTvUiSound) return;

    // Lazily init if a select happens before any keydown reached RemoteManager
    // (e.g. remote-control click) — still gesture-driven, just a different one.
    if (!this.initStarted) {
      this.init();
    }
    if (!this.ctx) return;

    // Guards against the same interaction firing play() twice in one frame
    // (e.g. a click handler and onEnterPress both resolving together). Also
    // caps "nav" ticks under a held-down/fast-repeating key — deliberately
    // shorter than the remote's own ~100-150ms repeat interval so distinct
    // presses each still get a tick, just never two in the same instant.
    const now = performance.now();
    if (now - this.lastPlayedAt < 60) return;
    this.lastPlayedAt = now;

    if (name === "select") {
      this.playTone({ freq: 600, freqEnd: 900, duration: 0.09, peakGain: 0.16 });
    } else if (name === "nav") {
      this.playTone({ freq: 900, freqEnd: 700, duration: 0.045, peakGain: 0.07 });
    } else {
      this.playTone({ freq: 500, freqEnd: 320, duration: 0.09, peakGain: 0.14 });
    }
  }
}

export const tvSoundManager = new TVSoundManager();
