document.addEventListener('DOMContentLoaded', () => {
  console.log('Renderer loaded, requesting file content...');
  window.workerElectronBridge.listenForScanRequest((message) => {
    console.log('Body of handling work');
    console.log(message);
  });
});
