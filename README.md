# cc-shorts

Play YouTube Shorts from Claude Code with `/shorts`. Browse the feed, watch and pause clips, like videos, and open a Short in your browser.

cc-shorts supports Linux distributions using Wayland or X11, including Arch, Debian/Ubuntu, Fedora, openSUSE, and Alpine, as well as macOS. It supports Chromium-based browsers and Firefox. Linux audio uses PipeWire/PulseAudio when available and falls back to ALSA.

## Requirements

- Claude Code running in a terminal. The Claude desktop app and IDE extensions do not support this player pane.
- `yt-dlp`, FFmpeg, and Python 3. Deno 2.3 or newer is recommended for yt-dlp's YouTube JavaScript challenge solver; clips can still work without it, but some downloads may fail or have fewer formats.
- A browser signed in to YouTube. Chromium or Firefox are recommended.
- On Linux, `xdg-utils` (for `xdg-open`) is needed to open Shorts in your default browser.
- For sharp inline frames, use Kitty or Ghostty. Claude Code's inline image path works in these terminals. Foot uses Sixel, which the current Claude Code image pane does not render, so Foot displays the lower-resolution colored-block fallback.
- A working audio service: PipeWire with its PulseAudio compatibility service (`pipewire-pulse`), PulseAudio, or ALSA.

## Install dependencies on Linux

Install the equivalent packages with your distribution's package manager. Examples for common distributions follow; omit `chromium` or `firefox` if you do not use that browser.

### Debian and Ubuntu

```sh
sudo apt update
sudo apt install yt-dlp ffmpeg xdg-utils firefox-esr chromium
```

Ubuntu may call the browser package `chromium-browser`, and some releases provide Chromium as a Snap.

### Fedora

```sh
sudo dnf install yt-dlp xdg-utils firefox chromium
```

For full FFmpeg support, enable RPM Fusion and install its FFmpeg package as described by [RPM Fusion](https://rpmfusion.org/Howto/Multimedia). Fedora's default `ffmpeg-free` may lack codecs needed by some videos.

### Arch Linux and Arch-based distributions

```sh
sudo pacman -S --needed yt-dlp ffmpeg xdg-utils firefox chromium
```

If you use an AUR helper such as `yay`, use it for packages that are only available from the AUR; the packages above are available from the standard repositories.

### openSUSE

```sh
sudo zypper install yt-dlp ffmpeg xdg-utils MozillaFirefox chromium
```

Some openSUSE multimedia packages require the Packman repository. If your FFmpeg build lacks PulseAudio or ALSA output, install a full FFmpeg build from your enabled multimedia repository.

### Alpine Linux

```sh
sudo apk add yt-dlp ffmpeg xdg-utils firefox chromium
```

Package availability can vary by release and enabled repository. If a package is missing, use the distribution's official package search or install that tool from its upstream instructions.

### Deno for yt-dlp

Current yt-dlp YouTube support needs Deno 2.3 or newer (or another supported JavaScript runtime). Deno does not publish an official apt repository, and distribution packages can lag behind. Install Deno with its [official Linux installer](https://docs.deno.com/runtime/getting_started/installation/):

```sh
curl -fsSL https://deno.land/install.sh | sh
source "$HOME/.deno/env"
deno --version
```

Confirm the first line reports version `2.3.0` or newer. Start Claude Code from this shell so it inherits the Deno path. The yt-dlp helper also enables yt-dlp's official GitHub EJS-script fallback for distribution builds that do not bundle those scripts.

### Audio setup

PipeWire with `pipewire-pulse` is recommended. On distributions that package the PulseAudio compatibility service separately, install and enable it using the distribution's service manager. Native PulseAudio and ALSA are also supported. cc-shorts checks the FFmpeg build's audio outputs and uses PulseAudio/PipeWire or ALSA accordingly.

### Chromium cookie access

Chromium may encrypt cookies with the desktop keyring. On GNOME, make sure GNOME Keyring's Secret Service is installed and unlocked; on KDE Plasma, make sure KWallet is installed and unlocked. Some distributions require yt-dlp's optional Python SecretStorage package. Firefox does not depend on the desktop keyring and is a useful choice if Chromium cookie decryption fails.

## Run cc-shorts

Clone the repository (or use your local copy), then launch Claude Code from Kitty or Ghostty for the sharpest inline video:

```sh
git clone <REPOSITORY_URL> ~/cc-shorts
cd ~/cc-shorts
claude --plugin-dir .
```

Inside Claude Code:

1. Run `/shorts`.
2. Choose Chromium or Firefox, then sign in to YouTube in that browser if needed.
3. Run `/shorts` again if browser sign-in or setup was not complete.

You can start Claude Code from another directory by passing the full plugin path:

```sh
claude --plugin-dir ~/cc-shorts
```

The current frame and download width is capped at 480 pixels. The plugin also retains its macOS code path; install its tools with Homebrew as needed:

```sh
brew install yt-dlp ffmpeg deno
```

## Controls

Focus the Shorts pane to use its keys:

| Key | Action |
| --- | --- |
| `j` | Next Short |
| `k` | Previous Short, from the start |
| `p` | Pause or resume |
| `r` | Replay from the start |
| `l` | Like or unlike on YouTube |
| `m` | Mute or unmute |
| `o` | Pause and open the Short in your browser |
| `x` | Close the pane |

Click the channel name below the video to open the Short as well. Closing the pane keeps your place for the rest of the Claude Code session.

## Privacy and behavior

- yt-dlp reads browser cookies locally and sends YouTube requests using that session.
- Shorts are downloaded at up to 480 pixels wide, with up to five clips queued ahead. Temporary files are stored under `$TMPDIR/cc-shorts/` and cleaned up when playback closes or the session ends.
- After 10 seconds of playback, cc-shorts marks a Short watched. The `l` key changes the YouTube like on your account.
- The Shorts feed uses YouTube's undocumented web API, which may change. Requests are paced near ordinary scrolling.

## Troubleshooting

- **Signed out:** sign in to YouTube in the selected browser, then run `/shorts browser` and select it again.
- **Cannot read Chromium cookies:** unlock GNOME Keyring or KWallet. If the error persists, use Firefox with `/shorts browser`.
- **The image looks like colored blocks:** launch Claude Code from Kitty or Ghostty, which support the inline image protocol used by Claude Code. Foot's Sixel support is not currently used by Claude Code's image pane.
- **Downloads fail:** check the network and press `j` to retry.
- **Every download fails on Kali/Debian:** update `yt-dlp`, verify Deno is at least 2.3 with `deno --version`, and confirm Claude Code was started from a shell that can run `deno`. If it still fails, the actual yt-dlp error is in Claude Code's debug log; include its last error lines when asking for help.
- **A required tool appears missing:** Claude Code may have a different `PATH` from your interactive shell. Start it from a shell where `yt-dlp`, `ffmpeg`, `python3`, and `deno` are available. The `/shorts` setup prompt detects apt, dnf, pacman, zypper, and apk when offering Linux package installation.

## Development

Run the plugin and helper tests with:

```sh
claude plugin test .
python -m unittest tests/test_ime.py tests/test_yt.py
```

## License and credit

This project is distributed under the MIT License; see [LICENSE](LICENSE).

The original macOS version of cc-shorts was created by Matthew Lee ([mthli/cc-shorts](https://github.com/mthli/cc-shorts)). This project builds on that work and retains the macOS code path.
