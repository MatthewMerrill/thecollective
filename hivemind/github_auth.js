const crypto = require('crypto');
const fetch = require('node-fetch');

require('dotenv').config();
const callbackBase = process.env.API_BASE;

module.exports.GitHubAuth = class GitHubAuth {

  constructor(db) {
    this.db = db;
  }

  async getUserAccessToken(code, state) {
    let ghRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_OAUTH_ID,
        client_secret: process.env.GITHUB_OAUTH_SECRET,
        redirect_url: `${callbackBase}/authorized`,
        code: code,
        state: state,
      }),
    });
    let ghAccess = await ghRes.json();
    return ghAccess['access_token'];
  }

  async getGithubProfileData(access_token) {
    let profileRes = await fetch('https://api.github.com/user', {
      method: 'get',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `token ${access_token}`
      },
    });
    let profile = await profileRes.json();
    if (profile.email === null) {
      let emailRes = await fetch('https://api.github.com/user/emails', {
        method: 'get',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `token ${access_token}`
        },
      });
      let emails = await emailRes.json();
      for (let email of emails) {
        if (email.validated) {
          profile.email = email.email;
        }
        if (email.primary) {
          profile.email = email.email;
          break;
        }
      }
    }
    return profile;
  }

  async handleUserLoginRequest(req, res) {
    req.session.oauth_state = crypto.randomBytes(16).toString('hex');
    let query = `?client_id=${process.env.GITHUB_OAUTH_ID}`
      + `&state=${req.session.oauth_state}`
      + `&scope=user`
      + `&redirect_uri=${callbackBase}/authorized`;
    res.redirect(`https:/`+`/github.com/login/oauth/authorize${query}`);
  }

  async handleUserAuthorization(req, res) {
    if (req.session.oauth_state == req.query.state) {
      try {
        let {code, state} = req.query;
        let accessToken = await this.getUserAccessToken(code, state);
        let githubProfile = await this.getGithubProfileData(accessToken);
        let user_id = await this.db.getUserIdFromOAuth('GitHub', githubProfile.id);
        if (user_id === undefined) {
          user_id = await this.db.insertOAuthUser(
            { name: githubProfile.name, email: githubProfile.email },
            'GitHub',
            githubProfile.id);
        }
        req.session.oauth_state = undefined;
        req.session.user_id = user_id;
        res.redirect(process.env.WEBSITE_BASE);
      } catch (err) {
        res.status(500).send(`
          <h1>Something bad happened.</h1>
          <p>Server could not retrieve an API token to retrieve your info from GitHub.</p>
          <p>Please try again later. If this problem persists, please file a bunch of issues on
            <a href="https://github.com/MatthewMerrill/thecollective">
              https://github.com/MatthewMerrill/thecollective</a>.</p>
          `);
        console.error(err);
      }
      return;
    }
    else {
      res.send('boot >:(');
      return;
    }
  }
}

