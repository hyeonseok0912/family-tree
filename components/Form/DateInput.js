import { useState, useEffect, useRef } from 'react';
import dates from '../../utils/dates.cjs';
export default function DateInput({label,name,value,precision,onChange}){
  const [text,setText]=useState(()=>dates.dateInputValue(value,precision));
  const [error,setError]=useState('');
  const inputRef=useRef(null);
  useEffect(()=>{setText(dates.dateInputValue(value,precision));},[value,precision]);
  const commit=(input,chosen,element)=>{
    try{const parsed=dates.parseDateInput(chosen==='DAY' && /^\d{4}$/.test(input) ? `${input}-01-01` : input,chosen);setError('');(element||inputRef.current)?.setCustomValidity('');onChange(parsed);setText(dates.dateInputValue(parsed.date,parsed.precision));}
    catch(err){setError(err.message);(element||inputRef.current)?.setCustomValidity(err.message);}
  };
  return <fieldset style={{padding:8,border:'1px solid #ddd',borderRadius:6}}>
    <legend>{label}</legend>
    <label>직접 입력 <input ref={inputRef} name={name} value={text} onChange={e=>{setText(e.target.value);setError('');try{const parsed=dates.parseDateInput(e.target.value);e.target.setCustomValidity('');onChange(parsed);}catch(err){e.target.setCustomValidity(err.message);}}}
      onBlur={e=>commit(text,precision,e.target)} placeholder="1932 또는 1932-05-17 (미상: 0)" aria-invalid={!!error}/></label>
    <label>달력 <input type="date" aria-label={`${label} 달력`} value={value?String(value).slice(0,10):''} onChange={e=>commit(e.target.value,'DAY')}/></label>
    <label>정확도 <select aria-label={`${label} 정확도`} value={precision||(!value?'UNKNOWN':'DAY')} onChange={e=>commit(text,e.target.value)}>
      <option value="UNKNOWN">미상</option><option value="YEAR">연도만</option><option value="DAY">월일까지</option>
      {precision==='LEGACY'&&<option value="LEGACY">기존 1월 1일 · 확인 필요</option>}
    </select></label>
    {error&&<p role="alert">{error}</p>}
    {precision==='LEGACY'&&<small>실제 1월 1일인지, 연도만 알려진 것인지 정확도를 선택해주세요.</small>}
  </fieldset>;
}
