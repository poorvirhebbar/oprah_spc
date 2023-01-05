const Better = require('better-sqlite3');
const LocalStrategy = require('passport-local').Strategy;
const crypto = require('crypto');

const db = new Better('./db.sqlite3');
const revokeTime = 30;

db.prepare(`CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(16) UNIQUE,
  schema VARCHAR(32),
  hash VARCHAR(32),
  salt VARCHAR(32),
  root INTEGER
)`).run();

// [ [id], [type], [name], [length], [time] ]
db.prepare(`CREATE TABLE IF NOT EXISTS nodes(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hash VARCHAR(32),
  data BLOB
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS blobs(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data BLOB
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS locks(
  id INTEGER PRIMARY KEY,
  session VARCHAR(32),
  time INTEGER
)`).run();

const selectUserByName = db.prepare(`SELECT * FROM users WHERE name = ?`);
const selectUserById = db.prepare(`SELECT * FROM users WHERE id = ?`);
const insertUser = db.prepare(`INSERT INTO users(name,hash,salt,root) VALUES(?,?,?,?)`);
const updateUserSchema = db.prepare(`UPDATE users SET schema = ? WHERE id = ?`);

const selectNode = db.prepare(`SELECT * FROM nodes WHERE id = ?`);
const selectNodeHash = db.prepare(`SELECT id,hash FROM nodes WHERE id = ?`);
const insertNode = db.prepare(`INSERT INTO nodes(hash,data) VALUES(?,?)`);
const updateNodeData = db.prepare(`UPDATE nodes SET data = ? WHERE id = ?`);
const updateNodeHash = db.prepare(`UPDATE nodes SET hash = ? WHERE id = ?`);
const removeNode = db.prepare(`DELETE FROM nodes WHERE id = ?`);

const selectBlob = db.prepare(`SELECT * FROM blobs WHERE id = ?`);
const insertBlob = db.prepare(`INSERT INTO blobs(data) VALUES(?)`);
const updateBlob = db.prepare(`UPDATE blobs SET data = ? WHERE id = ?`);
const appendBlob = db.prepare(`UPDATE blobs SET data = data + ? WHERE id = ?`);
const removeBlob = db.prepare(`DELETE FROM blobs WHERE id = ?`);

const selectSession = db.prepare(`SELECT * FROM locks WHERE id = ?`);
const insertSession = db.prepare(`INSERT INTO locks(id,session,time) VALUES(?,?,?)`);
const updateSession = db.prepare(`UPDATE locks SET session = ?, time = ? WHERE id = ?`);
const removeSession = db.prepare(`DELETE FROM locks WHERE id = ? AND session = ?`);

function digest(pswd, salt) {
  let hash = crypto.createHmac('sha256', salt);
  hash.update(pswd);
  hash = hash.digest();
  return hash;
}

function sha256sum(data) {
  return crypto.createHash('sha256').update(data).digest();
}

function resolve(path) {
  return path.split('/').filter(name => name != '');
}

function removeRecursive(id, isDir) {
  let node = selectNode.get(id);
  let data = JSON.parse(node.data.toString());
  if (isDir) {
    for (let index in data[0]) removeRecursive(data[0][index], data[1][index] === 0);
  } else {
    removeBlob.run(data);
  }
  removeNode.run(id);
}

