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

  function makeBtn(label, kind, id, title) {
    const btn = document.createElement('button');
    btn.className = 'act ' + kind;
    btn.textContent = label;
    btn.title = title;
    btn.dataset.id = id;
    return btn;
  }

  function render(profiles) {
    profilesEl.innerHTML = '';
    for (const p of profiles) {
      const card = document.createElement('div');
      card.className = 'card';
      card.dataset.id = p.id;
      card.title = 'Click to switch to this profile';

      const head = document.createElement('div');
      head.className = 'card-head';
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = p.name;
      head.appendChild(name);
      const status = document.createElement('span');
      status.innerHTML = badge(p);
      head.appendChild(status);

      const actions = document.createElement('div');
      actions.className = 'actions';

      if (p.signedIn) {
        actions.appendChild(makeBtn('Sign out', 'signout', p.id, 'Sign out of this profile'));
      } else {
        actions.appendChild(makeBtn(p.isActive ? 'Sign in' : 'Sign in', 'signin', p.id, 'Open Microsoft sign-in in a new window for this profile'));
      }
      actions.appendChild(makeBtn('Remove', 'remove', p.id, 'Delete this profile'));

      card.appendChild(head);
      card.appendChild(actions);
      profilesEl.appendChild(card);
    }
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
    const actionBtn = event.target.closest('.act');
    const card = event.target.closest('.card');
    if (!card) return;

    const profileId = card.dataset.id;

    if (actionBtn) {
      event.stopPropagation();
      actionBtn.disabled = true;
      try {
        if (actionBtn.classList.contains('signin')) {
          const result = await api.signInProfile(profileId);
          if (result && result.ok) {
            setStatus('Sign-in window opened. Sign in there, the window closes when you are signed in.');
          } else {
            setStatus(result && result.error ? result.error : 'Failed to open sign-in.', true);
          }
        } else if (actionBtn.classList.contains('signout')) {
          const result = await api.signOutProfile(profileId);
          setStatus(result && result.ok ? 'Signed out of this profile.' : 'Failed to sign out.', !(result && result.ok));
        } else if (actionBtn.classList.contains('remove')) {
          if (!window.confirm('Remove this profile? Its account session will be deleted.')) {
            actionBtn.disabled = false;
            return;
          }
          const result = await api.removeProfile(profileId);
          setStatus(result && result.ok ? 'Profile removed.' : (result ? result.error : 'Failed to remove profile.'), !(result && result.ok));
        }
      } catch (err) {
        setStatus('Action failed: ' + err.message, true);
      }
      actionBtn.disabled = false;
      await refresh();
      return;
    }

    setStatus('Switched to profile. Wait a moment for the app window to reload.');
    await api.switchProfile(profileId).catch((err) => setStatus('Failed to switch: ' + err.message, true));
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
        setStatus('Profile "' + name + '" created. Click "Sign in" to attach an account.');
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

  window.addEventListener('focus', refresh);

  if (api.onProfilesUpdated) {
    api.onProfilesUpdated(() => refresh());
  }

  document.getElementById('status').addEventListener('click', () => setStatus(''));

  refresh();
})();