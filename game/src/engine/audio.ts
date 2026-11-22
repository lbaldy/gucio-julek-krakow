// Web Audio: music and ambience loops (crossfaded), one-shot sfx, voice lines.
// Each channel runs through its own bus so the player can set its volume.

import type { Adapters, VoiceHandle } from "./game";

type AudioAdapter = Adapters["audio"];

/** Player-facing volume channels; ambience shares the effects channel. */
export const CHANNELS = ["music", "sfx", "voice"] as const;
export type Channel = (typeof CHANNELS)[number];
export type Volumes = Record<Channel, number>;

export class AudioOut implements AudioAdapter {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private loops: Record<"music" | "ambience", { path: string | null; gain: GainNode | null; src: AudioBufferSourceNode | null }> = {
    music: { path: null, gain: null, src: null },
    ambience: { path: null, gain: null, src: null },
  };
  private voiceNode: { src: AudioBufferSourceNode; analyser: AnalyserNode } | null = null;
  private buses: Record<Channel, GainNode> | null = null;

  /** Volumes are 0..1 per channel. */
  constructor(private volumes: Volumes = { music: 1, sfx: 1, voice: 1 }) {}

  getVolumes(): Volumes {
    return { ...this.volumes };
  }

  setVolume(ch: Channel, v: number) {
    this.volumes[ch] = Math.min(1, Math.max(0, v));
    if (this.buses && this.ctx) this.buses[ch].gain.setTargetAtTime(gainOf(this.volumes[ch]), this.ctx.currentTime, 0.03);
  }

  /** Browsers only allow audio after a user gesture; call this from one. */
  unlock() {
    if (!this.ctx) {
      const ctx = (this.ctx = new AudioContext());
      const bus = (ch: Channel) => {
        const g = ctx.createGain();
        g.gain.value = gainOf(this.volumes[ch]);
        g.connect(ctx.destination);
        return g;
      };
      this.buses = { music: bus("music"), sfx: bus("sfx"), voice: bus("voice") };
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    for (const kind of ["music", "ambience"] as const) {
      const l = this.loops[kind];
      if (l.path && !l.src) this.startLoop(kind, l.path);
    }
  }

  private buffer(path: string): Promise<AudioBuffer | null> {
    let b = this.buffers.get(path);
    if (!b) {
      b = fetch(`${import.meta.env.BASE_URL}${path}`)
        .then((r) => (r.ok && !(r.headers.get("content-type") ?? "").includes("text/html") ? r.arrayBuffer() : null))
        .then((data) => (data && this.ctx ? this.ctx.decodeAudioData(data) : null))
        .catch(() => null);
      this.buffers.set(path, b);
    }
    return b;
  }

  music(path: string | null) {
    this.setLoop("music", path);
  }

  ambience(path: string | null) {
    this.setLoop("ambience", path);
  }

  private setLoop(kind: "music" | "ambience", path: string | null) {
    const l = this.loops[kind];
    if (l.path === path) return;
    this.stopLoop(kind);
    l.path = path;
    if (path && this.ctx) this.startLoop(kind, path);
  }

  private stopLoop(kind: "music" | "ambience") {
    const l = this.loops[kind];
    if (l.src && l.gain && this.ctx) {
      const src = l.src;
      l.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
      setTimeout(() => src.stop(), 2000);
    }
    l.src = null;
    l.gain = null;
  }

  private async startLoop(kind: "music" | "ambience", path: string) {
    const ctx = this.ctx!;
    const buf = await this.buffer(path);
    const l = this.loops[kind];
    if (!buf || l.path !== path || l.src) return;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(kind === "music" ? 0.45 : 0.7, ctx.currentTime, 0.6);
    gain.connect(this.buses![kind === "music" ? "music" : "sfx"]);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(gain);
    src.start();
    Object.assign(l, { src, gain });
  }

  sfx(path: string) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    void this.buffer(path).then((buf) => {
      if (!buf) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.buses!.sfx);
      src.start();
    });
  }

  async voice(lineId: string): Promise<VoiceHandle | null> {
    if (!this.ctx) return null;
    const buf = await this.buffer(`audio/vo/${lineId}.mp3`);
    if (!buf) return null;
    const ctx = this.ctx;
    this.voiceNode?.src.stop();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    analyser.connect(this.buses!.voice);
    const data = new Uint8Array(analyser.fftSize);
    const done = new Promise<void>((res) => (src.onended = () => res()));
    src.start();
    this.voiceNode = { src, analyser };
    return {
      done,
      stop: () => {
        try {
          src.stop();
        } catch {
          /* already stopped */
        }
      },
      level: () => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
        return peak / 128;
      },
    };
  }
}

/** Slider position → gain; squared so the slider feels even to the ear. */
const gainOf = (v: number) => v * v;
