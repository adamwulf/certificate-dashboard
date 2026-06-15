$(function () {
  var $container = $('#container');
  var runDate = $container.data('rundate');

  $('#created_date').html(runDate);

  var card_html = String()
    +'<div class="col-xs-12 col-md-6 col-xl-4">'
    +'  <div class="card text-xs-center" style="border-color:#333;">'
    +'    <div class="card-header" style="overflow:hidden;">'
    +'      <h4 class="text-muted" style="margin-bottom:0;">{{server}}</h4>'
    +'    </div>'
    +'    <div class="card-block {{background}}">'
    +'      <h1 class="card-text display-4" style="margin-top:0;margin-bottom:-1rem;">{{days_left}}</h1>'
    +'      <p class="card-text" style="margin-bottom:.75rem;"><small>days left</small></p>'
    +'    </div>'
    +'    <div class="card-footer">'
    +'      <h6 class="text-muted" style="margin-bottom:.5rem;">Issued by: {{issuer}}</h6>'
    +'      <h6 class="text-muted" style=""><small>{{issuer_cn}}</small></h6>'
    +'      <h6 class="text-muted" style="margin-bottom:0;"><small>{{common_name}}</small></h6>'
    +'    </div>'
    +'  </div>'
    +'</div>';

  var card_template = Handlebars.compile(card_html);

  // Cards are rendered in arrival order, which is the host order from .env
  // (the load is strictly serial down that list).

  function background_class(days_left) {
    if (days_left === "??") {
      return 'card-inverse card-info';
    } else if (days_left <= 30) {
      return 'card-inverse card-danger';
    } else if (days_left > 30 && days_left <= 60) {
      return 'card-inverse card-warning';
    } else {
      return 'card-inverse card-success';
    }
  }

  function append_card(element) {
    var json = {
      'server': element.server,
      'days_left': element.info.days_left,
      'issuer': element.issuer.org,
      'common_name': element.subject.common_name,
      'issuer_cn': element.issuer.common_name,
      'background': background_class(element.info.days_left)
    };
    $('#panel').append(card_template(json));
  }

  // Fetch one host's cert. Resolves even on AJAX failure so a single bad host
  // never stops the serial chain.
  function fetch_cert(host) {
    return $.getJSON('/api/cert', { host: host })
      .then(function (data) {
        return data;
      }, function () {
        return {
          'server': host,
          'subject': { 'org': '-', 'common_name': '-', 'sans': '-' },
          'issuer': { 'org': '-', 'common_name': 'Error fetching cert' },
          'info': { 'days_left': '??' }
        };
      });
  }

  // Walk the host list strictly serially: each request finishes (and its card
  // is rendered) before the next one starts.
  function load_serially(hosts) {
    var index = 0;

    function next() {
      if (index >= hosts.length) {
        $('#loading').hide();
        return;
      }

      var host = hosts[index];
      $('#loading_progress').text((index + 1) + ' of ' + hosts.length + ': ' + host);

      fetch_cert(host).then(function (cert) {
        append_card(cert);
        index++;
        next();
      });
    }

    next();
  }

  $.getJSON('/api/hosts').then(function (data) {
    if (data.runDate) {
      $('#created_date').html(data.runDate);
    }
    load_serially(data.hosts);
  }, function () {
    $('#loading').text('Failed to load host list.');
  });
});
