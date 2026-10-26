import io
import unittest
from contextlib import redirect_stderr, redirect_stdout

from helper.yt import _YoutubeDL, cookie_key_hint, ydl_params


class CookieKeyHintTest(unittest.TestCase):
    def test_linux_missing_or_locked_keyring_has_linux_instructions(self):
        hint = cookie_key_hint('linux', ['cannot decrypt v11 cookies: no key found'], [])
        self.assertEqual(hint, 'unlock your GNOME Keyring or KWallet so yt-dlp can decrypt Chromium cookies')
        missing_kwallet = cookie_key_hint('linux', [], ['kwallet-query command not found'])
        self.assertEqual(missing_kwallet, 'unlock your GNOME Keyring or KWallet so yt-dlp can decrypt Chromium cookies')

    def test_macos_keeps_the_keychain_hint(self):
        hint = cookie_key_hint('darwin', ['find-generic-password failed'], [])
        self.assertEqual(hint, 'allow the macOS Keychain prompt for its key')

    def test_unrelated_cookie_warnings_are_not_misreported_as_keyring_failures(self):
        self.assertIsNone(cookie_key_hint('linux', ['some unrelated warning'], []))
        self.assertIsNone(cookie_key_hint('linux', [], ['network unavailable']))

    def test_keyring_error_is_recorded_without_aborting_cookie_loading(self):
        with redirect_stderr(io.StringIO()), redirect_stdout(io.StringIO()):
            ydl = _YoutubeDL({'quiet': True})
            ydl.report_error('secretstorage not available', is_error=True)
        self.assertEqual(ydl.errors, ['secretstorage not available'])
        ydl.close()


class YtDlpSetupTest(unittest.TestCase):
    def test_downloads_allow_official_remote_ejs_scripts_for_distro_packages(self):
        params = ydl_params(cookies=False, format='best')
        self.assertEqual(params['remote_components'], ['ejs:github'])
        self.assertFalse(params.get('cookiesfrombrowser'))
        self.assertEqual(params['format'], 'best')


if __name__ == '__main__':
    unittest.main()
