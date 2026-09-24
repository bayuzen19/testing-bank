import json,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import github_review as review

class ReviewScopeTests(unittest.TestCase):
    def run_case(self,files,after='a',args=None):
        temp=tempfile.TemporaryDirectory();self.addCleanup(temp.cleanup)
        target=Path(temp.name)/'review.json'
        responses=[{'head':{'sha':'a'*40},'changed_files':len(files)},files,{'head':{'sha':after*40}}]
        def get(_):return responses.pop(0)
        argv=['review','--repo','bayuzen19/testing-bank','--pr','2','--output',str(target)]+(args or [])
        with patch.object(sys,'argv',argv),patch.object(review,'github_get',get),patch.object(review,'infer',return_value=(json.dumps({'findings':[],'limitations':'Test fixture only'}),{'model':'test-double'})) as infer:
            review.main();return json.loads(target.read_text()),infer.call_args
    def test_exact_file_scope_records_omissions_and_accepts_jsx(self):
        files=[{'filename':'src/App.jsx','patch':'@@ -0,0 +1,2 @@\n+const a=1;\n+export default a;'},{'filename':'server/app.mjs','patch':'@@ -0,0 +1 @@\n+const x=1;'}]
        result,args=self.run_case(files,args=['--file','src/App.jsx'])
        self.assertEqual(result['omitted_files'],['server/app.mjs']);self.assertNotIn('server/app.mjs',args.args[1])
    def test_changed_head_fails_closed(self):
        with self.assertRaisesRegex(ValueError,'changed during review'):self.run_case([{'filename':'a.mjs','patch':'@@ -0,0 +1 @@\n+const a=1;'}],after='b')
    def test_large_and_secret_patches_fail_before_inference(self):
        for body in ['x'*22001,'-----BEGIN PRIVATE KEY-----']:
            with self.assertRaises(ValueError):self.run_case([{'filename':'a.mjs','patch':body}])
    def test_missing_requested_scope_fails_closed(self):
        with self.assertRaisesRegex(ValueError,'Requested file missing'):self.run_case([{'filename':'a.mjs','patch':'x'}],args=['--file','missing.mjs'])
if __name__=='__main__':unittest.main()
