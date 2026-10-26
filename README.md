# cc-shorts

Play YouTube Shorts from Claude Code with `/shorts`. Browse the feed, watch and pause clips, like videos, and open a Short in your browser.

This project is focused on Linux, especially Arch Linux. It supports Wayland and X11, Chromium and Firefox, and PipeWire, PulseAudio, or ALSA audio. The macOS code path is retained.

## Requirements

- Claude Code running in a terminal. The Claude desktop app and IDE extensions do not support this player pane.
- `yt-dlp`, FFmpeg, Python, and Deno. Deno helps yt-dlp solve YouTube JavaScript challenges.
- A browser signed in to YouTube. Chromium or Firefox are recommended.
- For sharp inline frames, use Kitty or Ghostty. cc-shorts uses Claude Code's Kitty graphics image path. Foot supports Sixel instead, so it uses the lower-resolution colored-block fallback.
- On Linux, `xdg-utils` is needed for opening Shorts in your default browser. PipeWire with `pipewire-pulse` is recommended; PulseAudio and ALSA are supported too.

## Install on Arch Linux

Install the player tools and the browsers you plan to use:

```sh
sudo pacman -S --needed yt-dlp ffmpeg deno xdg-utils chromium firefox pipewire-pulse kitty
```

You can omit `chromium` or `firefox` if you already have a supported browser. For PulseAudio, install `pulseaudio` instead of `pipewire-pulse`. If neither PulseAudio nor PipeWire is available, cc-shorts uses FFmpeg's ALSA output.

For Chromium cookie decryption on GNOME, install and unlock the Secret Service keyring and yt-dlp's optional binding:

```sh
sudo pacman -S --needed gnome-keyring python-secretstorage
```

On KDE Plasma, make sure KWallet is installed and unlocked. Firefox does not require a desktop keyring and is the simplest option if Chromium cookies cannot be decrypted.

## Run from this folder

Open Kitty, then run:

```sh
cd /path/to/cc-shorts
claude --plugin-dir .
```

Inside Claude Code:

1. Run `/shorts`.
2. Choose Chromium or Firefox, then sign in to YouTube in that browser if needed.
3. Run `/shorts` again if setup or browser sign-in was not complete.

To use a local clone from any directory, pass its full path:

```sh
claude --plugin-dir /path/to/cc-shorts
```

Start Claude Code in Kitty or Ghostty for higher-resolution inline frames. Starting a fresh Claude Code session retries image rendering if the previous terminal had fallen back to colored blocks. The current frame and download width is capped at 480 pixels.

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
- **The image looks like colored blocks:** launch Claude Code from Kitty or Ghostty, which support the graphics protocol used by the inline image path. Foot uses Sixel and currently gets the block fallback.
- **Downloads fail:** check the network and press `j` to retry.
- **A required tool appears missing:** Claude Code may have a different `PATH` from your interactive shell. Start it from a shell where `yt-dlp`, `ffmpeg`, `python`, and `deno` are available.

## Development

Run the plugin and helper tests with:

```sh
claude plugin test .
python -m unittest tests/test_ime.py tests/test_yt.py
```

## License and credit

This project is distributed under the MIT License; see [LICENSE](LICENSE).

The original macOS version of cc-shorts was created by Matthew Lee ([mthli/cc-shorts](https://github.com/mthli/cc-shorts)). This Linux and Arch-focused version builds on that work while retaining the macOS code path.
