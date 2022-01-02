var Promise = require('promise');
var https = require('https');
var Utils = require('./utils.js');
var http = require('http');
const config = require('./config');
const monitoredHosts = require('./monitored-hosts.js');

function getCertificationData() {
  var promises = [];

  for (var i = 0; i < monitoredHosts.length; ++i) {
    var host = monitoredHosts[i];
    promises.push(_getRequestPromise(host));
  }

  return new Promise(function(resolve, reject) {
    Promise.all(promises).then(function(values) {
      var data = {};
      for(var i = 0; i < values.length; i++) {
        var index = i+1;
        data[index] = values[i]
      }

      resolve(data);
    });
  });
};

function _getRequestPromise(host) {
  return new Promise(function(resolve, reject) {
    var req = https.request({ hostname: host, path: '/', port: 443, method: 'GET', agent: false });
    req.setTimeout(config.connectionTimeout);

    req.on('response',  function (res) {
      var cert = res.connection.getPeerCertificate();
      var certificateInfo = _getCertificateInfo(host, cert);

      resolve(certificateInfo);
    });

    req.on('timeout',  function (err) {
      this.abort();
      resolve(_getCertificateInfo(host, _errorCert(host, "timeout")))
    });

    req.on('error', function(err) {
      if(err.code == 'ECONNREFUSED') {
        resolve(_getCertificateInfo(host, _errorCert(host, err.code)));
      } else {
        resolve(_getCertificateInfo(host, _errorCert(host, err.code)));
      }
    });
    req.end()
  });
}

function _errorCert(host, err) {
  return {
    'server': host,
    'subject': {
      'org': '-',
      'common_name': '-',
      'sans': '-'
    },
    'issuer': {
      'org': '-',
      'common_name': 'Error fetching cert: ' + err
    },
    'info': {
      'valid_from': new Date(Date.now() - 86400000),
      'valid_to': new Date(Date.now() - 86400000),
      'days_left': '??'
    }
  };
}

function _getCertificateInfo(host, certificate) {
  return {
    'server': host,
    'subject': {
      'org': certificate.subject ? certificate.subject.O : '-',
      'common_name': certificate.subject ? certificate.subject.CN : '-',
      'sans': certificate.subject ? certificate.subjectaltname : '-'
    },
    'issuer': {
      'org': certificate.issuer ? certificate.issuer.O : '-',
      'common_name': certificate.issuer ? certificate.issuer.CN : 'Unknown issuer'
    },
    'info': {
      'valid_from': Utils.parseDate(certificate.valid_from),
      'valid_to': Utils.parseDate(certificate.valid_to),
      'days_left': certificate.valid_to ? Utils.getDaysLeft(certificate.valid_to): '??'
    }
  };
}

module.exports = {
  getCertificationData: getCertificationData
};
