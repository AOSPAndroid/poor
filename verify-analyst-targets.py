import unittest,datetime as dt,importlib.util
spec=importlib.util.spec_from_file_location('targets','analyst-targets.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Tests(unittest.TestCase):
 def test_validation(self):
  x=dict(ticker='NVDA',institution='Morgan Stanley',analyst='Example Analyst',published='2026-09-30',currency='USD',oldTarget=200,newTarget=220,rating='Overweight',horizon='12 months',reason='Verified revision',sources=['https://www.reuters.com/markets/report'])
  valid=lambda v:m.validate_items({'items':[v]},set(x['sources']),dt.date(2026,9,30),['NVDA'])
  self.assertEqual(len(valid(x)),1)
  for delta in [dict(oldTarget=None),dict(newTarget=True),dict(currency='EUR'),dict(published='2026-10-01'),dict(sources=['https://unread.example/report']),dict(institution='Anonymous'),dict(newTarget=200)]:self.assertFalse(valid({**x,**delta}))
if __name__=='__main__':unittest.main()
