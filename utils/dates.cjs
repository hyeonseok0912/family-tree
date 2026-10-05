function parseDateInput(value, precision) {
  if (precision && !['UNKNOWN','YEAR','DAY','LEGACY'].includes(precision)) throw Error('날짜 정확도 값이 올바르지 않습니다.');
  const text=String(value ?? '').trim();
  if(!text || text==='0' || precision==='UNKNOWN') return {date:null,precision:'UNKNOWN'};
  const normalized=text.replaceAll('.','-');
  if(/^\d{4}$/.test(normalized) && Number(normalized)>0) return {date:`${normalized}-01-01`,precision:'YEAR'};
  if(!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) throw Error('연도 또는 YYYY-MM-DD 형식으로 입력해주세요.');
  const [year,month,day]=normalized.split('-').map(Number);
  const leap=year%4===0&&(year%100!==0||year%400===0);
  const maxDay=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][month-1];
  if(year<1||month<1||month>12||day<1||day>maxDay) throw Error('실제 존재하는 날짜를 입력해주세요.');
  if(precision==='YEAR') return {date:`${normalized.slice(0,4)}-01-01`,precision:'YEAR'};
  if(precision==='LEGACY'&&normalized.endsWith('-01-01')) return {date:normalized,precision:'LEGACY'};
  return {date:normalized,precision:'DAY'};
}
function dateInputValue(value,precision) {
  if(!value || precision==='UNKNOWN') return '';
  const text=String(value).slice(0,10);
  return precision==='YEAR'?text.slice(0,4):text;
}
function datesInOrder(birth,death) {
  if(!birth.date||!death.date)return true;
  const latestDeath=['YEAR','LEGACY'].includes(death.precision)?`${death.date.slice(0,4)}-12-31`:death.date;
  return birth.date<=latestDeath;
}
module.exports={parseDateInput,dateInputValue,datesInOrder};
