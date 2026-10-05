const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.join(__dirname,'..'),target=path.join(root,'.verification','build-'+Date.now());
fs.mkdirSync(target,{recursive:true});
for(const name of ['components','pages','public','server','styles','utils','package.json','package-lock.json','jsconfig.json','.eslintrc.json']){
 if(fs.existsSync(path.join(root,name)))fs.cpSync(path.join(root,name),path.join(target,name),{recursive:true});
}
fs.writeFileSync(path.join(target,'next.config.mjs'),`export default {reactStrictMode:true,outputFileTracingRoot:${JSON.stringify(target)},experimental:{cpus:2}};\n`);
fs.symlinkSync(path.join(root,'node_modules'),path.join(target,'node_modules'),'junction');
console.log('Verification build directory: '+target);
const child=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'build'],{cwd:target,stdio:'inherit',env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'}});
child.on('exit',code=>{
 if(code===0)fs.writeFileSync(path.join(root,'.verification','latest-build.txt'),target);
 process.exit(code||0);
});
