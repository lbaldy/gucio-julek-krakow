// Web fonts for the menus, registered under fixed family names so the CSS and
// the canvas renderer can refer to them without knowing the files.

export const TITLE_FONT = `"GameTitle", Impact, "Arial Narrow", sans-serif`;
export const MENU_FONT = `"GameMenu", "Courier New", monospace`;

/** Loads the configured fonts; a missing file just leaves the fallback in place. */
export async function loadFonts(fonts: { title?: string; menu?: string } | undefined): Promise<void> {
  const faces = [
    ["GameTitle", fonts?.title],
    ["GameMenu", fonts?.menu],
  ] as const;
  await Promise.all(
    faces.map(async ([family, path]) => {
      if (!path) return;
      try {
        const face = await new FontFace(family, `url("${import.meta.env.BASE_URL}${path}")`).load();
        document.fonts.add(face);
      } catch (e) {
        console.warn(`[fonts] ${path}:`, e);
      }
    }),
  );
}
