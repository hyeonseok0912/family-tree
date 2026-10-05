const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {jsPDF}=require('jspdf');
const pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a3'});
const image='data:image/png;base64,'+fs.readFileSync(path.join(__dirname,'../public/icons/icon-192.png')).toString('base64');
for(let page=0;page<3;page++){if(page)pdf.addPage();pdf.addImage(image,'PNG',10,10,200,200);}
assert.equal(pdf.internal.getNumberOfPages(),3);
assert.ok(pdf.output().startsWith('%PDF-'));
assert.ok(pdf.output('datauristring').includes('base64,'));
console.log('PASS: updated PDF library embeds PNG, generates multiple A3 pages and produces native export data');
