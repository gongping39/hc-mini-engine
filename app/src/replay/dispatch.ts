export function dispatchToGame(type:"down"|"up", code:string) {
  // 1) Phaser のキーボードがあれば emit（こちらを優先）
  const anyWin = window as any;
  const kb = anyWin.__phaserKeyboard; // GameScene 初期化時に格納する
  if (kb?.emit) {
    kb.emit(type === "down" ? `keydown-${code}` : `keyup-${code}`, { code });
    return;
  }
  // 2) 汎用フォールバック: DOM に合成イベント（Phaserの拾い方に応じて）
  const ev = new KeyboardEvent(type === "down" ? "keydown" : "keyup", { code, key: code, bubbles:true });
  document.dispatchEvent(ev);
}