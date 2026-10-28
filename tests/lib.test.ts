import { describe, expect, test } from 'claude-code/testing'

import {
  blankCells,
  BROWSERS,
  browsersFor,
  browserOptions,
  browserQuestion,
  CHROME_ROWS,
  clockTime,
  ffmpegArgs,
  audioOutput,
  detectPlatform,
  findBrowser,
  frameSize,
  imageModeAfterRestart,
  isSupportedDenoVersion,
  installPrompt,
  installCommand,
  installGuide,
  installQuestion,
  nameList,
  parseProgress,
  setupToast,
  shebangPython,
  toCells,
  videoBox,
} from '../hooks/lib'

describe('setup', () => {
  const ytdlp = { name: 'yt-dlp', why: 'no Python that imports yt_dlp', package: 'yt-dlp' }
  const ffmpeg = { name: 'ffmpeg', why: 'not found', package: 'ffmpeg' }
  const deno = { name: 'deno', why: 'not found', package: 'deno', isOptional: true }

  test('shebangPython: the interpreter, through env, or none', async () => {
    expect(shebangPython('#!/Users/a/.local/pipx/venvs/yt-dlp/bin/python -E')).toBe(
      '/Users/a/.local/pipx/venvs/yt-dlp/bin/python',
    )
    expect(shebangPython('#!/usr/bin/env python3')).toBe('python3')
    expect(shebangPython('#!/usr/bin/env -S python3 -E')).toBe('python3')
    expect(shebangPython('#!')).toBeUndefined()
    expect(shebangPython('Ïúíþ binary')).toBeUndefined()
  })

  test('nameList', async () => {
    expect(nameList(['a'])).toBe('a')
    expect(nameList(['a', 'b'])).toBe('a and b')
    expect(nameList(['a', 'b', 'c'])).toBe('a, b and c')
  })

  test('Deno versions older than yt-dlp EJS minimum are treated as unsupported', async () => {
    expect(isSupportedDenoVersion('deno 2.3.0 (stable, release, x86_64-unknown-linux-gnu)')).toBe(true)
    expect(isSupportedDenoVersion('deno 2.10.1 (stable, release, x86_64-unknown-linux-gnu)')).toBe(true)
    expect(isSupportedDenoVersion('deno 1.46.3 (stable, release, x86_64-unknown-linux-gnu)')).toBe(false)
    expect(isSupportedDenoVersion('')).toBe(false)
  })

  test('installCommand uses the detected native package manager', async () => {
    expect(installCommand([ytdlp, ffmpeg, { ...ffmpeg, why: 'no pulse' }], 'macos')).toBe('brew install yt-dlp ffmpeg')
    expect(installCommand([ytdlp, ffmpeg], 'linux', 'apt')).toBe('sudo apt install yt-dlp ffmpeg')
    expect(installCommand([ytdlp, ffmpeg], 'linux', 'dnf')).toBe('sudo dnf install yt-dlp ffmpeg')
    expect(installCommand([ytdlp, ffmpeg], 'linux', 'pacman')).toBe('sudo pacman -S --needed yt-dlp ffmpeg')
    expect(installCommand([ytdlp, ffmpeg], 'linux', 'zypper')).toBe('sudo zypper install yt-dlp ffmpeg')
    expect(installCommand([ytdlp, ffmpeg], 'linux', 'apk')).toBe('sudo apk add yt-dlp ffmpeg')
    expect(installCommand([ytdlp, ffmpeg], 'linux')).toContain('your Linux package manager')
    expect(installCommand([deno], 'linux', 'apt')).toContain('docs.deno.com')
    expect(installCommand([ffmpeg, deno], 'linux', 'apt')).toBe('sudo apt install ffmpeg')
  })

  test('setupToast: nothing missing says nothing; deno alone gets its command', async () => {
    expect(setupToast([])).toBeUndefined()
    expect(setupToast([deno])).toBe('cc-shorts: deno is missing, so yt-dlp may miss formats; run brew install deno')
    expect(setupToast([deno], 'linux')).toContain('install Deno 2.3 or newer')
    expect(setupToast([ffmpeg])).toBe('cc-shorts: ffmpeg is missing; /shorts offers to install it')
  })

  test('installQuestion: the command, or Homebrew first', async () => {
    expect(installQuestion([ffmpeg, deno], true)).toBe(
      'cc-shorts is missing ffmpeg, plus deno, which helps yt-dlp find formats. Install with `brew install ffmpeg deno`?',
    )
    expect(installQuestion([ytdlp, ffmpeg], false)).toContain('Homebrew')
  })

  test('installPrompt: why each is missing, what to run, and Homebrew left to the person', async () => {
    const withBrew = installPrompt([ffmpeg, deno], true)
    expect(withBrew).toContain('- ffmpeg: not found')
    expect(withBrew).toContain('Run `brew install ffmpeg deno`')
    // Homebrew's untrusted-tap warning is for the person to weigh, not Claude.
    expect(withBrew).toContain('run no `brew trust` or `brew untap`')
    expect(withBrew).toContain('stop and tell me what it said')
    const noBrew = installPrompt([ffmpeg], false)
    expect(noBrew).toContain('Do not install it yourself')
    expect(noBrew).toContain('then run `brew install ffmpeg` once it is in')
  })

  test('Linux install prompt uses detected package manager or asks for distro instructions', async () => {
    expect(installQuestion([ffmpeg], true, 'linux', 'pacman')).toContain('`sudo pacman -S --needed ffmpeg`')
    expect(installPrompt([ffmpeg], true, 'linux', 'pacman')).toContain('Run `sudo pacman -S --needed ffmpeg`')
    expect(installQuestion([ffmpeg], false, 'linux')).toContain('supported Linux package manager was not found')
    expect(installPrompt([ffmpeg], true, 'linux')).not.toContain('Homebrew')
    expect(installPrompt([ffmpeg, deno], true, 'linux', 'apt')).toContain('sudo apt install ffmpeg')
    expect(installPrompt([ffmpeg, deno], true, 'linux', 'apt')).toContain('Deno 2.3 or newer')
  })
})

