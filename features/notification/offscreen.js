
/**
 * WeCal Sync - Offscreen Audio Player
 * 职责：在后台播放高频警报音（因为 Service Worker 无法直接访问 AudioContext）
 */

// 监听来自后台的消息来触发声音
chrome.runtime.onMessage.addListener((message) => {
  if (message.target === 'offscreen' && message.type === 'PLAY_BEEP') {
    playAlarmSequence();
  }
});

function playAlarmSequence() {
  // 创建音频上下文
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  // 定义播放单音符的函数
  const playTone = (freq, startTime, duration) => {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = 'square'; // 使用方波，听起来更刺耳响亮，适合警报
    oscillator.frequency.setValueAtTime(freq, startTime);
    
    // 音量包络：淡入 -> 保持 -> 淡出
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
    gainNode.gain.setValueAtTime(0.3, startTime + duration - 0.02);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  };

  const now = audioCtx.currentTime;
  // 模拟警报器的高低交替音，共响4组，每组0.4秒
  // 嘀-嘟-嘀-嘟...
  for(let i=0; i<4; i++) {
    const start = now + (i * 0.5);
    playTone(987.77, start, 0.2);       // 高音 B5
    playTone(783.99, start + 0.25, 0.2); // 低音 G5
  }
}
