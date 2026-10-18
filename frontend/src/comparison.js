export function comparisonLabel(label, documents) {
  let text = label;
  for (const doc of documents) {
    for (const name of [doc.company, doc.name].filter(Boolean)) {
      text = text.replaceAll(name, '');
    }
  }
  text = text.replace(/\b(?:Apple|Microsoft|AAPL|MSFT)\b/gi, '').trim();
  if (/รอบบัญชี|ปีบัญชี.*สิ้นสุด|fiscal year|year.end/i.test(text)) return 'รอบปีบัญชี';
  return text.replace(/^[\s·:–—-]+|[\s·:–—-]+$/g, '').replace(/\s+/g, ' ') || label;
}
