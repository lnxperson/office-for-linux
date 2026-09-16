(function () {
  const api = window.electronAPI;
  const profilesEl = document.getElementById('profiles');
  const newNameEl = document.getElementById('newName');
  const createBtn = document.getElementById('createBtn');
  const statusEl = document.getElementById('status');

  function setStatus(message, isError) {
    statusEl.textContent = message || '';
    statusEl.classList.toggle('error', !!isError);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function badge(profile) {
    if (profile.isActive) return '<span class="badge active">Active</span>';
    return profile.signedIn
      ? '<span class="badge signedin">Signed in</span>'
      : '<span class="badge signedout">No account</span>';
  }

  function render(profiles) {
    profilesEl.innerHTML = '';
    for (const p of profiles) {
      const card = document.createElement('div');
      card.className = 'card';

      const head = document.createElement('div');
      head.className = 'card-head';
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = p.name;
      const status = document.createElement('span');
      status.className = 'badge';
      status.outerHTML = badge(p);
      head.appendChild(name);
      head.appendChild(status);

      const actions = document.createElement('div');
      actions.className = 'actions';

      if (p.isActive) {
        const hint = document.createElement('span');
        hint.className = 'inactive-hint';
        hint.textContent = 'Current profile';
        actions.appendChild(hint);
      } else {
        actions.appendChild(makeBtn('Switch', 'switch', p.id, 'Switch to this profile'));
      }
      actions.appendChild(makeBtn(p.isActive ? 'Sign in' : 'Attach account', 'attach', p.id, 'Sign a Microsoft account into this profile'));
      actions.appendChild(makeBtn('Detach', 'detach', p.id, 'Sign out of this profile'));
      actions.appendChild(makeBtn('Remove', 'remove', p.id, 'Delete this profile'));

      card.appendChild(head);
      card.appendChild(actions);
      profilesEl.appendChild(card);
    }
  }

  function makeBtn(label, kind, id, title) {
    const btn = document.createElement('button');
    btn.className = 'act ' + kind;
    btn.textContent = label;
    btn.title = title;
    btn.dataset.id = id;
    return btn;
  }

  async function refresh() {
    try {
      const list = await api.getProfiles();
      render(list);
    } catch (err) {
      setStatus('Failed to load profiles: ' + err.message, true);
    }
  }

  profilesEl.addEventListener('click', async (event) => {
    const btn = event.target.closest('.act');
    if (!btn) return;
    const id = btn.dataset.id;
    btn.disabled = true;
    try {
      if (btn.classList.contains('switch')) {
        await api.switchProfile(id);
        setStatus('Switched to profile. Wait a moment for the app window to reload.');
      } else if (btn.classList.contains('attach')) {
        setStatus('Preparing sign-in, look at the main app window...');
        const result = await api.attachAccount(id);
        setStatus(result && result.ok ? 'Sign-in opened in the main app window.' : 'Failed to start sign-in.', !(result && result.ok));
      } else if (btn.classList.contains('detach')) {
        const result = await api.detachAccount(id);
        setStatus(result && result.ok ? 'Account signed out of this profile.' : 'Failed to sign out.', !(result && result.ok));
      } else if (btn.classList.contains('remove')) {
        if (!window.confirm('Remove this profile? Its account session will be deleted.')) {
          btn.disabled = false;
          return;
        }
        const result = await api.removeProfile(id);
        setStatus(result && result.ok ? 'Profile removed.' : (result ? result.error : 'Failed to remove profile.'), !(result && result.ok));
      }
    } catch (err) {
      setStatus('Action failed: ' + err.message, true);
    }
    btn.disabled = false;
    await refresh();
  });

  createBtn.addEventListener('click', async () => {
    const name = newNameEl.value.trim();
    if (!name) {
      setStatus('Enter a profile name first.', true);
      return;
    }
    try {
      const created = await api.createProfile(name);
      if (created && created.id) {
        setStatus('Profile "' + name + '" created. Click "Attach account" to sign in.');
        newNameEl.value = '';
        await refresh();
      } else {
        setStatus('Could not create the profile.', true);
      }
    } catch (err) {
      setStatus('Could not create the profile: ' + err.message, true);
    }
  });

  newNameEl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') createBtn.click();
  });

  document.getElementById('status').addEventListener('click', () => setStatus(''));

  refresh();
})();