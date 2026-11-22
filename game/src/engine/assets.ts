// Image loading. Missing images resolve to null and are drawn as placeholders.

export class Images {
  private cache = new Map<string, HTMLImageElement | null>();
  private loading = new Map<string, Promise<void>>();

  /** Loaded image, or null if missing / not loaded yet (a load is started). */
  get(path: string): HTMLImageElement | null {
    if (this.cache.has(path)) return this.cache.get(path)!;
    void this.load(path);
    return null;
  }

  load(path: string): Promise<void> {
    if (this.cache.has(path)) return Promise.resolve();
    let p = this.loading.get(path);
    if (!p) {
      p = new Promise<void>((res) => {
        const img = new Image();
        img.onload = () => {
          this.cache.set(path, img);
          res();
        };
        img.onerror = () => {
          this.cache.set(path, null);
          res();
        };
        img.src = `${import.meta.env.BASE_URL}${path}`;
      });
      this.loading.set(path, p);
    }
    return p;
  }

  loadAll(paths: string[]): Promise<void> {
    return Promise.all(paths.map((p) => this.load(p))).then(() => undefined);
  }

  size = (path: string) => {
    const img = this.cache.get(path);
    return img ? { w: img.naturalWidth, h: img.naturalHeight } : null;
  };
}
