// Copyright (c) 2016, David M. Lee, II
import 'babel-polyfill';

import bformat from 'bunyan-format';
import program from 'commander';
import _ from 'lodash';

import { startCapture } from './cap';
import { gelfDecoder } from './gelf-decoder';
import { gelfWriter } from './gelf-writer';
import log, { setLogLevel } from './log';

const { name, version } = require('../package.json');

const DefaultGelfPort = 12201;
program.version(version)
  .option('-b --bunyan-format [mode]', 'Parses and displays messages in bunyan format')
  .option('-c --container [name]', 'Filter on Docker container name')
  .option('   --container-id [id]', 'Filter on Docker container id')
  .option('   --full-gelf', 'Output full gelf contents, instead of just the message')
  .option('-i --interface [interface]', 'Listen on interface (required)')
  .option('-p --port [port]', `GELF port to sniff on [${DefaultGelfPort}]`, DefaultGelfPort)
  .option('-v --verbose', 'Bump up logging level', (v, total) => total + 1, 0);

program.on('--help', () => {
  console.log(`Bunyan format modes:

  short (default), long, simple, json, bunyan

Examples:

  # Capture all gelf packets on eth0, displaying the message field
  $ gelfcap --interface eth0

  # Capture gelf logs the Docker container named 'nginx'
  $ gelfcap --interface eth0 --container nginx

  # Capture gelf logs from 'node-app', using bunyan for formatting
  $ gelfcap --interface eth0 --container node-app --bunyan-format

  # Display all gelf fields, and use jq for pretty-printing
  $ gelfcap --interface eth0 --full-gelf | jq .
`);
});
program.parse(process.argv);

setLogLevel(program.verbose);

if (!program.interface) {
  console.error(`${name}: --interface option required`);
  process.exit(1);
}

if (!_.isNumber(program.port)) {
  console.error(`${name}: invalid port ${program.port}`);
  process.exit(1);
}

if (program.fullGelf && program.bunyanFormat) {
  console.error(`${name}: --full-gelf does not work with --bunyan-format`);
  program.fullGelf = false;
}

const filters = [];

if (program.container) {
  filters.push((m) => m._container_name === program.container);
}

if (program.containerId) {
  filters.push((m) => m._container_id === program.containerId);
}

let write = console.log;

if (program.bunyanFormat) {
  if (program.bunyanFormat === true) {
    program.bunyanFormat = 'short';
  }
  log(1, `bunyan: format=${program.bunyanFormat}`);
  const out = bformat({
    outputMode: program.bunyanFormat,
    color: process.stdout.isTTY,
  });
  write = out.write.bind(out);
}

const pcapOptions = {
  filter: `udp dst port ${program.port}`,
};


const cap = startCapture({ captureInterface: program.interface, pcapOptions });
const parser = gelfDecoder();
const writer = gelfWriter({ filters, fullGelf: program.fullGelf, write });

cap.on('datagram', parser.emit.bind(parser, 'datagram'));
parser.on('gelf', writer.emit.bind(writer, 'gelf'));

function onError(err) {
  console.error(err.message);
  if (err.details) {
    console.error(err.details);
  }
}

cap.on('error', onError);
parser.on('error', onError);
writer.on('error', onError);

parser.on('reassembly-timeout', ({ remaining, count }) => {
  console.error(`Error reassembling gelf message (missing ${remaining} of ${count} fragments)`);
});

log(1, 'ready');
