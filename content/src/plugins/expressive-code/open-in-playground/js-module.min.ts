/*
	GENERATED FILE - DO NOT EDIT
	----------------------------
	This JS module code was built from the source file "js-module.ts".
	To change it, modify the source file and then re-run the build script.
*/

export default "try{(()=>{function a(e){let t=Array.from(e,o=>String.fromCodePoint(o)).join(\"\");return btoa(t)}function d(e){let c=(e.currentTarget.closest(\".expressive-code\")?.querySelector(\".copy button\")).dataset.code.replace(/\\u007f/g,`\n`),r=new TextEncoder().encode(c),s=a(r);window.open(`${window.location.origin}/play/?code=${encodeURIComponent(s)}`,\"_blank\")}function n(e){e.querySelectorAll?.(\".expressive-code .open-in-playground button\").forEach(t=>t.addEventListener(\"click\",d))}n(document);var u=new MutationObserver(e=>e.forEach(t=>t.addedNodes.forEach(o=>{n(o)})));u.observe(document.body,{childList:!0,subtree:!0});document.addEventListener(\"astro:page-load\",()=>{n(document)});})();}catch(e){console.error(\"[EC] js-module failed:\",e)}"
