const fs = require('fs');

let main = fs.readFileSync('src/main.tsx', 'utf8');

main = main.replace(
/window\.addEventListener\('error', \(e\) => \{[\s\S]*?\}\);/g,
`window.addEventListener('error', (e) => {
    if (e.message && (
      e.message.includes('ResizeObserver') || 
      e.message.includes('loop limit exceeded') ||
      e.message.includes('Missing or insufficient permissions') ||
      e.message.includes('permission-denied') ||
      e.message.includes('Uncaught Error in snapshot listener')
    )) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  });

  window.addEventListener('unhandledrejection', (e) => {
    if (e.reason && e.reason.message && (
      e.reason.message.includes('Missing or insufficient permissions') ||
      e.reason.message.includes('permission-denied')
    )) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  });`
);

fs.writeFileSync('src/main.tsx', main);
