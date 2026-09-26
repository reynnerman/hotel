try {
  const fs = require('fs');
  const code = fs.readFileSync('public/app.js', 'utf8');
  new require('vm').Script(code);
} catch (e) {
  console.log(e.stack);
}
