import { json } from "../_lib/http.js";

const DEFAULT_SETTINGS = {
  backgroundColor: "#000000",
  textColor: "#ff0000",
  fontStyle: "gothic",
};

export async function onRequestGet({ env }) {
  const [settingsRows, tags, entries] = await Promise.all([
    env.DB.prepare("SELECT key, value FROM settings").all(),
    env.DB.prepare("SELECT id, name, sort_order AS sortOrder FROM tags ORDER BY sort_order, id").all(),
    env.DB.prepare(
      "SELECT id, name, description, sort_order AS sortOrder, tag_id AS tagId FROM entries ORDER BY sort_order, id",
    ).all(),
  ]);
  const settings = { ...DEFAULT_SETTINGS };
  for (const row of settingsRows.results) {
    if (Object.hasOwn(settings, row.key)) settings[row.key] = row.value;
  }
  return json({ settings, tags: tags.results, entries: entries.results });
}
