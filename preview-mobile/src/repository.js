import { DEFAULT_CATEGORIES, APP_ID } from "./book-logic.js";
import { demoBooks } from "./demo-data.js";
export const DEMO_KEY = "reading-journal-v2-demo";
export function createDemoRepository(storage) {
  let data = {
    books: structuredClone(demoBooks),
    categories: [...DEFAULT_CATEGORIES],
  };
  try {
    const saved = JSON.parse(storage.getItem(DEMO_KEY));
    if (saved && Array.isArray(saved.books) && Array.isArray(saved.categories))
      data = saved;
  } catch {}
  let listener = () => {};
  const emit = () => listener(structuredClone(data));
  const commit = (next) => {
    storage.setItem(DEMO_KEY, JSON.stringify(next));
    data = next;
    emit();
  };
  return {
    mode: "demo",
    subscribe(fn) {
      listener = fn;
      emit();
      return () => (listener = () => {});
    },
    async add(book) {
      const id = globalThis.crypto?.randomUUID?.() || "book-" + Date.now();
      commit({
        ...data,
        books: [
          ...data.books,
          {
            ...book,
            id,
            status: "reading",
            createdAt: { seconds: Date.now() / 1000 },
          },
        ],
      });
      return id;
    },
    async update(id, patch) {
      commit({
        ...data,
        books: data.books.map((b) => (b.id === id ? { ...b, ...patch } : b)),
      });
    },
    async remove(id) {
      commit({ ...data, books: data.books.filter((b) => b.id !== id) });
    },
    async categories(categories) {
      commit({ ...data, categories });
    },
    async reset() {
      commit({
        books: structuredClone(demoBooks),
        categories: [...DEFAULT_CATEGORIES],
      });
    },
  };
}
export async function loadCloud() { throw new Error("這是獨立示範版，未連接正式書櫃。"); }

export async function lookupBook(title, author) {
  const q = `intitle:${title}${author ? `+inauthor:${author}` : ""}`;
  const response = await fetch(
    "https://www.googleapis.com/books/v1/volumes?q=" +
      encodeURIComponent(q) +
      "&maxResults=1",
  );
  if (!response.ok) throw Error("查找服務暫時無法使用，請稍後再試");
  const json = await response.json();
  const info = json.items?.[0]?.volumeInfo;
  if (!info) throw Error("沒有找到這本書的資料");
  return {
    author: info.authors?.[0] || "",
    wordCount: (info.pageCount || 0) * 350,
    synopsis: info.description || "",
  };
}
