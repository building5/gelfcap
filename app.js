// Copyright (c) 2016, David M. Lee, II
require('babel-polyfill');
require('babel-register')({
  retainLines: typeof v8debug !== 'undefined',
});
require('./src/cli');
