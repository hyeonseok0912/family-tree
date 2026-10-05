const {spawnSync}=require('node:child_process');
for(const file of ['step1-regressions.cjs','admin-security.cjs','memo-autosave.cjs','dates.cjs','pdf.cjs','pwa.cjs','record-presentation.cjs','ui-presentation.cjs','tree-scroll.cjs','admin-create-ui.cjs']){
 const result=spawnSync(process.execPath,[require('node:path').join(__dirname,file)],{stdio:'inherit'});
 if(result.status!==0)process.exit(result.status||1);
}
