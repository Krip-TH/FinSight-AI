import importlib.util, json, os
from pathlib import Path
import pymupdf, pytest
from fastapi.testclient import TestClient

@pytest.fixture
def service(tmp_path,monkeypatch):
    monkeypatch.setenv('SEMINAR_DATA_DIR',str(tmp_path))
    spec=importlib.util.spec_from_file_location('seminar_test_main',Path(__file__).with_name('main.py'))
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    module.CONFIG.update(key='',enabled=False)
    with TestClient(module.app) as client: yield module,client

def pdf_bytes(text):
    doc=pymupdf.open();page=doc.new_page();page.insert_textbox(pymupdf.Rect(30,30,560,780),text,fontsize=12)
    data=doc.tobytes();doc.close();return data

TEXT='TEST FIXTURE ONLY. Example Financial Report FY2025. Revenue USD 123 million. Net income USD 12 million. Fiscal year ended June 30, 2025. Risk factors include competition and currency fluctuation. This is a synthetic unit-test fixture, never experimental evidence.'

def put(client,text=TEXT,name='fixture.pdf'):
    r=client.post('/api/documents',files={'file':(name,pdf_bytes(text),'application/pdf')});assert r.status_code==200;return r.json()['document']['id']

def test_upload_duplicate_and_source_page(service):
    m,c=service;data=pdf_bytes(TEXT)
    id=c.post('/api/documents',files={'file':('fixture.pdf',data,'application/pdf')}).json()['document']['id']
    id2=c.post('/api/documents',files={'file':('fixture.pdf',data,'application/pdf')}).json()['document']['id']
    assert id==id2
    assert len(c.get('/api/documents').json())==1
    assert 'Revenue USD 123' in c.get(f'/api/documents/{id}/pages/1').json()['text']
    assert c.get(f'/api/documents/{id}/pages/2').status_code==404
    assert c.get(f'/api/documents/{id}/pdf').content.startswith(b'%PDF')

def test_invalid_pdf_and_scanned_pdf(service):
    m,c=service
    assert c.post('/api/documents',files={'file':('bad.pdf',b'%PDF-broken','application/pdf')}).status_code==400
    assert c.post('/api/documents',files={'file':('bad.txt',b'x','text/plain')}).status_code==400
    assert c.post('/api/documents',files={'file':('blank.pdf',pdf_bytes(''),'application/pdf')}).status_code==422

def test_no_key_no_fake_answer(service):
    m,c=service;id=put(c)
    r=c.post('/api/analyze/summary',json={'doc_ids':[id]});assert r.status_code==503
    assert c.get('/api/runs').json()==[]

def test_retrieval_and_grounding_rejects_fabricated_sources(service):
    m,c=service;id=put(c);chunks=m.retrieve([id],'รายได้',6)
    raw={'claims':[{'text':'bad','chunk_id':'not-real','quote':'Revenue USD 123 million'},
                   {'text':'bad','chunk_id':chunks[0]['id'],'quote':'Net income USD 999 million'},
                   {'label':'Revenue','text':'123 million','chunk_id':chunks[0]['id'],'quote':'Revenue USD 123 million'}]}
    result=m.validate_answer(raw,chunks);assert result['rejected_claims']==2;assert len(result['claims'])==1
    assert result['claims'][0]['page']==1

def test_thai_financial_query_keeps_income_statement(service):
    m,c=service
    text='INCOME STATEMENTS. In millions. Revenue 123. Net income 12. Research and development 9. Fiscal 2025. ' + TEXT
    id=put(c,text)
    chunk=m.retrieve([id],'ค่าใช้จ่ายวิจัยและพัฒนาปีบัญชี 2025 เท่าไร',1)[0]
    assert 'INCOME STATEMENTS' in chunk['text']

def test_mock_provider_cache_logging_and_csv(service,monkeypatch):
    m,c=service;id=put(c);calls=[]
    async def fixture_provider(prompt):
        calls.append(prompt);chunk=m.retrieve([id],'Revenue',1)[0]
        return {'title':'UNIT TEST ONLY','claims':[{'label':'Revenue','text':'123 million','chunk_id':chunk['id'],'quote':'Revenue USD 123 million'}],'limitations':[]},{'totalTokenCount':100}
    monkeypatch.setattr(m,'call_gemini',fixture_provider)
    m.CONFIG.update(key='test-key-not-a-secret',enabled=True)
    first=c.post('/api/analyze/summary',json={'doc_ids':[id]}).json()
    second=c.post('/api/analyze/summary',json={'doc_ids':[id]}).json()
    assert first['cached'] is False and second['cached'] is True and len(calls)==1
    assert len(c.get('/api/runs').json())==2
    export=c.get('/api/runs/export');assert 'UNIT TEST ONLY' in export.text
    assert 'test-key-not-a-secret' not in export.text

def test_compare_validation_and_settings_consent(service):
    m,c=service;id=put(c)
    assert c.post('/api/analyze/compare',json={'doc_ids':[id]}).status_code==400
    assert c.post('/api/analyze/compare',json={'doc_ids':[id,id]}).status_code==400
    assert c.post('/api/settings',json={'key':'test-key-only','approve_requests':False}).status_code==400
    assert c.post('/api/settings',json={'key':'test-key-only','approve_requests':True}).status_code==200
    assert 'key' not in c.get('/api/health').json()
    assert c.post('/api/settings/clear').json()['ai_ready'] is False

def test_failed_provider_calls_consume_limit_and_stop_retry(service,monkeypatch):
    m,c=service;id=put(c);calls=[]
    async def failing_provider(prompt):
        calls.append(prompt)
        raise m.HTTPException(502,'Provider unavailable')
    monkeypatch.setattr(m,'call_gemini',failing_provider)
    c.post('/api/settings',json={'key':'test-key-only','approve_requests':True,'max_requests':1})
    request={'doc_ids':[id],'use_cache':False}
    assert c.post('/api/analyze/summary',json=request).status_code==502
    assert c.get('/api/health').json()['requests_remaining']==0
    assert c.post('/api/analyze/summary',json=request).status_code==429
    assert len(calls)==1
    records=c.get('/api/runs').json()
    assert len(records)==1 and records[0]['status']=='error'
    assert records[0]['api_ms']>=0

def test_cache_remains_available_after_provider_limit(service,monkeypatch):
    m,c=service;id=put(c);calls=[]
    async def provider(prompt):
        calls.append(prompt);chunk=m.retrieve([id],'Revenue',1)[0]
        return {'claims':[{'label':'Revenue','text':'123 million','chunk_id':chunk['id'],'quote':'Revenue USD 123 million'}]},{}
    monkeypatch.setattr(m,'call_gemini',provider)
    c.post('/api/settings',json={'key':'test-key-only','approve_requests':True,'max_requests':1})
    request={'doc_ids':[id]}
    assert c.post('/api/analyze/summary',json=request).json()['cached'] is False
    assert c.post('/api/analyze/summary',json=request).json()['cached'] is True
    assert c.get('/api/health').json()['requests_used']==1
    assert len(calls)==1
    assert c.post('/api/settings',json={'key':'test-key-only','approve_requests':True,'max_requests':0}).status_code==422
