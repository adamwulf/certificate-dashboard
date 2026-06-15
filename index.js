// Enable promise error logging
require('promise/lib/rejection-tracking').enable();

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
  console.log('Loading: ', process.env.MONITORED_CERT_HOSTS);
}

var express = require('express');
var app = express();
var certificate = require('./src/certificate')
var monitoredHosts = require('./src/monitored-hosts.js')

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// Render the page shell immediately; the browser fetches certs one host at a
// time via the API below so the page is never blocked by a slow/timing-out host.
app.get('/', function(request, response) {
  response.render('pages/index', { runDate: new Date().toDateString() });
});

// Returns the list of hosts the client should fetch, in order.
app.get('/api/hosts', function(request, response) {
  response.json({ hosts: monitoredHosts, runDate: new Date().toDateString() });
});

// Fetches the certificate info for a single host.
app.get('/api/cert', function(request, response) {
  var host = request.query.host;

  if (!host || monitoredHosts.indexOf(host) === -1) {
    response.status(400).json({ error: 'Unknown or missing host' });
    return;
  }

  certificate.getCertificationDataForHost(host).then(function(data) {
    response.json(data);
  });
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});


