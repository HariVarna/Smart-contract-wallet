const fs = require('fs');

const normalize = (err, path) => {
  if (err && (err.code === 'EISDIR' || err.code === 'UNKNOWN' || err.errno === -4068)) {
    const einval = new Error(`EINVAL: invalid argument, readlink '${path}'`);
    einval.code = 'EINVAL';
    einval.errno = -4071;
    einval.syscall = 'readlink';
    return einval;
  }
  return err;
};

const origReadlinkSync = fs.readlinkSync;
fs.readlinkSync = function (path, options) {
  try {
    return origReadlinkSync.apply(this, arguments);
  } catch (err) {
    throw normalize(err, path);
  }
};

const origReadlink = fs.readlink;
fs.readlink = function (path, options, callback) {
  const cb = typeof options === 'function' ? options : callback;
  const opts = typeof options === 'function' ? undefined : options;
  origReadlink.call(this, path, opts, (err, linkString) => {
    if (err) {
      return cb(normalize(err, path));
    }
    return cb(null, linkString);
  });
};

if (fs.promises && fs.promises.readlink) {
  const origPromisesReadlink = fs.promises.readlink;
  fs.promises.readlink = async function (path, options) {
    try {
      return await origPromisesReadlink.apply(this, arguments);
    } catch (err) {
      throw normalize(err, path);
    }
  };
}
