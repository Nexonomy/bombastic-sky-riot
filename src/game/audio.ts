let ctx: AudioContext | undefined;
let musicTimer: ReturnType<typeof setInterval> | undefined;
let note = 0;
let activeVoices = 0;
export const soundtrack = {
  mood: "menu" as "menu" | "battle" | "danger" | "win" | "lose",
};
export const audioSettings = {
  master: 0.65,
  music: 0.18,
  sfx: 0.65,
  mute: false,
};
function tone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.15,
  slide?: number,
) {
  if (!ctx || audioSettings.mute || activeVoices >= 24) return;
  activeVoices++;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator(),
    g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + duration);
  g.gain.setValueAtTime(Math.max(0.0001, volume * audioSettings.master), t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start();
  osc.stop(t + duration);
  osc.onended = () => {
    activeVoices--;
    osc.disconnect();
    g.disconnect();
  };
}
export function initAudio() {
  if (!ctx) ctx = new AudioContext();
  void ctx.resume();
  if (!musicTimer)
    musicTimer = setInterval(() => {
      const melody =
        soundtrack.mood === "win"
          ? [0, 4, 7, 12, 7, 4, 12, 16, 0, 4, 7, 12, 7, 4, 12, 16]
          : soundtrack.mood === "danger"
            ? [0, 1, 7, 8, 0, 1, 7, 8, 3, 4, 10, 11, 3, 4, 10, 11]
            : soundtrack.mood === "battle"
              ? [0, 12, 7, 3, 0, 10, 7, 15, 5, 17, 12, 8, 3, 15, 10, 7]
              : [0, 7, 12, 7, 3, 10, 15, 10, 5, 12, 17, 12, 3, 10, 15, 7];
      tone(
        130.81 * Math.pow(2, melody[note % 16] / 12),
        0.19,
        "triangle",
        audioSettings.music * 0.27,
      );
      if (note % 4 === 0) tone(65.4, 0.35, "sine", audioSettings.music * 0.5);
      note++;
    }, 210);
}
export function sound(name: string) {
  const v = audioSettings.sfx;
  switch (name) {
    case "hit":
      tone(150, 0.12, "sawtooth", v * 0.13, 45);
      tone(350, 0.06, "square", v * 0.04, 90);
      break;
    case "shield":
      tone(1300, 0.2, "sine", v * 0.11, 500);
      break;
    case "splash":
      tone(370, 0.09, "triangle", v * 0.035, 110);
      break;
    case "blast":
      tone(110, 0.36, "sawtooth", v * 0.15, 25);
      tone(55, 0.4, "triangle", v * 0.28, 20);
      break;
    case "ice":
      tone(1100, 0.3, "sine", v * 0.1, 220);
      break;
    case "shock":
      tone(230, 0.22, "square", v * 0.07, 1800);
      break;
    case "wind":
      tone(180, 0.4, "triangle", v * 0.1, 600);
      break;
    case "smoke":
      tone(65, 0.5, "sawtooth", v * 0.07, 30);
      break;
    case "step":
      tone(90, 0.04, "triangle", v * 0.025, 55);
      break;
    case "place":
      tone(240, 0.08, "square", v * 0.08, 100);
      break;
    case "pickup":
      tone(660, 0.12, "sine", v * 0.16);
      setTimeout(() => tone(990, 0.2, "sine", v * 0.13), 70);
      break;
    case "ability":
      tone(330, 0.25, "triangle", v * 0.18, 1100);
      break;
    case "tick":
      tone(850, 0.04, "square", v * 0.03);
      break;
    case "win":
      [330, 440, 550, 660].forEach((f, i) =>
        setTimeout(() => tone(f, 0.35, "triangle", v * 0.15), i * 120),
      );
      break;
    case "lose":
      tone(200, 0.6, "triangle", v * 0.2, 65);
      break;
    default:
      tone(440, 0.08, "triangle", v * 0.08, 600);
  }
}