describe('platform support', () => {
  test('detects Linux and macOS with a home-directory fallback', async () => {
    expect(detectPlatform('Linux', '/home/alice')).toBe('linux')
    expect(detectPlatform('Darwin', '/Users/alice')).toBe('macos')
    expect(detectPlatform('', '/Users/alice')).toBe('macos')
  })

  test('finds both Chromium and Firefox data on Linux and excludes Safari', async () => {
    const linux = browsersFor('linux')
    expect(linux.map(browser => browser.id)).toContain('chromium')
    expect(linux.map(browser => browser.id)).toContain('firefox')
    expect(linux.map(browser => browser.id)).not.toContain('safari')
    expect(linux.find(browser => browser.id === 'chromium')?.dir).toBe('.config/chromium')
    expect(browsersFor('macos').find(browser => browser.id === 'safari')).toBeDefined()
  })

  test('Firefox is the first browser offered, on both platforms, ahead of Safari', async () => {
    expect(browsersFor('linux')[0]?.id).toBe('firefox')
    expect(browsersFor('macos')[0]?.id).toBe('firefox')
  })

  test('installGuide: every dependency for the detected system', async () => {
    expect(installGuide('macos')).toBe('brew install yt-dlp ffmpeg deno')
    expect(installGuide('linux', 'pacman')).toBe(
      'sudo pacman -S --needed yt-dlp ffmpeg xdg-utils\nDeno 2.3 or newer: curl -fsSL https://deno.land/install.sh | sh',
    )
    expect(installGuide('linux')).toContain('your Linux package manager (packages: yt-dlp ffmpeg xdg-utils)')
  })

  test('selects PulseAudio (including PipeWire Pulse) then ALSA on Linux', async () => {
    expect(audioOutput('DE pulse Pulse audio output device', 'linux')).toBe('pulse')
    expect(audioOutput('DE alsa ALSA audio output', 'linux')).toBe('alsa')
    expect(audioOutput('DE pulse Pulse audio output device\nDE alsa ALSA audio output', 'linux', false)).toBe('alsa')
    expect(audioOutput('DE audiotoolbox AudioToolbox output', 'macos')).toBe('audiotoolbox')
  })
})

