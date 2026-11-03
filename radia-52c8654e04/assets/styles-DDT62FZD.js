let i=!1;function t(){if(i||typeof document>"u")return;i=!0;const e=document.createElement("style");e.dataset.src="events-photo",e.textContent=`
.pb-wrap { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 8px; }
.pb-stage { position: relative; flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; }
.pb-prev { display: block; border-radius: 14px; box-shadow: 0 8px 22px rgba(59,49,82,0.35); background: #fff; touch-action: manipulation; }
.pb-count { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 120px; font-weight: 800; color: #fff; text-shadow: 0 4px 0 #e8558f, 0 0 30px rgba(255,255,255,0.8); pointer-events: none; z-index: 5; }
.pb-count.in { animation: pbCount 0.6s var(--ease-pop) both; }
@keyframes pbCount { from { transform: scale(2.2); opacity: 0; } 40% { opacity: 1; } to { transform: scale(0.9); opacity: 0.9; } }
.pb-flash { position: absolute; inset: -40px; background: #fff; z-index: 30; pointer-events: none; opacity: 0; }
.pb-flash.go { animation: pbFlash 0.55s ease-out both; }
@keyframes pbFlash { 0% { opacity: 0; } 12% { opacity: 1; } 100% { opacity: 0; } }
.pb-card { position: absolute; z-index: 6; box-shadow: 0 14px 28px rgba(40,20,60,0.45); border-radius: 4px; background: #fff; will-change: transform; }
.pb-rows { display: flex; flex-direction: column; gap: 5px; flex-shrink: 0; }
.pb-row { display: flex; align-items: center; gap: 6px; min-width: 0; }
.pb-lab { flex: 0 0 52px; font-size: 12px; font-weight: 700; color: var(--choco-soft, #8a6f68); text-transform: uppercase; letter-spacing: 0.03em; }
.pb-chips { flex: 1; min-width: 0; display: flex; gap: 6px; overflow-x: auto; padding: 3px 2px; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
.pb-chips::-webkit-scrollbar { display: none; }
.pb-chip { flex: 0 0 auto; min-height: 40px; display: inline-flex; align-items: center; gap: 6px; padding: 0 12px; border-radius: 20px; border: 0; font: inherit; font-size: 14px; font-weight: 700; color: var(--choco, #58433f); background: rgba(255,255,255,0.85); box-shadow: 0 0 0 2px rgba(185,165,232,0.5); cursor: pointer; }
.pb-chip.on { background: #fff; color: var(--rose-deep, #e8558f); box-shadow: 0 0 0 3px var(--rose-vif, #ff75a8), 0 3px 8px rgba(232,85,143,0.3); }
.pb-chip i { width: 16px; height: 16px; border-radius: 50%; box-shadow: 0 0 0 1.5px rgba(88,67,63,0.4); }
.pb-chip:disabled { opacity: 0.5; }
.pb-go { flex-shrink: 0; font-size: 22px; min-height: 56px; }
.pb-acts { display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }
/* galerie */
.pg-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 4px 2px 12px; }
.pg-card { display: block; background: #fffaf5; border-radius: 14px; padding: 6px 6px 8px; box-shadow: 0 0 0 2px rgba(245,160,187,0.7), 0 5px 12px rgba(59,49,82,0.22); text-align: left; border: 0; font: inherit; color: var(--choco, #58433f); cursor: pointer; min-width: 0; }
.pg-card canvas { display: block; width: 100%; aspect-ratio: 4 / 5; border-radius: 9px; background: linear-gradient(135deg, #fde6ef, #e3d7f7); }
.pg-card b { display: block; margin-top: 6px; font-size: 14px; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pg-card small { display: block; font-size: 12px; opacity: 0.7; }
.pg-empty { padding: 28px 12px; text-align: center; opacity: 0.75; font-style: italic; }
.pv-back { position: absolute; inset: 0; z-index: 130; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: calc(var(--sat, 0px) + 12px) 14px calc(var(--sab, 0px) + 12px); background: rgba(40,28,60,0.88); animation: fadeIn 0.2s ease; touch-action: manipulation; }
.pv-box { flex: 1; min-height: 0; width: 100%; display: flex; align-items: center; justify-content: center; }
.pv-box canvas { display: block; border-radius: 6px; box-shadow: 0 14px 34px rgba(0,0,0,0.5); animation: evPop 0.4s var(--ease-pop); max-width: 100%; max-height: 100%; }
.pv-title { color: #fff; font-size: 17px; text-align: center; flex-shrink: 0; }
.pv-title small { display: block; opacity: 0.7; font-size: 13px; }
.pv-acts { display: flex; gap: 10px; flex-shrink: 0; width: 100%; max-width: 360px; }
.pv-acts .btn { flex: 1; min-height: 48px; }
`,document.head.append(e)}export{t as e};
