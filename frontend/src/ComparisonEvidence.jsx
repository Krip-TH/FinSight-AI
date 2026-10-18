import React, {useEffect, useState} from 'react';

export default function ComparisonEvidence({docs, onEvidence}) {
  const [state, setState] = useState({});
  const [selectedYear, setSelectedYear] = useState('');
  const ids = docs.map(d => d.id).join(',');
  useEffect(() => {
    const controller = new AbortController();
    setState({});
    for (const id of ids.split(',').filter(Boolean)) {
      fetch(`/api/documents/${id}/research?kind=stock`, {signal: controller.signal})
        .then(async response => {
          if (!response.ok) throw new Error('โหลดรอบบัญชีไม่สำเร็จ');
          return response.json();
        })
        .then(report => setState(old => ({...old, [id]: {report}})))
        .catch(error => {
          if (error.name !== 'AbortError') setState(old => ({...old, [id]: {error: error.message}}));
        });
    }
    return () => controller.abort();
  }, [ids]);
  if (!docs.length) return null;
  const reports = docs.map(doc => state[doc.id]?.report);
  const years = [...new Set(reports.flatMap(report => report?.financial.years || []))].sort().reverse();
  const year = years.includes(selectedYear) ? selectedYear : years[0];
  const metrics = [['revenue', 'รายได้รวม'], ['net_income', 'กำไรสุทธิ'], ['operating_income', 'กำไรจากการดำเนินงาน'], ['research_development', 'วิจัยและพัฒนา']];
  const fmt = value => Number(value).toLocaleString('th-TH', {maximumFractionDigits: 2});
  return <section className="card comparison-periods"><h2>รอบบัญชีจากเอกสารต้นฉบับ</h2>
    <p className="footnote">FY ที่ชื่อเหมือนกันอาจครอบคลุมคนละช่วงเวลา ใช้วันสิ้นสุดของแต่ละบริษัทประกอบการเปรียบเทียบ</p>
    <div className="table-wrap"><table><thead><tr><th>เอกสาร</th><th>ปีบัญชี / วันสิ้นสุด</th><th>หลักฐานจาก PDF</th></tr></thead><tbody>{docs.map(doc => {
      const entry = state[doc.id], financial = entry?.report?.financial;
      return <tr key={doc.id}><th>{doc.company || doc.name}<small>ข้อมูลกำกับที่ผู้ใช้กรอก: {doc.period || 'ยังไม่ระบุ'}</small></th>
        <td>{!entry ? 'กำลังอ่านรอบบัญชี…' : entry.error || (financial?.years.length ? financial.years.map((year, i) => <div key={year}>FY{year} · สิ้นสุด {financial.period_ends[i]}</div>) : 'ยังสกัดวันสิ้นสุดไม่ได้ กรุณาตรวจ PDF ต้นฉบับ')}</td>
        <td>{financial?.header_quote && <><button className="source-link" onClick={() => onEvidence({doc_id: doc.id, page: financial.page, quote: financial.header_quote})}>ตรวจหัวตาราง · PDF หน้า {financial.page}</button><details><summary>ข้อความรอบบัญชีต้นฉบับ</summary><blockquote>{financial.header_quote}</blockquote></details></>}</td></tr>;
    })}</tbody></table></div>
    <p className="footnote">สกัดหัวตารางด้วยกฎจาก PDF โดยไม่เรียก AI · เลขหน้าเริ่มนับจากหน้าแรกของไฟล์เป็น 1 และอาจต่างจากเลขหน้าที่พิมพ์ในรายงาน</p>
    {years.length > 0 && <><h2>เปรียบเทียบตัวเลขจากตาราง PDF โดยตรง</h2>
      <label>ปีบัญชี <select aria-label="ปีบัญชีที่เปรียบเทียบ" value={year} onChange={event => setSelectedYear(event.target.value)}>{years.map(value => <option key={value} value={value}>FY{value}</option>)}</select></label>
      <p className="footnote">สกัดด้วยกฎ ไม่ใช้ AI · วันสิ้นสุดรอบบัญชีต่างกัน จึงไม่ได้ครอบคลุมช่วงเวลาเดียวกันทั้งหมด</p>
      <div className="table-wrap"><table><thead><tr><th>ประเด็น</th>{docs.map((doc, index) => {
        const financial = reports[index]?.financial, position = financial?.years.indexOf(year);
        return <th key={doc.id}>{doc.company || doc.name}<small>FY{year} · สิ้นสุด {position >= 0 ? financial.period_ends[position] : 'ยังไม่มีข้อมูลปีนี้'}</small></th>;
      })}</tr></thead><tbody>{metrics.map(([key, label]) => <tr key={key}><th>{label}</th>{docs.map((doc, index) => {
        const financial = reports[index]?.financial, metric = financial?.metrics.find(item => item.key === key);
        const position = financial?.years.indexOf(year), value = position >= 0 ? metric?.values[position] : undefined;
        return <td key={doc.id}>{Number.isFinite(value) ? <><b>{fmt(value)}</b><small>{metric.unit}</small><button className="source-link" onClick={() => onEvidence({...metric, doc_id: doc.id})}>PDF หน้า {metric.page}</button><details><summary>แถวตัวเลขจากเอกสาร</summary><blockquote>{metric.quote}</blockquote></details></> : 'ยังสกัดตัวเลขที่เทียบได้ไม่ได้'}</td>;
      })}</tr>)}</tbody></table></div></>}
  </section>;
}