describe('the browser', () => {
  const named = (...ids: string[]) => BROWSERS.filter(b => ids.includes(b.id))

  test('findBrowser: by either name, within a longer one, or none', async () => {
    expect(findBrowser('Firefox')?.id).toBe('firefox')
    expect(findBrowser(' edge ')?.id).toBe('edge')
    expect(findBrowser('Google Chrome')?.id).toBe('chrome')
    expect(findBrowser('Microsoft Edge')?.id).toBe('edge')
    expect(findBrowser('chromium')?.id).toBe('chromium')
    expect(findBrowser('Safari', 'linux')).toBeUndefined()
    expect(findBrowser('Arc')).toBeUndefined()
    expect(findBrowser('')).toBeUndefined()
  })

  test('browserOptions: the one in use first, four at most', async () => {
    const here = named('chrome', 'safari', 'edge', 'firefox', 'brave')
    expect(browserOptions(here, '')).toEqual(['Chrome', 'Safari', 'Edge', 'Firefox'])
    expect(browserOptions(here, 'brave')).toEqual(['Brave', 'Chrome', 'Safari', 'Edge'])
  })

  test('browserQuestion: names the browsers here that the choices leave out', async () => {
    expect(browserQuestion(named('chrome', 'safari'), '')).not.toContain('on this Mac too')
    expect(browserQuestion(named('chrome', 'safari'), '')).toContain('giving your terminal Full Disk Access')
    expect(browserQuestion(named('chrome', 'edge'), '')).not.toContain('Full Disk Access')
    expect(browserQuestion(named('chrome', 'safari', 'edge', 'firefox', 'brave'), '')).toContain(
      'Brave is on this Mac too: type it in.',
    )
    expect(browserQuestion(named('chrome', 'safari', 'edge', 'firefox', 'brave', 'opera'), '')).toContain(
      'Brave and Opera are on this Mac too: type one in.',
    )
  })
})

describe('videoBox', () => {
  test('a tall pane: the width decides, 9 columns to 8 rows', async () => {
    expect(videoBox(36, 60)).toEqual({ columns: 36, rows: 32 })
  })

  test('a short pane: the height decides, and the chrome fits under it', async () => {
    const box = videoBox(120, 30)
    expect(box.rows).toBeLessThanOrEqual(30 - CHROME_ROWS)
    expect(box.columns).toBe(Math.floor(((30 - CHROME_ROWS) * 9) / 8))
  })

  test('a big terminal: the normal pane keeps its section, however large', async () => {
    expect(videoBox(200, 100)).toEqual({ columns: 37, rows: 33 })
    expect(videoBox(400, 400)).toEqual({ columns: 37, rows: 33 })
  })

  test('zen: fills the body, and is never wider than an Image may be', async () => {
    expect(videoBox(120, 30, true)).toEqual({ columns: 32, rows: 28 })
    expect(videoBox(400, 400, true).columns).toBe(255)
  })
})

describe('frameSize', () => {
  test('raster: a pixel per column, two per row', async () => {
    expect(frameSize('raster', { columns: 36, rows: 32 })).toEqual({ width: 36, height: 64 })
  })

  test('image: about ten pixels a column, 9:16, at most 480 wide', async () => {
    expect(frameSize('image', { columns: 36, rows: 32 })).toEqual({ width: 360, height: 640 })
    expect(frameSize('image', { columns: 200, rows: 178 }).width).toBe(480)
  })
})

