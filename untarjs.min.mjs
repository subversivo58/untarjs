/**
 * @license The MIT License (MIT) {@link https://github.com/subversivo58/untarjs/blob/master/LICENSE LICENSE}
 * @copyright Copyright (c) 2015 Sebastian Jørgensen | Copyright (c) 2019 Lauro Moraes
 * @see https://github.com/InvokIT/js-untar
 */export default((a,b=!1)=>new Promise((c,d)=>{if(!(a instanceof ArrayBuffer))return void d("\"arrayBuffer\" param is not an instance of `ArrayBuffer`");if(!b)return void d("\"workerScriptUri\" param is not defined");let e=new Worker(b),f=[];e.onerror=a=>{d(a)},e.onmessage=a=>{switch(a=a.data,a.type){case"extract":f.push(a.data);break;case"complete":e.terminate(),c(f);break;case"error":e.terminate(),d(a.data.message);break;default:e.terminate(),d("Unknown message from worker: "+a.type);}},e.postMessage({type:"extract",buffer:a},[a])}));
