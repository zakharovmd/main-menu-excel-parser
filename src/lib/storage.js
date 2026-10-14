/**
 * Сохранённые меню живут в localStorage этого браузера: файл загружается
 * один раз, дальше правки сохраняются автоматически.
 */
const KEY = "main-menu-pdf:v1";

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { docs: [], activeId: null };
    const data = JSON.parse(raw);
    return { docs: Array.isArray(data.docs) ? data.docs : [], activeId: data.activeId ?? null };
  } catch {
    return { docs: [], activeId: null };
  }
}

/** Возвращает текст ошибки, если сохранить не удалось (например, кончилось место). */
export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return null;
  } catch (e) {
    return e?.name === "QuotaExceededError"
      ? "В браузере закончилось место — удалите старые меню"
      : "Не удалось сохранить в браузере";
  }
}
