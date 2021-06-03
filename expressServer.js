const express = require('express')
const path    = require('path')
const app     = express();


app.set('port', (process.env.PORT || 3050));
app.use(express.static(path.join(__dirname, 'gui')))

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'gui/visualizer.html'));
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
  console.log('Open http://localhost:'+ app.get('port') + "/");
});
