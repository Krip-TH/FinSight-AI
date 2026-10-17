import React,{useEffect,useRef,useState} from 'react';
const stocks=[['AAPL','Apple'],['MSFT','Microsoft'],['NVDA','NVIDIA'],['GOOGL','Alphabet'],['AMZN','Amazon'],['META','Meta'],['TSLA','Tesla']];
const palette=['#087f6b','#6366f1','#d97706','#db2777'];
const number=n=>Number(n).toLocaleString('th-TH',{maximumFractionDigits:2});
const percent=n=>`${n>0?'+':''}${number(n)}%`;

function TrendChart({data,smooth}){
  const [active,setActive]=useState(null);
  const points=data.series[0].points;
  const values=data.series.flatMap(s=>s.points.map(p=>p.change_pct));
  const min=Math.min(0,...values),max=Math.max(0,...values),padding=Math.max(5,(max-min)*.08);
  const bottom=min-padding,top=max+padding;
  const start=Date.parse(data.start_date),duration=Date.parse(data.end_date)-start||1;
  const x=p=>80+(Date.parse(p.date)-start)/duration*650;
  const y=p=>260-(p.change_pct-bottom)/(top-bottom)*220;
  function path(series){return series.map((p,i)=>{
    if(!i)return `M ${x(p)} ${y(p)}`;
    const prev=series[i-1],middle=(x(prev)+x(p))/2;
    return smooth?`C ${middle} ${y(prev)} ${middle} ${y(p)} ${x(p)} ${y(p)}`:`L ${x(p)} ${y(p)}`;
  }).join(' ')}
  const shown=active===null?points.length-1:active;
  return <><div className="comparison-chart-shell"><svg className="research-chart comparison-chart" viewBox="0 0 780 325" role="img" aria-label="กราฟเส้นเปรียบเทียบเปอร์เซ็นต์การเปลี่ยนแปลงหุ้นจากวันเริ่มต้นร่วมกัน">
    {[0,.25,.5,.75,1].map(t=><g key={t}><line x1="80" x2="730" y1={260-t*220} y2={260-t*220} stroke="#e2e8f0"/><text x="70" y={264-t*220} textAnchor="end" fontSize="11" fill="#64748b">{number(bottom+(top-bottom)*t)}%</text></g>)}
    <line x1="80" x2="730" y1={y({change_pct:0})} y2={y({change_pct:0})} stroke="#94a3b8" strokeDasharray="5 5"/>
    {data.series.map((s,i)=><g key={s.symbol}><path d={path(s.points)} fill="none" stroke={palette[i]} strokeWidth="3"/>{s.points.map((p,j)=><circle key={p.date} cx={x(p)} cy={y(p)} r={shown===j?5:3} fill={palette[i]} stroke="white" strokeWidth="1.5"><title>{s.symbol} · {p.label} · {p.date}: {percent(p.change_pct)} · ราคาปิดปรับปรุง {number(p.adjusted_close)} {s.currency}</title></circle>)}</g>)}
    {points.map((p,i)=><g key={p.date}>
      {(i===0||i===points.length-1||(i%Math.ceil(points.length/6)===0&&x(p)>155&&x(p)<655))&&<text x={x(p)} y="291" textAnchor={i===0?'start':i===points.length-1?'end':'middle'} fontSize="11" fill="#64748b">{p.is_baseline?'เริ่มต้น':p.label}</text>}
      <rect x={x(p)-Math.max(6,310/points.length)} y="30" width={Math.max(12,620/points.length)} height="235" fill="transparent" onMouseEnter={()=>setActive(i)} onClick={()=>setActive(i)}/>
    </g>)}
    <line x1={x(points[shown])} x2={x(points[shown])} y1="35" y2="263" stroke="#94a3b8" strokeDasharray="3 5" pointerEvents="none"/>
  </svg></div><div className="comparison-inspector" aria-live="polite"><label>ตรวจจุดข้อมูล<select aria-label="จุดข้อมูลในกราฟเปรียบเทียบ" value={shown} onChange={e=>setActive(Number(e.target.value))}>{points.map((p,i)=><option key={p.date} value={i}>{p.is_baseline?'เริ่มต้น':p.label} · {p.date}{p.is_partial&&!p.is_baseline?' (บางช่วง)':''}</option>)}</select></label><div className="chart-legend">{data.series.map((s,i)=><span key={s.symbol}><i style={{background:palette[i]}}/>{s.symbol} <b>{percent(s.points[shown].change_pct)}</b></span>)}</div></div></>;
}

