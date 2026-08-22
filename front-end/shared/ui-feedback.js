/**
 * shared/ui-feedback.js — the ONE notification system for every app.
 *
 * Replaces every pre-existing popup pattern found across this codebase:
 * raw window.alert()/window.confirm() (15+ call sites), three
 * copy-pasted inline-styled toast() helpers with hardcoded hex colors,
 * a fourth CSS-class-based toast with different timing, HOM's duplicated
 * closeModals()/.modal-overlay pairs, the Patient dashboard's separate
 * openModal/closeModal system, and PRE's six-function popup mess
 * (showError/showPopupError/clearError/clearPopupError/showSuccess/
 * openPatientPopup...). One Material You snackbar + one dialog
 * implementation, used everywhere, so there is exactly one place to get
 * the interaction right.
 *
 * Public API (window.UIFeedback):
 *   toast(message, type)              type: 'success'|'error'|'warning'|'info' (default 'info')
 *   alert({ title, body, confirmLabel }) -> Promise<void>
 *   confirm({ title, body, confirmLabel, cancelLabel, danger }) -> Promise<boolean>
 *
 * Never triggers a native window.alert/confirm/prompt (those block the
 * whole page and cannot be styled) — everything here is a real DOM node.
 */
(function () {
  var ICONS = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  var SNACKBAR_DURATION_MS = 4000;

  function ensureRegion() {
    var region = document.querySelector('.md-snackbar-region');
    if (!region) {
      region = document.createElement('div');
      region.className = 'md-snackbar-region';
      region.setAttribute('aria-live', 'polite');
      region.setAttribute('role', 'status');
      document.body.appendChild(region);
    }
    return region;
  }

  function toast(message, type) {
    type = ICONS[type] ? type : 'info';
    var region = ensureRegion();

    var node = document.createElement('div');
    node.className = 'md-snackbar md-snackbar-' + type;
    node.innerHTML =
      '<span class="md-snackbar-icon" aria-hidden="true">' + ICONS[type] + '</span>' +
      '<span class="md-snackbar-message"></span>' +
      '<button type="button" class="md-snackbar-dismiss" aria-label="Dismiss">✕</button>';
    node.querySelector('.md-snackbar-message').textContent = String(message);
    region.appendChild(node);

    var dismissTimer;
    function dismiss() {
      clearTimeout(dismissTimer);
      node.classList.remove('is-visible');
      node.addEventListener('transitionend', function () {
        if (node.parentNode) node.parentNode.removeChild(node);
      }, { once: true });
      // Fallback in case transitionend never fires (e.g. reduced motion).
      setTimeout(function () {
        if (node.parentNode) node.parentNode.removeChild(node);
      }, 400);
    }
    node.querySelector('.md-snackbar-dismiss').addEventListener('click', dismiss);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        node.classList.add('is-visible');
      });
    });
    dismissTimer = setTimeout(dismiss, SNACKBAR_DURATION_MS);

    return { dismiss: dismiss };
  }

  function openDialog(options) {
    return new Promise(function (resolve) {
      var scrim = document.createElement('div');
      scrim.className = 'md-dialog-scrim';

      var dialog = document.createElement('div');
      dialog.className = 'md-dialog';
      dialog.setAttribute('role', 'alertdialog');
      dialog.setAttribute('aria-modal', 'true');

      var titleId = 'md-dialog-title-' + Math.random().toString(36).slice(2, 9);
      dialog.setAttribute('aria-labelledby', titleId);

      var titleEl = document.createElement('div');
      titleEl.className = 'md-dialog-title';
      titleEl.id = titleId;
      titleEl.textContent = options.title || '';

      var bodyEl = document.createElement('div');
      bodyEl.className = 'md-dialog-body';
      bodyEl.textContent = options.body || '';

      var actionsEl = document.createElement('div');
      actionsEl.className = 'md-dialog-actions';

      function close(result) {
        scrim.classList.remove('is-visible');
        document.removeEventListener('keydown', onKeydown);
        setTimeout(function () {
          if (scrim.parentNode) scrim.parentNode.removeChild(scrim);
        }, 300);
        resolve(result);
      }

      function onKeydown(e) {
        if (e.key === 'Escape') close(options.mode === 'confirm' ? false : undefined);
      }

      if (options.mode === 'confirm') {
        var cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'md-btn md-btn-text';
        cancelBtn.textContent = options.cancelLabel || 'Cancel';
        cancelBtn.addEventListener('click', function () { close(false); });
        actionsEl.appendChild(cancelBtn);

        var confirmBtn = document.createElement('button');
        confirmBtn.type = 'button';
        confirmBtn.className = 'md-btn ' + (options.danger ? 'md-btn-danger' : 'md-btn-filled');
        confirmBtn.textContent = options.confirmLabel || 'Confirm';
        confirmBtn.addEventListener('click', function () { close(true); });
        actionsEl.appendChild(confirmBtn);
      } else {
        var okBtn = document.createElement('button');
        okBtn.type = 'button';
        okBtn.className = 'md-btn md-btn-filled';
        okBtn.textContent = options.confirmLabel || 'OK';
        okBtn.addEventListener('click', function () { close(undefined); });
        actionsEl.appendChild(okBtn);
      }

      dialog.appendChild(titleEl);
      dialog.appendChild(bodyEl);
      dialog.appendChild(actionsEl);
      scrim.appendChild(dialog);
      document.body.appendChild(scrim);
      document.addEventListener('keydown', onKeydown);

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          scrim.classList.add('is-visible');
          actionsEl.lastElementChild.focus();
        });
      });
    });
  }

  function alertDialog(options) {
    return openDialog(Object.assign({ mode: 'alert' }, options));
  }

  function confirmDialog(options) {
    return openDialog(Object.assign({ mode: 'confirm' }, options));
  }

  /**
   * A dialog offering a fixed set of choices as pill buttons (e.g. payment
   * method) instead of asking the user to type an exact string into a
   * native window.prompt(). `options.options` is an array of either plain
   * strings or `{ value, label }` objects. Resolves to the chosen value,
   * or `null` if dismissed/cancelled.
   */
  function selectOneDialog(options) {
    return new Promise(function (resolve) {
      var scrim = document.createElement('div');
      scrim.className = 'md-dialog-scrim';

      var dialog = document.createElement('div');
      dialog.className = 'md-dialog';
      dialog.setAttribute('role', 'alertdialog');
      dialog.setAttribute('aria-modal', 'true');

      var titleEl = document.createElement('div');
      titleEl.className = 'md-dialog-title';
      titleEl.textContent = options.title || '';

      var bodyEl = document.createElement('div');
      bodyEl.className = 'md-dialog-body';
      bodyEl.textContent = options.body || '';

      var choicesEl = document.createElement('div');
      choicesEl.className = 'md-dialog-choices';

      function close(result) {
        scrim.classList.remove('is-visible');
        document.removeEventListener('keydown', onKeydown);
        setTimeout(function () {
          if (scrim.parentNode) scrim.parentNode.removeChild(scrim);
        }, 300);
        resolve(result);
      }
      function onKeydown(e) {
        if (e.key === 'Escape') close(null);
      }

      (options.options || []).forEach(function (opt) {
        var value = typeof opt === 'string' ? opt : opt.value;
        var label = typeof opt === 'string' ? opt : opt.label;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'md-chip md-dialog-choice';
        btn.textContent = label;
        btn.addEventListener('click', function () { close(value); });
        choicesEl.appendChild(btn);
      });

      var actionsEl = document.createElement('div');
      actionsEl.className = 'md-dialog-actions';
      var cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'md-btn md-btn-text';
      cancelBtn.textContent = options.cancelLabel || 'Cancel';
      cancelBtn.addEventListener('click', function () { close(null); });
      actionsEl.appendChild(cancelBtn);

      dialog.appendChild(titleEl);
      if (options.body) dialog.appendChild(bodyEl);
      dialog.appendChild(choicesEl);
      dialog.appendChild(actionsEl);
      scrim.appendChild(dialog);
      document.body.appendChild(scrim);
      document.addEventListener('keydown', onKeydown);

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          scrim.classList.add('is-visible');
          var first = choicesEl.querySelector('button');
          if (first) first.focus();
        });
      });
    });
  }

  window.UIFeedback = {
    toast: toast,
    alert: alertDialog,
    confirm: confirmDialog,
    selectOne: selectOneDialog,
  };
})();
