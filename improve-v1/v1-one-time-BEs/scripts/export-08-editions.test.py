#!/usr/bin/env python3
"""Source continuity, exporter drift, and unsafe-markup regression tests. No network."""
import copy
import importlib.util
from pathlib import Path
import subprocess
import sys
import unittest

spec = importlib.util.spec_from_file_location('exporter', Path(__file__).with_name('export-08-editions.py'))
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)


class EditionExportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.result = exporter.export()
        cls.editions = {e['id']: e for e in cls.result['editions']}

    def test_committed_fixture_is_current_and_deterministic(self):
        self.assertEqual(exporter.serialize(self.result), exporter.OUTPUT.read_text())
        self.assertEqual(exporter.serialize(exporter.export()), exporter.serialize(self.result))
        process = subprocess.run([sys.executable, str(Path(exporter.__file__)), '--check'], capture_output=True)
        self.assertEqual(process.returncode, 0, process.stderr)

    def test_full_original_email_and_fixed_cards_survive(self):
        edition = self.editions['healing-v1']
        self.assertIn('Subject:', edition['freeEmailText'])
        self.assertIn('A figure in a dark cloak', edition['freeEmailText'])
        self.assertIn('P.S.', edition['freeEmailText'])
        self.assertIn('%FIRSTNAME%', edition['freeEmailText'])
        self.assertIn('\n\n', edition['freeEmailText'])
        self.assertNotIn('](BOOKING)', edition['freeEmailText'])
        self.assertEqual([p['fixedCard']['cardId'] for p in edition['positions'] if p['visibility']=='free'], ['five-of-cups','strength'])
        self.assertIn('bookingCopy', edition)

    def test_variable_visibility_and_same_topic_versions(self):
        self.assertEqual(sum(p['visibility']=='free' for p in self.editions['quiet-v1']['positions']),3)
        self.assertTrue(all(e['theme'].strip() for e in self.editions.values()))
        a,b = self.editions['higher-calling-v1'], self.editions['higher-calling-v2']
        self.assertEqual(a['slug'],b['slug'])
        self.assertEqual((a['version'],b['version']),(1,2))
        self.assertNotEqual(a['freeEmailText'],b['freeEmailText'])
        self.assertNotEqual(a['positions'][1]['label'],b['positions'][1]['label'])
        self.assertEqual(a['positions'][0]['fixedCard']['cardId'],'star')

    def test_paid_cards_are_never_predrawn(self):
        for edition in self.editions.values():
            for pos in edition['positions']:
                if pos['visibility']=='paid':
                    self.assertNotIn('fixedCard',pos)
        broken = copy.deepcopy(self.editions['healing-v1'])
        broken['positions'][2]['fixedCard'] = {'cardId':'sun','reversed':False}
        with self.assertRaisesRegex(AssertionError,'per buyer'):
            exporter.validate(broken)

    def test_bad_source_metadata_fails(self):
        builder = exporter.load_builder()
        builder.LETTERS['what-part-of-me-needs-healing']['funnel']['paid_labels'] = ['Missing positions']
        with self.assertRaisesRegex(AssertionError,'count mismatch'):
            exporter.export(builder)

    def test_fixture_drift_is_detected_without_writing(self):
        original = exporter.OUTPUT
        import tempfile
        with tempfile.TemporaryDirectory() as directory:
            exporter.OUTPUT = Path(directory)/'editions.json'
            exporter.OUTPUT.write_text('{}')
            from unittest.mock import patch
            with patch.object(sys,'argv',['exporter','--check']):
                self.assertEqual(exporter.main(),1)
            self.assertEqual(exporter.OUTPUT.read_text(),'{}')
        exporter.OUTPUT = original

    def test_plain_text_removes_markup_and_active_content(self):
        self.assertEqual(exporter.plain_text('**Hello**\n\n[Continue](BOOKING)<script>bad()</script><img src=x onerror=bad()>'), 'Hello\n\nContinue')
        self.assertEqual(exporter.plain_text('A &amp; B'), 'A & B')

    def test_published_status_is_only_for_local_routing(self):
        self.assertEqual(self.result['publicationScope'],'local-fixture-only')
        self.assertIn('not approved',self.result['notice'])
        self.assertEqual(len(self.result['sources']),len(self.editions))


if __name__ == '__main__':
    unittest.main()
