"""Model-free official announcement scan across every loaded political equity."""
import datetime as dt, json, re, time
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
from research_engine import PROFILE, checked_url, extract_page

STATE=PROFILE/'poor-catalyst-monitor.json'
SOURCES={'DOE':'https://www.energy.gov/newsroom','Treasury':'https://home.treasury.gov/news/press-releases','Commerce':'https://www.commerce.gov/news/press-releases'}
ALIASES={'VST':'Vistra','BE':'Bloom Energy','INTC':'Intel','NVDA':'NVIDIA','CEG':'Constellation Energy','TLN':'Talen Energy','NEE':'NextEra Energy','AVGO':'Broadcom','MSFT':'Microsoft','AMZN':'Amazon','GOOG':'Alphabet','GOOGL':'Alphabet'}
class Links(HTMLParser):
 def __init__(self):super().__init__();self.urls=[]
 def handle_starttag(self,tag,attrs):
  if tag=='a':
   href=dict(attrs).get('href','')
   if href:self.urls.append(href)

def article_links(html,base):
 p=Links();p.feed(html);host=urlparse(base).hostname;out=[]
 for href in p.urls:
  u=urljoin(base,href);path=urlparse(u).path
  if urlparse(u).hostname!=host or urlparse(u).query:continue
  if '/articles/' in path or re.search(r'/news/press-releases/[^/]+',path):out.append(u)
 return list(dict.fromkeys(out))[:24]

def issuer_names(rows):
 names={}
 for r in rows:
  s=r.get('ticker','')
  if r.get('quality')=='User-provided' or r.get('asset') not in ('Stock','ADR','Call options','ETF') or not re.fullmatch(r'[A-Z][A-Z0-9.-]{0,11}',s):continue
  name=ALIASES.get(s) or re.split(r'\b(?:Common|Class|Stock|Shares|COM|CL)\b|\(',r.get('company',''),maxsplit=1,flags=re.I)[0].strip(' .-')
  if name.lower() in ('service','strategy','target','news','energy','capital','bank','trust','international','united','first'):continue
  if len(name)>=4 and not re.search(r'\d|\$',name):names[s]=name
 return names

def match_document(doc,names,today):
 date=str(doc.get('date') or '')[:10]
 try:age=(today-dt.date.fromisoformat(date)).days
 except ValueError:return []
 if not 0<=age<=7:return []
 text=(doc.get('title') or '')+' '+doc.get('text','')
 return [{'ticker':s,'kind':'policy','label':doc.get('title') or 'Official announcement','date':date,'url':doc['url'],'detail':'Official announcement names '+name+'. Company impact and trade direction require investigation.','status':'sourced'} for s,name in names.items() if re.search(r'(?<!\w)'+re.escape(name)+r'(?!\w)',text,re.I)]

def scan(rows,force=False):
 old=json.loads(STATE.read_text(encoding='utf-8')) if STATE.exists() else {}
 names=issuer_names(rows);today=dt.date.today()
 if not force and time.time()-old.get('checkedAt',0)<1800 and old.get('names')==names:return old
 checked_url(SOURCES['DOE'])
 from tools.url_safety import create_ssrf_safe_client
 urls=[];errors=[]
 for name,url in SOURCES.items():
  try:
   checked_url(url)
   with create_ssrf_safe_client(timeout=15,follow_redirects=False,trust_env=False) as client:
    r=client.get(url);r.raise_for_status();links=article_links(r.text,url)
   if not links:raise ValueError('No article links')
   urls+=links
  except Exception as e:errors.append(name+': '+type(e).__name__)
 def read(url):
  try:return extract_page(url)
  except Exception:return {'url':url}
 with ThreadPoolExecutor(max_workers=4) as pool:docs=list(pool.map(read,dict.fromkeys(urls)))
 items=[item for doc in docs for item in match_document(doc,names,today)]
 result={'checkedAt':time.time(),'names':names,'symbols':sorted(names),'items':items,'sources':list(SOURCES),'errors':errors,'pages':len(docs),'retrieved':sum(bool(d.get('text')) for d in docs)}
 if docs and not result['retrieved']:result['errors'].append('No announcement text retrieved')
 temp=STATE.with_suffix('.tmp');temp.write_text(json.dumps(result),encoding='utf-8');temp.replace(STATE);return result

def news_candidates(rows,fetch_news,today,offset=0,limit=96):
 """Rotate through all loaded equities; older positions never age out."""
 names=issuer_names(rows);symbols=sorted(names)
 selected=[] if not symbols else [symbols[(offset+i)%len(symbols)] for i in range(min(limit,len(symbols)))]
 events=[];errors=[]
 def fetch(s):
  try:return s,fetch_news(s)
  except Exception:return s,{'error':True}
 with ThreadPoolExecutor(max_workers=6) as pool:results=list(pool.map(fetch,selected))
 for s,data in results:
  try:
   if data.get('error') or data.get('stale'):raise ValueError('News unavailable')
   for item in data.get('value',{}).get('items',[]):
    from email.utils import parsedate_to_datetime
    try:d=parsedate_to_datetime(item['published']).date()
    except Exception:continue
    if 0<=(today-d).days<=3 and str(item.get('url','')).startswith('https://'):
     events.append({'ticker':s,'kind':'company','label':item['title'],'date':str(d),'url':item['url'],'detail':'News discovery lead; retrieve original evidence before publishing.','status':'candidate'})
  except Exception:errors.append(s)
 return events,{'scanned':selected,'total':len(symbols),'nextOffset':(offset+len(selected))%max(1,len(symbols)),'errors':errors}
