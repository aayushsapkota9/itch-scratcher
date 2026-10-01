// Offscreen Web Audio Processor for ItchScratcher
const capturedTabs = new Map();

chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  if (message?.target !== 'offscreen') return;

  const { type, tabId, streamId, volume } = message;

  if (type === 'start-capture' && tabId && streamId) {
    if (capturedTabs.has(tabId)) {
      const entry = capturedTabs.get(tabId);
      if (entry && entry.gainNode) {
        entry.gainNode.gain.value = volume;
      }
      return;
    }

    navigator.mediaDevices
      .getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'tab',
            chromeMediaSourceId: streamId,
          },
        },
        video: false,
      })
      .then((stream) => {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = volume;

        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        capturedTabs.set(tabId, { audioCtx, stream, gainNode });

        stream.getAudioTracks().forEach((track) => {
          track.onended = () => {
            try {
              audioCtx.close();
            } catch (e) {}
            capturedTabs.delete(tabId);
          };
        });
      })
      .catch((err) => {
        console.warn('[ItchScratcher Offscreen] Tab capture failed:', err);
      });
  }

  if (type === 'set-volume' && tabId !== undefined) {
    if (capturedTabs.has(tabId)) {
      const entry = capturedTabs.get(tabId);
      if (entry && entry.gainNode) {
        entry.gainNode.gain.value = volume;
      }
    }
  }

  if (type === 'stop-capture' && tabId !== undefined) {
    if (capturedTabs.has(tabId)) {
      const entry = capturedTabs.get(tabId);
      if (entry) {
        try {
          entry.stream.getTracks().forEach((t) => t.stop());
          entry.audioCtx.close();
        } catch (e) {}
        capturedTabs.delete(tabId);
      }
    }
  }
});
