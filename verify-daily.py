import datetime,importlib.util,unittest
spec=importlib.util.spec_from_file_location('daily','daily-research.py');d=importlib.util.module_from_spec(spec);spec.loader.exec_module(d)
class DailyTests(unittest.TestCase):
 def test_provenance(self):
  today=datetime.date.today();u='https://www.sec.gov/news/test';a=dict(title='News',tldr='Summary',why='Implication',risk='Uncertainty',watch='Next filing',published=str(today),tickers=['INTC'],sources=[u])
  self.assertEqual(len(d.validate_articles({'articles':[a]},{u},set(),today)),1)
  self.assertEqual(d.validate_articles({'articles':[a]},set(),set(),today),[])
  self.assertEqual(d.validate_articles({'articles':[a]},{u},{u},today),[])
  a['published']=str(today+datetime.timedelta(days=1));self.assertEqual(d.validate_articles({'articles':[a]},{u},set(),today),[])
if __name__=='__main__':unittest.main()
