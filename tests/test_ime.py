import subprocess
import unittest
from unittest.mock import patch

from helper import ime


class LinuxInputMethodTest(unittest.TestCase):
    @patch(
        'helper.ime.shutil.which',
        side_effect=lambda name: '/usr/bin/fcitx5-remote' if name == 'fcitx5-remote' else None,
    )
    @patch('helper.ime.subprocess.run')
    def test_fcitx5_is_suspended_and_restored(self, run, _which):
        run.side_effect = [
            subprocess.CompletedProcess([], 0, '2'),
            subprocess.CompletedProcess([], 0, ''),
            subprocess.CompletedProcess([], 0, ''),
        ]
        with patch('helper.ime.sys.platform', 'linux'):
            switched = ime.linux_english()
            restored = ime.linux_select(switched['was'])
        self.assertEqual(switched, {'was': 'fcitx5:active'})
        self.assertEqual(restored, {'id': 'fcitx5:active'})
        self.assertEqual(run.call_args_list[1].args[0], ['/usr/bin/fcitx5-remote', '-c'])
        self.assertEqual(run.call_args_list[2].args[0], ['/usr/bin/fcitx5-remote', '-o'])

    @patch('helper.ime.shutil.which', side_effect=lambda name: '/usr/bin/ibus' if name == 'ibus' else None)
    @patch('helper.ime.subprocess.run')
    def test_ibus_uses_us_layout_and_restores_previous_engine(self, run, _which):
        run.side_effect = [
            subprocess.CompletedProcess([], 0, 'pinyin'),
            subprocess.CompletedProcess([], 0, ''),
            subprocess.CompletedProcess([], 0, ''),
        ]
        with patch('helper.ime.sys.platform', 'linux'):
            switched = ime.linux_english()
            restored = ime.linux_select(switched['was'])
        self.assertEqual(switched, {'was': 'ibus:pinyin'})
        self.assertEqual(restored, {'id': 'ibus:pinyin'})
        self.assertEqual(run.call_args_list[1].args[0], ['/usr/bin/ibus', 'engine', 'xkb:us::eng'])
        self.assertEqual(run.call_args_list[2].args[0], ['/usr/bin/ibus', 'engine', 'pinyin'])

    @patch('helper.ime.shutil.which', return_value=None)
    def test_no_ime_service_is_a_no_op(self, _which):
        with patch('helper.ime.sys.platform', 'linux'):
            self.assertEqual(ime.linux_english(), {'was': None})


if __name__ == '__main__':
    unittest.main()
