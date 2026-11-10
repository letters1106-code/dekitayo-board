/* できたよボードを オフラインでも ひらけるようにする しくみ
   ・HTML は「まずネットを見にいく」→ つながらなければ 保存した分を出す（更新がすぐ届く）
   ・絵や設定ファイルは「保存した分を先に出す」（速い）
   file:// や 埋め込みページでは そもそも登録されないので 何も起きない          */
var CACHE = "dekitayo-v1";
var SHELL = [
  "./",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){
    /* 1つ失敗しても 残りは保存する */
    return Promise.all(SHELL.map(function(u){
      return c.add(new Request(u, { cache: "reload" })).catch(function(){});
    }));
  }));
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){ return k === CACHE ? null : caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;
  if(new URL(req.url).origin !== self.location.origin) return;

  var wantsHTML = req.mode === "navigate" ||
                  (req.headers.get("accept") || "").indexOf("text/html") >= 0;

  if(wantsHTML){
    e.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); });
        return res;
      }).catch(function(){
        return caches.match(req).then(function(hit){
          return hit || caches.match("./");
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function(hit){
      if(hit) return hit;
      return fetch(req).then(function(res){
        if(res && res.status === 200 && res.type === "basic"){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
