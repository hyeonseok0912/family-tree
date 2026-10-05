package com.familytree.app;
import android.app.*;
import android.os.Bundle;
import android.webkit.*;
import android.net.Uri;
import android.content.*;
import android.provider.MediaStore;
import android.util.Base64;
import android.widget.*;
import java.io.OutputStream;

public class MainActivity extends Activity {
  private WebView web;
  private boolean trusted(String url) {
    Uri target=Uri.parse(url),site=Uri.parse(BuildConfig.SITE_URL);
    return "https".equals(target.getScheme()) && site.getHost()!=null && site.getHost().equals(target.getHost()) && site.getPort()==target.getPort();
  }
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    if(!trusted(BuildConfig.SITE_URL))throw new IllegalArgumentException("SITE_URL must be HTTPS");
    LinearLayout layout=new LinearLayout(this);layout.setOrientation(LinearLayout.VERTICAL);layout.setFitsSystemWindows(true);
    Button browser=new Button(this);browser.setText("브라우저에서 열기");browser.setOnClickListener(v->startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(BuildConfig.SITE_URL))));layout.addView(browser);
    web=new WebView(this);layout.addView(web,new LinearLayout.LayoutParams(-1,0,1));setContentView(layout);
    web.getSettings().setJavaScriptEnabled(true);web.getSettings().setDomStorageEnabled(true);
    web.getSettings().setAllowFileAccess(false);web.getSettings().setAllowContentAccess(false);
    web.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    CookieManager.getInstance().setAcceptCookie(true);
    web.addJavascriptInterface(new FileExport(),"FamilyTreeNative");
    web.setWebViewClient(new WebViewClient(){
      @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
        String url=request.getUrl().toString();if(trusted(url))return false;
        String scheme=request.getUrl().getScheme();
        if("https".equals(scheme)||"mailto".equals(scheme)||"tel".equals(scheme))try{startActivity(new Intent(Intent.ACTION_VIEW,request.getUrl()));}catch(ActivityNotFoundException ignored){}
        return true;
      }
      @Override public void onReceivedError(WebView view,WebResourceRequest req,WebResourceError error){
        if(req.isForMainFrame())new AlertDialog.Builder(MainActivity.this).setMessage("인터넷 연결을 확인해주세요.").setPositiveButton("다시 연결",(d,w)->web.loadUrl(BuildConfig.SITE_URL)).setNegativeButton("닫기",null).show();
      }
    });
    web.setWebChromeClient(new WebChromeClient(){
      @Override public boolean onJsAlert(WebView view,String url,String message,JsResult result){new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("확인",(d,w)->result.confirm()).setOnCancelListener(d->result.cancel()).show();return true;}
      @Override public boolean onJsConfirm(WebView view,String url,String message,JsResult result){new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("확인",(d,w)->result.confirm()).setNegativeButton("취소",(d,w)->result.cancel()).setOnCancelListener(d->result.cancel()).show();return true;}
    });
    if(state==null)web.loadUrl(BuildConfig.SITE_URL);else web.restoreState(state);
  }
  public class FileExport {
    @JavascriptInterface public void saveFile(String filename,String dataUrl){runOnUiThread(()->{
      Uri saved=null;
      try{
        if(!trusted(web.getUrl()==null?"":web.getUrl())||dataUrl.length()>40000000)throw new IllegalArgumentException();
        String mime;
        if(dataUrl.startsWith("data:image/png;base64,")&&filename.endsWith(".png"))mime="image/png";
        else if(dataUrl.startsWith("data:application/pdf;")&&dataUrl.contains("base64,")&&filename.endsWith(".pdf"))mime="application/pdf";
        else throw new IllegalArgumentException();
        if(!filename.matches("[A-Za-z0-9_-]+\\.(png|pdf)"))throw new IllegalArgumentException();
        byte[] bytes=Base64.decode(dataUrl.substring(dataUrl.indexOf("base64,")+7),Base64.DEFAULT);
        ContentValues values=new ContentValues();values.put(MediaStore.Downloads.DISPLAY_NAME,filename);values.put(MediaStore.Downloads.MIME_TYPE,mime);values.put(MediaStore.Downloads.IS_PENDING,1);
        saved=getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,values);
        if(saved==null)throw new IllegalStateException();
        try(OutputStream out=getContentResolver().openOutputStream(saved)){if(out==null)throw new IllegalStateException();out.write(bytes);}
        values.clear();values.put(MediaStore.Downloads.IS_PENDING,0);getContentResolver().update(saved,values,null,null);
        Toast.makeText(MainActivity.this,"다운로드 폴더에 저장했습니다.",Toast.LENGTH_LONG).show();
      }catch(Exception error){if(saved!=null)getContentResolver().delete(saved,null,null);Toast.makeText(MainActivity.this,"파일 저장 실패. 브라우저에서 다시 시도해주세요.",Toast.LENGTH_LONG).show();}
    });}
  }
  @Override protected void onSaveInstanceState(Bundle state){web.saveState(state);super.onSaveInstanceState(state);}
  @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
  @Override protected void onPause(){CookieManager.getInstance().flush();web.onPause();super.onPause();}
  @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
  @Override protected void onDestroy(){web.removeJavascriptInterface("FamilyTreeNative");web.destroy();super.onDestroy();}
}
