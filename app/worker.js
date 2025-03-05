document.addEventListener('DOMContentLoaded', () => {
  window.workerElectronBridge.listenForScanRequest((message) => {
    /* Placeholder for callback, if needed */
  });
});
