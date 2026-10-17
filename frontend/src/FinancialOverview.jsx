import React, {useState} from 'react';
import {Activity, ArrowUpRight, BarChart3, TrendingUp, Layers3} from 'lucide-react';
import './dashboard.css';

const palette = ['#2dd4bf', '#a5a0ff'];
const number = n => Number(n).toLocaleString('en-US', {maximumFractionDigits: 2});
const compact = n => Math.abs(n) >= 1000 ? `${number(n / 1000)}B` : `${number(n)}M`;
const percent = n => n === null ? '—' : `${n > 0 ? '+' : ''}${number(n)}%`;
const valueAt = (r, key, year) => {
  const index = r.financial.years.indexOf(year);
  const value = r.financial.metrics.find(m => m.key === key)?.values[index];
  return index >= 0 && typeof value === 'number' && Number.isFinite(value) ? value : null;
};
const growth = (current, previous) => current === null || previous === null || previous <= 0 ? null : (current / previous - 1) * 100;

function Sparkline({values, color}) {
  const finite = values.filter(v => v !== null);
  if (!finite.length) return null;
  const min = Math.min(...finite), span = Math.max(...finite) - min || 1;
  const points = values.map((v, i) => v === null ? null : `${i / Math.max(1, values.length - 1) * 100},${28 - (v - min) / span * 24}`).filter(Boolean).join(' ');
  return <svg viewBox="0 0 100 34" className="financial-spark" aria-hidden="true"><polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round"/></svg>;
}

