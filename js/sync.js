// Sauvegarde en ligne (Supabase) : compte, synchronisation entre appareils.
// L'app continue de fonctionner hors-ligne avec la copie locale (localStorage) ;
// les modifications sont envoyées dès que le réseau est disponible.
// En cas de modifications sur deux appareils, la plus récente l'emporte.
(function () {
  var cfg = window.PB_CONFIG || {};
  var enabled = !!(cfg.supabaseUrl && cfg.supabaseKey && window.supabase);
  var sb = enabled
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;

  var META_KEY = "pb-sync";
  var meta = loadMeta(); // { dirty, lastSync, userId }
  var user = null;
  var status = enabled ? "off" : "disabled"; // disabled | off | ok | pending | syncing | offline | error
  var lastError = "";
  var timer = null, busy = false, again = false;
  var formMsg = "";

  function loadMeta() {
    try { return JSON.parse(localStorage.getItem(META_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveMeta() {
    try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (e) {}
  }

  function hasData(st) {
    if (!st || !st.cycles) return false;
    if (st.cycles.length > 1) return true;
    return st.cycles.some(function (c) {
      return Object.keys(c.weights || {}).some(function (k) { return c.weights[k]; }) ||
        Object.keys(c.done || {}).some(function (k) { return c.done[k]; });
    });
  }

  // ── Statut ──
  function setStatus(s, err) {
    status = s;
    lastError = err || "";
    var dot = document.getElementById("sync-dot");
    if (dot) dot.className = "sync-dot " + s;
    if (document.getElementById("v-account").classList.contains("active")) renderAccount();
  }

  // ── Remplacer l'état local par celui du cloud ──
  function applyRemote(remote) {
    if (!remote || !remote.cycles || !remote.cycles.length) return;
    state = remote;
    if (state.ci >= state.cycles.length) state.ci = state.cycles.length - 1;
    try { localStorage.setItem("pb-v2", JSON.stringify(state)); } catch (e) {}
    if (document.getElementById("v-train").classList.contains("active")) render();
    else if (document.getElementById("v-history").classList.contains("active")) renderHistory();
  }

  // ── Synchronisation (compare local / cloud, garde le plus récent) ──
  function sync() {
    if (!sb || !user) return Promise.resolve();
    if (!navigator.onLine) { setStatus("offline"); return Promise.resolve(); }
    if (busy) { again = true; return Promise.resolve(); }
    busy = true;
    setStatus("syncing");

    return sb.from("app_state").select("state, updated_at").maybeSingle()
      .then(function (res) {
        if (res.error) throw res.error;
        var row = res.data;
        var localT = state.updatedAt || 0;

        // Première synchro de ce compte sur cet appareil
        if (meta.userId !== user.id) {
          meta.userId = user.id;
          saveMeta();
          if (row && hasData(row.state)) {
            var keepLocal = hasData(state) && !confirm(
              "Des données existent déjà dans ton compte.\n\n" +
              "OK : utiliser les données du compte\n" +
              "Annuler : remplacer par les données de cet appareil"
            );
            if (!keepLocal) { applyRemote(row.state); meta.dirty = false; return; }
            state.updatedAt = Date.now();
            return push();
          }
          return push();
        }

        if (!row) return push();
        var remoteT = row.state.updatedAt || new Date(row.updated_at).getTime();
        if (remoteT > localT) { applyRemote(row.state); meta.dirty = false; return; }
        if (localT > remoteT) return push();
        meta.dirty = false;
      })
      .then(function () {
        meta.lastSync = Date.now();
        saveMeta();
        setStatus(meta.dirty ? "pending" : "ok");
      })
      .catch(function (e) {
        setStatus(navigator.onLine ? "error" : "offline", e && e.message);
      })
      .then(function () {
        busy = false;
        if (again) { again = false; sync(); }
      });
  }

  function push() {
    var t = state.updatedAt || Date.now();
    state.updatedAt = t;
    return sb.from("app_state")
      .upsert({ user_id: user.id, state: state, updated_at: new Date(t).toISOString() })
      .then(function (res) {
        if (res.error) throw res.error;
        if ((state.updatedAt || 0) === t) meta.dirty = false; // rien n'a changé pendant l'envoi
      });
  }

  function onLocalChange() {
    meta.dirty = true;
    saveMeta();
    if (!user) return;
    setStatus(navigator.onLine ? "pending" : "offline");
    clearTimeout(timer);
    timer = setTimeout(sync, 1500);
  }

  // ── Écran Compte ──
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var STATUS_TEXT = {
    disabled: "Synchro non configurée (js/config.js)",
    off: "Non connecté",
    ok: "Synchronisé",
    pending: "Modifications en attente d'envoi",
    syncing: "Synchronisation…",
    offline: "Hors-ligne — envoi dès le retour du réseau",
    error: "Erreur de synchronisation"
  };

  function renderAccount() {
    var el = document.getElementById("account-body");
    var h = "";
    if (!enabled) {
      h += '<div class="summary-card"><div class="summary-label">Sauvegarde en ligne</div>' +
        '<div class="acc-text">La synchro n\'est pas encore configurée. Renseigne l\'URL et la clé Supabase dans <b>js/config.js</b>.</div></div>';
    } else if (!user) {
      h += '<div class="summary-card"><div class="summary-label">Sauvegarde en ligne</div>' +
        '<div class="acc-text">Connecte-toi pour sauvegarder tes données et les retrouver sur tous tes appareils.</div>' +
        '<input class="text-input" id="acc-email" type="email" autocomplete="email" placeholder="Email">' +
        '<input class="text-input" id="acc-pass" type="password" autocomplete="current-password" placeholder="Mot de passe (6 caractères min.)">' +
        (formMsg ? '<div class="acc-msg">' + esc(formMsg) + "</div>" : "") +
        '<button class="btn-primary" onclick="PBSync.signIn()">Se connecter</button>' +
        '<button class="btn-secondary" onclick="PBSync.signUp()">Créer un compte</button></div>';
    } else {
      var last = meta.lastSync
        ? new Date(meta.lastSync).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
        : "—";
      h += '<div class="summary-card"><div class="summary-label">Sauvegarde en ligne</div>' +
        '<div class="summary-row"><span class="summary-lift">Compte</span><span class="summary-val">' + esc(user.email) + "</span></div>" +
        '<div class="summary-row"><span class="summary-lift">Statut</span><span class="summary-val"><span class="sync-dot ' + status + '"></span>' + STATUS_TEXT[status] + "</span></div>" +
        '<div class="summary-row"><span class="summary-lift">Dernière synchro</span><span class="summary-val">' + last + "</span></div>" +
        (status === "error" && lastError ? '<div class="acc-msg">' + esc(lastError) + "</div>" : "") +
        "</div>" +
        '<button class="btn-secondary" onclick="PBSync.sync()">Synchroniser maintenant</button>' +
        '<button class="btn-ghost" onclick="PBSync.signOut()">Se déconnecter</button>';
    }
    el.innerHTML = h;
  }

  function translate(msg) {
    if (/invalid login credentials/i.test(msg)) return "Email ou mot de passe incorrect.";
    if (/email not confirmed/i.test(msg)) return "Confirme d'abord ton email (clique sur le lien reçu par mail).";
    if (/already registered/i.test(msg)) return "Un compte existe déjà avec cet email : connecte-toi.";
    if (/password should be at least/i.test(msg)) return "Le mot de passe doit faire au moins 6 caractères.";
    if (/rate limit/i.test(msg)) return "Trop de tentatives, réessaie dans quelques minutes.";
    if (/failed to fetch|network/i.test(msg)) return "Pas de connexion internet.";
    return msg;
  }

  function readForm() {
    var email = document.getElementById("acc-email").value.trim();
    var pass = document.getElementById("acc-pass").value;
    if (!email || !pass) { formMsg = "Renseigne ton email et ton mot de passe."; renderAccount(); return null; }
    return { email: email, password: pass };
  }

  function signIn() {
    var f = readForm(); if (!f) return;
    formMsg = "Connexion…"; renderAccount();
    sb.auth.signInWithPassword(f).then(function (res) {
      formMsg = res.error ? translate(res.error.message) : "";
      renderAccount();
    });
  }

  function signUp() {
    var f = readForm(); if (!f) return;
    formMsg = "Création du compte…"; renderAccount();
    sb.auth.signUp({
      email: f.email,
      password: f.password,
      options: { emailRedirectTo: location.origin + location.pathname }
    }).then(function (res) {
      if (res.error) formMsg = translate(res.error.message);
      else if (!res.data.session) formMsg = "Compte créé ! Clique sur le lien reçu par email pour le confirmer, puis reviens te connecter ici.";
      else formMsg = "";
      renderAccount();
    });
  }

  function signOut() {
    if (!confirm("Se déconnecter ?\n\nTes données restent sur cet appareil et dans ton compte.")) return;
    sb.auth.signOut();
  }

  // ── Démarrage ──
  window.showAccount = function () { showView("v-account"); renderAccount(); };
  window.PBSync = { onLocalChange: onLocalChange, sync: sync, signIn: signIn, signUp: signUp, signOut: signOut };

  setStatus(status);
  if (!sb) return;

  sb.auth.onAuthStateChange(function (event, session) {
    var u = session ? session.user : null;
    var changed = (u && u.id) !== (user && user.id);
    user = u;
    if (!user) { meta.userId = null; saveMeta(); setStatus("off"); return; }
    if (changed) { formMsg = ""; setTimeout(sync, 0); }
  });

  window.addEventListener("online", function () { sync(); });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") sync();
  });
})();
