export const runWithLimit = async <T>(items: T[], limit: number, worker: (item: T) => Promise<void>) => {
  const executing: Promise<void>[] = [];
  for (const item of items) {
    const p = Promise.resolve().then(() => worker(item)).finally(() => {
      const idx = executing.indexOf(p);
      if (idx >= 0) executing.splice(idx, 1);
    });
    executing.push(p);
    if (executing.length >= limit) await Promise.race(executing);
  }
  await Promise.all(executing);
};
