import asyncio
import httpx
import pytest
from backend.research import financial_series, topic_evidence
from backend import market

def test_statement_alignment_negative_values_and_dates():
    text='''CONSOLIDATED STATEMENTS OF OPERATIONS
(In millions)
September 27, 2025
September 28, 2024
September 30, 2023
Total net sales
$ 100 $ 80 $ 60
Net income
$ (10) $ 8 $ 6
'''
    result=financial_series([(7,text)])
    assert result['years']==['2025','2024','2023']
    assert result['period_ends'][0]=='September 27, 2025'
    metrics={m['key']:m for m in result['metrics']}
    assert metrics['net_income']['values']==[-10,8,6]
    assert metrics['revenue']['values']==[100,80,60]
    assert metrics['revenue']['quote'] in text
    assert metrics['revenue']['page']==7

def test_ambiguous_statement_does_not_invent_chart():
    assert financial_series([(1,'Revenue 100. Net income 10.')])['status']=='unsupported'
    text='INCOME STATEMENTS\n(In millions)\n2025 2024\nRevenue:\nTotal revenue\n$ 100 80 60'
    assert financial_series([(1,text)])['metrics']==[]

def test_crypto_topics_preserve_quotes_and_missing_state():
    text='The protocol uses consensus. Security is discussed here.'
    result=topic_evidence([{'page':4,'text':text}],'crypto')
    found=[x for x in result if x['status']=='found']
    assert found and all(p['quote'] in text for x in found for p in x['passages'])
    assert next(x for x in result if x['label']=='ปริมาณและการกระจาย Token')['status']=='not_found'

def test_stock_evidence_skips_contents_and_prioritizes_risk_context():
    chunks=[{'page':1,'text':'TABLE OF CONTENTS\nCybersecurity'},
            {'page':2,'text':'Our cybersecurity products are popular.'},
            {'page':3,'text':'Cybersecurity attacks could adversely affect us.'}]
    topic=next(x for x in topic_evidence(chunks,'stock') if x['label']=='ความปลอดภัยไซเบอร์')
    assert topic['passages'][0]['page']==3
    assert all(p['page']!=1 for p in topic['passages'])

def test_market_handles_missing_quotes_and_cache(monkeypatch):
    original=httpx.AsyncClient
    calls=[]
    def handler(request):
        calls.append(request)
        assert request.url.host=='query1.finance.yahoo.com'
        assert 'x-goog-api-key' not in request.headers
        return httpx.Response(200,json={'chart':{'result':[{'meta':{'currency':'USD'},
            'timestamp':[1700000000,1700086400,1700172800],
            'indicators':{'quote':[{'close':[100,None,110]}]}}]}})
    monkeypatch.setattr(market.httpx,'AsyncClient',lambda **kwargs:original(transport=httpx.MockTransport(handler),**kwargs))
    market.CACHE.clear()
    first=asyncio.run(market.market_history('AAPL','1mo'))
    second=asyncio.run(market.market_history('AAPL','1mo'))
    assert [p['close'] for p in first['points']]==[100,110]
    assert second['cached'] is True and len(calls)==1
    market.CACHE.clear()

def test_market_error_is_explicit_no_fake_prices(monkeypatch):
    original=httpx.AsyncClient
    monkeypatch.setattr(market.httpx,'AsyncClient',lambda **kwargs:original(transport=httpx.MockTransport(lambda r:httpx.Response(429)),**kwargs))
    market.CACHE.clear()
    with pytest.raises(market.HTTPException) as error:
        asyncio.run(market.market_history('BTC-USD','1mo'))
    assert error.value.status_code==502
    with pytest.raises(market.HTTPException) as error:
        asyncio.run(market.market_history('untrusted','1mo'))
    assert error.value.status_code==400
