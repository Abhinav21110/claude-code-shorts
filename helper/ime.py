"""cc-shorts input source helper: keeps an input method off the pane's hotkeys.

    ime.py english   switches to an ASCII-capable layout or suspends the active
                     input method, and prints {"was": sourceId | null}
    ime.py select ID restores the input source and prints {"id": ID}

Every command prints one JSON line on stdout; errors go to stderr with a
non-zero exit. Linux uses Fcitx5 or IBus when available, and otherwise leaves
the input method unchanged.

A Chinese or Japanese input method takes the letters a key types before the
terminal sees them, so a Button's hotkey never fires while one is on. macOS
uses the Text Input Sources API through ctypes; Linux uses the desktop input
method's command-line tool. Any Python can run this.
"""

import ctypes
import ctypes.util
import json
import shutil
import subprocess
import sys

UTF8 = 0x08000100
vp = ctypes.c_void_p


def load():
    cf = ctypes.cdll.LoadLibrary(ctypes.util.find_library('CoreFoundation'))
    tis = ctypes.cdll.LoadLibrary(ctypes.util.find_library('Carbon'))
    for lib, name, restype, argtypes in [
        (cf, 'CFStringCreateWithCString', vp, [vp, ctypes.c_char_p, ctypes.c_uint32]),
        (cf, 'CFStringGetCString', ctypes.c_bool, [vp, ctypes.c_char_p, ctypes.c_long, ctypes.c_uint32]),
        (cf, 'CFBooleanGetValue', ctypes.c_bool, [vp]),
        (cf, 'CFDictionaryCreate', vp, [vp, ctypes.POINTER(vp), ctypes.POINTER(vp), ctypes.c_long, vp, vp]),
        (cf, 'CFArrayGetCount', ctypes.c_long, [vp]),
        (cf, 'CFArrayGetValueAtIndex', vp, [vp, ctypes.c_long]),
        (tis, 'TISCopyCurrentKeyboardInputSource', vp, []),
        (tis, 'TISCopyCurrentASCIICapableKeyboardLayoutInputSource', vp, []),
        (tis, 'TISGetInputSourceProperty', vp, [vp, vp]),
        (tis, 'TISCreateInputSourceList', vp, [vp, ctypes.c_bool]),
        (tis, 'TISSelectInputSource', ctypes.c_int32, [vp]),
    ]:
        fn = getattr(lib, name)
        fn.restype, fn.argtypes = restype, argtypes
    return cf, tis


def text(cf, ref):
    buf = ctypes.create_string_buffer(256)
    return buf.value.decode() if ref and cf.CFStringGetCString(ref, buf, len(buf), UTF8) else None


def main():
    cmd, args = sys.argv[1], sys.argv[2:]
    if sys.platform == 'darwin':
        out = {'english': english, 'select': select}[cmd](*args)
    elif sys.platform.startswith('linux'):
        out = {'english': linux_english, 'select': linux_select}[cmd](*args)
    else:
        out = {'english': lambda: {'was': None}, 'select': lambda _source: {'id': _source}}[cmd](*args)
    json.dump(out, sys.stdout)
    print()


def run(argv):
    try:
        return subprocess.run(argv, capture_output=True, text=True, timeout=5, check=False)
    except (OSError, subprocess.TimeoutExpired) as err:
        sys.exit(str(err))


def linux_english():
    fcitx = shutil.which('fcitx5-remote')
    if fcitx:
        state = run([fcitx]).stdout.strip()
        if state == '2':
            if run([fcitx, '-c']).returncode != 0:
                sys.exit('could not suspend Fcitx5')
            return {'was': 'fcitx5:active'}
        if state in ('0', '1'):
            return {'was': None}

    ibus = shutil.which('ibus')
    if ibus:
        current = run([ibus, 'engine'])
        engine = current.stdout.strip()
        if current.returncode == 0 and engine and not engine.startswith('xkb:'):
            if run([ibus, 'engine', 'xkb:us::eng']).returncode != 0:
                sys.exit('could not select the IBus English layout')
            return {'was': f'ibus:{engine}'}
    return {'was': None}


def linux_select(source_id):
    if source_id == 'fcitx5:active':
        fcitx = shutil.which('fcitx5-remote')
        if not fcitx or run([fcitx, '-o']).returncode != 0:
            sys.exit('could not restore the Fcitx5 input method')
        return {'id': source_id}
    if source_id.startswith('ibus:'):
        ibus = shutil.which('ibus')
        engine = source_id.removeprefix('ibus:')
        if not ibus or not engine or run([ibus, 'engine', engine]).returncode != 0:
            sys.exit(f'could not restore IBus engine {engine}')
        return {'id': source_id}
    sys.exit(f'unknown Linux input source {source_id}')


def english():
    cf, tis = load()

    def prop(src, name):
        return tis.TISGetInputSourceProperty(src, vp.in_dll(tis, name))

    def source_id(src):
        return text(cf, prop(src, 'kTISPropertyInputSourceID'))

    now = tis.TISCopyCurrentKeyboardInputSource()
    is_layout = text(cf, prop(now, 'kTISPropertyInputSourceType')) == text(cf, vp.in_dll(tis, 'kTISTypeKeyboardLayout'))
    ascii_ref = prop(now, 'kTISPropertyInputSourceIsASCIICapable')
    if is_layout and ascii_ref and cf.CFBooleanGetValue(ascii_ref):
        return {'was': None}
    layout = tis.TISCopyCurrentASCIICapableKeyboardLayoutInputSource()
    if tis.TISSelectInputSource(layout) != 0:
        sys.exit(f'could not select {source_id(layout)}')
    return {'was': source_id(now)}


def select(source_id):
    cf, tis = load()
    key = vp(vp.in_dll(tis, 'kTISPropertyInputSourceID').value)
    value = vp(cf.CFStringCreateWithCString(None, source_id.encode(), UTF8))
    query = cf.CFDictionaryCreate(None, ctypes.byref(key), ctypes.byref(value), 1, None, None)
    found = tis.TISCreateInputSourceList(query, False)
    if not found or cf.CFArrayGetCount(found) == 0:
        sys.exit(f'no enabled input source {source_id}')
    if tis.TISSelectInputSource(cf.CFArrayGetValueAtIndex(found, 0)) != 0:
        sys.exit(f'could not select {source_id}')
    return {'id': source_id}


if __name__ == '__main__':
    main()
