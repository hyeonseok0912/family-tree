export function createMemoAutosave({ save, onStatus, delay = 1000, schedule = setTimeout, cancel = clearTimeout }) {
  let timer = null;
  let pending = null;
  let revision = 0;
  let disposed = false;
  let queue = Promise.resolve();
  const enqueue = (content, version, clearing = false) => {
    const task = queue.then(async () => {
      try {
        await save(content);
        if (!disposed && version === revision) onStatus(clearing ? "초기화됨" : "저장됨");
        return true;
      } catch {
        if (!disposed && version === revision) onStatus(clearing ? "초기화 실패" : "저장 실패");
        return false;
      }
    });
    queue = task.then(() => {});
    return task;
  };
  const flush = () => {
    if (timer !== null) cancel(timer);
    timer = null;
    if (pending === null) return queue;
    const item = pending;
    pending = null;
    return enqueue(item.content, item.version);
  };
  return {
    change(content) {
      if (disposed) return;
      pending = { content, version: ++revision };
      onStatus("저장 중...");
      if (timer !== null) cancel(timer);
      timer = schedule(flush, delay);
    },
    clear() {
      if (disposed) return Promise.resolve(false);
      if (timer !== null) cancel(timer);
      timer = null;
      pending = null;
      onStatus("초기화 중...");
      return enqueue("", ++revision, true);
    },
    flush,
    dispose() { disposed = true; return flush(); },
  };
}
