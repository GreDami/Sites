/* SUBLIMOTORS — petits scripts du site (menu, horaires, stock, formulaire) */
(function () {
  'use strict';

  /* ---------- Menu mobile ---------- */

  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');

  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.sr-only').textContent = open ? 'Fermer le menu' : 'Ouvrir le menu';
    document.body.classList.toggle('nav-open', open);
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
        setMenu(false);
        toggle.focus();
      }
    });
    window.matchMedia('(min-width: 960px)').addEventListener('change', function (mq) {
      if (mq.matches) setMenu(false);
    });
  }

  /* ---------- Année du copyright ---------- */

  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- Horaires : ouvert / fermé (heure de Paris) ---------- */

  // 0 = dimanche. Du lundi au samedi, 10h00 – 19h00.
  var OPEN = 10 * 60;
  var CLOSE = 19 * 60;
  var OPEN_DAYS = [1, 2, 3, 4, 5, 6];

  function parisNow() {
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    try {
      var parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Paris',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
      }).formatToParts(new Date());
      var get = function (type) {
        return parts.find(function (p) { return p.type === type; }).value;
      };
      return { day: days.indexOf(get('weekday')), minutes: Number(get('hour')) * 60 + Number(get('minute')) };
    } catch (err) {
      var d = new Date();
      return { day: d.getDay(), minutes: d.getHours() * 60 + d.getMinutes() };
    }
  }

  var now = parisNow();
  var openToday = OPEN_DAYS.indexOf(now.day) !== -1;
  var isOpen = openToday && now.minutes >= OPEN && now.minutes < CLOSE;
  var statusText;

  if (isOpen) {
    statusText = 'Ouvert en ce moment · jusqu’à 19h';
  } else if (openToday && now.minutes < OPEN) {
    statusText = 'Fermé · ouvre aujourd’hui à 10h';
  } else if (now.day === 6 || now.day === 0) {
    statusText = 'Fermé · réouverture lundi à 10h';
  } else {
    statusText = 'Fermé · réouverture demain à 10h';
  }

  document.querySelectorAll('[data-status]').forEach(function (el) {
    el.classList.add(isOpen ? 'is-open' : 'is-closed');
    var label = el.querySelector('[data-status-text]');
    if (label) label.textContent = statusText;
  });

  document.querySelectorAll('.hours tr[data-day="' + now.day + '"]').forEach(function (row) {
    row.classList.add('is-today');
  });

  /* ---------- Page véhicules : filtres et tri ---------- */

  var stock = document.querySelector('[data-stock]');

  if (stock) {
    var cars = Array.prototype.slice.call(stock.querySelectorAll('.car-row'));
    var chips = document.querySelectorAll('[data-type-filter]');
    var fuelSelect = document.getElementById('filtre-energie');
    var sortSelect = document.getElementById('tri');
    var countEl = document.querySelector('[data-stock-count]');
    var emptyEl = document.querySelector('[data-stock-empty]');
    var currentType = 'tous';

    chips.forEach(function (chip) {
      var type = chip.getAttribute('data-type-filter');
      var n = type === 'tous' ? cars.length : cars.filter(function (c) { return c.dataset.type === type; }).length;
      var badge = chip.querySelector('.chip-count');
      if (badge) badge.textContent = n;

      chip.addEventListener('click', function () {
        currentType = type;
        chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
        render();
      });
    });

    function render() {
      var fuel = fuelSelect.value;
      var sort = sortSelect.value.split('-'); // ex. "price-desc"
      var key = sort[0];
      var dir = sort[1] === 'desc' ? -1 : 1;

      var visible = cars.filter(function (c) {
        return (currentType === 'tous' || c.dataset.type === currentType) &&
               (fuel === 'toutes' || c.dataset.fuel === fuel);
      });

      visible.sort(function (a, b) {
        return (Number(a.dataset[key]) - Number(b.dataset[key])) * dir;
      });

      cars.forEach(function (c) { c.hidden = true; });
      visible.forEach(function (c) {
        c.hidden = false;
        stock.appendChild(c);
      });

      countEl.textContent = visible.length + (visible.length > 1 ? ' véhicules' : ' véhicule');
      emptyEl.hidden = visible.length > 0;
    }

    fuelSelect.addEventListener('change', render);
    sortSelect.addEventListener('change', render);
    render();
  }

  /* ---------- Page contact : formulaire ---------- */

  var form = document.getElementById('contact-form');

  if (form) {
    var subject = form.querySelector('#sujet');
    var vehicleField = form.querySelector('#vehicule');
    var extra = form.querySelector('[data-extra]');
    var success = document.querySelector('[data-form-success]');

    // Pré-remplissage depuis les liens du site : contact.html?sujet=reprise&vehicule=…
    var params = new URLSearchParams(window.location.search);
    var wanted = params.get('sujet');
    if (wanted && Array.prototype.some.call(subject.options, function (o) { return o.value === wanted; })) {
      subject.value = wanted;
    }
    if (params.get('vehicule')) vehicleField.value = params.get('vehicule');

    function toggleExtra() {
      var show = subject.value === 'reprise' || subject.value === 'depot-vente';
      extra.hidden = !show;
    }
    subject.addEventListener('change', toggleExtra);
    toggleExtra();

    // Sans serveur, la demande part par e-mail (logiciel de messagerie du visiteur).
    // Pour un envoi direct, il suffira de brancher l'attribut action sur un service de formulaire.
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var val = function (name) { return (data.get(name) || '').toString().trim(); };
      var subjectLabel = subject.options[subject.selectedIndex].text;

      var lines = [
        'Bonjour,',
        '',
        val('message') || '(pas de message)',
        '',
        '—',
        'Objet : ' + subjectLabel
      ];
      if (val('vehicule')) lines.push('Véhicule concerné : ' + val('vehicule'));
      if (!extra.hidden) {
        if (val('modele')) lines.push('Mon véhicule : ' + val('modele'));
        if (val('annee')) lines.push('Année : ' + val('annee'));
        if (val('kilometrage')) lines.push('Kilométrage : ' + val('kilometrage') + ' km');
      }
      lines.push('Nom : ' + val('nom'));
      lines.push('Téléphone : ' + val('telephone'));
      if (val('email')) lines.push('E-mail : ' + val('email'));

      var href = 'mailto:sublimotors92@gmail.com' +
        '?subject=' + encodeURIComponent('Demande via le site : ' + subjectLabel) +
        '&body=' + encodeURIComponent(lines.join('\n'));

      window.location.href = href;
      success.hidden = false;
    });
  }
})();
