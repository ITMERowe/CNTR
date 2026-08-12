(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))r(o);new MutationObserver(o=>{for(const a of o)if(a.type==="childList")for(const c of a.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&r(c)}).observe(document,{childList:!0,subtree:!0});function n(o){const a={};return o.integrity&&(a.integrity=o.integrity),o.referrerPolicy&&(a.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?a.credentials="include":o.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function r(o){if(o.ep)return;o.ep=!0;const a=n(o);fetch(o.href,a)}})();/*! Capacitor: https://capacitorjs.com/ - MIT License */var z;(function(e){e.Unimplemented="UNIMPLEMENTED",e.Unavailable="UNAVAILABLE"})(z||(z={}));class Le extends Error{constructor(t,n,r){super(t),this.message=t,this.code=n,this.data=r}}const ft=e=>{var t,n;return e!=null&&e.androidBridge?"android":!((n=(t=e==null?void 0:e.webkit)===null||t===void 0?void 0:t.messageHandlers)===null||n===void 0)&&n.bridge?"ios":"web"},yt=e=>{const t=e.CapacitorCustomPlatform||null,n=e.Capacitor||{},r=n.Plugins=n.Plugins||{},o=()=>t!==null?t.name:ft(e),a=()=>o()!=="web",c=p=>{const v=d.get(p);return!!(v!=null&&v.platforms.has(o())||l(p))},l=p=>{var v;return(v=n.PluginHeaders)===null||v===void 0?void 0:v.find(E=>E.name===p)},i=p=>e.console.error(p),d=new Map,u=(p,v={})=>{const E=d.get(p);if(E)return console.warn(`Capacitor plugin "${p}" already registered. Cannot register plugins twice.`),E.proxy;const f=o(),h=l(p);let x;const _=async()=>(!x&&f in v?x=typeof v[f]=="function"?x=await v[f]():x=v[f]:t!==null&&!x&&"web"in v&&(x=typeof v.web=="function"?x=await v.web():x=v.web),x),Z=(w,R)=>{var q,U;if(h){const Y=h==null?void 0:h.methods.find(F=>R===F.name);if(Y)return Y.rtype==="promise"?F=>n.nativePromise(p,R.toString(),F):(F,de)=>n.nativeCallback(p,R.toString(),F,de);if(w)return(q=w[R])===null||q===void 0?void 0:q.bind(w)}else{if(w)return(U=w[R])===null||U===void 0?void 0:U.bind(w);throw new Le(`"${p}" plugin is not implemented on ${f}`,z.Unimplemented)}},y=w=>{let R;const q=(...U)=>{const Y=_().then(F=>{const de=Z(F,w);if(de){const ue=de(...U);return R=ue==null?void 0:ue.remove,ue}else throw new Le(`"${p}.${w}()" is not implemented on ${f}`,z.Unimplemented)});return w==="addListener"&&(Y.remove=async()=>R()),Y};return q.toString=()=>`${w.toString()}() { [capacitor code] }`,Object.defineProperty(q,"name",{value:w,writable:!1,configurable:!1}),q},S=y("addListener"),D=y("removeListener"),b=(w,R)=>{const q=S({eventName:w},R),U=async()=>{const F=await q;D({eventName:w,callbackId:F},R)},Y=new Promise(F=>q.then(()=>F({remove:U})));return Y.remove=async()=>{console.warn("Using addListener() without 'await' is deprecated."),await U()},Y},P=new Proxy({},{get(w,R){switch(R){case"$$typeof":return;case"toJSON":return()=>({});case"addListener":return h?b:S;case"removeListener":return D;default:return y(R)}}});return r[p]=P,d.set(p,{name:p,proxy:P,platforms:new Set([...Object.keys(v),...h?[f]:[]])}),P};return n.convertFileSrc||(n.convertFileSrc=p=>p),n.getPlatform=o,n.handleError=i,n.isNativePlatform=a,n.isPluginAvailable=c,n.registerPlugin=u,n.Exception=Le,n.DEBUG=!!n.DEBUG,n.isLoggingEnabled=!!n.isLoggingEnabled,n},gt=e=>e.Capacitor=yt(e),ye=gt(typeof globalThis<"u"?globalThis:typeof self<"u"?self:typeof window<"u"?window:typeof global<"u"?global:{}),Ve=ye.registerPlugin;class We{constructor(){this.listeners={},this.retainedEventArguments={},this.windowListeners={}}addListener(t,n){let r=!1;this.listeners[t]||(this.listeners[t]=[],r=!0),this.listeners[t].push(n);const a=this.windowListeners[t];a&&!a.registered&&this.addWindowListener(a),r&&this.sendRetainedArgumentsForEvent(t);const c=async()=>this.removeListener(t,n);return Promise.resolve({remove:c})}async removeAllListeners(){this.listeners={};for(const t in this.windowListeners)this.removeWindowListener(this.windowListeners[t]);this.windowListeners={}}notifyListeners(t,n,r){const o=this.listeners[t];if(!o){if(r){let a=this.retainedEventArguments[t];a||(a=[]),a.push(n),this.retainedEventArguments[t]=a}return}o.forEach(a=>a(n))}hasListeners(t){var n;return!!(!((n=this.listeners[t])===null||n===void 0)&&n.length)}registerWindowListener(t,n){this.windowListeners[n]={registered:!1,windowEventName:t,pluginEventName:n,handler:r=>{this.notifyListeners(n,r)}}}unimplemented(t="not implemented"){return new ye.Exception(t,z.Unimplemented)}unavailable(t="not available"){return new ye.Exception(t,z.Unavailable)}async removeListener(t,n){const r=this.listeners[t];if(!r)return;const o=r.indexOf(n);this.listeners[t].splice(o,1),this.listeners[t].length||this.removeWindowListener(this.windowListeners[t])}addWindowListener(t){window.addEventListener(t.windowEventName,t.handler),t.registered=!0}removeWindowListener(t){t&&(window.removeEventListener(t.windowEventName,t.handler),t.registered=!1)}sendRetainedArgumentsForEvent(t){const n=this.retainedEventArguments[t];n&&(delete this.retainedEventArguments[t],n.forEach(r=>{this.notifyListeners(t,r)}))}}const Oe=e=>encodeURIComponent(e).replace(/%(2[346B]|5E|60|7C)/g,decodeURIComponent).replace(/[()]/g,escape),He=e=>e.replace(/(%[\dA-F]{2})+/gi,decodeURIComponent);class ht extends We{async getCookies(){const t=document.cookie,n={};return t.split(";").forEach(r=>{if(r.length<=0)return;let[o,a]=r.replace(/=/,"CAP_COOKIE").split("CAP_COOKIE");o=He(o).trim(),a=He(a).trim(),n[o]=a}),n}async setCookie(t){try{const n=Oe(t.key),r=Oe(t.value),o=t.expires?`; expires=${t.expires.replace("expires=","")}`:"",a=(t.path||"/").replace("path=",""),c=t.url!=null&&t.url.length>0?`domain=${t.url}`:"";document.cookie=`${n}=${r||""}${o}; path=${a}; ${c};`}catch(n){return Promise.reject(n)}}async deleteCookie(t){try{document.cookie=`${t.key}=; Max-Age=0`}catch(n){return Promise.reject(n)}}async clearCookies(){try{const t=document.cookie.split(";")||[];for(const n of t)document.cookie=n.replace(/^ +/,"").replace(/=.*/,`=;expires=${new Date().toUTCString()};path=/`)}catch(t){return Promise.reject(t)}}async clearAllCookies(){try{await this.clearCookies()}catch(t){return Promise.reject(t)}}}Ve("CapacitorCookies",{web:()=>new ht});const Et=async e=>new Promise((t,n)=>{const r=new FileReader;r.onload=()=>{const o=r.result;t(o.indexOf(",")>=0?o.split(",")[1]:o)},r.onerror=o=>n(o),r.readAsDataURL(e)}),St=(e={})=>{const t=Object.keys(e);return Object.keys(e).map(o=>o.toLocaleLowerCase()).reduce((o,a,c)=>(o[a]=e[t[c]],o),{})},bt=(e,t=!0)=>e?Object.entries(e).reduce((r,o)=>{const[a,c]=o;let l,i;return Array.isArray(c)?(i="",c.forEach(d=>{l=t?encodeURIComponent(d):d,i+=`${a}=${l}&`}),i.slice(0,-1)):(l=t?encodeURIComponent(c):c,i=`${a}=${l}`),`${r}&${i}`},"").substr(1):null,Bt=(e,t={})=>{const n=Object.assign({method:e.method||"GET",headers:e.headers},t),o=St(e.headers)["content-type"]||"";if(typeof e.data=="string")n.body=e.data;else if(o.includes("application/x-www-form-urlencoded")){const a=new URLSearchParams;for(const[c,l]of Object.entries(e.data||{}))a.set(c,l);n.body=a.toString()}else if(o.includes("multipart/form-data")||e.data instanceof FormData){const a=new FormData;if(e.data instanceof FormData)e.data.forEach((l,i)=>{a.append(i,l)});else for(const l of Object.keys(e.data))a.append(l,e.data[l]);n.body=a;const c=new Headers(n.headers);c.delete("content-type"),n.headers=c}else(o.includes("application/json")||typeof e.data=="object")&&(n.body=JSON.stringify(e.data));return n};class Ct extends We{async request(t){const n=Bt(t,t.webFetchExtra),r=bt(t.params,t.shouldEncodeUrlParams),o=r?`${t.url}?${r}`:t.url,a=await fetch(o,n),c=a.headers.get("content-type")||"";let{responseType:l="text"}=a.ok?t:{};c.includes("application/json")&&(l="json");let i,d;switch(l){case"arraybuffer":case"blob":d=await a.blob(),i=await Et(d);break;case"json":i=await a.json();break;case"document":case"text":default:i=await a.text()}const u={};return a.headers.forEach((p,v)=>{u[v]=p}),{data:i,headers:u,status:a.status,url:a.url}}async get(t){return this.request(Object.assign(Object.assign({},t),{method:"GET"}))}async post(t){return this.request(Object.assign(Object.assign({},t),{method:"POST"}))}async put(t){return this.request(Object.assign(Object.assign({},t),{method:"PUT"}))}async patch(t){return this.request(Object.assign(Object.assign({},t),{method:"PATCH"}))}async delete(t){return this.request(Object.assign(Object.assign({},t),{method:"DELETE"}))}}Ve("CapacitorHttp",{web:()=>new Ct});function Lt(e){return e.reduce((t,n)=>(t.revenue+=n.price,t.profit+=n.price-n.cost,n.payment==="Cash"&&(t.cash+=n.price),n.payment==="QRIS"&&(t.qris+=n.price),t),{revenue:0,profit:0,cash:0,qris:0})}function Te(e,t,n){const r=n??e.name,o=t.findIndex(c=>c.name===r);if(o>=0){const c=t[o];c.name=e.name,c.price=e.price,c.cost=e.cost,c.color=e.color;const l=t.findIndex((i,d)=>d!==o&&i.name===e.name);return l>=0&&t.splice(l,1),t}const a=t.findIndex(c=>c.name===e.name);return a>=0&&t.splice(a,1),t.push({...e}),t}function ge(){return typeof crypto<"u"&&typeof crypto.randomUUID=="function"?crypto.randomUUID():"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,e=>{const t=Math.random()*16|0;return(e==="x"?t:t&3|8).toString(16)})}const Je="cntrProducts",Ke="cntrProductHistory",ze="cntrSales",Qe="cntrEventCosts",Xe="cntrSavedReports",Me="cntrImportedEventReport",Ze="cntrSettings",Mt={currency:"IDR"};function X(e,t){const n=localStorage.getItem(e);if(!n)return t;try{return JSON.parse(n)}catch{return t}}function J(e,t){localStorage.setItem(e,JSON.stringify(t))}function kt(){const e=localStorage.getItem(Me);if(!e)return null;try{const t=JSON.parse(e);return!t||typeof t!="object"||!Array.isArray(t.sales)||!Array.isArray(t.products)?null:{sales:t.sales.map(n=>({...n,timestamp:new Date(n.timestamp)})),products:t.products}}catch{return null}}function xt(e){if(e===null){localStorage.removeItem(Me);return}J(Me,e)}function It(){return X(Je,[])}function $t(e){J(Je,e)}function wt(){return X(Ke,[])}function Pt(e){J(Ke,e)}function Rt(){return X(ze,[]).map(t=>({...t,timestamp:new Date(t.timestamp)}))}function At(e){J(ze,e.map(t=>({...t,timestamp:t.timestamp instanceof Date?t.timestamp.toISOString():t.timestamp})))}function Ot(){return X(Qe,[]).map(e=>({id:e.id,name:e.name,amount:e.amount}))}function Ht(e){J(Qe,e)}function Tt(){return X(Xe,[])}function Dt(e){J(Xe,e)}function A(){const e=X(Ze,{});return{currency:["IDR","USD","EUR","SGD","AUD","GBP","JPY","MYR"].includes(e.currency)?e.currency:Mt.currency,compactMoney:!!e.compactMoney}}function et(e){J(Ze,e)}const Pe={IDR:"Rp",USD:"$",EUR:"€",SGD:"S$",AUD:"A$",GBP:"£",JPY:"¥",MYR:"RM"},qt={IDR:"id-ID",USD:"en-US",EUR:"de-DE",SGD:"en-SG",AUD:"en-AU",GBP:"en-GB",JPY:"ja-JP",MYR:"ms-MY"};function Ut(e){const t={IDR:",",USD:".",EUR:",",SGD:".",AUD:".",GBP:".",JPY:".",MYR:"."};return{group:{IDR:".",USD:",",EUR:".",SGD:",",AUD:",",GBP:",",JPY:",",MYR:","}[e]||",",decimal:t[e]||"."}}function ke(e,t){return new Intl.NumberFormat(qt[t]||"en-US",{minimumFractionDigits:0,maximumFractionDigits:2}).format(e)}function xe(e,t=A().currency){const n=(e??"").replace(/\s+/g,"").trim();if(!n)return 0;const o=(Pe[t]||"Rp").replace(/[$€£¥]/g,"\\$&"),a=n.replace(new RegExp(`^${o}`),""),{group:c,decimal:l}=Ut(t),d=a.replace(new RegExp(`\\${c==="."?"\\.":c}`,"g"),"").replace(l,".").replace(/[^0-9.\-]/g,""),u=Number(d);return Number.isFinite(u)?u:0}function te(e,t=A().currency){const n=(e??"").replace(/[^0-9]/g,"");if(!n)return"";const r=Number(n);if(!Number.isFinite(r))return"";const o=ke(r,t);return`${Pe[t]||"Rp"} ${o}`}function Nt(e,t=A().currency,n=A().compactMoney){const r=Pe[t]||"Rp",o=e<0?"-":"",a=Math.abs(e);if(n&&a>=1e3){const c=a>=1e6?1e6:1e3,l=a>=1e6?"M":"K",i=a/c;let d=1;i>=100?d=0:i>=10?d=1:i>=1?d=2:d=3;const u=Number(i.toFixed(d));return`${r} ${o}${ke(u,t)}${l}`}return`${r} ${o}${ke(a,t)}`}const C=e=>{const t=A();return Nt(e,t.currency,t.compactMoney)};function oe(e){const t=parseInt(e.slice(1),16),n=t>>16&255,r=t>>8&255,o=t&255;return n*.299+r*.587+o*.114>160?"#071f1d":"#ffffff"}const Ft=["#F76495","#FF4D4D","#F9B234","#51C43F","#30C7FF","#4F6EFF","#B85DFF"];function re(e){return`#${e.trim().replace(/^#/,"").slice(0,6).toUpperCase()}`}function jt(e){const t=new Set(e.map(n=>re(n.color).toUpperCase()));return Ft.find(n=>!t.has(n.toUpperCase()))||null}function De(e,t){const n=re(t);return e.some(o=>re(o.color).toUpperCase()===n.toUpperCase())&&jt(e)||n}const B=_t(),H=Yt();function tt(){const e=B.reduce((o,a)=>{const c=o.findIndex(l=>l.name===a.name);return c>=0?(o[c]={...a},o):(o.push({...a}),o)},[]),t=H.reduce((o,a)=>{const c=o.findIndex(l=>l.name===a.name);return c>=0?(o[c]={...a},o):(o.push({...a}),o)},[]),n=new Set(e.map(o=>o.name)),r=[...t.filter(o=>n.has(o.name)),...t.filter(o=>!n.has(o.name))];for(const o of e)r.some(a=>a.name===o.name)||r.push({...o});B.splice(0,B.length,...e),H.splice(0,H.length,...r),B.length===0&&H.length&&B.push(...H.map(o=>({...o})))}tt();console.debug("startup: loaded products count=",B.length);const M=Vt(),T=Wt();let m=null,N=Gt(),ae=null;function Gt(){return kt()}function Re(e){xt(e)}function _t(){return It()}function ve(){tt(),$t(B)}function Yt(){return wt()}function qe(e=H){const t=e.reduce((n,r)=>{const o=n.findIndex(a=>a.name===r.name);return o>=0?(n[o]={...r},n):(n.push({...r}),n)},[]);H.splice(0,H.length,...t),Pt(H)}function Vt(){return Rt()}function ie(){At(M)}function Wt(){return Ot()}function be(){Ht(T)}function O(){return Tt()}function he(e){Dt(e)}function ce(e){const t=O(),n=t.filter(r=>r.id!==e);n.length!==t.length&&(he(n),(m==null?void 0:m.id)===e&&(m=null),$("Report deleted"),g())}function Jt(e,t){const n=t.trim();if(!n)return;const r=O(),o=r.find(a=>a.id===e);o&&(o.name=n,he(r),(m==null?void 0:m.id)===e&&(m={...o}),$("Report renamed"),g())}function Kt(){var t;return((t=document.querySelector(".screen.active"))==null?void 0:t.id)==="eventScreen"?N?{sales:N.sales.map(n=>({...n})),products:N.products.map(n=>({...n})),eventCosts:T.map(n=>({...n}))}:{sales:M.map(n=>({...n})),products:B.map(n=>({...n})),eventCosts:T.map(n=>({...n}))}:m&&m.type==="event"?{sales:m.sales.map(n=>({...n})),products:m.products.map(n=>({...n})),eventCosts:m.eventCosts.map(n=>({...n}))}:N?{sales:N.sales.map(n=>({...n})),products:N.products.map(n=>({...n})),eventCosts:T.map(n=>({...n}))}:{sales:M.map(n=>({...n})),products:B.map(n=>({...n})),eventCosts:T.map(n=>({...n}))}}function zt(e,t){const n=O(),r=e.trim()||`${t==="event"?"Event report":"Report"} ${new Date().toLocaleString()}`;if(t==="event"){const o=Kt();m||(N={sales:o.sales,products:o.products},Re(N)),n.push({id:ge(),name:r,createdAt:new Date().toISOString(),type:t,products:o.products,sales:o.sales,eventCosts:o.eventCosts}),he(n),$(`Saved event report: ${r}`),g();return}n.push({id:ge(),name:r,createdAt:new Date().toISOString(),type:t,products:B.map(o=>({...o})),sales:M.map(o=>({...o})),eventCosts:T.map(o=>({...o}))}),he(n),$(`Saved report: ${r}`),g()}function Qt(e,t){T.push({id:ge(),name:e,amount:t}),be(),g()}function Xt(e){const t=T.findIndex(n=>n.id===e);t>=0&&(T.splice(t,1),be(),g())}function Zt(e){const t=T.find(l=>l.id===e);if(!t)return;const n=document.getElementById("expenseModalOverlay"),r=document.getElementById("expenseModalTitle"),o=document.getElementById("eventCostName"),a=document.getElementById("eventCostAmount"),c=document.getElementById("addCostBtn");!n||!r||!o||!a||!c||(Ee=t.id,o.value=t.name,a.value=String(t.amount),r.textContent="Edit Expense",c.textContent="Save changes",n.classList.add("open"),Ie())}let V=-1,Ee=null,j="salesScreen",ne=null,se=null;const s={grid:document.getElementById("grid"),stats:document.getElementById("stats"),headline:document.getElementById("headline"),toast:document.getElementById("toast"),reset:document.getElementById("resetBtn"),optionsBtn:document.getElementById("optionsBtn"),optionsMenu:document.getElementById("optionsMenu"),saveReportOption:document.getElementById("saveReportOption"),saveEventReportOption:document.getElementById("saveEventReportOption"),openProductEdit:document.getElementById("openProductEdit"),closeEditBtn:document.getElementById("closeEditBtn"),removeProductBtn:document.getElementById("removeProductBtn"),editName:document.getElementById("editName"),editPrice:document.getElementById("editPrice"),editCost:document.getElementById("editCost"),editColorHex:document.getElementById("editColorHex"),editColorHexInput:document.getElementById("editColorHexInput"),colorGroup:document.querySelector(".color-input-group"),colorPickerMenu:document.getElementById("colorPickerMenu"),pickerSurface:document.getElementById("pickerSurface"),pickerSurfaceThumb:document.getElementById("pickerSurfaceThumb"),hueSlider:document.getElementById("hueSlider"),hueThumb:document.getElementById("hueThumb"),hueValue:document.getElementById("hueValue"),pickerHexCard:document.getElementById("pickerHexCard"),saveProductBtn:document.getElementById("saveProductBtn"),report:document.getElementById("reportCard"),eventReport:document.getElementById("eventCard"),expenseModalOverlay:document.getElementById("expenseModalOverlay"),expenseModalCloseBtn:document.getElementById("expenseModalCloseBtn"),expenseModalCancelBtn:document.getElementById("expenseModalCancelBtn"),reportPageTitle:document.getElementById("reportPageTitle"),eventPageTitle:document.getElementById("eventPageTitle"),reportBackBtn:document.getElementById("reportBackBtn"),eventBackBtn:document.getElementById("eventBackBtn"),reportDeleteBtn:document.getElementById("reportDeleteBtn"),eventDeleteBtn:document.getElementById("eventDeleteBtn"),historySavedReports:document.getElementById("historySavedReports"),historySavedEventReports:document.getElementById("historySavedEventReports"),historyRecentPurchase:document.getElementById("historyRecentPurchase"),saveModalOverlay:document.getElementById("saveModalOverlay"),saveModalTitle:document.getElementById("saveModalTitle"),saveModalInput:document.getElementById("saveModalInput"),saveModalSaveBtn:document.getElementById("saveModalSaveBtn"),saveModalCancelBtn:document.getElementById("saveModalCancelBtn"),saveModalCloseBtn:document.getElementById("saveModalCloseBtn"),compareModalOverlay:document.getElementById("compareModalOverlay"),compareModalTitle:document.getElementById("compareModalTitle"),compareModalList:document.getElementById("compareModalList"),compareModalConfirmBtn:document.getElementById("compareModalConfirmBtn"),compareModalCancelBtn:document.getElementById("compareModalCancelBtn"),compareModalCloseBtn:document.getElementById("compareModalCloseBtn"),compareSalesBtn:document.getElementById("compareSalesBtn"),compareEventsBtn:document.getElementById("compareEventsBtn"),compareSalesCard:document.getElementById("compareSalesCard"),compareEventCard:document.getElementById("compareEventCard"),compareSalesBackBtn:document.getElementById("compareSalesBackBtn"),compareEventBackBtn:document.getElementById("compareEventBackBtn"),productMenuBtn:document.getElementById("openProductsMenuBtn"),salesReportHistoryBackBtn:document.getElementById("salesReportHistoryBackBtn"),eventReportHistoryBackBtn:document.getElementById("eventReportHistoryBackBtn"),productHistoryBackBtn:document.getElementById("productHistoryBackBtn"),productHistoryAddBtn:document.getElementById("productHistoryAddBtn"),productHistoryList:document.getElementById("productHistoryList"),salesReportHistoryList:document.getElementById("salesReportHistoryList"),eventReportHistoryList:document.getElementById("eventReportHistoryList"),importModalOverlay:document.getElementById("importModalOverlay"),importSavedReportsList:document.getElementById("importSavedReportsList"),importModalCancelBtn:document.getElementById("importModalCancelBtn"),importModalConfirmBtn:document.getElementById("importModalConfirmBtn"),importModalCloseBtn:document.getElementById("importModalCloseBtn"),eventImportBtn:document.getElementById("eventImportBtn")};function en(){const e=m&&m.type==="sales"?m.sales:M,t=m&&m.type==="sales"?m.products:B;m&&m.type;const n=e.reduce((f,h)=>f+h.price,0),r=e.reduce((f,h)=>f+(h.price-h.cost),0),o=e.filter(f=>f.payment==="Cash").length,a=e.filter(f=>f.payment==="QRIS").length,c=e.reduce((f,h)=>h.payment==="Cash"?f+h.price:f,0),l=e.reduce((f,h)=>h.payment==="QRIS"?f+h.price:f,0),i=e.length,d=e.reduce((f,h)=>{const x=h.product;return f[x]||(f[x]={count:0,revenue:0,profit:0}),f[x].count+=1,f[x].revenue+=h.price,f[x].profit+=h.price-h.cost,f},{}),u=t.map(f=>{const h=d[f.name]||{count:0,revenue:0,profit:0};return{name:f.name,count:h.count,revenue:h.revenue,profit:h.profit,color:f.color}}).sort((f,h)=>h.count-f.count||h.revenue-f.revenue),p=u.slice(0,5),v=n?r/n*100:0;p[0];const E=i;return`
    <div class="report-shell">
      <section class="report-hero">
        <div class="report-hero-heading">
          <div>
            <h2 class="report-title">Sales Overview</h2>
            <p class="report-subtitle">${e.length?"A complete snapshot of revenue, profit, payment mix, and best-selling products for the day.":"Every sale you log will appear here with real-time summaries, trends, and insights."}</p>
          </div>
        </div>
        <div class="summary-grid">
          <div class="summary-tile">
            <span class="label">Revenue</span>
            <span class="value">${C(n)}</span>
            <span class="hint">${e.length} total sales</span>
          </div>
          <div class="summary-tile">
            <span class="label">Profit</span>
            <span class="value">${C(r)}</span>
            <span class="hint">${v.toFixed(1)}% margin</span>
          </div>
          <div class="summary-tile">
            <span class="label">Cash</span>
            <span class="value">${o}</span>
            <span class="hint">${C(c)} by cash</span>
          </div>
          <div class="summary-tile">
            <span class="label">QRIS</span>
            <span class="value">${a}</span>
            <span class="hint">${C(l)} by qris</span>
          </div>
        </div>
      </section>

      <section class="report-section product-grid-section">
        <div class="section-head">
          <h2 class="report-title">Product distribution</h2>
        </div>
        ${u.length?`<div class="product-columns">${u.map(f=>{const h=E?f.count/E*100:0,x=f.color||"var(--accent)";return`
            <div class="product-row">
              <div class="performance-item">
                <div class="performance-top">
                  <strong>${f.name}</strong>
                </div>
                <div class="performance-details">
                  <span class="profit">${C(f.profit)} Profit</span>
                </div>
              </div>
              <div class="distribution-item">
                <div class="distribution-line">
                  <span class="distribution-sales">${f.count} sales</span>
                  <span class="distribution-value">${h.toFixed(0)}%</span>
                </div>
                <div class="distribution-track">
                  <div class="distribution-fill" style="width:${h>0?Math.max(6,h):0}%;background:${x}"></div>
                </div>
              </div>
            </div>`}).join("")}</div>`:'<div class="empty-state">No distribution data yet.</div>'}
      </section>

    </div>`}function nt(){const e=m&&m.type==="event"?m:null,t=e?null:N,n=!!(e||t),r=e?e.eventCosts:T,o=e?e.sales:t?t.sales:[],a=e?e.products:t?t.products:[],c=r.reduce((y,S)=>y+S.amount,0),l=o.reduce((y,S)=>y+S.price,0),i=o.reduce((y,S)=>y+(S.price-S.cost),0),d=l-c,u=r.length,p=o.length,v=l?i/l*100:0,E=d<0?"Deficit":"Net profit",f=d<0?"value deficit":"value profit",h=o.reduce((y,S)=>{const D=S.product;return y[D]||(y[D]={count:0,revenue:0,profit:0}),y[D].count+=1,y[D].revenue+=S.price,y[D].profit+=S.price-S.cost,y},{}),_=a.map(y=>{const S=h[y.name]||{count:0,revenue:0,profit:0};return{name:y.name,count:S.count,revenue:S.revenue,profit:S.profit,color:y.color}}).filter(y=>y.count>0).sort((y,S)=>S.profit-y.profit||S.revenue-y.revenue||S.count-y.count).slice(0,5),Z=_.reduce((y,S)=>y+Math.abs(S.profit),0)||1;return`
    <div class="report-shell">
      <section class="report-hero">
        <div class="report-hero-heading">
          <div>
            <h2 class="report-title">Event Report</h2>
            <p class="report-subtitle">${n?"Track booth cost and revenue with profit and distribution metrics.":"Import a saved sales report to view event revenue and profit."}</p>
          </div>
        </div>
        ${n?`
        <div class="summary-grid">
          <div class="summary-tile">
            <span class="label">Revenue</span>
            <span class="value">${C(l)}</span>
            <span class="hint">${p} sales</span>
          </div>
          <div class="summary-tile">
            <span class="label">Profit</span>
            <span class="value">${C(i)}</span>
            <span class="hint">Margin ${v.toFixed(0)}%</span>
          </div>
          <div class="summary-tile">
            <span class="label">Event cost</span>
            <span class="value">${C(c)}</span>
            <span class="hint">${u} items</span>
          </div>
          <div class="summary-tile">
            <span class="label">${E}</span>
            <span class="${f}">${C(d)}</span>
            <span class="hint">Revenue − costs</span>
          </div>
        </div>
        `:""}
      </section>

      <section class="report-section">
        <div class="section-head">
          <h2 class="report-title">Expense</h2>
          <button class="control-btn add-expense-btn" id="openAddExpenseBtn" type="button" aria-expanded="false" title="Add Expense"><span class="material-symbols-outlined control-icon">add</span></button>
        </div>
        <!-- Expense input moved to a modal overlay: #expenseModalOverlay -->
        ${u?`<div class="cost-list">${r.map(y=>`
          <div class="cost-item">
            <div>
              <strong>${y.name}</strong>
            </div>
            <div class="cost-actions">
              <span class="cost-amount">${C(y.amount)}</span>
              <button class="history-item-delete edit-cost" data-id="${y.id}" title="Edit cost"><span class="material-symbols-outlined">edit</span></button>
              <button class="history-item-delete delete-cost" data-id="${y.id}" title="Remove cost"><span class="material-symbols-outlined">delete</span></button>
            </div>
          </div>`).join("")}</div>`:'<div class="empty-state">No event costs yet. Add booth cost, transportation, or staffing expenses.</div>'}
      </section>

      <section class="report-section">
        <div class="section-head">
          <h2 class="report-title">Sales</h2>
          <button class="control-btn add-expense-btn" id="eventImportBtn" type="button" title="Import"><span class="material-symbols-outlined control-icon">upload</span></button>
        </div>
        ${_.length?`<div class="event-product-columns">${_.map(y=>{const S=Math.abs(y.profit)/Z*100,D=Math.max(8,S);return`
            <div class="product-row event-product-row">
              <div class="performance-item">
                <div class="performance-top">
                  <strong>${y.name}</strong>
                </div>
                <div class="performance-details">
                  <span class="distribution-sales">${y.count} sales · ${C(y.revenue)} revenue</span>
                </div>
              </div>
              <div class="distribution-item">
                <div class="distribution-line">
                  <span class="profit">${C(y.profit)} Profit</span>
                  <span class="distribution-value">${S.toFixed(0)}%</span>
                </div>
                <div class="distribution-track">
                  <div class="distribution-fill" style="width:${D}%;background:${y.color||"var(--highlight)"}"></div>
                </div>
              </div>
            </div>`}).join("")}</div>`:'<div class="empty-state">No product sales yet for event revenue.</div>'}
      </section>
    </div>`}function Ie(){const e=document.getElementById("addCostBtn"),t=document.getElementById("eventCostName"),n=document.getElementById("eventCostAmount");if(!e||!t||!n)return;const r=t.value.trim(),o=Number(n.value);e.disabled=!r||Number.isNaN(o)||o<=0}function ee(){const e=document.getElementById("expenseModalOverlay"),t=document.getElementById("expenseModalTitle"),n=document.getElementById("eventCostName"),r=document.getElementById("eventCostAmount"),o=document.getElementById("addCostBtn");Ee=null,e&&e.classList.remove("open"),t&&(t.textContent="Add Expense"),n&&(n.value=""),r&&(r.value=""),o&&(o.textContent="Add Expense",o.disabled=!0)}function st(){const e=document.getElementById("addCostBtn"),t=document.getElementById("eventCostName"),n=document.getElementById("eventCostAmount"),r=document.getElementById("openAddExpenseBtn"),o=document.getElementById("expensePopover"),a=()=>{Ie()};r&&o&&(r.onclick=u=>{u.stopPropagation();const p=o.classList.toggle("open");o.hidden=!p,r.setAttribute("aria-expanded",String(p)),a()}),t&&t.addEventListener("input",a),n&&n.addEventListener("input",()=>{const u=te(n.value,A().currency);n.value=u,a()}),e&&t&&n&&(a(),e.onclick=()=>{const u=t.value.trim(),p=xe(n.value,A().currency);if(!(!u||Number.isNaN(p)||p<=0)){if(Ee){const v=T.find(E=>E.id===Ee);v&&(v.name=u,v.amount=p,be())}else Qt(u,p);ee(),r&&r.setAttribute("aria-expanded","false"),s.eventReport&&(s.eventReport.innerHTML=nt(),st())}});const c=document.getElementById("eventImportBtn");c&&c.addEventListener("click",u=>{u.stopPropagation(),vn()});const l=document.getElementById("expenseModalOverlay"),i=document.getElementById("expenseModalCloseBtn"),d=document.getElementById("expenseModalCancelBtn");r&&l&&r.addEventListener("click",u=>{u.stopPropagation(),ee(),l.classList.add("open"),Ie()}),i&&i.addEventListener("click",()=>{ee()}),d&&d.addEventListener("click",()=>{ee()}),l&&l.addEventListener("click",u=>{u.target===l&&ee()}),document.querySelectorAll(".edit-cost").forEach(u=>{u.addEventListener("click",p=>{const E=p.currentTarget.getAttribute("data-id");E&&Zt(E)})}),document.querySelectorAll(".delete-cost").forEach(u=>{u.addEventListener("click",p=>{const E=p.currentTarget.getAttribute("data-id");E&&Xt(E)})})}function ot(){const e=document.getElementById("grid");if(!e){console.warn("makeTiles: grid element not found");return}e.innerHTML="",B.forEach(t=>{const n=document.createElement("div");n.className="tile",n.style.setProperty("--tile",t.color),n.dataset.product=t.name,n.innerHTML=`
        <div class="tile-head">
          <div class="product-meta">
            <div class="product-name">${t.name}</div>
            <div class="product-price">${C(t.price)}</div>
          </div>
          <button class="settings-btn" aria-label="Edit ${t.name}"><span class="material-symbols-outlined">edit</span></button>
        </div>
        <div class="tile-bottom">
          <div class="payment-quarter">
            <span class="payment-label">Cash</span>
            <div class="payment-controls">
              <button class="control-btn" data-payment="Cash" data-action="minus"><span class="material-symbols-outlined control-icon">remove</span></button>
              <div class="payment-value-wrap"><span class="payment-value" data-counter-for="Cash">0</span></div>
              <button class="control-btn" data-payment="Cash" data-action="plus"><span class="material-symbols-outlined control-icon">add</span></button>
            </div>
          </div>
          <div class="payment-quarter">
            <span class="payment-label">QRIS</span>
            <div class="payment-controls">
              <button class="control-btn" data-payment="QRIS" data-action="minus"><span class="material-symbols-outlined control-icon">remove</span></button>
              <div class="payment-value-wrap"><span class="payment-value" data-counter-for="QRIS">0</span></div>
              <button class="control-btn" data-payment="QRIS" data-action="plus"><span class="material-symbols-outlined control-icon">add</span></button>
            </div>
          </div>
        </div>`,n.querySelectorAll(".control-btn").forEach(o=>{o.addEventListener("click",a=>{const c=a.currentTarget,l=c.getAttribute("data-payment")||"Cash",i=c.getAttribute("data-action"),d=n.getBoundingClientRect(),u=c.getBoundingClientRect();n.style.setProperty("--x",`${u.left-d.left+u.width/2}px`),n.style.setProperty("--y",`${u.top-d.top+u.height/2}px`),n.classList.add("ripple"),setTimeout(()=>n.classList.remove("ripple"),160),i==="plus"?tn(t,l):nn(t.name,l)})}),n.querySelector(".settings-btn").addEventListener("click",()=>{Ce(B.findIndex(o=>o.name===t.name))}),e.appendChild(n)})}function tn(e,t){M.push({product:e.name,price:e.price,cost:e.cost,payment:t,timestamp:new Date}),ie(),ne=e.name,se=t,g(!0),$(`${e.name} • ${t}`)}function nn(e,t){for(let n=M.length-1;n>=0;n--)if(M[n].product===e&&M[n].payment===t){M.splice(n,1),ie(),ne=e,se=t,g(!0),$(`${e} removed`);return}$("Nothing to remove")}function sn(){const e=O().filter(c=>c.type==="sales"),t=O().filter(c=>c.type==="event"),n=M.slice(-5).reverse(),r=c=>c.length?c.map(l=>`
          <div class="history-item" data-id="${l.id}" data-type="${l.type}" tabindex="0" role="button">
            <div>
              <strong>${l.name}</strong>
              <div class="history-meta">${new Date(l.createdAt).toLocaleString()}</div>
            </div>
            <div class="history-item-actions">
              <button class="icon-btn history-item-delete" type="button" title="Delete report" data-delete-id="${l.id}">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>
        `).join(""):'<div class="empty-state">No saved reports yet.</div>',o=c=>{c&&c.querySelectorAll(".history-item").forEach(l=>{const i=l.querySelector(".history-item-delete");i&&i.addEventListener("click",d=>{d.stopPropagation();const u=i.getAttribute("data-delete-id");u&&ce(u)}),l.addEventListener("click",()=>{const d=l.getAttribute("data-id");if(!d)return;const u=O().find(E=>E.id===d);if(!u)return;m=u;const p=u.type==="event"?"eventScreen":"reportsScreen",v=document.querySelector(`.nav button[data-tab="${p}"]`);v&&(document.querySelectorAll(".nav button").forEach(E=>E.classList.remove("active")),v.classList.add("active"),k(p),s.stats&&(s.stats.style.display="none"),L(p)),g()}),l.addEventListener("keydown",d=>{const u=d;(u.key==="Enter"||u.key===" ")&&(u.preventDefault(),l.click())})})},a=c=>c.length?c.map(l=>`
          <div class="history-item">
            <div>
              <strong>${l.product}</strong>
              <div class="history-meta">${l.payment} · ${C(l.price)}</div>
            </div>
            <span class="history-badge">${new Date(l.timestamp).toLocaleTimeString()}</span>
          </div>
        `).join(""):'<div class="empty-state">No recent purchases yet.</div>';s.historySavedReports&&(s.historySavedReports.innerHTML=r(e)),s.historySavedEventReports&&(s.historySavedEventReports.innerHTML=r(t)),s.historyRecentPurchase&&(s.historyRecentPurchase.innerHTML=a(n)),o(s.historySavedReports),o(s.historySavedEventReports)}function on(){if(!s.productHistoryList)return;const e=H.length?H.map(t=>{const n=B.some(r=>r.name===t.name);return B.findIndex(r=>r.name===t.name),`
            <div class="product-history-item" style="--product-color: ${t.color};">
              <div class="product-row product-row-compact">
                <div class="product-history-main">
                  <strong>${t.name}</strong>
                  <span class="history-meta">Price ${C(t.price)} · Cost ${C(t.cost)}</span>
                </div>
                <div class="product-history-actions">
                  <button class="product-edit-btn" type="button" data-name="${t.name}" title="Edit ${t.name}">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button class="save-btn product-restore-btn" type="button" data-name="${t.name}" ${n?"disabled":""}>
                    ${n?"Active":"Add back"}
                  </button>
                </div>
              </div>
            </div>
          `}).join(""):'<div class="empty-state">No products have been created yet.</div>';s.productHistoryList.innerHTML=e,s.productHistoryList.querySelectorAll(".product-edit-btn").forEach(t=>{t.addEventListener("click",()=>{const n=t.getAttribute("data-name");if(!n)return;const r=B.findIndex(o=>o.name===n);if(r<0){$(`${n} is not active yet`);return}Ce(r)})}),s.productHistoryList.querySelectorAll(".product-restore-btn").forEach(t=>{t.addEventListener("click",()=>{const n=t.getAttribute("data-name");if(!n)return;const r=H.find(o=>o.name===n);if(r){if(B.some(o=>o.name===n)){$(`${n} is already active`);return}B.push({...r}),ve(),$e(),$(`${n} added back to counter`),g(!0)}})})}function rn(){if(!s.salesReportHistoryList)return;const e=O().filter(n=>n.type==="sales"),t=e.length?e.map(n=>`
            <div class="sales-report-history-item" data-id="${n.id}" tabindex="0" role="button">
              <div class="product-row product-row-compact">
                <div class="product-history-main">
                  <strong>${n.name}</strong>
                  <span class="history-meta">${new Date(n.createdAt).toLocaleString()}</span>
                </div>
                <div class="product-history-actions">
                  <button class="icon-btn sales-report-edit-btn" type="button" data-edit-id="${n.id}" title="Rename report">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button class="icon-btn history-item-delete" type="button" data-delete-id="${n.id}" title="Delete report">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            </div>
          `).join(""):'<div class="empty-state">No saved sales reports yet.</div>';s.salesReportHistoryList.innerHTML=t,s.salesReportHistoryList.querySelectorAll(".sales-report-history-item").forEach(n=>{const r=n.getAttribute("data-id");if(!r)return;const o=n.querySelector(".sales-report-edit-btn");o&&o.addEventListener("click",c=>{c.stopPropagation();const l=O().find(i=>i.id===r);l&&(ae=r,s.saveModalTitle.textContent="Rename report",s.saveModalInput.value=l.name,s.saveModalInput.placeholder="New report name",s.saveModalSaveBtn.textContent="Rename",s.saveModalSaveBtn.disabled=l.name.trim().length===0,s.saveModalOverlay.classList.add("open"),s.saveModalInput.focus())});const a=n.querySelector(".history-item-delete");a&&a.addEventListener("click",c=>{c.stopPropagation(),ce(r)}),n.addEventListener("click",()=>{const c=O().find(l=>l.id===r);c&&(m=c,k("reportsScreen"),L("reportsScreen"),g())}),n.addEventListener("keydown",c=>{(c.key==="Enter"||c.key===" ")&&(c.preventDefault(),n.click())})})}function an(){if(!s.eventReportHistoryList)return;const e=O().filter(n=>n.type==="event"),t=e.length?e.map(n=>`
            <div class="sales-report-history-item" data-id="${n.id}" tabindex="0" role="button">
              <div class="product-row product-row-compact">
                <div class="product-history-main">
                  <strong>${n.name}</strong>
                  <span class="history-meta">${new Date(n.createdAt).toLocaleString()}</span>
                </div>
                <div class="product-history-actions">
                  <button class="icon-btn sales-report-edit-btn" type="button" data-edit-id="${n.id}" title="Rename report">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button class="icon-btn history-item-delete" type="button" data-delete-id="${n.id}" title="Delete report">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            </div>
          `).join(""):'<div class="empty-state">No saved event reports yet.</div>';s.eventReportHistoryList.innerHTML=t,s.eventReportHistoryList.querySelectorAll(".sales-report-history-item").forEach(n=>{const r=n.getAttribute("data-id");if(!r)return;const o=n.querySelector(".sales-report-edit-btn");o&&o.addEventListener("click",c=>{c.stopPropagation();const l=O().find(i=>i.id===r);l&&(ae=r,s.saveModalTitle.textContent="Rename report",s.saveModalInput.value=l.name,s.saveModalInput.placeholder="New report name",s.saveModalSaveBtn.textContent="Rename",s.saveModalSaveBtn.disabled=l.name.trim().length===0,s.saveModalOverlay.classList.add("open"),s.saveModalInput.focus())});const a=n.querySelector(".history-item-delete");a&&a.addEventListener("click",c=>{c.stopPropagation(),ce(r)}),n.addEventListener("click",()=>{const c=O().find(l=>l.id===r);c&&(m=c,k("eventScreen"),L("eventScreen"),g())}),n.addEventListener("keydown",c=>{(c.key==="Enter"||c.key===" ")&&(c.preventDefault(),n.click())})})}function W(e){const t=e.sales.reduce((l,i)=>l+i.price,0),n=e.sales.reduce((l,i)=>l+(i.price-i.cost),0),r=t?n/t*100:0,o=e.sales.length,a=e.products.map(l=>{const i=e.sales.filter(p=>p.product===l.name),d=i.reduce((p,v)=>p+v.price,0),u=i.reduce((p,v)=>p+(v.price-v.cost),0);return{name:l.name,count:i.length,revenue:d,profit:u}}).filter(l=>l.count>0).sort((l,i)=>i.revenue-l.revenue||i.count-l.count),c=a[0]||null;return{revenue:t,profit:n,margin:r,salesCount:o,breakdown:a,topProduct:c}}function Ue(e,t,n,r=[]){const o=W(e),a=n?W(n):null,{revenue:c,profit:l,margin:i,salesCount:d}=o,u=a?c>a.revenue:!1,p=a?l>a.profit:!1,v=a?i>a.margin:!1,E=a?d>a.salesCount:!1;return`
    <div class="compare-card">
      <div class="compare-card-header">
        
        <h3>${e.name}</h3>
      </div>
      <div class="compare-metric ${u?"compare-metric-winner":""}"><span>Revenue</span><span>${C(c)}</span></div>
      <div class="compare-metric ${p?"compare-metric-winner":""}"><span>Profit</span><span>${C(l)}</span></div>
      <div class="compare-metric ${v?"compare-metric-winner":""}"><span>Margin</span><span>${i.toFixed(1)}%</span></div>
      <div class="compare-metric ${E?"compare-metric-winner":""}"><span>Sales</span><span>${d}</span></div>
      ${r.length?`
        <div class="compare-product-list compare-product-list-inline">
          <div class="compare-product-section-title">Products Sold</div>
          ${r.map(f=>`
                <div class="compare-product-row">
                  <div class="compare-product-name">
                    <strong>${f.name}</strong>
                  </div>
                  <div class="compare-product-side ${f.winner?"winner":""}">
                    <span class="report-side-value">${f.value}</span>
                  </div>
                </div>
              `).join("")}
        </div>
      `:""}
    </div>
  `}function Ne(e,t,n,r=[]){const o=n?W(n):null,a=e.sales.reduce((b,P)=>b+P.price,0),c=e.sales.reduce((b,P)=>b+(P.price-P.cost),0),l=e.eventCosts.reduce((b,P)=>b+P.amount,0),i=a-l,d=o?o.revenue:0,u=o?o.profit:0,p=n?n.eventCosts.reduce((b,P)=>b+P.amount,0):0,v=d-p,E=n?l<p:!1,f=n?a>d:!1,h=n?c>u:!1,x=n?i>v:!1,_=i<0,Z=_?"Deficit":"Net profit",y=_?"compare-metric-negative":"",D=Array.from(new Set([...e.eventCosts.map(b=>b.name),...n?n.eventCosts.map(b=>b.name):[]])).map(b=>{var R,q;const P=((R=e.eventCosts.find(U=>U.name===b))==null?void 0:R.amount)??0,w=n?((q=n.eventCosts.find(U=>U.name===b))==null?void 0:q.amount)??0:0;return{name:b,value:P,winner:n?P<w:!1}}).sort((b,P)=>P.value-b.value);return`
    <div class="compare-card">
      <div class="compare-card-header">
        
        <h3>${e.name}</h3>
      </div>
      <div class="compare-metric ${E?"compare-metric-winner":""}"><span>Event cost</span><span>${C(l)}</span></div>
      <div class="compare-metric ${f?"compare-metric-winner":""}"><span>Revenue</span><span>${C(a)}</span></div>
      <div class="compare-metric ${h?"compare-metric-winner":""}"><span>Profit</span><span>${C(c)}</span></div>
      <div class="compare-metric ${x?"compare-metric-winner":""}"><span>${Z}</span><span class="${y}">${C(i)}</span></div>
      ${D.length?`
        <div class="compare-expense-list compare-product-list-inline">
          <div class="compare-product-section-title">Expenses</div>
          ${D.map(b=>`
                <div class="compare-expense-row ${b.winner?"compare-expense-winner":""}">
                  <span class="compare-expense-name">${b.name}</span>
                  <span class="compare-expense-value">${C(b.value)}</span>
                </div>
              `).join("")}
        </div>
      `:""}
      ${r.length?`
        <div class="compare-product-list compare-product-list-inline">
          <div class="compare-product-section-title">Products Sold</div>
          ${r.map(b=>`
                <div class="compare-product-row">
                  <div class="compare-product-name">
                    <strong>${b.name}</strong>
                  </div>
                  <div class="compare-product-side ${b.winner?"winner":""}">
                    <span class="report-side-value">${b.value}</span>
                  </div>
                </div>
              `).join("")}
        </div>
      `:""}
    </div>
  `}function cn(){if(!s.compareSalesCard)return;const e=G.length?G:(()=>{try{return JSON.parse(s.compareSalesCard.dataset.compareIds||"[]")}catch{return[]}})(),t=O().filter(i=>i.type==="sales"&&e.includes(i.id));if(t.length<2){s.compareSalesCard.innerHTML='<div class="empty-state">Select two saved sales reports to compare.</div>';return}s.compareSalesCard.dataset.compareIds=JSON.stringify(e);const[n,r]=t,o=W(n),a=W(r),l=Array.from(new Set([...o.breakdown.map(i=>i.name),...a.breakdown.map(i=>i.name)])).map(i=>{const d=o.breakdown.find(E=>E.name===i),u=a.breakdown.find(E=>E.name===i),p=(d==null?void 0:d.count)??0,v=(u==null?void 0:u.count)??0;return{name:i,leftCount:p,rightCount:v,winner:p===v?"equal":p>v?"left":"right"}}).sort((i,d)=>d.leftCount+d.rightCount-(i.leftCount+i.rightCount)).slice(0,6);s.compareSalesCard.innerHTML=`
    <div class="compare-sales-page">
      <div class="compare-report-columns">
        <div class="compare-report-column">
          <div class="compare-report-header">Report A</div>
          ${Ue(n,"",r,l.map(i=>({name:i.name,value:i.leftCount,winner:i.winner==="left"})))}
        </div>
        <div class="compare-report-column">
          <div class="compare-report-header">Report B</div>
          ${Ue(r,"",n,l.map(i=>({name:i.name,value:i.rightCount,winner:i.winner==="right"})))}
        </div>
      </div>
    </div>
  `}function ln(){if(!s.compareEventCard)return;const e=G.length?G:(()=>{try{return JSON.parse(s.compareEventCard.dataset.compareIds||"[]")}catch{return[]}})(),t=O().filter(i=>i.type==="event"&&e.includes(i.id));if(t.length<2){s.compareEventCard.innerHTML='<div class="empty-state">Select two saved event reports to compare.</div>';return}s.compareEventCard.dataset.compareIds=JSON.stringify(e);const[n,r]=t,o=W(n),a=W(r),l=Array.from(new Set([...o.breakdown.map(i=>i.name),...a.breakdown.map(i=>i.name)])).map(i=>{const d=o.breakdown.find(E=>E.name===i),u=a.breakdown.find(E=>E.name===i),p=(d==null?void 0:d.count)??0,v=(u==null?void 0:u.count)??0;return{name:i,leftCount:p,rightCount:v,winner:p===v?"equal":p>v?"left":"right"}}).sort((i,d)=>d.leftCount+d.rightCount-(i.leftCount+i.rightCount)).slice(0,6);s.compareEventCard.innerHTML=`
    <div class="compare-sales-page">
      <div class="compare-report-columns">
        <div class="compare-report-column">
          <div class="compare-report-header">Report A</div>
          ${Ne(n,"",r,l.map(i=>({name:i.name,value:i.leftCount,winner:i.winner==="left"})))}
        </div>
        <div class="compare-report-column">
          <div class="compare-report-header">Report B</div>
          ${Ne(r,"",n,l.map(i=>({name:i.name,value:i.rightCount,winner:i.winner==="right"})))}
        </div>
      </div>
    </div>
  `}let G=[],K=[],fe="sales";function dn(e){if(!s.compareModalList)return;const t=O().filter(n=>n.type===e);if(!t.length){s.compareModalList.innerHTML='<div class="empty-state">No saved reports yet.</div>';return}s.compareModalList.innerHTML=t.map(n=>`
      <label class="import-item">
        <input type="checkbox" value="${n.id}" ${K.includes(n.id)?"checked":""} />
        <div>
          <strong>${n.name}</strong>
          <small>${new Date(n.createdAt).toLocaleString()}</small>
        </div>
      </label>
    `).join("")}function rt(e){fe=e,K=[...G],[...G];const t=e==="sales"?"Compare sales":"Compare events";s.compareModalTitle&&(s.compareModalTitle.textContent=t),dn(e),s.compareModalOverlay&&s.compareModalOverlay.classList.add("open")}function Be(e=!1){s.compareModalOverlay&&s.compareModalOverlay.classList.remove("open"),e&&(K=[])}function un(){const e=Array.from(s.compareModalList.querySelectorAll('input[type="checkbox"]')).filter(t=>t.checked).map(t=>t.value);if(e.length!==2){$("Select exactly 2 reports");return}K=e,G=[...e],[...e],fe==="sales"&&s.compareSalesCard&&(s.compareSalesCard.dataset.compareIds=JSON.stringify(e)),fe==="event"&&s.compareEventCard&&(s.compareEventCard.dataset.compareIds=JSON.stringify(e)),Be(!1),fe==="sales"?(cn(),k("compareSalesScreen"),L("compareSalesScreen")):(ln(),k("compareEventScreen"),L("compareEventScreen")),g()}function g(e=!1){const t=Lt(M),n=[["Revenue",t.revenue],["Profit",t.profit]];if(s.headline.textContent=`${C(t.revenue)} × ${M.length}`,s.stats.innerHTML=n.map(r=>`<div class="stat ${e?"bump":""}"><span class="label">${r[0]}</span><span class="value">${C(r[1])}</span></div>`).join(""),setTimeout(()=>document.querySelectorAll(".stat").forEach(r=>r.classList.remove("bump")),220),document.querySelectorAll(".tile").forEach(r=>{const o=r.getAttribute("data-product")||"",a=M.filter(d=>d.product===o&&d.payment==="Cash").length,c=M.filter(d=>d.product===o&&d.payment==="QRIS").length,l=r.querySelector('.payment-value[data-counter-for="Cash"]');r.querySelector(".payment-value-wrap");const i=r.querySelector('.payment-value[data-counter-for="QRIS"]');r.querySelectorAll(".payment-value-wrap")[1],l&&(l.textContent=`${a}`),i&&(i.textContent=`${c}`)}),e&&ne&&se){const r=ne,o=se;requestAnimationFrame(()=>{document.querySelectorAll(".tile").forEach(a=>{if((a.getAttribute("data-product")||"")===r){const l=a.querySelectorAll(".payment-quarter"),i=o==="Cash"?l[0]:l[1];i&&(i.classList.remove("bump"),i.offsetWidth,i.classList.add("bump"))}})}),window.setTimeout(()=>document.querySelectorAll(".payment-quarter.bump").forEach(a=>a.classList.remove("bump")),260),ne=null,se=null}s.report.innerHTML=en(),s.eventReport&&(s.eventReport.innerHTML=nt(),st()),sn(),on(),rn(),an(),fn()}function pn(){return s.importSavedReportsList?Array.from(s.importSavedReportsList.querySelectorAll('input[type="checkbox"]')).some(t=>t.checked):!1}function at(){s.importModalConfirmBtn&&(s.importModalConfirmBtn.disabled=!pn())}function mn(){const e=O().filter(n=>n.type==="sales"),t=e.length?e.map(n=>`
              <label class="import-item">
                <input type="checkbox" value="${n.id}" />
                <div>
                  <strong>${n.name}</strong>
                  <small>${new Date(n.createdAt).toLocaleString()}</small>
                </div>
              </label>
            `).join(""):'<div class="empty-state">No saved sales reports to import.</div>';s.importSavedReportsList&&(s.importSavedReportsList.innerHTML=`
      <label class="import-item">
        <input type="checkbox" id="importCurrentLiveReport" value="current-live" />
        <div>
          <strong>Current live report</strong>
          <small>Import active costs from the current session.</small>
        </div>
      </label>
      ${t}
    `),at()}function vn(){mn(),s.importModalOverlay&&s.importModalOverlay.classList.add("open")}function le(){s.importModalOverlay&&s.importModalOverlay.classList.remove("open")}function fn(){const e=!!(m&&m.type==="sales"),t=!!(m&&m.type==="event");s.reportPageTitle&&(s.reportPageTitle.textContent=e?m.name:"Reports"),s.eventPageTitle&&(s.eventPageTitle.textContent=t?m.name:"Event Report"),s.reportBackBtn&&(s.reportBackBtn.style.display=e?"inline-grid":"none"),s.eventBackBtn&&(s.eventBackBtn.style.display=t?"inline-grid":"none"),s.reportDeleteBtn&&(s.reportDeleteBtn.style.display=e?"inline-grid":"none"),s.eventDeleteBtn&&(s.eventDeleteBtn.style.display=t?"inline-grid":"none")}s.reportBackBtn&&s.reportBackBtn.addEventListener("click",()=>{m=null,document.querySelectorAll(".nav button").forEach(t=>t.classList.remove("active"));const e=document.querySelector('.nav button[data-tab="historyScreen"]');e&&e.classList.add("active"),k("historyScreen"),s.stats&&(s.stats.style.display="none"),L("historyScreen"),g()});s.eventBackBtn&&s.eventBackBtn.addEventListener("click",()=>{m=null,document.querySelectorAll(".nav button").forEach(t=>t.classList.remove("active"));const e=document.querySelector('.nav button[data-tab="historyScreen"]');e&&e.classList.add("active"),k("historyScreen"),s.stats&&(s.stats.style.display="none"),L("historyScreen"),g()});s.reportDeleteBtn&&s.reportDeleteBtn.addEventListener("click",()=>{if(!m||m.type!=="sales")return;ce(m.id),m=null,document.querySelectorAll(".nav button").forEach(t=>t.classList.remove("active"));const e=document.querySelector('.nav button[data-tab="historyScreen"]');e&&e.classList.add("active"),k("historyScreen"),s.stats&&(s.stats.style.display="none"),L("historyScreen"),g()});s.eventDeleteBtn&&s.eventDeleteBtn.addEventListener("click",()=>{if(!m||m.type!=="event")return;ce(m.id),m=null,document.querySelectorAll(".nav button").forEach(t=>t.classList.remove("active"));const e=document.querySelector('.nav button[data-tab="historyScreen"]');e&&e.classList.add("active"),k("historyScreen"),s.stats&&(s.stats.style.display="none"),L("historyScreen"),g()});function it(){s.optionsMenu.classList.remove("open")}function yn(){s.optionsMenu.classList.toggle("open")}function L(e){const t=e==="reportsScreen"||e==="eventScreen";s.optionsBtn.style.display=t?"inline-grid":"none";const n=e==="salesScreen"||e==="productHistoryScreen";s.openProductEdit.style.display=n?"inline-grid":"none";const r=e!=="historyScreen"&&e!=="settingsScreen"&&e!=="productHistoryScreen";s.reset.style.display=r?"inline-grid":"none",s.productHistoryAddBtn&&(s.productHistoryAddBtn.style.display="none"),t||it()}function $e(){s.grid.innerHTML="",ot(),g()}function k(e){document.querySelectorAll(".screen").forEach(n=>n.classList.remove("active"));const t=document.getElementById(e);t&&t.classList.add("active")}function Ce(e){var r;const t=document.getElementById("productEditTitle"),n=((r=document.querySelector(".screen.active"))==null?void 0:r.id)||"salesScreen";if(j=n==="productEditScreen"?j:n,e>=0){const o=B[e];V=e,t.textContent="Edit product",s.editName.value=o.name,s.editPrice.value=te(String(o.price),A().currency),s.editCost.value=te(String(o.cost),A().currency),s.editColorHex.textContent=o.color.toUpperCase(),s.editColorHexInput.value=o.color.toUpperCase(),s.removeProductBtn.style.display="grid"}else{V=-1,t.textContent="Add product",s.editName.value="",s.editPrice.value="",s.editCost.value="";const o=De(B,"#F76495");s.editColorHex.textContent=o,s.editColorHexInput.value=o,s.removeProductBtn.style.display="none"}Se(s.editColorHex.textContent||"#F76495"),k("productEditScreen"),s.editPrice.addEventListener("input",()=>{s.editPrice.value=te(s.editPrice.value,A().currency)}),s.editCost.addEventListener("input",()=>{s.editCost.value=te(s.editCost.value,A().currency)}),s.removeProductBtn.onclick=()=>{if(V<0)return;Ae();const o=B.splice(V,1)[0];for(let a=M.length-1;a>=0;a--)M[a].product===o.name&&M.splice(a,1);ve(),ie(),$(`${o.name} removed`),V=-1,$e(),g(!0),k(j),L(j)},s.saveProductBtn.onclick=()=>{const o=s.editName.value.trim()||`Product ${B.length+1}`,a=xe(s.editPrice.value,A().currency)||0,c=xe(s.editCost.value,A().currency)||0,l=(s.editColorHex.textContent||"#ffffff").trim(),i=l.startsWith("#")?l:`#${l}`;if(V>=0){const d=B[V],u=d.name;d.name=o,d.price=a,d.cost=c,d.color=i,M.forEach(p=>{p.product===u&&(p.product=o,p.price=a,p.cost=c)}),ve(),ie(),Te(d,H,u),qe(H),$(`${o} saved`)}else{const d=De(B,i);d!==i&&Se(d);const u={name:o,price:a,cost:c,color:d};B.push(u),ve(),Te(u,H),qe(H),$(`${o} added`)}$e(),g(!0),k(j),L(j)}}let I={h:340,s:.68,v:.97};function we(e,t,n){return Math.min(n,Math.max(t,e))}function gn(e){const t=re(e),n=parseInt(t.slice(1,3),16),r=parseInt(t.slice(3,5),16),o=parseInt(t.slice(5,7),16);return{r:n,g:r,b:o}}function ct(e,t,n){return`#${[e,t,n].map(r=>r.toString(16).padStart(2,"0")).join("").toUpperCase()}`}function hn(e,t,n){const r=e/255,o=t/255,a=n/255,c=Math.max(r,o,a),l=Math.min(r,o,a),i=c-l;let d=0;i!==0&&(c===r?d=(o-a)/i%6:c===o?d=(a-r)/i+2:d=(r-o)/i+4,d*=60,d<0&&(d+=360));const u=c===0?0:i/c;return{h:d,s:u,v:c}}function lt(e,t,n){const r=n*t,o=r*(1-Math.abs(e/60%2-1)),a=n-r;let c=0,l=0,i=0;return e>=0&&e<60?(c=r,l=o,i=0):e>=60&&e<120?(c=o,l=r,i=0):e>=120&&e<180?(c=0,l=r,i=o):e>=180&&e<240?(c=0,l=o,i=r):e>=240&&e<300?(c=o,l=0,i=r):(c=r,l=0,i=o),{r:Math.round((c+a)*255),g:Math.round((l+a)*255),b:Math.round((i+a)*255)}}function En(){s.colorPickerMenu.classList.add("open")}function Ae(){s.colorPickerMenu.classList.remove("open")}function Se(e){const t=re(e),n=gn(t);I=hn(n.r,n.g,n.b);const r=lt(I.h,I.s,I.v),o=ct(r.r,r.g,r.b);s.editColorHex.textContent=o,s.editColorHexInput.value=o,s.colorPickerMenu.style.setProperty("--picker-bg",o),s.pickerHexCard.style.setProperty("--picker-bg",o),s.colorPickerMenu.style.setProperty("--picker-text",oe(o)),s.pickerHexCard.style.setProperty("--picker-text",oe(o)),s.hueValue.textContent=`${Math.round(I.h)}°`,ut(o),s.pickerSurface.style.setProperty("--picker-hue",`hsl(${I.h},100%,50%)`),s.hueThumb.style.left=`${I.h/360*100}%`,s.pickerSurfaceThumb.style.left=`${I.s*100}%`,s.pickerSurfaceThumb.style.top=`${(1-I.v)*100}%`}function dt(){const e=lt(I.h,I.s,I.v),t=ct(e.r,e.g,e.b);s.editColorHex.textContent=t,s.editColorHexInput.value=t,s.colorPickerMenu.style.setProperty("--picker-bg",t),s.pickerHexCard.style.setProperty("--picker-bg",t),s.colorPickerMenu.style.setProperty("--picker-text",oe(t)),s.pickerHexCard.style.setProperty("--picker-text",oe(t)),s.hueValue.textContent=`${Math.round(I.h)}°`,ut(t),s.pickerSurface.style.setProperty("--picker-hue",`hsl(${I.h},100%,50%)`),s.hueThumb.style.left=`${I.h/360*100}%`,s.pickerSurfaceThumb.style.left=`${I.s*100}%`,s.pickerSurfaceThumb.style.top=`${(1-I.v)*100}%`}function Fe(e){const t=s.pickerSurface.getBoundingClientRect(),n=we((e.clientX-t.left)/t.width,0,1),r=we((e.clientY-t.top)/t.height,0,1);I.s=n,I.v=1-r,dt()}function je(e){const t=s.hueSlider.getBoundingClientRect(),n=we((e.clientX-t.left)/t.width,0,1);I.h=n*360,dt()}const pe=document.getElementById("currencySelect"),me=document.getElementById("compactMoneyToggle");if(pe){const e=A();pe.value=e.currency,pe.addEventListener("change",()=>{const t={...A(),currency:pe.value};et(t),g()})}me&&(me.checked=A().compactMoney,me.addEventListener("change",()=>{const e={...A(),compactMoney:me.checked};et(e),g()}));s.openProductEdit.addEventListener("click",()=>{Ce(-1)});s.productMenuBtn&&s.productMenuBtn.addEventListener("click",()=>{k("productHistoryScreen"),L("productHistoryScreen"),g()});const Ge=document.getElementById("openSalesReportMenuBtn");Ge&&Ge.addEventListener("click",()=>{document.querySelectorAll(".nav button").forEach(e=>e.classList.remove("active")),k("salesReportHistoryScreen"),L("salesReportHistoryScreen"),g()});s.salesReportHistoryBackBtn&&s.salesReportHistoryBackBtn.addEventListener("click",()=>{k("settingsScreen"),L("settingsScreen"),g()});const _e=document.getElementById("openEventReportMenuBtn");_e&&_e.addEventListener("click",()=>{document.querySelectorAll(".nav button").forEach(e=>e.classList.remove("active")),k("eventReportHistoryScreen"),L("eventReportHistoryScreen"),g()});s.eventReportHistoryBackBtn&&s.eventReportHistoryBackBtn.addEventListener("click",()=>{k("settingsScreen"),L("settingsScreen"),g()});const Ye=document.getElementById("openAboutMenuBtn");Ye&&Ye.addEventListener("click",()=>{$("About coming soon")});s.productHistoryBackBtn&&s.productHistoryBackBtn.addEventListener("click",()=>{const e=j==="productEditScreen"?"productHistoryScreen":"settingsScreen";k(e),L(e),g()});s.compareSalesBtn&&s.compareSalesBtn.addEventListener("click",()=>rt("sales"));s.compareEventsBtn&&s.compareEventsBtn.addEventListener("click",()=>rt("event"));s.compareModalConfirmBtn&&s.compareModalConfirmBtn.addEventListener("click",un);s.compareModalCancelBtn&&s.compareModalCancelBtn.addEventListener("click",()=>Be(!0));s.compareModalCloseBtn&&s.compareModalCloseBtn.addEventListener("click",()=>Be(!0));s.compareSalesBackBtn&&s.compareSalesBackBtn.addEventListener("click",()=>{G=[],K=[],k("historyScreen"),L("historyScreen"),g()});s.compareEventBackBtn&&s.compareEventBackBtn.addEventListener("click",()=>{G=[],K=[],k("historyScreen"),L("historyScreen"),g()});s.compareModalOverlay&&s.compareModalOverlay.addEventListener("click",e=>{e.target===s.compareModalOverlay&&Be(!0)});s.compareModalList&&s.compareModalList.addEventListener("change",()=>{const e=Array.from(s.compareModalList.querySelectorAll('input[type="checkbox"]')).filter(t=>t.checked).map(t=>t.value);K=e,s.compareModalConfirmBtn.disabled=e.length!==2});s.productHistoryAddBtn&&s.productHistoryAddBtn.addEventListener("click",()=>Ce(-1));s.closeEditBtn.addEventListener("click",()=>{k(j),L(j),g()});s.editColorHexInput.addEventListener("input",()=>{const e=s.editColorHexInput.value;/^#?[A-Fa-f0-9]{6}$/.test(e.trim())&&Se(e)});s.colorGroup.addEventListener("click",()=>{En()});s.pickerSurface.addEventListener("pointerdown",e=>{Fe(e);const t=r=>Fe(r),n=()=>{window.removeEventListener("pointermove",t),window.removeEventListener("pointerup",n)};window.addEventListener("pointermove",t),window.addEventListener("pointerup",n)});s.hueSlider.addEventListener("pointerdown",e=>{je(e);const t=r=>je(r),n=()=>{window.removeEventListener("pointermove",t),window.removeEventListener("pointerup",n)};window.addEventListener("pointermove",t),window.addEventListener("pointerup",n)});s.colorPickerMenu.addEventListener("click",e=>{const n=e.target.closest(".color-preset");if(!n)return;const r=n.style.getPropertyValue("--preset");r&&Se(r.trim())});document.addEventListener("pointerdown",e=>{if(!s.colorPickerMenu.classList.contains("open"))return;const t=e.target;s.colorPickerMenu.contains(t)||s.colorGroup.contains(t)||Ae()});document.addEventListener("keydown",e=>{e.key==="Escape"&&Ae()});function ut(e){const t=e.startsWith("#")?e:`#${e}`;s.colorGroup.style.setProperty("--color-field-bg",t),s.colorGroup.style.background=t,s.editColorHex.style.color=oe(t)}function $(e){s.toast.textContent=e,s.toast.classList.add("show"),clearTimeout($.t),$.t=window.setTimeout(()=>s.toast.classList.remove("show"),900)}s.reset.addEventListener("click",()=>{const e=document.querySelector(".screen.active");if((e==null?void 0:e.id)==="eventScreen"){N=null,Re(null),T.length=0,be(),g(),$("Event report cleared");return}M.length=0,ie(),g(!0),$("Sales cleared")});s.optionsBtn.addEventListener("click",e=>{e.stopPropagation();const t=document.querySelector(".screen.active");(t==null?void 0:t.id)==="reportsScreen"?(s.saveReportOption.style.display="block",s.saveEventReportOption.style.display="none"):(t==null?void 0:t.id)==="eventScreen"?(s.saveReportOption.style.display="none",s.saveEventReportOption.style.display="block"):(s.saveReportOption.style.display="none",s.saveEventReportOption.style.display="none"),yn()});document.querySelectorAll(".nav button").forEach(e=>{e.addEventListener("click",()=>{document.querySelectorAll(".nav button").forEach(n=>n.classList.remove("active")),e.classList.add("active"),document.querySelectorAll(".screen").forEach(n=>n.classList.remove("active"));const t=document.getElementById(e.getAttribute("data-tab")||"");t&&t.classList.add("active"),s.stats&&(t&&t.id==="salesScreen"?s.stats.style.display="":s.stats.style.display="none"),t&&(L(t.id),(t.id==="reportsScreen"&&(m==null?void 0:m.type)==="sales"||t.id==="eventScreen"&&(m==null?void 0:m.type)==="event")&&(m=null)),g()})});let pt="sales";const mt=()=>{!s.saveModalSaveBtn||!s.saveModalInput||(s.saveModalSaveBtn.disabled=s.saveModalInput.value.trim().length===0)},vt=e=>{pt=e,it(),s.saveModalTitle.textContent=e==="event"?"Save event report":"Save report",s.saveModalInput.placeholder=e==="event"?`Event report ${new Date().toLocaleDateString()}`:`Report ${new Date().toLocaleDateString()}`,s.saveModalInput.value="",mt(),s.saveModalOverlay.classList.add("open"),s.saveModalInput.focus()},Q=()=>{ae=null,s.saveModalSaveBtn.textContent="Save",s.saveModalTitle.textContent="Save report",s.saveModalInput.value="",s.saveModalOverlay.classList.remove("open")};s.saveReportOption.addEventListener("click",()=>vt("sales"));s.saveEventReportOption.addEventListener("click",()=>vt("event"));s.saveModalSaveBtn.addEventListener("click",()=>{const e=s.saveModalInput.value.trim();if(ae){Jt(ae,e),Q();return}zt(e,pt),Q(),g()});s.saveModalCancelBtn.addEventListener("click",Q);s.saveModalCloseBtn.addEventListener("click",Q);s.saveModalOverlay.addEventListener("click",e=>{e.target===s.saveModalOverlay&&Q()});s.saveModalInput.addEventListener("input",()=>{mt()});s.saveModalInput.addEventListener("keydown",e=>{e.key==="Enter"&&(e.preventDefault(),s.saveModalSaveBtn.disabled||s.saveModalSaveBtn.click())});s.importModalCancelBtn&&s.importModalCancelBtn.addEventListener("click",le);s.importModalCloseBtn&&s.importModalCloseBtn.addEventListener("click",le);s.importModalOverlay&&s.importModalOverlay.addEventListener("click",e=>{e.target===s.importModalOverlay&&le()});s.importSavedReportsList&&s.importSavedReportsList.addEventListener("change",()=>{at()});s.importModalConfirmBtn&&s.importModalConfirmBtn.addEventListener("click",()=>{const e=s.importSavedReportsList.querySelector("#importCurrentLiveReport"),t=Array.from(s.importSavedReportsList.querySelectorAll('input[type="checkbox"]')).filter(a=>a.checked).map(a=>a.value).filter(a=>a!=="current-live"),n=O().filter(a=>a.type==="sales"&&t.includes(a.id)),r=[...e!=null&&e.checked?M.map(a=>({...a})):[],...n.flatMap(a=>a.sales.map(c=>({...c})))],o=e!=null&&e.checked?T.map(a=>({...a,id:ge()})):[];if(!r.length&&!o.length){$("Select at least one saved sales report or current live report");return}N={sales:r,products:B.map(a=>({...a}))},Re(N),m=null,le(),g()});document.addEventListener("keydown",e=>{e.key==="Escape"&&(s.saveModalOverlay.classList.contains("open")||s.importModalOverlay.classList.contains("open")||s.expenseModalOverlay&&s.expenseModalOverlay.classList.contains("open"))&&(Q(),le(),s.expenseModalOverlay&&s.expenseModalOverlay.classList.remove("open"))});ot();g();(()=>{const e=document.querySelector(".screen.active");s.stats&&(e&&e.id==="salesScreen"?s.stats.style.display="":s.stats.style.display="none"),e&&L(e.id)})();ye.isNativePlatform()&&document.body.classList.add("capacitor-native");
