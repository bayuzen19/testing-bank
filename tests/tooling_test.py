import copy,sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from local_model import validate_endpoint
from release_docs import validate,REQUIRED

class EvidenceTests(unittest.TestCase):
    def setUp(self):
        self.e={'sha':'a'*40,'repository':'bayuzen19/testing-bank','run_id':'123','checks':{k:'passed' for k in REQUIRED}}
        self.s={'sha':'a'*40,'status':'OK','analysis_id':'current-analysis'}
    def test_complete_evidence(self):validate(self.e,self.s)
    def test_missing_failed_skipped_and_stale_fail_closed(self):
        for status in ['failed','skipped','unknown',None]:
            e=copy.deepcopy(self.e);e['checks']['browser']=status
            with self.assertRaises(ValueError):validate(e,self.s)
        e=copy.deepcopy(self.e);del e['checks']['sonar']
        with self.assertRaises(ValueError):validate(e,self.s)
        for change in [{'sha':'b'*40},{'status':'ERROR'},{'analysis_id':''}]:
            with self.assertRaises(ValueError):validate(self.e,{**self.s,**change})
    def test_cloud_and_ambiguous_endpoints_are_rejected(self):
        for url in ['https://api.openai.com','http://localhost:11434','http://127.0.0.1.evil.test','http://user:secret@127.0.0.1','http://127.0.0.1/x','http://127.0.0.1?x=1']:
            with self.assertRaises(ValueError):validate_endpoint(url)
        self.assertEqual(validate_endpoint('http://127.0.0.1:11434'),'http://127.0.0.1:11434')
if __name__=='__main__':unittest.main()
