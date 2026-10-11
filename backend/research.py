"""Conservative text-table extraction; no model calls or market data."""
import re

METRICS = {
    'revenue': ('รายได้รวม', ['Total net sales', 'Total revenue']),
    'net_income': ('กำไรสุทธิ', ['Net income']),
    'operating_income': ('กำไรจากการดำเนินงาน', ['Operating income']),
    'research_development': ('วิจัยและพัฒนา', ['Research and development']),
}
TOPICS = {
    'stock': [
        ('การแข่งขัน', ['competition', 'competitive']),
        ('กฎระเบียบ', ['regulatory', 'regulation']),
        ('ความปลอดภัยไซเบอร์', ['cybersecurity', 'cyberattack']),
        ('สภาพคล่องและหนี้', ['liquidity', 'indebtedness']),
    ],
    'crypto': [
        ('การใช้งานและเทคโนโลยี', ['consensus', 'protocol', 'transaction']),
        ('ปริมาณและการกระจาย Token', ['token supply', 'total supply', 'distribution', 'issuance']),
        ('การกำกับดูแล', ['governance', 'voting', 'decentralization']),
        ('ความปลอดภัย', ['security', 'attack', 'vulnerability']),
        ('ข้อจำกัดและความเสี่ยง', ['risk', 'limitation', 'regulation']),
    ],
}

def financial_series(pages):
    for page, text in pages:
        lower = text.lower()
        if not ('consolidated statements of operations' in lower or 'income statements' in lower):
            continue
        if 'in millions' not in lower or '$' not in text:
            continue
        first = re.search(r'(?im)^\s*(?:Total net sales|Revenue:)\s*$', text)
        if not first:
            continue
        header = text[:first.start()]
        years = re.findall(r'\b20\d{2}\b', header)
        if len(years) != 3 or len(set(years)) != 3:
            continue
        months = r'(January|February|March|April|May|June|July|August|September|October|November|December)'
        dates = re.findall(months+r'\s+(\d{1,2}),\s*(20\d{2})', header, re.I)
        if len(dates) == 3:
            period_ends = [f'{month} {day}, {year}' for month,day,year in dates]
        else:
            common = re.search(r'Year Ended\s+'+months+r'\s+(\d{1,2}),', header, re.I)
            if not common:
                continue
            period_ends = [f'{common.group(1)} {common.group(2)}, {year}' for year in years]
        number = r'\(?-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\)?'
        metrics = []
        for key, (label, aliases) in METRICS.items():
            for alias in aliases:
                row = re.search(r'(?im)^\s*'+re.escape(alias)+r'\s*((?:\$?\s*'+number+r'\s*){3})(?!\d)', text)
                if not row:
                    continue
                tokens = re.findall(number, row.group(1))
                if len(tokens) != 3:
                    continue
                values = [float(t.replace(',','').replace('(','-').replace(')','')) for t in tokens]
                metrics.append({'key':key,'label':label,'values':values,'unit':'ล้าน $ ตามต้นฉบับ',
                                'page':page,'quote':row.group(0).strip()})
                break
        if metrics:
            return {'years':years,'period_ends':period_ends,'metrics':metrics,'page':page,
                    'unit_quote':re.search(r'\(In millions[^\n]*',text,re.I).group(0),
                    'header_quote':header.strip(),
                    'status':'extracted','method':'rule-based income-statement text extraction'}
    return {'years':[],'period_ends':[],'metrics':[],'status':'unsupported',
            'method':'rule-based income-statement text extraction'}

def topic_evidence(chunks, kind):
    result=[]
    for label, keywords in TOPICS[kind]:
        passages=[]
        candidates=[]
        for chunk in chunks:
            lower=chunk['text'].lower()
            if ('table of contents' in lower or re.search(r'(?im)^\s*index\s*$',lower)
                    or 'indicate by check mark' in lower):
                continue
            count=sum(len(re.findall(r'\b'+re.escape(word)+r'\b',lower)) for word in keywords)
            if count:
                risk_context=bool(re.search(r'\b(risks?|adversely|uncertainties|vulnerability)\b',lower))
                candidates.append((count+(20 if kind=='stock' and risk_context else 0),chunk))
        for _,chunk in sorted(candidates,key=lambda x:(-x[0],x[1]['page'])):
            hit = next((re.search(r'\b'+re.escape(word)+r'\b',chunk['text'],re.I) for word in keywords
                        if re.search(r'\b'+re.escape(word)+r'\b',chunk['text'],re.I)),None)
            if not hit:
                continue
            start=max(0,hit.start()-180);end=min(len(chunk['text']),hit.end()+320)
            quote=chunk['text'][start:end]
            if not any(p['page']==chunk['page'] for p in passages):
                passages.append({'page':chunk['page'],'quote':quote})
            if len(passages)==2:
                break
        result.append({'label':label,'status':'found' if passages else 'not_found','passages':passages})
    return result
