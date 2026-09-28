import datetime, unittest
from unittest.mock import patch
import research_engine as engine
from research_candidates import buying_clusters

class ResearchTests(unittest.TestCase):
    def test_json_recovery(self):
        self.assertEqual(engine.parse_json('log {bad}\n```json\n{"items":[]}\n```'),{'items':[]})
        with self.assertRaises(ValueError):engine.parse_json('Still searching')
    def test_only_extracted_or_supplied_sources_publish(self):
        leads=[{'url':'https://example.com/read','tool':'web_search','snippet':'lead'}, {'url':'https://example.com/blocked','tool':'web_search','snippet':'unverified'}]
        def extract(url):return {'url':url,'text':'Verified page text','kind':'extracted page'} if url.endswith('read') else {'url':url,'kind':'unavailable'}
        with patch.object(engine,'invoke',return_value='{"items":[]}'),patch.object(engine,'discovered_evidence',return_value=leads),patch.object(engine,'extract_page',side_effect=extract):
            report,allowed=engine.run_report('Test',{'https://house.gov/filing'})
        self.assertEqual(allowed,{'https://house.gov/filing','https://example.com/read'})
        self.assertEqual(report['_diagnostics']['extracted'],1)
    def test_url_refusals(self):
        for u in ['http://example.com','https://user:secret@example.com','https://127.0.0.1/','https://example.com/?api_key=secret']:
            with self.assertRaises(ValueError):engine.checked_url(u)
    def test_cluster_window_and_duplicate_households(self):
        today=datetime.date(2026,9,28)
        def row(person,date,ticker='TEST'):return dict(person=person,traded=date,filed=date,ticker=ticker,type='Purchase',asset='Stock',source='https://house.gov/filing')
        rows=[row('A','2026-09-01'),row('A','2026-09-02'),row('B','2026-09-10'),row('C','2026-07-01'),row('D','2026-10-01'),row('A','2026-09-01','OTHER'),row('B','2026-09-10','OTHER')]
        c=buying_clusters(rows,today)['TEST']
        self.assertEqual(c['people'],['A','B']);self.assertEqual(c['households'],2);self.assertEqual(c['otherSharedStocks'],['OTHER'])
        self.assertEqual(buying_clusters([{**rows[0],'quality':'User-provided'}],today),{})

if __name__=='__main__':unittest.main()
