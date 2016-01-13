// Copyright (c) 2016, David M. Lee, II
let logLevel = 0;

export function setLogLevel(level) {
  logLevel = level;
}

export default function log(level, ...args) {
  if (logLevel >= level) {
    console.error(...args);
  }
}
