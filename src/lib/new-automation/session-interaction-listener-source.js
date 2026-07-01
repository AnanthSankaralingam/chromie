export const CHROMIE_INTERACTION_LISTENER_SOURCE = String.raw`
(() => {
  if (window.__chromieInteractionRecorderInstalled) return;
  window.__chromieInteractionRecorderInstalled = true;

  const BINDING_NAME = "__chromieEmit";
  const MAX_TEXT_LENGTH = 120;
  const MAX_HTML_LENGTH = 2000;
  const MEANINGFUL_KEYS = new Set([
    "Enter",
    "Tab",
    "Escape",
    "Backspace",
    "Delete",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
  ]);
  let currentField = null;
  let flushTimer = null;

  function trim(value, maxLength = MAX_TEXT_LENGTH) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 1) + "...";
  }

  function emit(payload) {
    try {
      const binding = window[BINDING_NAME];
      if (typeof binding !== "function") return;
      binding(JSON.stringify({
        ...payload,
        href: window.location.href,
        title: document.title || null,
        timestamp: Date.now(),
      }));
    } catch {
      // Never let telemetry affect the user's session.
    }
  }

  function labelFor(element) {
    if (!element || !document) return null;
    if (element.labels && element.labels.length) {
      const label = trim(Array.from(element.labels).map((item) => item.innerText).join(" "));
      if (label) return label;
    }
    const enclosingLabel = element.closest && element.closest("label");
    if (enclosingLabel) {
      const label = trim(enclosingLabel.innerText);
      if (label) return label;
    }
    const id = element.getAttribute && element.getAttribute("id");
    if (id && window.CSS && typeof window.CSS.escape === "function") {
      const externalLabel = document.querySelector('label[for="' + window.CSS.escape(id) + '"]');
      const label = trim(externalLabel && externalLabel.innerText);
      if (label) return label;
    }
    return null;
  }

  function descriptorFor(target) {
    const element = target && target.nodeType === Node.ELEMENT_NODE
      ? target
      : target && target.parentElement;
    if (!element) return "page";

    const tag = element.tagName ? element.tagName.toLowerCase() : "element";
    const parts = [tag];
    const id = element.getAttribute && element.getAttribute("id");
    const className = element.getAttribute && element.getAttribute("class");
    const firstClass = typeof className === "string" ? className.split(/\s+/).filter(Boolean)[0] : null;
    const name = element.getAttribute && element.getAttribute("name");
    if (id) parts.push("#" + id);
    else if (firstClass) parts.push("." + firstClass);
    if (name) parts.push('name="' + trim(name, 40) + '"');

    const semanticText = trim(
      (element.getAttribute && (
        element.getAttribute("aria-label") ||
        element.getAttribute("placeholder") ||
        element.getAttribute("title")
      )) ||
        labelFor(element) ||
        (tag === "input" || tag === "textarea" || tag === "select" ? element.value : element.innerText),
      80,
    );
    if (semanticText) parts.push('"' + semanticText + '"');
    return parts.join(" ");
  }

  function actionableElementFor(target) {
    const element = target && target.nodeType === Node.ELEMENT_NODE
      ? target
      : target && target.parentElement;
    if (!element || !element.closest) return element || null;
    return (
      element.closest(
        'a,button,input,select,textarea,label,summary,[role="button"],[role="link"],[onclick]',
      ) || element
    );
  }

  function htmlForClick(target) {
    const element = actionableElementFor(target);
    if (!element || typeof element.outerHTML !== "string") return null;
    return trim(element.outerHTML, MAX_HTML_LENGTH);
  }

  function isTextField(element) {
    if (!element || !element.tagName) return false;
    const tag = element.tagName.toLowerCase();
    if (tag === "textarea") return true;
    if (element.isContentEditable) return true;
    if (tag !== "input") return false;
    const type = (element.getAttribute("type") || "text").toLowerCase();
    return ![
      "button",
      "checkbox",
      "color",
      "file",
      "hidden",
      "image",
      "radio",
      "range",
      "reset",
      "submit",
    ].includes(type);
  }

  function fieldValue(element) {
    if (!element) return "";
    const type = (element.getAttribute && element.getAttribute("type") || "").toLowerCase();
    if (type === "password") return "[password hidden]";
    if (element.isContentEditable) return trim(element.innerText || element.textContent || "", 500);
    return trim(element.value || "", 500);
  }

  function flushField(reason) {
    if (flushTimer) {
      window.clearTimeout(flushTimer);
      flushTimer = null;
    }
    if (!currentField) return;
    const { target, value } = currentField;
    currentField = null;
    if (!value) return;
    emit({
      kind: "type",
      target,
      value,
      reason: reason || "input",
    });
  }

  function scheduleFlush() {
    if (flushTimer) window.clearTimeout(flushTimer);
    flushTimer = window.setTimeout(() => flushField("pause"), 1200);
  }

  function onClick(event) {
    emit({
      kind: "click",
      target: descriptorFor(event.target),
      elementHtml: htmlForClick(event.target),
      button: event.button,
    });
  }

  function onInput(event) {
    const target = event.target;
    if (!isTextField(target)) return;
    const descriptor = descriptorFor(target);
    if (currentField && currentField.target !== descriptor) flushField("field-change");
    currentField = {
      target: descriptor,
      value: fieldValue(target),
    };
    scheduleFlush();
  }

  function onChange(event) {
    const target = event.target;
    if (!isTextField(target)) return;
    const descriptor = descriptorFor(target);
    currentField = {
      target: descriptor,
      value: fieldValue(target),
    };
    flushField("change");
  }

  function onKeyDown(event) {
    if (!MEANINGFUL_KEYS.has(event.key)) return;
    if (event.key === "Tab" || event.key === "Enter") flushField(event.key.toLowerCase());
    emit({
      kind: "key",
      key: event.key,
      target: descriptorFor(event.target),
    });
  }

  function onFocusOut() {
    flushField("blur");
  }

  function onSubmit(event) {
    flushField("submit");
    emit({
      kind: "submit",
      target: descriptorFor(event.target),
    });
  }

  document.addEventListener("click", onClick, { capture: true, passive: true });
  document.addEventListener("input", onInput, { capture: true, passive: true });
  document.addEventListener("change", onChange, { capture: true, passive: true });
  document.addEventListener("keydown", onKeyDown, { capture: true, passive: true });
  document.addEventListener("focusout", onFocusOut, { capture: true, passive: true });
  document.addEventListener("submit", onSubmit, { capture: true, passive: true });
})();
`
