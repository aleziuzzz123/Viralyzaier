// This file is part of the CreativeEditor SDK.
// The original content is typically loaded from the IMG.LY CDN.
// This placeholder provides a valid worker structure to prevent loading errors.
self.onmessage = function(e) {
  // A simple worker that acknowledges messages.
  // This prevents syntax errors but does not replicate full functionality.
  self.postMessage('Worker received: ' + e.data);
};
