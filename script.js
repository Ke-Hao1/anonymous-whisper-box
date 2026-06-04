// 不署名信箱 - 第一版网页演示
// 注意：这个版本只把消息存在当前浏览器 localStorage 里。
// 也就是说，A 手机发的消息，不会自动出现在 B 手机的主人后台。
// 下一步接云数据库后，才能实现真正跨设备收信。

const STORAGE_KEY = "anonymous_whisper_messages_v1";
const LAST_SENT_KEY = "anonymous_whisper_last_sent_at";
const OWNER_KEY = "123456"; // 你可以把主人口令改成自己喜欢的数字，但静态网页里它不是真正安全的密码。
const MAX_LENGTH = 120;
const COOLDOWN_MS = 10000;

const page = document.body.dataset.page;

function $(selector) {
  return document.querySelector(selector);
}

function loadMessages() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function saveMessages(messages) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
}

function showToast(text) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }

  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 1800);
}

function cleanText(text) {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/\s{3,}/g, "  ")
    .trim();
}

function looksUnsafe(text) {
  // 第一版的轻量提醒，不等于真正内容安全审核。
  // 接数据库/小程序时，建议再接正式内容审核接口。
  const riskyPatterns = [
    /去死|自杀|杀了你|人肉|身份证|银行卡|手机号|住址/i,
    /傻逼|废物|垃圾|贱/i
  ];
  return riskyPatterns.some((pattern) => pattern.test(text));
}

function formatTime(iso) {
  const date = new Date(iso);
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function initHomePage() {
  const form = $("#whisperForm");
  const input = $("#messageInput");
  const charCount = $("#charCount");
  const sendButton = $("#sendButton");
  const cooldownText = $("#cooldownText");
  const successPanel = $("#successPanel");
  const writeAgainButton = $("#writeAgainButton");

  function updateCharCount() {
    charCount.textContent = `${input.value.length} / ${MAX_LENGTH}`;
  }

  function getCooldownLeft() {
    const lastSentAt = Number(localStorage.getItem(LAST_SENT_KEY) || 0);
    return Math.max(0, COOLDOWN_MS - (Date.now() - lastSentAt));
  }

  function updateCooldown() {
    const left = getCooldownLeft();
    if (left > 0) {
      sendButton.disabled = true;
      cooldownText.textContent = `还要等 ${Math.ceil(left / 1000)} 秒`;
    } else {
      sendButton.disabled = false;
      cooldownText.textContent = "";
    }
  }

  input.addEventListener("input", updateCharCount);

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const content = cleanText(input.value);
    if (!content) {
      showToast("先写一句悄悄话吧");
      input.focus();
      return;
    }

    if (content.length > MAX_LENGTH) {
      showToast("太长啦，控制在 120 字以内");
      return;
    }

    if (getCooldownLeft() > 0) {
      showToast("先等几秒再发，防止刷屏");
      return;
    }

    if (looksUnsafe(content)) {
      showToast("这句话可能会让人不舒服，换一种温柔的说法吧");
      return;
    }

    const messages = loadMessages();
    messages.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      content,
      createdAt: new Date().toISOString()
    });
    saveMessages(messages);
    localStorage.setItem(LAST_SENT_KEY, String(Date.now()));

    input.value = "";
    updateCharCount();
    updateCooldown();
    successPanel.hidden = false;
  });

  writeAgainButton.addEventListener("click", () => {
    successPanel.hidden = true;
    input.focus();
  });

  updateCharCount();
  updateCooldown();
  setInterval(updateCooldown, 500);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
}

function initInboxPage() {
  const lockScreen = $("#lockScreen");
  const inboxPanel = $("#inboxPanel");
  const keyInput = $("#keyInput");
  const unlockButton = $("#unlockButton");
  const keyError = $("#keyError");
  const messageList = $("#messageList");
  const messageCount = $("#messageCount");
  const emptyState = $("#emptyState");
  const exportButton = $("#exportButton");
  const clearButton = $("#clearButton");

  function hasCorrectKey() {
    const url = new URL(window.location.href);
    return url.searchParams.get("key") === OWNER_KEY;
  }

  function unlock() {
    lockScreen.hidden = true;
    inboxPanel.hidden = false;
    renderMessages();
  }

  function renderMessages() {
    const messages = loadMessages();
    messageCount.textContent = messages.length;
    emptyState.hidden = messages.length > 0;
    messageList.innerHTML = "";

    messages.forEach((message, index) => {
      const card = document.createElement("article");
      card.className = "message-card";
      card.innerHTML = `
        <div class="message-meta">
          <span>第 ${messages.length - index} 条</span>
          <span>${formatTime(message.createdAt)}</span>
        </div>
        <p class="message-content"></p>
        <div class="message-actions">
          <button class="text-btn" type="button" data-id="${message.id}">删除</button>
        </div>
      `;
      card.querySelector(".message-content").textContent = `“${message.content}”`;
      messageList.appendChild(card);
    });
  }

  unlockButton.addEventListener("click", () => {
    if (keyInput.value.trim() === OWNER_KEY) {
      const url = new URL(window.location.href);
      url.searchParams.set("key", OWNER_KEY);
      history.replaceState(null, "", url.toString());
      unlock();
    } else {
      keyError.hidden = false;
      keyInput.select();
    }
  });

  keyInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") unlockButton.click();
  });

  messageList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-id]");
    if (!button) return;

    const id = button.dataset.id;
    const messages = loadMessages().filter((message) => message.id !== id);
    saveMessages(messages);
    renderMessages();
    showToast("已删除");
  });

  clearButton.addEventListener("click", () => {
    const messages = loadMessages();
    if (messages.length === 0) {
      showToast("现在没有可清空的内容");
      return;
    }

    if (confirm("确定要清空全部悄悄话吗？")) {
      saveMessages([]);
      renderMessages();
      showToast("已清空");
    }
  });

  exportButton.addEventListener("click", async () => {
    const messages = loadMessages();
    if (messages.length === 0) {
      showToast("还没有内容可复制");
      return;
    }

    const text = messages
      .map((message, index) => `${index + 1}. ${formatTime(message.createdAt)}\n${message.content}`)
      .join("\n\n");

    try {
      await navigator.clipboard.writeText(text);
      showToast("已复制全部悄悄话");
    } catch (error) {
      showToast("复制失败，可以手动截图保存");
    }
  });

  if (hasCorrectKey()) {
    unlock();
  } else {
    lockScreen.hidden = false;
    inboxPanel.hidden = true;
  }
}

if (page === "home") initHomePage();
if (page === "inbox") initInboxPage();
