/**
 * Rotates which educational loading tip index to show per loading session.
 * Module scope only — no storage, timers, or network.
 */
let rotation = 0

export function nextLoadingEducationIndex(stageCount) {
  if (!stageCount || stageCount < 1) return 0
  const idx = rotation % stageCount
  rotation += 1
  return idx
}