test('a new session retries full-resolution image rendering after a raster fallback', async () => {
  expect(imageModeAfterRestart('raster')).toBeUndefined()
  expect(imageModeAfterRestart('image')).toBe('image')
  expect(imageModeAfterRestart(undefined)).toBeUndefined()
})

describe('ffmpegArgs', () => {
  const frame = { file: '/tmp/f.rgb', width: 36, height: 64, columns: 36, rows: 32 }

  test('plays from the start point, sound to the speakers', async () => {
    const argv = ffmpegArgs({ path: '/tmp/a.mp4', start: 12.5, mode: 'image', frame, isMuted: false })
    expect(argv.join(' ')).toContain('-ss 12.50 -re -i /tmp/a.mp4')
    expect(argv.join(' ')).toContain('-update 1 -atomic_writing 1 /tmp/f.rgb')
    expect(argv.slice(-5)).toEqual(['-map', '0:a:0', '-f', 'audiotoolbox', '-'])
  })

  test('muted: no sound output; raster: 32 colors a frame', async () => {
    const argv = ffmpegArgs({ path: '/tmp/a.mp4', start: 0, mode: 'raster', frame, isMuted: true })
    expect(argv).not.toContain('audiotoolbox')
    expect(argv.join(' ')).toContain('palettegen=max_colors=32')
  })

  test('routes Linux audio to PipeWire/PulseAudio or ALSA', async () => {
    const pulse = ffmpegArgs({
      path: '/tmp/a.mp4',
      start: 0,
      mode: 'image',
      frame,
      isMuted: false,
      audioOutput: 'pulse',
    })
    expect(pulse.slice(-5)).toEqual(['-map', '0:a:0', '-f', 'pulse', 'default'])
    const alsa = ffmpegArgs({ path: '/tmp/a.mp4', start: 0, mode: 'image', frame, isMuted: false, audioOutput: 'alsa' })
    expect(alsa.slice(-5)).toEqual(['-map', '0:a:0', '-f', 'alsa', 'default'])
  })
})

describe('parseProgress', () => {
  test('reads the time and the end, keeping a cut line for the next piece', async () => {
    const first = parseProgress('frame=10\nout_time_us=2500000\nprogress=continue\nout_ti')
    expect(first).toEqual({ time: 2.5, isEnded: false, rest: 'out_ti' })
    const second = parseProgress(`${first.rest}me_us=3000000\nprogress=end\n`)
    expect(second).toEqual({ time: 3, isEnded: true, rest: '' })
  })

  test('skips a time ffmpeg does not know yet', async () => {
    expect(parseProgress('out_time_us=N/A\n').time).toBeUndefined()
  })
})

describe('toCells', () => {
  test('one cell: an upper half block, the upper pixel over the lower', async () => {
    const cells = toCells(Uint8Array.of(0xff, 0x80, 0x00, 0x00, 0x00, 0xff), 1, 1)
    const words = new Uint32Array(Uint8Array.fromBase64(cells).buffer)
    expect([...words]).toEqual([0x2580, 0xff8000, 0x0000ff])
  })

  test('cells are row-major over pixel rows two at a time', async () => {
    // 2 x 2 pixels: red, green / blue, white.
    const rgb = Uint8Array.of(255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255)
    const words = new Uint32Array(Uint8Array.fromBase64(toCells(rgb, 2, 1)).buffer)
    expect([...words]).toEqual([0x2580, 0xff0000, 0x0000ff, 0x2580, 0x00ff00, 0xffffff])
  })

  test('a blank box has a cell for every column and row', async () => {
    expect(Uint8Array.fromBase64(blankCells(3, 2)).length).toBe(3 * 2 * 12)
  })
})

test('clockTime', async () => {
  expect(clockTime(0)).toBe('0:00')
  expect(clockTime(75.9)).toBe('1:15')
})
