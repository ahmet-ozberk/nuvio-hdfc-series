/* RoketDizi Nuvio TV provider — independent preview.
 * Reads publicly exposed video URLs; no page scripts or DRM bypass.
 */
var RD_BASE='https://roketdizi.life';
var RD_UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';
function rdLog(stage,extra){
  if(typeof console!=='undefined'&&console.log)console.log('[AO ROKET]',stage,extra===undefined?'':String(extra));
}
function rdDecode(s){
  return String(s||'').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"')
    .replace(/&#(?:0?39);|&apos;/gi,"'").replace(/\\u0026/gi,'&')
    .replace(/\\u002f/gi,'/').replace(/\\\//g,'/').trim();
}
function rdAbsolute(raw,base){
  var u=rdDecode(raw),root=String(base||RD_BASE+'/');
  if(!u||/^(javascript|data|blob|file):/i.test(u))return '';
  if(u.indexOf('//')===0)u='https:'+u;
  else if(u.charAt(0)==='/'){
    var o=root.match(/^https?:\/\/[^/]+/i);u=(o?o[0]:RD_BASE)+u;
  }else if(!/^https?:\/\//i.test(u)){
    u=root.replace(/[?#].*$/,'').replace(/[^/]*$/,'')+u;
  }
  var host=(u.match(/^https?:\/\/([^/:?#]+)(?::\d{2,5})?\//i)||[])[1];
  if(!host)return '';
  host=host.toLowerCase();
  if(host==='localhost'||host==='127.0.0.1'||host==='0.0.0.0'||
     host==='::1'||host.endsWith('.localhost')||
     /^10\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\./.test(host))return '';
  return u;
}
function rdMedia(html,base){
  var txt=rdDecode(html),out=[],seen={},m;
  function add(x){
    var u=rdAbsolute(x,base);
    if(!/\.(m3u8|mp4)(?:[?#]|$)/i.test(u)||seen[u])return;
    seen[u]=true;out.push(u);
  }
  var direct=/(?:https?:)?\/\/[^\s"'<>\\]+?\.(?:m3u8|mp4)(?:[?#][^\s"'<>\\]*)?/gi;
  while((m=direct.exec(txt))!==null)add(m[0].replace(/[),;]+$/,''));
  var attr=/\b(?:src|data-src|file|url)\s*[:=]\s*["']([^"']+)["']/gi;
  while((m=attr.exec(txt))!==null)add(m[1]);
  return out.slice(0,12);
}
function rdIframes(html,page){
  var output=[],seen={},tag,link;
  var tags=/<iframe\b[^>]*>/gi;
  while((tag=tags.exec(html||''))!==null){
    var attrs=/\b(?:src|data-src|data-url)\s*=\s*["']([^"']+)["']/gi;
    while((link=attrs.exec(tag[0]))!==null){
      var u=rdAbsolute(link[1],page);
      if(u&&!seen[u]&&!/\.(mp4|m3u8)(?:[?#]|$)/i.test(u)){
        seen[u]=true;output.push(u);
      }
    }
  }
  return output.slice(0,3);
}
function rdArgs(input,type,season,episode){
  if(input&&typeof input==='object'){
    var o=input;input=o.id||o.tmdbId||o.imdbId||'';
    type=o.type||o.mediaType||type;
    season=o.season||o.seasonNum||season;
    episode=o.episode||o.episodeNum||episode;
  }
  var id=String(input||'').trim();
  var m=id.match(/^(?:tmdb:)?(?:60735|tt3107288)(?::(\d+):(\d+))?$/i);
  var custom=id.match(/^ao_roketdizi_series:ep:the-flash:(\d+):(\d+)$/);
  if(m){season=season||m[1];episode=episode||m[2];}
  if(custom){season=season||custom[1];episode=episode||custom[2];type=type||'series';}
  return {known:!!(m||custom),type:String(type||'').toLowerCase(),
    season:Number(season),episode:Number(episode)};
}
async function rdRead(url,referer){
  try{
    var headers={'User-Agent':RD_UA,'Accept':'text/html,application/xhtml+xml,*/*;q=0.8',
      'Accept-Language':'tr-TR,tr;q=0.9','Referer':referer||RD_BASE+'/'};
    var opts={headers:headers};
    if(typeof AbortSignal!=='undefined'&&AbortSignal.timeout)
      opts.signal=AbortSignal.timeout(9000);
    var r=await fetch(url,opts);
    if(!r||!r.ok){rdLog('HTTP_STATUS',r?r.status:'none');return '';}
    var h=await r.text();
    if(h.length>2000000){rdLog('HTML_TOO_LARGE');return '';}
    return h;
  }catch(e){rdLog('FETCH_FAILED',e&&e.message?String(e.message).slice(0,120):'unknown');return '';}
}
async function getStreams(tmdbId,mediaType,seasonNum,episodeNum){
  var a=rdArgs(tmdbId,mediaType,seasonNum,episodeNum);
  rdLog('REQUEST','known='+a.known+' type='+a.type+' s='+a.season+' e='+a.episode);
  if(!a.known||a.type==='movie'||!Number.isInteger(a.season)||
     !Number.isInteger(a.episode)||a.season<1||a.season>9||
     a.episode<1||a.episode>30)return [];
  var page=RD_BASE+'/dizi/the-flash/sezon-'+a.season+'/bolum-'+a.episode;
  var html=await rdRead(page,RD_BASE+'/');
  if(!html)return [];
  var urls=rdMedia(html,page),refs={},i,j;
  for(i=0;i<urls.length;i++)refs[urls[i]]=page;
  if(!urls.length){
    var frames=rdIframes(html,page);
    rdLog('IFRAME_COUNT',frames.length);
    for(i=0;i<frames.length;i++){
      var frameHtml=await rdRead(frames[i],page);
      var extra=rdMedia(frameHtml,frames[i]);
      for(j=0;j<extra.length;j++){
        if(urls.indexOf(extra[j])<0){urls.push(extra[j]);refs[extra[j]]=frames[i];}
      }
      if(urls.length)break;
    }
  }
  rdLog('MEDIA_CANDIDATES',urls.length);
  return urls.slice(0,8).map(function(url){
    var ref=refs[url]||page;
    var origin=(ref.match(/^https?:\/\/[^/]+/)||[RD_BASE])[0];
    var headers={'Referer':ref,'Origin':origin,'User-Agent':RD_UA};
    var hls=/\.m3u8(?:[?#]|$)/i.test(url);
    return {name:'RoketDizi [AO]',
      title:(hls?'HLS':'MP4')+' | Ses dili doğrulanmadı',
      url:url,quality:'Auto',format:hls?'hls':'mp4',isHls:hls,
      headers:headers,behaviorHints:{proxyHeaders:{request:headers}}};
  });
}
if(typeof module!=='undefined')module.exports={getStreams:getStreams};
if(typeof globalThis!=='undefined')globalThis.getStreams=getStreams;
