import React, {useEffect, useState} from 'react';
import {ArrowRight, BarChart3, BookOpen, Check, ChevronRight, Clock, FileText, HelpCircle, Layers3, LoaderCircle, MessageSquare, Search, ShieldCheck, Sparkles, TrendingUp} from 'lucide-react';
import './decision.css';

const number = value => Number(value).toLocaleString('en-US', {maximumFractionDigits: 2});
const money = value => value === null ? '—' : `$${number(value / 1000)}B`;
const topics = [
  {label: 'ผลประกอบการ', icon: BarChart3, question: 'รายได้และกำไรสุทธิในปีบัญชี 2025 เท่าไร และใช้หน่วยอะไร?'},
  {label: 'ความเสี่ยง', icon: ShieldCheck, question: 'ปัจจัยเสี่ยงสำคัญที่ระบุในรายงานมีอะไรบ้าง? อ้างอิงหลักฐานแต่ละประเด็น'},
  {label: 'เงินสดและหนี้', icon: Layers3, question: 'รายงานระบุกระแสเงินสด สภาพคล่อง และภาระหนี้ไว้อย่างไร? ระบุช่วงเวลา หน่วย และหลักฐาน'},
  {label: 'การเติบโต', icon: TrendingUp, question: 'รายได้และกำไรเปลี่ยนแปลงจากปีก่อนอย่างไร และรายงานอธิบายปัจจัยที่ทำให้เปลี่ยนแปลงว่าอะไร?'}
];
const categories = [
  {id: 'all', label: 'ทั้งหมด'}, {id: 'financial', label: 'ผลประกอบการ'},
  {id: 'business', label: 'ธุรกิจ / การเติบโต'}, {id: 'risk', label: 'ความเสี่ยง'}, {id: 'context', label: 'รอบบัญชี / บริบท'}
];
function category(claim) {
  const label = claim.label || '';
  if (/เสี่ยง|risk|แข่งขัน|competition|กฎระเบียบ|regulat|ไซเบอร์/i.test(label)) return 'risk';
  if (/รอบบัญชี|หน่วย|สิ้นสุด|fiscal|currency|period|unit/i.test(label)) return 'context';
  if (/รายได้|กำไร|เงินสด|หนี้|revenue|income|profit|cash|debt|margin|sales|ค่าใช้จ่าย/i.test(label)) return 'financial';
  if (/เสี่ยง|risk|แข่งขัน|competition|กฎระเบียบ|regulat|ไซเบอร์/i.test(claim.text)) return 'risk';
  return 'business';
}
function valueAt(financial, key, year) {
  const value = financial?.metrics.find(m => m.key === key)?.values[financial.years.indexOf(year)];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
function EvidenceButton({claim, onEvidence}) {
  return <button className="brief-source" onClick={() => onEvidence(claim)}><FileText size={12}/>PDF หน้า {claim.page}<ChevronRight size={12}/></button>;
}
function HighlightNumbers({text}) {
  const values = String(text).split(/([+-]?\d[\d,]*(?:\.\d+)?\s*(?:พันล้าน|ล้าน)(?:\s*(?:ดอลลาร์สหรัฐ|ดอลลาร์|บาท|USD))?|[+-]?\d+(?:\.\d+)?\s*%)/g);
  return values.map((value, index) => index % 2 ? <strong className="brief-number" key={index}>{value}</strong> : value);
}
function EarningsChart({report, onEvidence}) {
  const financial = report?.financial;
  const years = [...(financial?.years || [])].sort();
  const revenue = financial?.metrics.find(m => m.key === 'revenue');
  const net = financial?.metrics.find(m => m.key === 'net_income');
  if (!years.length || !revenue) return null;
  const all = years.flatMap(year => [valueAt(financial, 'revenue', year), valueAt(financial, 'net_income', year)]).filter(v => v !== null);
  const low = Math.min(0, ...all), high = Math.max(1, ...all), span = high - low;
  const y = value => 166 - (value - low) / span * 129;
  const group = 240 / years.length;
  return <section className="brief-earnings"><div className="brief-small-heading"><BarChart3 size={15}/><h3>เห็นแนวโน้มจากตัวเลข</h3></div><p>ผลประกอบการรายปี · พันล้าน $</p>
    <svg viewBox="0 0 320 208" role="img" aria-label="กราฟรายได้และกำไรสุทธิรายปีจากเอกสาร">
      {[0, .5, 1].map(t => <g key={t}><line x1="52" x2="302" y1={166 - t * 129} y2={166 - t * 129} stroke="#ffffff16"/><text x="44" y={170 - t * 129} textAnchor="end" fill="#8fa5bd" fontSize="10">{number((low + span * t) / 1000)}</text></g>)}
      <line x1="52" x2="302" y1={y(0)} y2={y(0)} stroke="#ffffff40"/>
      {years.map((year, i) => <g key={year}>{['revenue', 'net_income'].map((key, k) => {
        const value = valueAt(financial, key, year);
        return value === null ? null : <rect key={key} x={52 + group * (i + .5) - 23 + k * 25} y={Math.min(y(value), y(0))} height={Math.max(1, Math.abs(y(value) - y(0)))} width="19" rx="3" fill={k === 0 ? '#38d4b7' : '#a59aff'}><title>FY{year} · {k === 0 ? 'รายได้' : 'กำไรสุทธิ'}: {number(value)} ล้าน $</title></rect>;
      })}<text x={52 + group * (i + .5)} y="190" textAnchor="middle" fill="#aebdd0" fontSize="11">FY{year}</text></g>)}
    </svg><div className="brief-earnings-legend"><span><i/>รายได้</span>{net && <span><i/>กำไรสุทธิ</span>}</div><button className="brief-dark-source" onClick={() => onEvidence({...revenue, doc_id: report.document.id})}>ตรวจตารางต้นฉบับ · หน้า {revenue.page}<ArrowRight size={12}/></button>
  </section>;
}

function ClaimCard({claim, index, onEvidence}) {
  const group = category(claim);
  return <article className={`brief-claim brief-claim-${group}`}>
    <div className="brief-claim-top"><span className="brief-claim-index">{String(index + 1).padStart(2, '0')}</span><span className="brief-category">{categories.find(c => c.id === group).label}</span></div>
    <h3>{claim.label}</h3><small>สรุปโดย AI · ต้องตรวจความหมายและตัวเลขกับหลักฐาน</small><p><HighlightNumbers text={claim.text}/></p>
    <div className="brief-claim-bottom"><EvidenceButton claim={claim} onEvidence={onEvidence}/><details><summary>ข้อความจากเอกสารโดยตรง</summary><blockquote>{claim.quote}</blockquote></details></div>
  </article>;
}

export default function DecisionWorkspace({mode, docs, selectedId, onSelect, result: receivedResult, question, setQuestion, onAnalyze, onFollowUp, onEvidence, busy, health, cache, setCache}) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [filter, setFilter] = useState('all');
  const [checked, setChecked] = useState([]);
  const doc = docs.find(d => d.id === selectedId);
  const isQA = mode === 'qa';
  const result = receivedResult && (!receivedResult.operation || receivedResult.operation === mode) && (!receivedResult.documentIds || receivedResult.documentIds[0] === selectedId) ? receivedResult : null;
  useEffect(() => {
    setReport(null); setReportError(''); setChecked([]); setFilter('all'); setLoading(false);
    if (!selectedId) return;
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/documents/${selectedId}/research?kind=stock`, {signal: controller.signal}).then(async response => {
      if (!response.ok) throw new Error('โหลดตัวเลขจากเอกสารไม่สำเร็จ');
      return response.json();
    }).then(setReport).catch(error => {if (error.name !== 'AbortError') setReportError(error.message);}).finally(() => {if (!controller.signal.aborted) setLoading(false);});
    return () => controller.abort();
  }, [selectedId]);
  useEffect(() => setFilter('all'), [result, mode]);
  const priority = {financial: 0, business: 1, risk: 2, context: 3};
  const claims = [...(result?.claims || [])].sort((a, b) => priority[category(a)] - priority[category(b)]);
  const shown = claims.map((claim, index) => ({claim, index})).filter(({claim}) => filter === 'all' || category(claim) === filter);
  const pages = [...new Set(claims.map(c => c.page))];
  const years = [...(report?.financial?.years || [])].sort();
  const year = years.at(-1);
  const previous = String(Number(year) - 1);
  const financial = report?.financial;
  const revenue = valueAt(financial, 'revenue', year), net = valueAt(financial, 'net_income', year);
  const margin = revenue !== null && revenue !== 0 && net !== null ? net / revenue * 100 : null;
  const checklist = ['ตรวจหน่วยและวันสิ้นสุดรอบบัญชี', 'อ่านบริบทของตัวเลขใน PDF', 'ตรวจเงินสด หนี้ และความเสี่ยง', 'เทียบข้อมูลปัจจุบันก่อนตัดสินใจ'];
  const canAsk = !busy && health.ai_ready && selectedId && (!isQA || question.trim());
  function submit(event) {event?.preventDefault(); if (canAsk) onAnalyze(isQA ? question : '');}
  return <div className={`decision-workspace ${isQA ? 'decision-qa' : 'decision-summary'}`}>
    <section className="brief-document card"><div className="brief-document-icon"><FileText size={20}/></div><label>เอกสารที่ใช้วิเคราะห์<select aria-label="เอกสารหลัก" disabled={!!busy} value={selectedId || ''} onChange={e => onSelect(e.target.value)}><option value="">เลือกบริษัท / เอกสาร</option>{docs.map(d => <option key={d.id} value={d.id}>{d.company || d.name}</option>)}</select></label><div className="brief-document-period"><span>รอบบัญชีที่ผู้ใช้กรอก</span><b>{doc?.period || 'ยังไม่ระบุรอบบัญชี'}</b></div><label className="brief-cache"><input type="checkbox" checked={cache} onChange={e => setCache(e.target.checked)}/>ใช้ผลเดิมเมื่อคำขอเหมือนกัน</label></section>

    {!isQA && <section className="brief-hero"><div><span className="brief-eyebrow"><Sparkles size={13}/>INVESTMENT BRIEF</span><h2>{doc ? `${doc.company || doc.name} · สรุปเพื่อมองภาพรวม` : 'จากรายงานยาว สู่ประเด็นที่ควรดู'}</h2><p>อ่านผลประกอบการ เห็นประเด็นความเสี่ยง แล้วเจาะหลักฐานก่อนตัดสินใจ</p><div className="brief-hero-tags"><span><BookOpen size={12}/>อ้างอิงเอกสารต้นฉบับ</span><span><ShieldCheck size={12}/>เปิดตรวจหลักฐานได้ทุกประเด็น</span></div></div><div className="brief-hero-action"><button className="primary" onClick={submit} disabled={!canAsk}>{busy === mode ? <LoaderCircle className="spin" size={16}/> : <Sparkles size={16}/>}สร้างบทสรุป</button><small>{health.ai_ready ? `เรียกใหม่ได้อีก ${health.requests_remaining ?? 0} ครั้ง · cache ไม่นับ` : 'เชื่อมต่อ Gemini ในการตั้งค่า AI'}</small></div></section>}

    {!isQA && selectedId && <>
      {loading && <p role="status" className="brief-loading">กำลังอ่านตัวเลขจากตารางใน PDF…</p>}
      {reportError && <p role="status" className="period-note">{reportError} · ยังสามารถสร้างสรุปจากข้อความใน PDF ได้</p>}
      {years.length > 0 ? <div className="brief-metrics">{[['revenue','รายได้รวม',revenue],['net_income','กำไรสุทธิ',net],['margin','อัตรากำไรสุทธิ',margin]].map(([key, label, value]) => {
        const before = valueAt(financial, key, previous);
        const change = key !== 'margin' && value !== null && before !== null && before > 0 ? (value / before - 1) * 100 : null;
        const source = financial.metrics.find(m => m.key === (key === 'margin' ? 'net_income' : key));
        return <section className="brief-metric" key={key}><div><span>{label}</span>{key === 'margin' ? <ShieldCheck size={16}/> : <BarChart3 size={16}/>}</div><b>{value === null ? '—' : key === 'margin' ? `${number(value)}%` : money(value)}</b><div className="brief-metric-context"><span>FY{year} · สิ้นสุด {financial.period_ends[financial.years.indexOf(year)]}</span>{change !== null ? <span className={change >= 0 ? 'positive' : 'negative'}>{change > 0 ? '+' : ''}{number(change)}% YoY</span> : <span>{key === 'margin' ? 'กำไรสุทธิ ÷ รายได้' : 'ไม่มีปีก่อนที่เทียบได้'}</span>}</div>{source && <EvidenceButton claim={{...source, doc_id: selectedId}} onEvidence={onEvidence}/>}</section>;
      })}<p className="brief-unit-note">ตัวเลขจากตาราง PDF ที่รองรับ · B = พันล้าน $ ตามต้นฉบับ · ตรวจสกุลเงินและรอบบัญชีก่อนเปรียบเทียบ · แยกจากคำตอบ AI</p></div> : !loading && !reportError && <p className="brief-unit-note">เอกสารนี้ยังไม่มีตารางตัวเลขในรูปแบบที่รองรับ สามารถอ่านสรุปพร้อมหลักฐานจากข้อความได้</p>}
    </>}

    {isQA && <form className="brief-question card" onSubmit={submit}><div className="brief-small-heading"><MessageSquare size={19}/><div><h2>อยากเข้าใจประเด็นไหน?</h2><p>ถามเจาะรายงาน แล้วเปิดตรวจตัวเลขและข้อความที่ใช้ตอบ</p></div></div><div className="brief-question-topics">{topics.map(({label, icon: Icon, question: suggestion}) => <button type="button" key={label} onClick={() => setQuestion(suggestion)} aria-pressed={question === suggestion}><Icon size={16}/>{label}<ArrowRight size={13}/></button>)}</div><label className="brief-textarea-label">คำถามของคุณ<textarea aria-label="คำถามของคุณ" rows={3} value={question} onChange={e => setQuestion(e.target.value)} placeholder="เช่น รายได้เติบโตจากธุรกิจส่วนไหน และมีความเสี่ยงอะไรที่ต้องติดตาม?" onKeyDown={e => {if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {e.preventDefault(); submit();}}}/></label><div className="brief-question-action"><span>{health.ai_ready ? `เหลือ ${health.requests_remaining ?? 0} ครั้ง · Ctrl + Enter เพื่อถาม` : 'เชื่อมต่อ Gemini ในการตั้งค่า AI'}</span><button className="primary" disabled={!canAsk}>{busy === mode ? <LoaderCircle className="spin" size={15}/> : <Search size={15}/>}ค้นคำตอบ</button></div></form>}

    <div className="brief-reading-grid"><section className="brief-reading-main">
      {result ? <>
        {isQA && <div className="brief-asked"><MessageSquare size={16}/><div><span>คำถามที่ใช้สร้างคำตอบนี้</span><p>{result.askedQuestion || 'ดูคำถามของผลที่บันทึกไว้ในประวัติ'}</p></div></div>}
        <div className="brief-answer-heading"><div><span className="brief-section-label">{isQA ? 'ANSWER & EVIDENCE' : 'KEY TAKEAWAYS'}</span><h2>{isQA ? 'คำตอบที่ตรวจต่อได้' : 'ประเด็นสำคัญจากรายงาน'}</h2></div><span className="brief-result-status"><Clock size={12}/>{result.cached ? 'ผลที่บันทึกไว้' : `${number((result.elapsed_ms || 0) / 1000)} วินาที`}</span></div>
        <p className="brief-result-title">{result.title}</p>
        {result.status === 'insufficient' && <div className="period-note"><HelpCircle size={16}/>หลักฐานที่ค้นได้ยังไม่เพียงพอ ลองถามให้แคบลงหรือเปิดต้นฉบับตรวจเพิ่มเติม</div>}
        <div className="brief-filters" aria-label="หมวดคำตอบ">{categories.map(item => {const count = item.id === 'all' ? claims.length : claims.filter(c => category(c) === item.id).length; return <button key={item.id} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}<span>{count}</span></button>;})}</div>
        <div className="brief-claims">{shown.map(({claim, index}) => <ClaimCard key={`${claim.chunk_id}-${index}`} claim={claim} index={index} onEvidence={onEvidence}/>)}</div>
        {!shown.length && <div className="brief-no-claims">ยังไม่มีประเด็นในหมวดนี้จากคำตอบที่ได้รับ สามารถถามเจาะประเด็นเพิ่มได้</div>}
        <details className="brief-limitations" open={result.status === 'insufficient'}><summary><HelpCircle size={15}/>ขอบเขตและสิ่งที่ยังสรุปไม่ได้<span>{result.limitations?.length || 0}</span></summary>{(result.limitations || []).map((text, index) => <p key={index}>{text}</p>)}<p>การพบข้อความอ้างอิงยังต้องตรวจว่ารองรับข้อสรุปและตัวเลขครบถ้วน</p></details>
        <section className="brief-followups"><div className="brief-small-heading"><MessageSquare size={15}/><h3>เจาะประเด็นต่อ</h3></div>{topics.slice(1).map(item => <button key={item.label} onClick={() => onFollowUp(item.question)}>{item.label}<ArrowRight size={14}/></button>)}</section>
      </> : <section className="brief-start card"><div className="brief-start-icon">{isQA ? <MessageSquare size={25}/> : <BookOpen size={25}/>}</div><h3>{isQA ? 'คำตอบที่ดี เริ่มจากคำถามที่ชัด' : 'ภาพรวมพร้อมแล้ว เติมบริบทด้วยบทสรุป'}</h3><p>{isQA ? 'เลือกเอกสารและคำถามที่ต้องการตรวจ คำตอบจะแสดงเป็นประเด็นพร้อมหน้า PDF ที่อ้างอิง' : 'เลือกเอกสารแล้วกดสร้างบทสรุป เพื่ออ่านผลประกอบการ ธุรกิจ และความเสี่ยงเป็นประเด็น'}</p><div className="brief-start-steps"><span>01 · เลือกเอกสาร</span><ChevronRight size={13}/><span>02 · อ่านประเด็น</span><ChevronRight size={13}/><span>03 · ตรวจหลักฐาน</span></div></section>}
    </section><aside className="brief-reading-aside">
      {!isQA && <EarningsChart report={report} onEvidence={onEvidence}/>}
      {result && <section className="brief-evidence-panel card"><div className="brief-small-heading"><FileText size={16}/><h3>แหล่งอ้างอิงในคำตอบ</h3></div><div className="brief-evidence-count"><b>{claims.length}</b><span>ประเด็น · อ้างอิง {pages.length} หน้า</span></div><p>{doc?.company || doc?.name || 'เอกสารที่เลือก'}</p><div className="brief-page-links">{pages.map(page => <button key={page} onClick={() => onEvidence(claims.find(c => c.page === page))}>หน้า {page}<ArrowRight size={11}/></button>)}</div><small>เลขหน้า PDF นับจากหน้าแรกของไฟล์เป็น 1 อาจต่างจากเลขหน้าในรายงาน · จำนวนประเด็นคือข้อความที่ผ่านการตรวจ quote ไม่ใช่คะแนนความถูกต้อง</small></section>}
      <section className="brief-checklist card"><div className="brief-small-heading"><ShieldCheck size={16}/><h3>ก่อนใช้ประกอบการตัดสินใจ</h3></div><p>ใช้เป็นรายการตรวจของคุณ</p>{checklist.map((text, index) => <label key={text}><input type="checkbox" checked={checked.includes(index)} onChange={() => setChecked(old => old.includes(index) ? old.filter(i => i !== index) : [...old, index])}/><span>{text}</span></label>)}<div className="brief-checklist-progress"><span style={{width: `${checked.length / checklist.length * 100}%`}}/></div><small><Check size={12}/>{checked.length} / {checklist.length} รายการที่คุณตรวจแล้ว</small></section>
    </aside></div>
  </div>;
}
