import sys, unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from sonar_bootstrap import generate_admin_password

class SonarPasswordTests(unittest.TestCase):
    def test_missing_random_character_classes_do_not_break_bootstrap(self):
        for material in ['a' * 43, 'Z' * 43, '0' * 43, '_' * 43]:
            with self.subTest(material=material[0]), patch('sonar_bootstrap.secrets.token_urlsafe', return_value=material) as entropy:
                password = generate_admin_password()
                entropy.assert_called_once_with(32)
                self.assertGreaterEqual(len(password), 12)
                self.assertRegex(password, '[A-Z]')
                self.assertRegex(password, '[a-z]')
                self.assertRegex(password, '[0-9]')
                self.assertRegex(password, '[^A-Za-z0-9]')
                self.assertTrue(password.endswith(material))
