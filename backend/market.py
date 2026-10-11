"""Optional public historical prices. No credentials or trading operations."""
import asyncio
import datetime
import math
import time
import httpx
from fastapi import HTTPException

STOCKS={'AAPL':'Apple','MSFT':'Microsoft','NVDA':'NVIDIA','GOOGL':'Alphabet','AMZN':'Amazon','META':'Meta','TSLA':'Tesla'}
SYMBOLS={**STOCKS,'BTC-USD':'Bitcoin','ETH-USD':'Ethereum'}
CACHE={}

async def market_history(symbol,period):
    if symbol not in SYMBOLS or period not in ('1mo','3mo','1y','2y','5y','10y','ytd'):
        raise HTTPException(400,'ไม่รองรับสินทรัพย์หรือช่วงเวลานี้')
    cache_key=(symbol,period)
    cached=CACHE.get(cache_key)
    if cached and time.monotonic()-cached[0]<900:
        return {**cached[1],'cached':True}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response=await client.get(f'https://query1.finance.yahoo.com/v8/finance/chart/{symbol}',
                                      params={'range':period,'interval':'1d','includeAdjustedClose':'true'},headers={'User-Agent':'FinSight-AI/0.1'})
        response.raise_for_status()
        raw=response.json()['chart']['result'][0]
        quotes=raw['indicators']['quote'][0]['close']
        adjusted=raw['indicators'].get('adjclose',[{}])[0].get('adjclose',[])
        currency=raw['meta'].get('currency','')
        points=[]
        for index,(stamp,close) in enumerate(zip(raw.get('timestamp',[]),quotes)):
            if isinstance(close,(int,float)) and math.isfinite(close) and close>0:
                points.append({'date':datetime.datetime.fromtimestamp(stamp,datetime.timezone.utc).date().isoformat(),
                               'timestamp':stamp,'close':round(close,4)})
                adj=adjusted[index] if index<len(adjusted) else None
                if isinstance(adj,(int,float)) and math.isfinite(adj) and adj>0:
                    points[-1]['adjusted_close']=adj
        if len(points)<2: raise ValueError('Insufficient data')
    except (httpx.HTTPError,KeyError,TypeError,IndexError,ValueError):
        raise HTTPException(502,'ดึงราคาย้อนหลังจาก Yahoo Finance ไม่สำเร็จ กรุณาลองใหม่ภายหลัง ไม่มีข้อมูลจำลอง')
    result={'symbol':symbol,'name':SYMBOLS[symbol],'currency':currency,
            'points':points,'period':period,'price_type':'daily close, not adjusted close',
            'source':'Yahoo Finance','source_url':f'https://finance.yahoo.com/quote/{symbol}/history/',
            'fetched_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'cached':False,
            'limitations':['ราคาปิดย้อนหลังอาจล่าช้า ช่วงล่าสุดอาจยังไม่ปิดตลาด และวันที่แสดงตาม UTC',
                           'ไม่ปรับปันผลหรือแตกหุ้น ไม่ใช่ผลตอบแทนรวม ไม่ใช้เปรียบเทียบราคาต่อหน่วยข้ามสินทรัพย์',
                           'แหล่งสาธารณะนี้ไม่มี SLA และอาจจำกัดการเข้าถึง ไม่ใช่ราคาเรียลไทม์']}
    CACHE[cache_key]=(time.monotonic(),result)
    return result



def build_comparison(histories, period, frequency):
    """Align actual trading dates before sampling; never fill missing quotes."""
    if frequency not in ('quarterly','monthly'):
        raise HTTPException(400,'รองรับเฉพาะรายไตรมาสและรายเดือน')
    indexed=[]
    for history in histories:
        values={p['date']:p['adjusted_close'] for p in history['points']
                if isinstance(p.get('adjusted_close'),(int,float))
                and math.isfinite(p['adjusted_close']) and p['adjusted_close']>0}
        indexed.append(values)
    common=sorted(set.intersection(*(set(values) for values in indexed)))
    if len(common)<2:
        raise HTTPException(502,'ข้อมูลราคาปิดปรับปรุงที่ตรงวันกันไม่เพียงพอสำหรับเปรียบเทียบ ไม่แทนข้อมูลที่ขาดด้วยศูนย์')
    def bucket(date):
        year,month=int(date[:4]),int(date[5:7])
        return f'{year} Q{(month-1)//3+1}' if frequency=='quarterly' else date[:7]
    # Keep the start point at 0%, then the last shared trading day of every period.
    grouped={}
    for date in common:
        grouped[bucket(date)]=date
    dates=sorted(set([common[0],*grouped.values()]))
    today=datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    current=bucket(today)
    start_period=bucket(common[0])
    series=[]
    for history,values in zip(histories,indexed):
        base=values[common[0]]
        points=[]
        previous=base
        for date in dates:
            value=values[date]
            points.append({'date':date,'label':bucket(date),'adjusted_close':value,
                           'change_pct':round((value/base-1)*100,4),
                           'period_change_pct':None if date==common[0] else round((value/previous-1)*100,4),
                           'is_baseline':date==common[0],
                           'is_partial':bucket(date) in (current,start_period)})
            previous=value
        series.append({'symbol':history['symbol'],'name':history['name'],'currency':history['currency'],
                       'source_url':history['source_url'],'fetched_at':history['fetched_at'],
                       'cached':history['cached'],'points':points})
    return {'series':series,'period':period,'frequency':frequency,'start_date':common[0],
            'end_date':common[-1],'aligned_daily_points':len(common),
            'source':'Yahoo Finance','price_basis':'adjusted_close','baseline':0,
            'limitations':['เทียบเปอร์เซ็นต์จากราคาปิดปรับปรุงของวันเริ่มต้นร่วมกัน ใช้เฉพาะวันที่ทุกหุ้นมีข้อมูล',
                           'ราคาปิดปรับปรุงเป็นค่าจากผู้ให้บริการที่ปรับผลของปันผลและแตกหุ้น ไม่รวมค่าธรรมเนียมหรือภาษี',
                           'จุดต้นทางและช่วงแรกอาจเป็นเพียงส่วนหนึ่งของไตรมาส/เดือน ช่วงปัจจุบันใช้ข้อมูลล่าสุดที่มีและยังไม่ครบช่วง',
                           'เส้นโค้งใช้เพื่ออ่านแนวโน้มระหว่างจุด ไม่ใช่ราคาในวันที่ไม่มีข้อมูลหรือการคาดการณ์',
                           'วันที่แสดง UTC ข้อมูลอาจล่าช้าหรือแก้ย้อนหลัง แหล่งสาธารณะไม่มี SLA และไม่ใช่ราคาสด']}


async def stock_comparison(symbols, period='5y', frequency='quarterly'):
    if not 2<=len(symbols)<=4 or len(set(symbols))!=len(symbols) or any(s not in STOCKS for s in symbols):
        raise HTTPException(400,'เลือกหุ้นที่รองรับ 2–4 ตัวที่ไม่ซ้ำกัน')
    if period not in ('1y','2y','5y','10y','ytd') or frequency not in ('quarterly','monthly'):
        raise HTTPException(400,'ไม่รองรับช่วงเวลาหรือความถี่นี้')
    histories=await asyncio.gather(*(market_history(symbol,period) for symbol in symbols))
    return build_comparison(histories,period,frequency)
