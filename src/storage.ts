import { openDB } from "idb";
import type { Companion } from "./shared";
const db = openDB("aetherkin", 1, {
  upgrade(db) {
    db.createObjectStore("companions", { keyPath: "id" });
  },
});
export async function saveCompanion(companion: Companion) {
  return (await db).put("companions", companion);
}
export async function getCompanions(): Promise<Companion[]> {
  return (await db)
    .getAll("companions")
    .then((items) =>
      items
        .filter((item) => !item.demo)
        .sort((a, b) => b.createdAt - a.createdAt),
    );
}
export async function deleteCompanion(id: string) {
  return (await db).delete("companions", id);
}
