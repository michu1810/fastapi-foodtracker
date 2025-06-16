export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error("❌ Błąd zapisu do localStorage:", err);
  }
}

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (err) {
    console.error("❌ Błąd odczytu z localStorage:", err);
    return defaultValue;
  }
}

export function clearStorageKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.error("❌ Błąd czyszczenia localStorage:", err);
  }
}