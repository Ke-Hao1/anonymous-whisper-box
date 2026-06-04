/* QR code fix for anonymous-whisper-box
   Put this file in the same GitHub Pages folder as index.html,
   then add <script src="./qrcode_fix.js?v=1"></script> after script.js in index.html.
*/
(function () {
  "use strict";

  const QR_API = "https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=16&format=png&data=";

  function cleanText(value) {
    return String(value || "").trim().replace(/[\u200B-\u200D\uFEFF]/g, "");
  }

  function looksLikeProjectUrl(value) {
    const text = cleanText(value);
    if (!/^https?:\/\//i.test(text)) return false;
    return /anonymous-whisper-box/i.test(text) || text.includes(location.hostname);
  }

  function scoreUrl(value) {
    const text = cleanText(value);
    let score = 0;
    if (/anonymous-whisper-box/i.test(text)) score += 20;
    if (text.includes(location.hostname)) score += 15;
    if (/[?&](box|board|mailbox|id)=/i.test(text)) score += 20;
    if (/#(box|board|mailbox|id)=/i.test(text)) score += 10;
    if (text.length < 300) score += 5;
    return score;
  }

  function findShareUrl() {
    const candidates = [];

    document.querySelectorAll("input, textarea").forEach((el) => {
      if (el.value) candidates.push(el.value);
      if (el.placeholder) candidates.push(el.placeholder);
    });

    document.querySelectorAll("a[href]").forEach((a) => {
      candidates.push(a.href);
      candidates.push(a.textContent);
    });

    const textMatches = (document.body.innerText || "").match(/https?:\/\/[^\s\u4e00-\u9fa5]+/g) || [];
    candidates.push(...textMatches);

    const current = location.href;
    if (/[?&](box|board|mailbox|id)=/i.test(location.search) || /#(box|board|mailbox|id)=/i.test(location.hash)) {
      candidates.push(current);
    }

    const valid = candidates
      .map(cleanText)
      .filter(looksLikeProjectUrl)
      .sort((a, b) => scoreUrl(b) - scoreUrl(a));

    return valid[0] || current;
  }

  function ensureModal() {
    let modal = document.getElementById("qr-fix-modal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "qr-fix-modal";
    modal.innerHTML = `
      <div class="qr-fix-card" role="dialog" aria-modal="true" aria-label="分享二维码">
        <button class="qr-fix-close" type="button" aria-label="关闭">×</button>
        <h2>分享二维码</h2>
        <p class="qr-fix-tip">朋友扫码即可打开你的留言板</p>
        <img class="qr-fix-img" alt="分享二维码" />
        <textarea class="qr-fix-link" readonly></textarea>
        <div class="qr-fix-actions">
          <button class="qr-fix-copy" type="button">复制链接</button>
          <a class="qr-fix-open" target="_blank" rel="noopener">新窗口打开</a>
        </div>
        <p class="qr-fix-note">如果微信里图片加载慢，请先复制链接分享。</p>
      </div>
    `;

    const style = document.createElement("style");
    style.textContent = `
      #qr-fix-modal{position:fixed;inset:0;z-index:999999;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(15,23,42,.55);backdrop-filter:blur(8px)}
      #qr-fix-modal.qr-fix-show{display:flex}
      #qr-fix-modal .qr-fix-card{position:relative;width:min(92vw,420px);padding:24px;border-radius:28px;background:#fff;box-shadow:0 28px 80px rgba(15,23,42,.28);text-align:center;color:#172033}
      #qr-fix-modal .qr-fix-close{position:absolute;right:14px;top:12px;width:38px;height:38px;border:0;border-radius:50%;background:#f1f5f9;font-size:26px;line-height:1;cursor:pointer;color:#334155}
      #qr-fix-modal h2{margin:4px 0 6px;font-size:24px;color:#172033}
      #qr-fix-modal .qr-fix-tip{margin:0 0 16px;color:#64748b;font-size:14px}
      #qr-fix-modal .qr-fix-img{width:260px;height:260px;max-width:72vw;border:12px solid #fff;border-radius:20px;box-shadow:0 10px 30px rgba(15,23,42,.13);background:#fff}
      #qr-fix-modal .qr-fix-link{margin-top:16px;width:100%;min-height:66px;padding:12px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc;color:#334155;resize:none;font-size:13px;box-sizing:border-box}
      #qr-fix-modal .qr-fix-actions{display:flex;gap:10px;justify-content:center;margin-top:14px;flex-wrap:wrap}
      #qr-fix-modal .qr-fix-actions button,#qr-fix-modal .qr-fix-actions a{border:0;border-radius:999px;padding:11px 16px;background:#24304f;color:#fff;text-decoration:none;font-size:14px;cursor:pointer}
      #qr-fix-modal .qr-fix-note{margin:12px 0 0;color:#94a3b8;font-size:12px}
    `;

    document.head.appendChild(style);
    document.body.appendChild(modal);

    modal.querySelector(".qr-fix-close").addEventListener("click", () => modal.classList.remove("qr-fix-show"));
    modal.addEventListener("click", (event) => {
      if (event.target === modal) modal.classList.remove("qr-fix-show");
    });
    modal.querySelector(".qr-fix-copy").addEventListener("click", async () => {
      const link = modal.querySelector(".qr-fix-link").value;
      try {
        await navigator.clipboard.writeText(link);
        modal.querySelector(".qr-fix-copy").textContent = "已复制";
        setTimeout(() => (modal.querySelector(".qr-fix-copy").textContent = "复制链接"), 1200);
      } catch (e) {
        modal.querySelector(".qr-fix-link").select();
        document.execCommand("copy");
      }
    });

    return modal;
  }

  function showQrModal(url) {
    const modal = ensureModal();
    const img = modal.querySelector(".qr-fix-img");
    const link = modal.querySelector(".qr-fix-link");
    const open = modal.querySelector(".qr-fix-open");
    link.value = url;
    open.href = url;
    img.src = QR_API + encodeURIComponent(url) + "&t=" + Date.now();
    modal.classList.add("qr-fix-show");
  }

  function patchQrButtons() {
    const nodes = Array.from(document.querySelectorAll("button, a, [role='button']"));
    nodes.forEach((el) => {
      if (el.dataset.qrFixPatched === "1") return;
      const text = cleanText(el.textContent).replace(/\s+/g, "");
      if (!(text.includes("二维码") || text.includes("海报") || text.includes("扫码"))) return;

      const fresh = el.cloneNode(true);
      fresh.dataset.qrFixPatched = "1";
      fresh.addEventListener(
        "click",
        function (event) {
          event.preventDefault();
          event.stopPropagation();
          showQrModal(findShareUrl());
        },
        true
      );
      el.replaceWith(fresh);
    });
  }

  function boot() {
    patchQrButtons();
    const observer = new MutationObserver(patchQrButtons);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
