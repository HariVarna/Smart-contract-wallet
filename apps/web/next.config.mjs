import fs from 'node:fs';

// Polyfill/Normalize Windows filesystem readlink error codes (EISDIR -> EINVAL)
// when running on volumes where non-symlink files yield EISDIR.
const origReadlinkSync = fs.readlinkSync;
fs.readlinkSync = function (path, options) {
  try {
    return origReadlinkSync(path, options);
  } catch (err) {
    if (err && err.code === 'EISDIR') {
      const einvalErr = new Error(`EINVAL: invalid argument, readlink '${path}'`);
      einvalErr.code = 'EINVAL';
      einvalErr.errno = -4071;
      einvalErr.syscall = 'readlink';
      throw einvalErr;
    }
    throw err;
  }
};

const origReadlink = fs.readlink;
fs.readlink = function (path, options, callback) {
  const cb = typeof options === 'function' ? options : callback;
  const opts = typeof options === 'function' ? undefined : options;
  origReadlink(path, opts, (err, linkString) => {
    if (err && err.code === 'EISDIR') {
      const einvalErr = new Error(`EINVAL: invalid argument, readlink '${path}'`);
      einvalErr.code = 'EINVAL';
      einvalErr.errno = -4071;
      einvalErr.syscall = 'readlink';
      return cb(einvalErr);
    }
    return cb(err, linkString);
  });
};

if (fs.promises && fs.promises.readlink) {
  const origPromisesReadlink = fs.promises.readlink;
  fs.promises.readlink = async function (path, options) {
    try {
      return await origPromisesReadlink(path, options);
    } catch (err) {
      if (err && err.code === 'EISDIR') {
        const einvalErr = new Error(`EINVAL: invalid argument, readlink '${path}'`);
        einvalErr.code = 'EINVAL';
        einvalErr.errno = -4071;
        einvalErr.syscall = 'readlink';
        throw einvalErr;
      }
      throw err;
    }
  };
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@scw/contracts', '@scw/types', '@scw/wallet-core'],
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
};

export default nextConfig;
