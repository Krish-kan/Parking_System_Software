
(function(){
  const s = document.createElement('script');
  s.src = 'http://localhost:3000/socket.io/socket.io.js';
  s.onload = () => {
    const ioClient = window.io && window.io('http://localhost:3000');
    if (!ioClient) return;
    window._socket = ioClient;
    console.log('[socket.io] connected');
    ioClient.on('space_update', (msg) => {
      console.log('[space_update]', msg);
      // If a table of lots/spaces exists on the page, we could refresh it here.
      // For simplicity, we dispatch a browser event:
      window.dispatchEvent(new CustomEvent('space_update', { detail: msg }));
    });
  };
  document.head.appendChild(s);
})();
