/* Standalone Nuvio TV provider (preview). No dependency on Anthology. */
var AO_ORIGIN='https://www.hdfilmcehennemi.nl';
var AO_ID='ao_hdfc_series';
var AO_FLASH='the-flash-izle-12';
var AO_COUNTS=[23,23,23,23,22,19,18,20,13];
var AO_CACHE={};
var AO_HEADERS={'Accept':'text/html,application/xhtml+xml,*/*','Accept-Language':'tr-TR,tr;q=0.9',
  'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36'};

function aoDecode(v){
  return String(v||'').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"')
    .replace(/&#039;|&#39;/gi,"'").replace(/\\u0026/gi,'&')
    .replace(/\\\//g,'/').trim();
}
function aoFold(v){
  return aoDecode(v).toLowerCase().replace(/[ıİ]/g,'i').replace(/[şŞ]/g,'s')
    .replace(/[ğĞ]/g,'g').replace(/[üÜ]/g,'u').replace(/[öÖ]/g,'o')
    .replace(/[çÇ]/g,'c').replace(/[^a-z0-9]/g,'');
}
function aoAbsolute(href,base){
  var s=aoDecode(href);
  if(s.indexOf('//')===0)s='https:'+s;
  else if(s[0]==='/'){
    var parentOrigin=String(base||AO_ORIGIN).match(/^https?:\/\/[^/]+/);
    s=(parentOrigin?parentOrigin[0]:AO_ORIGIN)+s;
  }else if(!/^https?:\/\//i.test(s)){
    s=String(base||AO_ORIGIN+'/').replace(/[^/]*$/,'')+s;
  }
  return /^https?:\/\/[a-z0-9.-]+\//i.test(s)?s:'';
}
function aoSite(href,base){
  var u=aoAbsolute(href,base).split(/[?#]/)[0];
  return /^https:\/\/(?:www\.)?hdfilmcehennemi\.nl\/dizi\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\/?$/i.test(u)?u:'';
}
async function aoRead(url,referer,fresh){
  if(!url)return '';
  var key=url+'|'+String(referer||'');
  // Signed playback URLs are short-lived: never reuse cached player HTML.
  if(!fresh&&AO_CACHE[key])return AO_CACHE[key];
  try{
    var headers={},names=Object.keys(AO_HEADERS);
    for(var i=0;i<names.length;i++)headers[names[i]]=AO_HEADERS[names[i]];
    if(referer)headers.Referer=referer;
    var opts={headers:headers};
    if(typeof AbortSignal!=='undefined'&&AbortSignal.timeout)opts.signal=AbortSignal.timeout(8500);
    var r=await fetch(url,opts);
    if(!r||!r.ok){
      if(typeof console!=='undefined'&&console.warn){
        console.warn('[AO HDFC] HTTP_STATUS',r&&r.status||0,url.indexOf('/video/')!==-1?'player':'page');
      }
      return '';
    }
    var html=await r.text();
    if(!fresh&&html&&html.length<3000000)AO_CACHE[key]=html;
    return html;
  }catch(e){
    if(typeof console!=='undefined'&&console.warn){
      console.warn('[AO HDFC] FETCH_EXCEPTION',String(e&&e.message||e).slice(0,120));
    }
    return '';
  }
}
function aoLinks(html,base){
  var out=[],seen={},re=/(?:href|data-href|data-url)\s*=\s*["']([^"']+)["']/gi,m;
  while((m=re.exec(html||''))!==null){
    var u=aoSite(m[1],base);
    if(u&&!seen[u]){seen[u]=true;out.push(u)}
  }
  return out;
}
function aoSlug(id){
  var s=String(id||'');
  if(s==='60735'||s==='tt3107288'||/^(60735|tt3107288):\d+:\d+$/.test(s))return AO_FLASH;
  var m=s.match(/^ao_hdfc_series:show:([a-z0-9-]+)$/);
  return m&&m[1].length<=120?m[1]:'';
}
function aoEpisode(url,slug){
  var quoted=String(slug).replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&');
  var m=String(url||'').split(/[?#]/)[0].match(new RegExp('/dizi/'+quoted+'/sezon-(\\d+)/bolum-(\\d+)(?:-hd\\d+)?/?$','i'));
  return m?{season:Number(m[1]),episode:Number(m[2]),url:url}:null;
}
function aoEpisodeBase(slug,season,episode){
  return AO_ORIGIN+'/dizi/'+slug+'/sezon-'+season+'/bolum-'+episode+'/';
}
function aoDistinctUrls(urls){
  var arr=[],seen={};
  for(var i=0;i<urls.length;i++){
    var u=urls[i];
    if(u&&!seen[u]){seen[u]=true;arr.push(u);}
  }
  return arr;
}
async function aoFindEpisodeUrls(slug,season,episode){
  if(!/^[a-z0-9-]{2,120}$/.test(slug))return [];
  var home=AO_ORIGIN+'/dizi/'+slug+'/',urls=[];
  // Scan site links instead of guessing per-episode hd suffixes.
  var listing=[home+'sezon-'+season+'/',home];
  for(var i=0;i<listing.length;i++){
    var html=await aoRead(listing[i],undefined,true);
    var links=aoLinks(html,listing[i]);
    for(var j=0;j<links.length;j++){
      var ep=aoEpisode(links[j],slug);
      if(ep&&ep.season===season&&ep.episode===episode)urls.push(ep.url);
    }
  }
  // Known URLs are only fallbacks supplied by the user.
  if(slug===AO_FLASH&&season===4&&episode===16){
    urls.push(home+'sezon-4/bolum-16-hd9/');
  }
  if(slug===AO_FLASH&&season===4&&episode===1){
    urls.push(home+'sezon-4/bolum-1-hd12/');
  }
  return aoDistinctUrls(urls);
}
function aoDirect(html,page){
  var input=aoDecode(html||''),out=[],seen={},m;
  var re=/(?:https?:)?\/\/[^\s"'<>\\]+?(?:\.m3u8|\.mp4\/master\.txt|\.mp4)(?:\?[^\s"'<>\\]*)?/gi;
  while((m=re.exec(input))!==null){
    var u=aoAbsolute(m[0].replace(/[),;]+$/,''),page);
    if(u&&!seen[u]){out.push(u);seen[u]=true}
  }
  var src=/<(?:source|video)\b[^>]*\b(?:src|data-src)=["']([^"']+)["']/gi;
  while((m=src.exec(input))!==null){
    var u2=aoAbsolute(m[1],page);
    if(/(?:\.m3u8|\.mp4\/master\.txt|\.mp4)(?:[?#]|$)/i.test(u2)&&!seen[u2]){out.push(u2);seen[u2]=true}
  }
  return out.slice(0,8);
}
function aoBase64Decode(s){
  if(typeof atob==='function')return atob(s);
  if(typeof Buffer!=='undefined')return Buffer.from(s,'base64').toString('binary');
  throw new Error('base64 decoder missing');
}
function aoBase64Encode(s){
  if(typeof btoa==='function')return btoa(s);
  if(typeof Buffer!=='undefined')return Buffer.from(s,'binary').toString('base64');
  throw new Error('base64 encoder missing');
}
function aoCloseLoad(html){
  var input=String(html||''),file=input.match(/sources\s*:\s*\[\s*\{\s*file\s*:\s*([A-Za-z_$][\w$]*)/i);
  if(!file)return null;
  var name=file[1],blocks=[],m,re=/<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  while((m=re.exec(input))!==null)if(new RegExp('\\bvar\\s+'+name.replace(/[$]/g,'\\$&')+'\\s*=').test(m[1]))blocks.push(m[1]);
  for(var i=0;i<blocks.length;i++){
    try{
      var code='"use strict";var fetch,XMLHttpRequest,WebSocket,document,window,globalThis;'+blocks[i]+';return typeof '+name+'==="string"?'+name+':"";';
      var url=new Function('atob','btoa',code)(aoBase64Decode,aoBase64Encode);
      if(/^https?:\/\//i.test(url)){
        var subtitles=[],track=input.match(/tracks\s*:\s*(\[[\s\S]*?\])\s*,/i);
        if(track)try{
          var list=JSON.parse(track[1]);
          for(var k=0;k<list.length;k++)if(list[k]&&list[k].file&&list[k].kind==='captions'){
            var label=String(list[k].label||'Altyazı'),low=label.toLowerCase(),lang=/turk|türk/i.test(low)?'tr':(/english/i.test(low)?'en':'und');
            subtitles.push({id:'ao_hdfc_sub_'+k,url:list[k].file,file:list[k].file,link:list[k].file,
              lang:lang==='tr'?'tur':(lang==='en'?'eng':'und'),language:lang,label:label,name:label,title:label,
              format:'vtt',type:'text/vtt',mimeType:'text/vtt',headers:{Referer:'https://hdfilmcehennemi.mobi/'}});
          }
        }catch(e){}
        return {url:url,subtitles:subtitles};
      }
    }catch(e){}
  }
  return null;
}
function aoFrames(html,parent){
  var out=[],seen={},m,re=/<iframe\b[^>]*\b(?:src|data-src)=["']([^"']+)["']/gi;
  while((m=re.exec(html||''))!==null){
    var u=aoAbsolute(m[1],parent);
    var host=(u.match(/^https?:\/\/([^/]+)/)||[])[1]||'';
    if(!/(^|\.)hdfilmcehennemi\.(nl|mobi)$|(^|\.)rapidrame\.[a-z]+$/i.test(host))continue;
    if(!seen[u]){out.push(u);seen[u]=true}
  }
  return out.slice(0,3);
}
async function aoProbePlayable(url,headers,hls){
  // Only reject DEFINITE missing/invalid sources. Cross-origin fetch, Range
  // requests and anti-bot checks can fail even if the video player can play.
  var opts={headers:{}};
  for(var k in headers)if(Object.prototype.hasOwnProperty.call(headers,k))opts.headers[k]=headers[k];
  if(typeof AbortSignal!=='undefined'&&AbortSignal.timeout)opts.signal=AbortSignal.timeout(5000);
  try{
    if(hls){
      var result=await fetch(url,opts);
      if(result.status===404||result.status===410)return false;
      if(!result.ok)return true;
      var body=await result.text();
      if(/^\s*<!doctype html|^\s*<html\b/i.test(body))return false;
      return true;
    }
    opts.method='HEAD';
    var head=await fetch(url,opts);
    return head.status!==404&&head.status!==410;
  }catch(e){
    return true;
  }
}
async function aoExtract(epUrl){
  var html=await aoRead(epUrl,undefined,true);
  if(!html){
    if(typeof console!=='undefined'&&console.warn)console.warn('[AO HDFC] EMPTY_EPISODE_HTML');
    return [];
  }
  var candidates=[],subtitles=[],parent=epUrl,frames=aoFrames(html,epUrl);
  for(var i=0;i<frames.length;i++){
    var frameHtml=await aoRead(frames[i],AO_ORIGIN+'/',true);
    if(!frameHtml)continue;
    var close=aoCloseLoad(frameHtml);
    if(close){candidates=[close.url];subtitles=close.subtitles;parent=frames[i];break}
    var other=aoDirect(frameHtml,frames[i]);
    if(other.length){candidates=other;parent=frames[i];break}
  }
  // Try directly exposed sources if all known iframe players lacked media.
  if(!candidates.length){candidates=aoDirect(html,epUrl);parent=epUrl;}
  if(typeof console!=='undefined'&&console.log){
    console.log('[AO HDFC] HTML_PARSE frames='+frames.length+' candidates='+candidates.length);
  }
  var label=/\bDUAL\b|T[üu]rk[çc]e\s*Dublaj/i.test(html)
    ?'Dual/TR (site etiketi)':'Ses dili doğrulanmadı';
  var referer=((parent.match(/^https?:\/\/[^/]+/)||[])[0]||AO_ORIGIN)+'/';
  var requestHeaders={
    Referer:referer,
    'User-Agent':AO_HEADERS['User-Agent'],
    Origin:referer.replace(/\/$/,'')
  };
  // Only return links whose source server currently responds as playable media.
  // A 404 here is a stream error, not a GitHub/manifest install error.
  var streams=[];
  for(var j=0;j<candidates.length&&j<5;j++){
    var url=candidates[j];
    var hls=/\.m3u8(?:[?#]|$)|\/master\.txt(?:[?#]|$)/i.test(url);
    if(!(await aoProbePlayable(url,requestHeaders,hls)))continue;
    streams.push({
      name:'HDFilmCehennemi Diziler [AO]',
      title:(hls?'HLS':'MP4')+' | '+label,
      url:url,quality:'Auto',format:hls?'hls':'mp4',isHls:hls,
      headers:requestHeaders,
      behaviorHints:{headers:requestHeaders,proxyHeaders:{request:requestHeaders}},
      subtitles:subtitles
    });
  }
  return streams;
}
function aoArgs(id,mediaType,season,episode){
  if(id&&typeof id==='object'){
    var obj=id;id=obj.id||obj.tmdbId||obj.imdbId||'';
    mediaType=obj.type||obj.mediaType||mediaType;
    season=obj.season||obj.seasonNum||season;
    episode=obj.episode||obj.episodeNum||episode;
  }
  var raw=String(id||'').trim();
  // The video IDs emitted by getMeta are different from show IDs.
  // Nuvio can call getStreams(video.id) without separate season/episode args.
  var epId=raw.match(/^ao_hdfc_series:ep:([a-z0-9-]+):(\d+):(\d+)$/);
  if(epId){
    id=AO_ID+':show:'+epId[1];
    if(!season)season=epId[2];
    if(!episode)episode=epId[3];
    if(!mediaType)mediaType='tv';
  }else{
    var m=raw.match(/^(60735|tt3107288):(\d+):(\d+)$/);
    if(m){id=m[1];if(!season)season=m[2];if(!episode)episode=m[3];}
  }
  return {slug:aoSlug(id),type:mediaType,season:Number(season),episode:Number(episode)};
}
async function getStreams(id,mediaType,season,episode){
  var a=aoArgs(id,mediaType,season,episode);
  if(typeof console!=='undefined'&&console.log){
    console.log('[AO HDFC] REQUEST', 'id='+String(a.slug||'unsupported'),
      'type='+String(a.type||'unset'),
      'season='+String(a.season),'episode='+String(a.episode));
  }
  if(a.type==='movie'||!a.slug||
    !Number.isInteger(a.season)||!Number.isInteger(a.episode)||
    a.season<1||a.season>50||a.episode<1||a.episode>100){
    if(typeof console!=='undefined'&&console.warn)console.warn('[AO HDFC] UNSUPPORTED_REQUEST');
    return [];
  }
  // Try canonical suffix-free path before probing index pages.
  var direct=aoEpisodeBase(a.slug,a.season,a.episode);
  var streams=await aoExtract(direct);
  if(streams.length)return streams;
  var urls=await aoFindEpisodeUrls(a.slug,a.season,a.episode);
  for(var i=0;i<urls.length;i++){
    if(urls[i]===direct)continue;
    streams=await aoExtract(urls[i]);
    if(streams.length)return streams;
  }
  if(typeof console!=='undefined'&&console.warn){
    console.warn('[AO HDFC] No playable source for',a.slug,'S'+a.season+'E'+a.episode,'after',urls.length+1,'routes');
  }
  return [];
}
function aoMetaBase(slug){
  return {id:AO_ID+':show:'+slug,type:'series',
    name:slug===AO_FLASH?'The Flash':slug.replace(/-izle(?:-\d+)?$/,'').replace(/-/g,' '),
    poster:'https://www.google.com/s2/favicons?domain=hdfilmcehennemi.nl&sz=128',
    description:'HDFilmCehennemi dizi kaydı',genres:['Dizi']};
}
function aoVideos(slug,links){
  var rows=[],seen={};
  function add(season,episode){
    var k=season+':'+episode;if(seen[k])return;seen[k]=true;
    rows.push({id:AO_ID+':ep:'+slug+':'+season+':'+episode,
      title:season+'. Sezon '+episode+'. Bölüm',season:season,episode:episode});
  }
  for(var i=0;i<links.length;i++){
    var ep=aoEpisode(links[i],slug);
    if(ep)add(ep.season,ep.episode);
  }
  // Metadata counts are not a statement about stream availability.
  if(slug===AO_FLASH)for(var s=1;s<=AO_COUNTS.length;s++)
    for(var e=1;e<=AO_COUNTS[s-1];e++)add(s,e);
  return rows.sort(function(a,b){return a.season-b.season||a.episode-b.episode});
}
async function getMeta(arg){
  var slug=aoSlug(typeof arg==='string'?arg:arg&&arg.id);
  if(!slug)return {meta:null};
  var meta=aoMetaBase(slug),home=AO_ORIGIN+'/dizi/'+slug+'/';
  var html=await aoRead(home),h1=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if(h1)meta.name=aoDecode(h1[1].replace(/<[^>]*>/g,'')).trim()||meta.name;
  var poster=html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)/i);
  if(poster)meta.poster=aoDecode(poster[1]);
  meta.videos=aoVideos(slug,aoLinks(html,home));
  return {meta:meta};
}
async function getCatalog(arg){
  if(arg&&arg.type==='movie')return {metas:[]};
  var search=aoFold(arg&&(arg.search||(arg.extra&&arg.extra.search))||'');
  // The site's actual public series listing is /yabancidiziizle-5/.
  // /dizi/ is primarily a URL prefix for individual shows, not a dependable catalog.
  var pages=[AO_ORIGIN+'/yabancidiziizle-5/',AO_ORIGIN+'/'],seen={},metas=[];
  if(search)pages.unshift(AO_ORIGIN+'/?s='+encodeURIComponent(search));
  for(var i=0;i<pages.length;i++){
    var html=await aoRead(pages[i]),urls=aoLinks(html,pages[i]);
    for(var j=0;j<urls.length;j++){
      var m=urls[j].match(/\/dizi\/([a-z0-9-]+)\/?$/i);if(!m||seen[m[1]])continue;
      var item=aoMetaBase(m[1]);
      if(search&&aoFold(item.name).indexOf(search)===-1)continue;
      seen[m[1]]=true;metas.push(item);
      if(metas.length>=60)break;
    }
    if(metas.length>=60)break;
  }
  if(!seen[AO_FLASH]&&(!search||'theflash'.indexOf(search)!==-1)){
    metas.unshift(aoMetaBase(AO_FLASH));
  }
  return {metas:metas.slice(0,60)};
}
if(typeof module!=='undefined')module.exports={getStreams:getStreams,getCatalog:getCatalog,getMeta:getMeta};
if(typeof globalThis!=='undefined'){
  globalThis.getStreams=getStreams;
  globalThis.getCatalog=getCatalog;
  globalThis.getMeta=getMeta;
}