export default function StockComparison(){
  const [symbols,setSymbols]=useState(['AAPL','MSFT']),[period,setPeriod]=useState('5y'),[frequency,setFrequency]=useState('quarterly'),[smooth,setSmooth]=useState(true),[data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const request=useRef(null);
  useEffect(()=>()=>request.current?.abort(),[]);
  function change(action){setData(null);setError('');action()}
  async function load(){
    request.current?.abort();const controller=new AbortController();request.current=controller;
    setBusy(true);setError('');setData(null);
    try{const r=await fetch(`/api/market/compare?symbols=${symbols.join(',')}&period=${period}&frequency=${frequency}`,{signal:controller.signal});const body=await r.json();if(!r.ok)throw new Error(body.detail||'โหลดข้อมูลไม่สำเร็จ');setData(body)}
    catch(e){if(e.name!=='AbortError')setError(e.message)}finally{if(!controller.signal.aborted)setBusy(false)}
  }
  return <div className="research-workspace"><div className="card comparison-controls"><div className="research-title"><div><h2>เปรียบเทียบหุ้นย้อนหลัง</h2><p className="footnote">เห็นแนวโน้มหลายปีในกราฟเดียว · ใช้วันเริ่มต้นร่วมกันที่ 0%</p></div><span className="comparison-chip">รายไตรมาส / รายเดือน</span></div>
    <fieldset disabled={busy}><legend>เลือกหุ้น 2–4 ตัว</legend><div className="stock-picker">{stocks.map(([symbol,name])=><label key={symbol} className={symbols.includes(symbol)?'selected':''}><input type="checkbox" checked={symbols.includes(symbol)} disabled={!symbols.includes(symbol)&&symbols.length===4} onChange={()=>change(()=>setSymbols(old=>old.includes(symbol)?old.filter(s=>s!==symbol):[...old,symbol]))}/><b>{symbol}</b><span>{name}</span></label>)}</div></fieldset>
    <div className="comparison-options"><label>ช่วงย้อนหลัง<select disabled={busy} value={period} onChange={e=>change(()=>setPeriod(e.target.value))}><option value="1y">1 ปีถึงข้อมูลล่าสุด</option><option value="2y">2 ปีถึงข้อมูลล่าสุด</option><option value="5y">5 ปีถึงข้อมูลล่าสุด</option><option value="10y">10 ปีถึงข้อมูลล่าสุด</option><option value="ytd">ต้นปีถึงข้อมูลล่าสุด</option></select></label><label>ความถี่ของจุดข้อมูล<select disabled={busy} value={frequency} onChange={e=>change(()=>setFrequency(e.target.value))}><option value="quarterly">รายไตรมาส</option><option value="monthly">รายเดือน</option></select></label><button className="primary" disabled={busy||symbols.length<2} onClick={load}>{busy?'กำลังโหลดข้อมูลจริง…':'เปรียบเทียบหุ้น'}</button></div>
    <p className="footnote">ราคาปิดปรับปรุงจากผู้ให้บริการ · แยกจากงบรายไตรมาสของบริษัท · ไม่ใช้ Gemini</p></div>
    {busy&&<p role="status">กำลังจัดวันที่ซื้อขายให้ตรงกัน…</p>}{error&&<div className="error" role="alert">{error}</div>}
    {data&&<div className="card market-performance"><div className="research-title"><div><span className="dashboard-label">MARKET PERFORMANCE</span><h2>แนวโน้มการเปลี่ยนแปลง · {frequency==='quarterly'?'รายไตรมาส':'รายเดือน'}</h2><p className="footnote">{data.start_date} ถึง {data.end_date} · วันล่าสุดที่หุ้นทุกตัวมีข้อมูลตรงกัน</p></div><label className="curve-toggle"><input type="checkbox" checked={smooth} onChange={e=>setSmooth(e.target.checked)}/>เส้นโค้ง</label></div>
      <div className="comparison-summary">{data.series.map((s,i)=>{const latest=s.points.at(-1);return <div key={s.symbol} style={{borderTopColor:palette[i]}}><span>{s.name} · {s.symbol}</span><b className={latest.change_pct>=0?'positive':'negative'}>{percent(latest.change_pct)}</b><small>จากวันเริ่มต้นถึงข้อมูลล่าสุด</small><div className="market-period-result"><span>{latest.label}{latest.is_partial?' · บางช่วง':''}</span><strong className={latest.period_change_pct===null?'neutral':latest.period_change_pct>=0?'positive':'negative'}>{latest.period_change_pct===null?'—':percent(latest.period_change_pct)}</strong></div><small>เทียบจุดก่อน · ราคาปิดปรับปรุง {number(latest.adjusted_close)} {s.currency}</small></div>})}</div>
      <TrendChart key={`${data.start_date}-${data.end_date}-${data.frequency}`} data={data} smooth={smooth}/>
      <p className="period-note">จุดเริ่มต้น = 0% · ใช้วันซื้อขายร่วมล่าสุดของแต่ละช่วง ไม่ใช่ค่าเฉลี่ย · ไตรมาส/เดือนแรกและปัจจุบันอาจยังไม่ครบช่วง</p>
      <details><summary>ตรวจราคาปิดปรับปรุงและการเปลี่ยนแปลงแต่ละช่วง</summary><div className="table-wrap"><table><thead><tr><th>ช่วง / วันที่ UTC</th>{data.series.map(s=><th key={s.symbol}>{s.symbol}<small>ราคา · % จากเริ่มต้น · % จากจุดก่อน</small></th>)}</tr></thead><tbody>{data.series[0].points.map((p,j)=><tr key={p.date}><td>{p.is_baseline?'เริ่มต้น':p.label}<small>{p.date}{p.is_partial&&!p.is_baseline?' · บางช่วง':''}</small></td>{data.series.map(s=><td key={s.symbol}>{number(s.points[j].adjusted_close)} {s.currency}<small>{percent(s.points[j].change_pct)} · {s.points[j].period_change_pct===null?'—':percent(s.points[j].period_change_pct)}</small></td>)}</tr>)}</tbody></table></div></details>
      <div className="comparison-sources">{data.series.map(s=><a key={s.symbol} className="source-link" href={s.source_url} target="_blank" rel="noreferrer">{s.symbol} · ตรวจข้อมูลต้นทาง</a>)}</div><p className="footnote">ดึงข้อมูล {new Date(data.series[0].fetched_at).toLocaleString('th-TH')} · ใช้วันซื้อขายร่วม {data.aligned_daily_points} วัน · cache ไม่เกิน 15 นาที</p>{data.limitations.map(t=><p className="footnote" key={t}>• {t}</p>)}</div>}
    {!data&&!busy&&!error&&<div className="card empty">เลือกหุ้นและช่วงเวลา แล้วกดเปรียบเทียบเพื่อดูกราฟจากข้อมูลจริง</div>}
  </div>;
}
