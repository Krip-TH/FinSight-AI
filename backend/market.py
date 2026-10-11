"""Optional public historical prices. No credentials or trading operations."""
import datetime
import math
import time
import httpx
from fastapi import HTTPException

SYMBOLS={'AAPL':'Apple','MSFT':'Microsoft','BTC-USD':'Bitcoin','ETH-USD':'Ethereum'}
CACHE={}

async def market_history(symbol,period):
    if symbol not in SYMBOLS or period not in ('1mo','3mo','1y'):
        raise HTTPException(400,'ไม่รองรับสินทรัพย์หรือช่วงเวลานี้')
    cache_key=(symbol,period)
    cached=CACHE.get(cache_key)
    if cached and time.monotonic()-cached[0]<900:
        return {**cached[1],'cached':True}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response=await client.get(f'https://query1.finance.yahoo.com/v8/finance/chart/{symbol}',
                                      params={'range':period,'interval':'1d'},headers={'User-Agent':'FinSight-AI/0.1'})
        response.raise_for_status()
        raw=response.json()['chart']['result'][0]
        quotes=raw['indicators']['quote'][0]['close']
        points=[]
        for stamp,close in zip(raw.get('timestamp',[]),quotes):
            if isinstance(close,(int,float)) and math.isfinite(close) and close>0:
                points.append({'date':datetime.datetime.fromtimestamp(stamp,datetime.timezone.utc).date().isoformat(),
                               'timestamp':stamp,'close':round(close,4)})
        if len(points)<2: raise ValueError('Insufficient data')
    except (httpx.HTTPError,KeyError,TypeError,IndexError,ValueError):
        raise HTTPException(502,'ดึงราคาย้อนหลังจาก Yahoo Finance ไม่สำเร็จ กรุณาลองใหม่ภายหลัง ไม่มีข้อมูลจำลอง')
    result={'symbol':symbol,'name':SYMBOLS[symbol],'currency':raw['meta'].get('currency',''),
            'points':points,'period':period,'price_type':'daily close, not adjusted close',
            'source':'Yahoo Finance','source_url':f'https://finance.yahoo.com/quote/{symbol}/history/',
            'fetched_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'cached':False,
            'limitations':['ราคาปิดย้อนหลังอาจล่าช้า ช่วงล่าสุดอาจยังไม่ปิดตลาด และวันที่แสดงตาม UTC',
                           'ไม่ปรับปันผลหรือแตกหุ้น ไม่ใช่ผลตอบแทนรวม ไม่ใช้เปรียบเทียบราคาต่อหน่วยข้ามสินทรัพย์',
                           'แหล่งสาธารณะนี้ไม่มี SLA และอาจจำกัดการเข้าถึง ไม่ใช่ราคาเรียลไทม์']}
    CACHE[cache_key]=(time.monotonic(),result)
    return result
