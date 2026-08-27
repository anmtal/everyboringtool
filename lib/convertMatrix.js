// The file-conversion permutation engine's data. One dynamic route
// (app/convert/[pair]) renders every pair below, so adding a conversion is a
// one-line edit here — no new component or page. Args reuse the same self-hosted
// ffmpeg core as the video toolkit. Slugs look like "mp4-to-mp3".

// Per-format spec: display name, media kind, output mime, a one-line blurb (used
// to give each page some non-templated text), and the ffmpeg args to PRODUCE
// this format. Audio targets drop the video stream (-vn) so video->audio works.
export const FORMATS = {
  // video containers
  mp4:  { name: "MP4",  kind: "video", mime: "video/mp4",        blurb: "MP4 is the most widely supported video format — it plays on virtually every phone, browser and player.", args: (i, o) => ["-i", i, "-c:v", "libx264", "-crf", "23", "-preset", "veryfast", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", o] },
  mov:  { name: "MOV",  kind: "video", mime: "video/quicktime",  blurb: "MOV is Apple's QuickTime format, common from iPhones and Macs.", args: (i, o) => ["-i", i, "-c:v", "libx264", "-crf", "23", "-preset", "veryfast", "-c:a", "aac", "-b:a", "160k", o] },
  mkv:  { name: "MKV",  kind: "video", mime: "video/x-matroska", blurb: "MKV (Matroska) is a flexible container often used for high-quality video with multiple tracks.", args: (i, o) => ["-i", i, "-c:v", "libx264", "-crf", "23", "-preset", "veryfast", "-c:a", "aac", "-b:a", "160k", o] },
  webm: { name: "WEBM", kind: "video", mime: "video/webm",       blurb: "WebM is an open, web-optimised video format designed for fast streaming in browsers.", args: (i, o) => ["-i", i, "-c:v", "libvpx-vp9", "-crf", "32", "-b:v", "0", "-c:a", "libopus", o] },
  avi:  { name: "AVI",  kind: "video", mime: "video/x-msvideo",  blurb: "AVI is an older Windows video format with broad legacy support.", args: (i, o) => ["-i", i, "-c:v", "mpeg4", "-vtag", "xvid", "-qscale:v", "4", "-c:a", "libmp3lame", "-q:a", "4", o] },
  // audio
  mp3:  { name: "MP3",  kind: "audio", mime: "audio/mpeg",       blurb: "MP3 is the universal audio format — small files that play everywhere.", args: (i, o) => ["-i", i, "-vn", "-acodec", "libmp3lame", "-q:a", "2", o] },
  wav:  { name: "WAV",  kind: "audio", mime: "audio/wav",        blurb: "WAV is uncompressed audio — large files at full quality, ideal for editing.", args: (i, o) => ["-i", i, "-vn", o] },
  m4a:  { name: "M4A",  kind: "audio", mime: "audio/mp4",        blurb: "M4A is AAC audio in an MP4 container, common on Apple devices.", args: (i, o) => ["-i", i, "-vn", "-c:a", "aac", "-b:a", "192k", o] },
  ogg:  { name: "OGG",  kind: "audio", mime: "audio/ogg",        blurb: "OGG (Vorbis) is an open, royalty-free audio format.", args: (i, o) => ["-i", i, "-vn", "-c:a", "libvorbis", "-q:a", "5", o] },
  aac:  { name: "AAC",  kind: "audio", mime: "audio/aac",        blurb: "AAC is a modern, efficient audio format used by streaming services.", args: (i, o) => ["-i", i, "-vn", "-c:a", "aac", "-b:a", "192k", o] },
  flac: { name: "FLAC", kind: "audio", mime: "audio/flac",       blurb: "FLAC is lossless audio — full quality at a smaller size than WAV.", args: (i, o) => ["-i", i, "-vn", "-c:a", "flac", o] },
};

// Curated first batch of high-search conversions. `sitemap: true` marks the ones
// submitted to Google now — a cautious ramp (the rest stay crawlable via the hub
// and internal links). Widen this list as the domain earns trust.
export const PAIRS = [
  // video -> video
  ["mov", "mp4", true], ["avi", "mp4", true], ["mkv", "mp4", true], ["webm", "mp4", true],
  ["mp4", "webm", true], ["mp4", "mov", false], ["mp4", "mkv", false], ["mp4", "avi", false],
  // video -> audio
  ["mp4", "mp3", true], ["mov", "mp3", true], ["mkv", "mp3", false], ["webm", "mp3", false],
  ["avi", "mp3", false], ["mp4", "wav", false],
  // audio -> audio
  ["m4a", "mp3", true], ["wav", "mp3", true], ["ogg", "mp3", false], ["flac", "mp3", false],
  ["aac", "mp3", false], ["mp3", "wav", true], ["m4a", "wav", false], ["mp3", "m4a", false],
  ["wav", "flac", false], ["ogg", "wav", false],
].map(([from, to, sitemap]) => ({ from, to, slug: `${from}-to-${to}`, sitemap: !!sitemap }));

const BY_SLUG = Object.fromEntries(PAIRS.map((p) => [p.slug, p]));

export function getPair(slug) {
  return BY_SLUG[slug] || null;
}

export function pairName(p) {
  return `${FORMATS[p.from].name} to ${FORMATS[p.to].name}`;
}

// Related conversions for internal linking: same target, plus the reverse.
export function relatedPairs(p, n = 6) {
  const out = [];
  const rev = BY_SLUG[`${p.to}-to-${p.from}`];
  if (rev) out.push(rev);
  for (const q of PAIRS) {
    if (q.slug === p.slug || out.includes(q)) continue;
    if (q.to === p.to || q.from === p.from) out.push(q);
    if (out.length >= n) break;
  }
  return out.slice(0, n);
}

export function buildAbout(p) {
  const f = FORMATS[p.from], t = FORMATS[p.to];
  return (
    `The ${f.name} to ${t.name} converter changes a ${f.name} file into ${t.name}, right in your browser. ` +
    `Upload your ${f.name} file and download the ${t.name} version — free, with no sign-up, no watermark, and nothing uploaded.\n\n` +
    `${f.blurb} ${t.blurb} The conversion runs on an in-browser build of ffmpeg, so your file is processed entirely on your own device and never sent to a server.`
  );
}

export function buildFaq(p) {
  const f = FORMATS[p.from], t = FORMATS[p.to];
  const lossless = p.to === "wav" || p.to === "flac";
  const qualityA = lossless
    ? `Converting to ${t.name} keeps full quality — ${t.name} is a lossless format. Note it can't recover detail that a lossy source (like an MP3) had already discarded.`
    : `Converting re-encodes the file to ${t.name}, which is lossy, but the settings are tuned to keep quality high for everyday use.`;
  return [
    { q: `Is the ${f.name} to ${t.name} converter free?`, a: "Yes — completely free, with no sign-up, no watermark and no limits." },
    { q: "Is my file uploaded to a server?", a: "No. It runs an in-browser build of ffmpeg, so your file is processed entirely on your own device and never uploaded." },
    { q: `Will converting to ${t.name} lose quality?`, a: qualityA },
    { q: `Why convert ${f.name} to ${t.name}?`, a: `${t.blurb} Converting to ${t.name} makes the file easier to use wherever ${t.name} is expected.` },
    { q: "Why does the first run take a moment?", a: "The first time, it downloads a ~32 MB processing engine, which is cached afterwards so later conversions start instantly." },
  ];
}
