// Preload script — runs before the web page loads
// No Node.js access exposed to renderer for security

window.addEventListener('DOMContentLoaded', () => {
  // Add electron class to body for CSS targeting
  document.body.classList.add('electron-app');
});
