import React from 'react';
import {comparisonLabel} from './comparison.js';

export default function ComparisonResults({result, docs, onEvidence}) {
  const claims = result.claims.map(claim => ({...claim, row: comparisonLabel(claim.label, docs)}));
  const labels = [...new Set(claims.map(c => c.row))];
  return <>
    <p className="period-note">ส่วนนี้เป็นสรุปโดย AI จากผล{result.cached ? 'ที่บันทึกไว้เดิม' : 'ประมวลผลครั้งนี้'} · ตัวเลขจากตาราง PDF แสดงแยกไว้ด้านบน</p>
    {!claims.length && <p>ผลนี้ไม่มีข้อสรุป AI ที่ผ่านการตรวจข้อความอ้างอิง กรุณาดูตาราง PDF ด้านบนหรือประมวลผลใหม่</p>}
    <div className="table-wrap"><table><thead><tr><th>ประเด็น</th>{docs.map(d => <th key={d.id}>{d.company || d.name}</th>)}</tr></thead>
      <tbody>{labels.map(label => <tr key={label}><th>{label}</th>{docs.map(doc => {
        const entries = claims.filter(c => c.row === label && c.doc_id === doc.id);
        return <td key={doc.id}>{entries.length ? entries.map((claim, i) => <div key={i}>
          <small>สรุปโดย AI · ต้องตรวจความหมายและตัวเลขกับหลักฐาน</small><p>{claim.text}</p>
          <details><summary>ข้อความจากเอกสารโดยตรง</summary><blockquote>{claim.quote}</blockquote></details>
          <button className="source-link" onClick={() => onEvidence(claim)}>หลักฐาน · PDF หน้า {claim.page}</button>
        </div>) : <span>ยังไม่มีข้อสรุปที่ผ่านการตรวจหลักฐานในผลนี้<small>ไม่ได้หมายความว่าบริษัทไม่มีข้อมูลนี้ ตรวจตาราง PDF ด้านบนหรือค้นเพิ่มเติม</small></span>}</td>;
      })}</tr>)}</tbody></table></div>
  </>;
}
