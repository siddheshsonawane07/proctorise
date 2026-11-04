/**
 * Voice activity from the microphone, without recording anything (D6): every 250 ms, the energy in
 * the speech band (300–3,400 Hz) against a slowly adapting noise floor. Nothing leaves the browser
 * but a yes or no.
 */
export function watchSpeech(
  stream: MediaStream,
  onSample: (speaking: boolean) => void,
): () => void {
  const context = new AudioContext();
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  const bins = new Float32Array(analyser.frequencyBinCount);
  const hzPerBin = context.sampleRate / analyser.fftSize;
  const from = Math.floor(300 / hzPerBin);
  const to = Math.ceil(3400 / hzPerBin);
  let floor = -90;

  const timer = setInterval(() => {
    analyser.getFloatFrequencyData(bins);
    let sum = 0;
    for (let i = from; i <= to; i++) sum += bins[i]!;
    const level = sum / (to - from + 1);
    // The floor follows quiet fast and loud slowly, so steady background noise becomes the floor.
    floor = level < floor ? level : floor + (level - floor) * 0.01;
    onSample(level > floor + 12 && level > -75);
  }, 250);

  return () => {
    clearInterval(timer);
    source.disconnect();
    void context.close();
  };
}