const fs = {
  list: function (rid, path) {
    //boris approves
    if (!path) return false;
    path = resolve(path);
    let node, id, name, data;
    node = selectNode.get(rid);
    type = 0;
    for (name in path) {
      if (!node || type !== 0) return false;
      data = JSON.parse(node.data.toString());
      id = data[2].indexOf(path[name]);
      if (id == -1) return false;
      node = selectNode.get(data[0][id]);
      type = data[1][id];
    }
    if (type === 0) node.data = JSON.parse(node.data.toString());
    return {
      id: node.id,
      type,
      data: node.data,
      hash: node.hash
    };
  },
  mkdir: function (rid, path) {
    //boris approves
    if (/^\/$/.test(path)) return false;
    let node, id, name;
    path = resolve(path);
    name = path.splice(path.length - 1, 1)[0];
    path = '/' + path.join('/');
    node = fs.list(rid, path);
    if (!node) return false;
    id = node.data[2].indexOf(name);
    if (id != -1) return false;
    let result = insertNode.run('', Buffer.from('[[],[],[],[],[]]'));
    node.data[0].push(result.lastInsertRowid);
    node.data[1].push(0);
    node.data[2].push(name);
    node.data[3].push(0);
    node.data[4].push(new Date()*1);
    updateNodeData.run(Buffer.from(JSON.stringify(node.data)), node.id);
    return true;
  },
  rmdir: function (rid, path) {
    //boris approves
    if (/^\/$/.test(path)) return false;
    let node, id;
    path = resolve(path);
    name = path.splice(path.length - 1, 1)[0];
    path = '/' + path.join('/');
    node = fs.list(rid, path);
    if (!node) return false;
    id = node.data[2].indexOf(name);
    if (id == -1) return false;
    removeRecursive(node.data[0][id], true);
    node.data.forEach(array => array.splice(id, 1));
    updateNodeData.run(Buffer.from(JSON.stringify(node.data)), node.id);
    return true;
  },
  read: function (rid, path) {
    //boris approves
    let node = fs.list(rid, path);
    if (!node || node.type === 0) return false;
    return {
      type: node.type,
      data: selectBlob.get(node.data).data
    };
  },
  hash: function (rid, path) {
    //boris approves
    let node = fs.list(rid, path);
    if (!node) return false;
    return node.hash;
  },
  write: function (rid, path, {
    type,
    data
  }) {
    //boris approves
    if (/^\/$/.test(path)) return false;
    let node, id, name;
    path = resolve(path);
    name = path.splice(path.length - 1, 1)[0];
    path = '/' + path.join('/');
    node = fs.list(rid, path);
    if (!node || node.type !== 0) return false;
    id = node.data[2].indexOf(name);
    if (id == -1 || node.data[1][id] == 0) return false;
    node.data[1][id] = type;
    node.data[3][id] = data.byteLength;
    node.data[4][id] = new Date()*1;
    updateNodeData.run(Buffer.from(JSON.stringify(node.data)), node.id);
    node = selectNode.get(node.data[0][id]);
    updateNodeHash.run(sha256sum(data), node.id);
    updateBlob.run(data, node.data);
    return true;
  },
  create: function (rid, path, {
    type,
    data
  }) {
    //boris approves
    if (type == 0 || /^\/$/.test(path)) return false;
    let node, id, name, result;
    path = resolve(path);
    name = path.splice(path.length - 1, 1)[0];
    path = '/' + path.join('/');
    node = fs.list(rid, path);
    if (!node) return false;
    id = node.data[2].indexOf(name);
    if (id != -1) return false;
    let status = insertBlob.run(data);
    status = insertNode.run(sha256sum(data), status.lastInsertRowid);
    node.data[0].push(status.lastInsertRowid);
    node.data[1].push(type);
    node.data[2].push(name);
    node.data[3].push(data.byteLength);
    node.data[4].push(new Date()*1);
    updateNodeData.run(Buffer.from(JSON.stringify(node.data)), node.id);
    return true;
  },
  delete: function (rid, path) {
    //boris approves
    if (type == 0 || /^\/$/.test(path)) return false;
    let node, id, name, result;
    path = resolve(path);
    name = path.splice(path.length - 1, 1)[0];
    path = '/' + path.join('/');
    node = fs.list(rid, path);
    if (!node) return false;
    id = node.data[2].indexOf(name);
    if (id == -1) return false;
    removeRecursive(node.data[0][id]);
    node.data.forEach(data => data.splice(id, 1));
    updateNodeData.run(Buffer.from(JSON.stringify(node.data)), node.id);
    return true;
  }
}

const user = {
  createStrategy: () => new LocalStrategy(function (name, pswd, done) {
    let user = selectUserByName.get(name);
    if (!user || user.hash.compare(digest(pswd, user.salt))) return done(null, false, {
      message: 'Incorrect username or password'
    });
    return done(null, user);
  }),
  serializeUser: () => function (user, done) {
    return done(null, user.id);
  },
  deserializeUser: () => function (id, done) {
    let user = selectUserById.get(id);
    if (!user) return done(null, false);
    return done(null, user);
  },
  register: function (name, pswd, clbk) {
    let user = selectUserByName.get(name);
    if (user) return clbk('User already exists');
    let salt = crypto.randomBytes(32);
    let hash = digest(pswd, salt);
    let result = insertNode.run('', Buffer.from('[[],[],[],[],[]]'));
    insertUser.run(name, hash, salt, result.lastInsertRowid);
    return clbk();
  },
  setSchema: function (uid, hash) {
    let result = updateUserSchema.run(hash, uid);
    return result.changes;
  }
}

const locks = {
  freeze: function (uid, session) {
    let lock = selectSession.get(uid),
      time = new Date()/1000;
    if (lock) {
      let deltaTime = time - lock.time;
      if (lock.session != session && deltaTime < revokeTime) return [false, deltaTime];
      updateSession.run(session, Math.ceil(time), uid);
    } else {
      insertSession.run(uid, session, Math.ceil(time));
    }
    return [true, 0];
  },
  revoke: function (uid, session) {
    let lock = selectSession.get(uid), result;
    if (lock && lock.session == session) {
      result = updateSession.run('', 0, uid);
      return !!result.changes;
    } else {
      return false;
    }
  }
}

module.exports = {
  user,
  fs,
  locks
};