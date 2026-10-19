/* Mode admin : édition directe du site, publication dans le dépôt GitHub */
(function () {
  'use strict';
  var OWNER = 'gada-daniel', REPO = 'Portfolio', KEY = 'portfolio-admin-token';
  var API = 'https://api.github.com';
  var EDIT = 'header .wrap h1,header .wrap p,main h1,main h2,main h3,main h4,main p,main li,main td,main th,main figcaption,main .chip,main .more,main .etat,main .facts div,main .gantt div,main .crumb,.btn';
  var on = false, dirty = false, started = false, bar, msg;

  function getTok() { try { return sessionStorage.getItem(KEY) || localStorage.getItem(KEY); } catch (e) { return null; } }
  function setTok(t, keep) { try { sessionStorage.setItem(KEY, t); if (keep) localStorage.setItem(KEY, t); } catch (e) {} }
  function clearTok() { try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch (e) {} }
  function q(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function ui(tag, cls, html) { var e = document.createElement(tag); e.className = 'admin-ui ' + (cls || ''); if (html) e.innerHTML = html; return e; }
  function say(t, bad) { if (msg) { msg.textContent = t; msg.className = bad ? 'bad' : ''; } }
  function gh(path, opt) {
    opt = opt || {};
    opt.headers = Object.assign({ 'Authorization': 'Bearer ' + getTok(), 'Accept': 'application/vnd.github+json' }, opt.headers || {});
    return fetch(API + path, opt);
  }
  function b64(s) { return btoa(unescape(encodeURIComponent(s))); }

  /* ---------- Connexion ---------- */
  function showLogin() {
    if (document.getElementById('adm-login')) return;
    var o = ui('div', 'adm-overlay');
    o.id = 'adm-login';
    o.innerHTML = '<form class="adm-box"><h2>Connexion administrateur</h2>' +
      '<p>Colle ton token GitHub. Il reste dans ton navigateur et ne sert qu\'à enregistrer tes modifications.</p>' +
      '<label for="adm-token">Token GitHub</label><input id="adm-token" type="password" autocomplete="off" required>' +
      '<label class="adm-check"><input id="adm-keep" type="checkbox"> Rester connecté sur cet appareil</label>' +
      '<p id="adm-err" class="bad" role="alert"></p>' +
      '<div class="adm-row"><button type="submit" class="adm-btn pri">Connexion</button><button type="button" class="adm-btn" data-act="cancel">Annuler</button></div>' +
      '<details><summary>Comment obtenir mon token ?</summary><ol>' +
      '<li>Sur github.com : ta photo, puis <b>Settings</b>, puis <b>Developer settings</b>.</li>' +
      '<li><b>Personal access tokens</b>, puis <b>Fine-grained tokens</b>, puis <b>Generate new token</b>.</li>' +
      '<li><b>Repository access</b> : Only select repositories, puis choisis <b>Portfolio</b>.</li>' +
      '<li><b>Permissions</b>, <b>Repository permissions</b>, <b>Contents</b> : Read and write.</li>' +
      '<li>Clique sur Generate token et copie-le ici.</li></ol></details></form>';
    document.body.appendChild(o);
    var f = o.querySelector('form');
    document.getElementById('adm-token').focus();
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var t = document.getElementById('adm-token').value.trim(), err = document.getElementById('adm-err');
      err.textContent = 'Vérification...';
      login(t).then(function () { setTok(t, document.getElementById('adm-keep').checked); o.remove(); start(); })
        .catch(function (x) { err.textContent = x.message; });
    });
  }
  function login(t) {
    return fetch(API + '/user', { headers: { 'Authorization': 'Bearer ' + t } }).then(function (r) {
      if (!r.ok) throw new Error('Token refusé. Vérifie-le et réessaie.');
      return r.json();
    }).then(function (u) {
      if (String(u.login).toLowerCase() !== OWNER) throw new Error('Ce compte n\'est pas le propriétaire du site.');
      return fetch(API + '/repos/' + OWNER + '/' + REPO, { headers: { 'Authorization': 'Bearer ' + t } });
    }).then(function (r) {
      if (!r.ok) throw new Error('Ce token n\'a pas accès au dépôt Portfolio.');
    });
  }

  /* ---------- Mode édition ---------- */
  function start() {
    if (started) return;
    started = true; on = true;
    document.body.classList.add('admin-edit');
    bar = ui('div', 'adm-bar');
    bar.innerHTML = '<b>Mode admin</b><button class="adm-btn" data-act="toggle" aria-pressed="true">Édition : oui</button>' +
      '<button class="adm-btn pri" data-act="publish">Publier cette page</button>' +
      '<button class="adm-btn" data-act="reload">Annuler</button><button class="adm-btn" data-act="logout">Déconnexion</button><span id="adm-msg" role="status"></span>';
    document.body.appendChild(bar);
    msg = bar.querySelector('#adm-msg');
    say('Clique sur un texte pour le modifier.');
    setEditable(true); decorate();
  }
  function setEditable(v) {
    q(EDIT).forEach(function (e) {
      if (e.closest('.admin-ui')) return;
      if (v) { e.setAttribute('contenteditable', 'true'); e.setAttribute('spellcheck', 'true'); }
      else e.removeAttribute('contenteditable');
    });
  }
  function decorate() {
    q('.adm-tools,.adm-cell,.adm-add').forEach(function (n) { n.remove(); });
    q('.grid > .card,.grid > a.card,.proj,.shots > .shot,figure.fig').forEach(function (n) {
      var img = n.matches('.shot,figure.fig') ? '<button data-act="img" title="Mettre une image">Image</button>' : '';
      var dup = n.matches('figure.fig') ? '' : '<button data-act="dup" title="Dupliquer">Copier</button>';
      n.appendChild(ui('span', 'adm-tools', img + dup + '<button data-act="del" title="Supprimer">Suppr.</button>'));
    });
    q('tbody tr').forEach(function (tr) { tr.appendChild(ui('td', 'adm-cell', '<button data-act="delrow" title="Supprimer la ligne">Suppr.</button>')); });
    q('.scroll').forEach(function (s) {
      if (s.querySelector('table')) s.insertAdjacentElement('afterend', ui('div', 'adm-add', '<button class="adm-btn" data-act="addrow">+ Ajouter une ligne</button>'));
    });
    if (on) setEditable(true);
  }

  /* ---------- Actions ---------- */
  document.addEventListener('click', function (e) {
    var open = e.target.closest('#admin-open');
    if (open) { e.preventDefault(); if (started) return; if (getTok()) start(); else showLogin(); return; }
    var b = e.target.closest('.admin-ui [data-act]');
    if (b) { e.preventDefault(); act(b.getAttribute('data-act'), b); return; }
    if (on) {
      var a = e.target.closest('a');
      if (a && !a.closest('nav') && !a.closest('.admin-ui')) e.preventDefault();
    }
  }, true);

  function act(a, b) {
    var node;
    if (a === 'cancel') { var o = document.getElementById('adm-login'); if (o) o.remove(); }
    else if (a === 'toggle') { on = !on; setEditable(on); document.body.classList.toggle('admin-edit', on); b.textContent = 'Édition : ' + (on ? 'oui' : 'non'); b.setAttribute('aria-pressed', on); }
    else if (a === 'reload') { dirty = false; location.reload(); }
    else if (a === 'logout') { clearTok(); dirty = false; location.reload(); }
    else if (a === 'publish') publish();
    else if (a === 'dup') { node = b.closest('.card,.proj,.shot'); var c = node.cloneNode(true); q('.admin-ui', c).forEach(function (x) { x.remove(); }); node.insertAdjacentElement('afterend', c); dirty = true; decorate(); }
    else if (a === 'del') { if (confirm('Supprimer ce bloc ?')) { b.closest('.card,.proj,.shot,figure').remove(); dirty = true; } }
    else if (a === 'delrow') { if (confirm('Supprimer cette ligne ?')) { b.closest('tr').remove(); dirty = true; } }
    else if (a === 'addrow') {
      var t = b.closest('.adm-add').previousElementSibling.querySelector('table'), body = t.tBodies[0], last = body.rows[body.rows.length - 1];
      var row = last ? last.cloneNode(true) : document.createElement('tr');
      q('.admin-ui', row).forEach(function (x) { x.remove(); });
      q('td', row).forEach(function (td) { td.innerHTML = '<span class="todo">à compléter</span>'; });
      body.appendChild(row); dirty = true; decorate();
    }
    else if (a === 'img') pickImage(b.closest('.shot,figure.fig'));
  }

  document.addEventListener('input', function () { if (on) dirty = true; });
  document.addEventListener('paste', function (e) {
    if (!on || !e.target.closest || !e.target.closest('[contenteditable="true"]')) return;
    e.preventDefault();
    document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain'));
  });
  document.addEventListener('dblclick', function (e) {
    if (!on) return;
    var a = e.target.closest('a');
    if (!a || a.closest('nav') || a.closest('.admin-ui')) return;
    var u = prompt('Adresse du lien :', a.getAttribute('href') || '');
    if (u !== null) { a.setAttribute('href', u); dirty = true; }
  });
  window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- Images ---------- */
  function pickImage(node) {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = function () {
      var f = inp.files[0]; if (!f) return;
      if (f.size > 4 * 1024 * 1024) { say('Image trop lourde (4 Mo maximum).', true); return; }
      var alt = prompt('Décris l\'image en une phrase :', '') || 'Capture';
      var rd = new FileReader();
      rd.onload = function () {
        var data = rd.result, name = Date.now() + '-' + f.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
        say('Envoi de l\'image...');
        gh('/repos/' + OWNER + '/' + REPO + '/contents/images/' + name, { method: 'PUT', body: JSON.stringify({ message: 'Ajout de l\'image ' + name, content: data.split(',')[1] }) })
          .then(function (r) {
            if (!r.ok) throw new Error('Envoi impossible (' + r.status + ')');
            var img = node.querySelector('img');
            if (!img) { q('*', node).forEach(function (c) { if (!c.closest('.admin-ui') && !c.classList.contains('admin-ui')) c.remove(); }); node.childNodes.forEach(function (n) { if (n.nodeType === 3) n.remove(); }); img = document.createElement('img'); node.insertBefore(img, node.firstChild); }
            img.src = data; img.alt = alt; img.setAttribute('data-final', 'images/' + name);
            dirty = true; say('Image ajoutée. Clique sur Publier cette page.');
          }).catch(function (x) { say(x.message, true); });
      };
      rd.readAsDataURL(f);
    };
    inp.click();
  }

  /* ---------- Publication ---------- */
  function cleanHtml() {
    var c = document.documentElement.cloneNode(true);
    q('.admin-ui', c).forEach(function (n) { n.remove(); });
    q('[contenteditable]', c).forEach(function (n) { n.removeAttribute('contenteditable'); n.removeAttribute('spellcheck'); });
    q('[data-final]', c).forEach(function (i) { i.setAttribute('src', i.getAttribute('data-final')); i.removeAttribute('data-final'); });
    var body = c.querySelector('body'); body.classList.remove('admin-edit'); if (!body.getAttribute('class')) body.removeAttribute('class');
    q('.todo', c).forEach(function (n) {
      if (!/compl[eé]ter|ajouter/i.test(n.textContent)) { n.classList.remove('todo'); if (!n.getAttribute('class')) n.removeAttribute('class'); }
    });
    return '<!DOCTYPE html>\n' + c.outerHTML + '\n';
  }
  function pagePath() {
    var p = location.pathname.split('/').pop() || 'index.html';
    return /\./.test(p) ? p : p + '.html';
  }
  function publish() {
    var path = pagePath(), url = '/repos/' + OWNER + '/' + REPO + '/contents/' + path, html = cleanHtml();
    say('Publication en cours...');
    gh(url).then(function (r) { return r.ok ? r.json() : null; }).then(function (cur) {
      var body = { message: 'Mise à jour de ' + path + ' (mode admin)', content: b64(html) };
      if (cur && cur.sha) body.sha = cur.sha;
      return gh(url, { method: 'PUT', body: JSON.stringify(body) });
    }).then(function (r) {
      if (r.status === 401 || r.status === 403 || r.status === 404) throw new Error('Le token ne peut pas écrire dans le dépôt. Vérifie la permission Contents : Read and write.');
      if (!r.ok) throw new Error('Échec de la publication (' + r.status + ').');
      dirty = false; say('Publié. Le site se met à jour dans 1 à 2 minutes.');
    }).catch(function (x) { say(x.message, true); });
  }

  if (getTok()) start();
})();
