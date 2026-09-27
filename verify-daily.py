import datetime,importlib.util,unittest
spec=importlib.util.spec_from_file_location('daily','daily-research.py');d=importlib.util.module_from_spec(spec);spec.loader.exec_module(d)
class DailyTests(unittest.TestCase):
 def test_provenance(self):
  today=datetime.date.today();u='https://www.sec.gov/news/test';a=dict(title='News',tldr='Summary',why='Implication',risk='Uncertainty',watch='Next filing',published=str(today),tickers=['INTC'],sources=[u,'https://www.congress.gov/test'],pricedIn='Unknown',invalidation='Bill fails',horizon='2-20 days',evidence=[{'kind':'insider','fact':'Filing','date':str(today),'url':u},{'kind':'policy','fact':'Bill','date':str(today),'url':'https://www.congress.gov/test'}])
  self.assertEqual(len(d.validate_articles({'articles':[a]},{u,'https://www.congress.gov/test'},set(),today)),1)
  self.assertEqual(d.validate_articles({'articles':[a]},set(),set(),today),[])
  self.assertEqual(d.validate_articles({'articles':[a]},{u,'https://www.congress.gov/test'},{'|'.join(sorted(a['sources']))},today),[])
  a['published']=str(today+datetime.timedelta(days=1));self.assertEqual(d.validate_articles({'articles':[a]},{u,'https://www.congress.gov/test'},set(),today),[])
if __name__=='__main__':unittest.main()