export default function FinancialOverview({reports, metric}) {
  const [mode, setMode] = useState('bar');
  const [chosenYear, setChosenYear] = useState('');
  const years = [...new Set(reports.flatMap(r => r.financial.years))].sort();
  const year = years.includes(chosenYear) ? chosenYear : years.at(-1);
  const series = reports.filter(r => r.financial.metrics.some(m => m.key === metric));
  const metricLabel = reports.flatMap(r => r.financial.metrics).find(m => m.key === metric)?.label || 'ผลประกอบการ';
  const available = series.flatMap(r => years.map(y => valueAt(r, metric, y))).filter(v => v !== null);
  if (!available.length) return <div className="empty">ยังไม่มีตัวเลขสำหรับตัวชี้วัดนี้ในเอกสารที่เลือก</div>;
  const low = Math.min(0, ...available), high = Math.max(1, ...available), span = high - low;
  const y = v => 252 - (v - low) / span * 202;
  const groupWidth = 600 / Math.max(1, years.length);
  const x = i => 90 + groupWidth * (i + .5);
  const barWidth = Math.min(42, groupWidth / (series.length + 2));
  const activeIndex = years.indexOf(year);
  const cards = [
    ['revenue', 'รายได้รวม', BarChart3], ['net_income', 'กำไรสุทธิ', TrendingUp],
    ['margin', 'อัตรากำไรสุทธิ', Activity], ['research_development', 'วิจัยและพัฒนา', Layers3]
  ];
  return <div className="financial-overview">
    <div className="financial-kpis">{cards.map(([key, label, Icon]) => <section className="financial-kpi" key={key}>
      <div className="kpi-heading"><span>{label}</span><Icon size={16}/></div>
      {reports.map((r, i) => {
        const revenue = valueAt(r, 'revenue', year), net = valueAt(r, 'net_income', year);
        const value = key === 'margin' ? revenue !== null && revenue !== 0 && net !== null ? net / revenue * 100 : null : valueAt(r, key, year);
        const previous = String(Number(year) - 1);
        const change = key === 'margin' ? null : growth(value, valueAt(r, key, previous));
        return <div className="kpi-company" key={r.document.id}>
          <div><span className={`company-dot company-${i}`}/><span className="kpi-name">{r.document.company || r.document.name}</span></div>
          <div className="kpi-value"><b>{value === null ? '—' : key === 'margin' ? `${number(value)}%` : `$${compact(value)}`}</b>
            {key !== 'margin' && <span className={change === null ? 'neutral' : change >= 0 ? 'positive' : 'negative'}>{percent(change)}<small>YoY</small></span>}</div>
        </div>;
      })}<div className="kpi-footer">FY{year} <span>{key === 'margin' ? 'กำไรสุทธิ / รายได้รวม' : 'B = พันล้าน · M = ล้าน'}</span></div>
    </section>)}</div>

    <div className="financial-grid">
      <section className="terminal-chart">
        <div className="terminal-heading"><div><span className="terminal-eyebrow">FINANCIAL PERFORMANCE</span><h3>{metricLabel} <span>/ $</span></h3></div>
          <div className="terminal-switch" aria-label="รูปแบบกราฟ"><button aria-pressed={mode === 'bar'} onClick={() => setMode('bar')}><BarChart3 size={14}/>แท่ง</button><button aria-pressed={mode === 'line'} onClick={() => setMode('line')}><Activity size={14}/>เส้น</button></div>
        </div>
        <div className="terminal-legend">{series.map(r => <span key={r.document.id}><i style={{background: palette[reports.indexOf(r) % 2]}}/>{r.document.company || r.document.name}</span>)}<span className="terminal-unit">หน่วย: พันล้าน $ ตามต้นฉบับ (B)</span></div>
        <svg className="financial-chart" viewBox="0 0 760 300" role="img" aria-label={`กราฟ${mode === 'bar' ? 'แท่ง' : 'เส้น'}เปรียบเทียบ${metricLabel}รายปี เลือกปีได้จากปุ่มใต้กราฟ`}>
          {[0, .25, .5, .75, 1].map(t => <g key={t}><line x1="80" x2="714" y1={252 - t * 202} y2={252 - t * 202} stroke="#ffffff12"/><text x="65" y={256 - t * 202} textAnchor="end" fill="#8294ac" fontSize="11">{number((low + span * t) / 1000)}B</text></g>)}
          <rect x={x(activeIndex) - groupWidth * .43} y="33" width={groupWidth * .86} height="219" rx="6" fill="#ffffff04"/>
          <line x1="80" x2="714" y1={y(0)} y2={y(0)} stroke="#8294ac" strokeOpacity=".4"/>
          {series.map((r, si) => <g key={r.document.id}>
            {mode === 'line' && years.map((yr, i) => {
              const v = valueAt(r, metric, yr), previous = i > 0 ? valueAt(r, metric, years[i - 1]) : null;
              return v !== null && previous !== null ? <line key={yr} x1={x(i - 1)} x2={x(i)} y1={y(previous)} y2={y(v)} stroke={palette[reports.indexOf(r) % 2]} strokeWidth="3"/> : null;
            })}
            {years.map((yr, i) => {
              const v = valueAt(r, metric, yr);
              if (v === null) return null;
              const center = x(i) + (si - (series.length - 1) / 2) * (barWidth + 8);
              return <g key={yr}>{mode === 'bar' ? <rect x={center - barWidth / 2} y={Math.min(y(v), y(0))} width={barWidth} height={Math.max(1, Math.abs(y(v) - y(0)))} rx="3" fill={palette[reports.indexOf(r) % 2]} opacity={yr === year ? 1 : .65}><title>{r.document.company || r.document.name} FY{yr}: {number(v)} ล้าน $</title></rect> : <circle cx={x(i)} cy={y(v)} r={yr === year ? 6 : 4} fill={palette[reports.indexOf(r) % 2]} stroke="#132236" strokeWidth="2"><title>{r.document.company || r.document.name} FY{yr}: {number(v)} ล้าน $</title></circle>}</g>;
            })}
          </g>)}
          {years.map((yr, i) => <text key={yr} x={x(i)} y="281" textAnchor="middle" fontSize="12" fill={yr === year ? '#e5edf7' : '#8294ac'}>FY{yr}</text>)}
        </svg>
        <div className="terminal-bottom"><span>เลือกปีเพื่อดูรายละเอียด</span><div className="financial-years" aria-label="ปีบัญชี">{years.map(yr => <button key={yr} aria-pressed={yr === year} onClick={() => setChosenYear(yr)}>FY{yr}</button>)}</div></div>
      </section>

      <aside className="financial-snapshot"><div className="snapshot-title"><h3>เปรียบเทียบ ณ ปีที่เลือก</h3><span>FY{year}</span></div>
        <p className="snapshot-subtitle">{metricLabel} · จากเอกสารต้นฉบับ</p>
        {reports.map((r, i) => {
          const v = valueAt(r, metric, year), change = growth(v, valueAt(r, metric, String(Number(year) - 1)));
          return <section className="snapshot-company" key={r.document.id}>
            <div className="snapshot-company-heading"><span className={`company-monogram monogram-${i}`}>{(r.document.company || r.document.name).slice(0, 1)}</span><b>{r.document.company || r.document.name}</b><ArrowUpRight size={15}/></div>
            <div className="snapshot-value"><b>{v === null ? '—' : `$${compact(v)}`}</b><span className={change === null ? 'neutral' : change >= 0 ? 'positive' : 'negative'}>{percent(change)} YoY</span></div>
            <Sparkline values={years.map(yr => valueAt(r, metric, yr))} color={i === 0 ? '#0d9e89' : '#7771df'}/>
            <small>สิ้นสุดรอบบัญชี {r.financial.period_ends[r.financial.years.indexOf(year)] || 'ไม่มีข้อมูลปีนี้'}</small>
          </section>;
        })}
        <p className="snapshot-note">YoY เทียบปีก่อนของบริษัทเดียวกัน<br/>— หมายถึงข้อมูลไม่เพียงพอ</p>
      </aside>
    </div>
  </div>;
}
