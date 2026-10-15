"""Fetch pinned CC0 sources and prepare PCM for build-sfx.ts. See CREDITS.md."""
import hashlib
import io
import subprocess
import sys
import urllib.request
import zipfile
from pathlib import Path

CACHE = Path("tmp/audio-sources")
OUT = Path("tmp/audio-import")
CACHE.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
ENCODER = sys.argv[1]
RATE = int(sys.argv[2])
MENU_BPM, GAME_BPM, BARS = map(float, sys.argv[3:6])
PACKS = {
    "interface": ("https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip", "f2193d072726d6758a5f7871b2dcc54dcce0d5c35c6f0a62f92549b327c81232"),
    "impact": ("https://kenney.nl/media/pages/assets/impact-sounds/87b4ddecda-1677589768/kenney_impact-sounds.zip", "029d734af1582474edf3a694d1b0cebc97c1c152f2f39fa34d4c2bafc5de77f8"),
    "music": ("https://opengameart.org/sites/default/files/5%20Action%20Chiptunes%20By%20Juhani%20Junkala.zip", "ea189990c0fb9a700187ccc740eda72400341a082305a163867467d96346460d"),
}
archives = {}
for name, (url, digest) in PACKS.items():
    path = CACHE / (name + ".zip")
    if not path.exists():
        with urllib.request.urlopen(url, timeout=120) as response:
            path.write_bytes(response.read())
    data = path.read_bytes()
    if hashlib.sha256(data).hexdigest() != digest:
        raise RuntimeError("Source checksum mismatch: " + str(path))
    archives[name] = zipfile.ZipFile(io.BytesIO(data))

def source(pack, filename):
    # Only explicitly selected members are read; archive paths are never extracted.
    path = OUT / (pack + "-" + Path(filename).name)
    path.write_bytes(archives[pack].read(filename))
    return path

def convert(path, name, filters):
    subprocess.run([ENCODER, "-y", "-hide_banner", "-loglevel", "error", "-i", str(path),
        "-af", filters, "-ac", "1", "-ar", str(RATE), "-f", "f32le", str(OUT / (name + ".pcm"))], check=True)

# Original filenames are preserved in the ledger; trim silence and level the game mix.
CUES = {
    "click": ("interface", "click_001"), "back": ("interface", "back_001"),
    "toggle": ("interface", "switch_001"), "open": ("interface", "open_001"),
    "close": ("interface", "close_001"), "punch": ("impact", "impactPunch_heavy_000"),
    "hit": ("impact", "impactPunch_medium_000"), "tock": ("impact", "impactSoft_medium_000"),
    "log": ("impact", "impactWood_light_000"),
}
for cue, (pack, filename) in CUES.items():
    convert(source(pack, "Audio/" + filename + ".ogg"), cue,
        "silenceremove=start_periods=1:start_threshold=-50dB,alimiter=limit=0.75:level=false,afade=t=in:d=0.003")

# Measured beat grids (spectral-flux peaks and exact full-file bar counts):
# Title Screen: 4 bars at 85 BPM; Level 1: 28 bars at 90.5;
# Level 2: 32 bars at 105.5; Level 3: 36 bars at 105.5 (half-time grids).
# Each selection starts on a phrase downbeat. Title repeats its complete four bars.
TRACKS = {
    "menu": ("Title Screen", 85, 0, 16, MENU_BPM),
    "meadow": ("Level 1", 90.5, 0, 32, GAME_BPM),
    "autumn": ("Level 2", 105.5, 0, 32, GAME_BPM),
    "snow": ("Level 3", 105.5, 0, 32, GAME_BPM),
    "nightCity": ("Level 3", 105.5, 64, 32, GAME_BPM),
}
for name, (title, bpm, start_beat, beats, target) in TRACKS.items():
    path = source("music", "Juhani Junkala [Retro Game Music Pack] " + title + ".wav")
    filters = f"atrim=start={start_beat * 60 / bpm}:duration={beats * 60 / bpm},asetpts=PTS-STARTPTS,atempo={target / bpm},volume=0.36"
    convert(path, name, filters)
print("Prepared nine Kenney effects and five OpenGameArt music edits (CC0).")
