const API_BASE = process.env.API_BASE;

(async () => {
  try {
    let profileRes = await fetch(`${API_BASE}/whoami`, {
      credentials: 'include',
    });
    if (profileRes.ok) {
      let profile = await profileRes.json();
      if (profile === 24601) {
        alert('Hello, Jean Valjean');
      }
      window.loggedIn = true;
      document.body.setAttribute('loggedin', true);
    }
  } catch (err) {
    // probably not logged in
    console.error(err);
  }
})().then(console.log);

window.login = () => {
  console.log('launching login...');
  location.href = `${API_BASE}/login`;
}
window.logout = () => {
  console.log('launching logout...');
  location.href = `${API_BASE}/logout`;
}

