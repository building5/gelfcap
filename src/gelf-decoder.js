// Copyright (c) 2016, David M. Lee, II
import { EventEmitter } from 'events';
import { gunzipSync, inflateSync } from 'zlib';

import log from './log';

const DefaultReassemblyTimeoutMillis = 5000;

const MagicNumberGelfFragment = 0x1e0f;
const MagicNumberGzip = 0x1f8b;
const MagicNumberZlibNone = 0x7801;
const MagicNumberZlibDefault = 0x789c;
const MagicNumberZlibMax = 0x78da;

export class GelfDecoderError extends Error {
  constructor(message, details) {
    super(message);
    Error.captureStackTrace(this, this.constructor.name);
    this.name = this.constructor.name;
    this.message = message;
    this.details = details;
  }
}

export function gelfDecoder({ timeoutMillis } = { timeoutMillis: DefaultReassemblyTimeoutMillis }) {
  const emitter = new EventEmitter();

  log(1, `gelfDecoder: timeoutMillis=${timeoutMillis}`);

  function parseDatagram(datagram) {
    const magicNumber = datagram.readUInt16BE(0);

    log(3, `datagram: ${magicNumber.toString(16)}`);
    log(5, `  ${datagram.toString('hex')}`);

    switch (magicNumber) {
      case MagicNumberGelfFragment:
        log(3, '  fragment');
        parseFragment(datagram); // eslint-disable-line no-use-before-define
        break;
      case MagicNumberGzip:
        log(3, '  gzip');
        parseDatagram(gunzipSync(datagram));
        break;
      case MagicNumberZlibNone:
      case MagicNumberZlibDefault:
      case MagicNumberZlibMax:
        log(3, '  zlib');
        parseDatagram(inflateSync(datagram));
        break;
      default:
        emitter.emit('gelf', datagram.toString());
        break;
    }
  }

  emitter.on('datagram', parseDatagram);

  const accumulators = new Map();

  function parseFragment(fragment) {
    // noinspection MagicNumberJS
    const id = fragment.slice(2, 10).toString('hex');
    // noinspection MagicNumberJS
    const seqno = fragment[10];
    // noinspection MagicNumberJS
    const count = fragment[11];
    // noinspection MagicNumberJS
    const data = new Buffer(fragment.slice(12)); // copy buffer; it's reused by pcap2

    log(3, `fragment: id=${id.toString(16)} seqno=${seqno} count=${count}`);

    if (seqno >= count) {
      emitter.emit('error', new GelfDecoderError('Invalid sequence number', { id, seqno, count }));
      return;
    }

    if (count === 0) {
      parseDatagram(data);
    }

    let accumulator = accumulators.get(id);

    if (!accumulator) {
      // first fragment; start reassembly
      log(2, `fragment: new accumulator: id=${id} count=${count}`);
      accumulator = {
        fragments: new Array(count),
        remaining: count - 1,
        length: data.length,
        timeout: setTimeout(() => {
          log(2, `fragment: reassembly-timeout id=${id} remaining=${accumulator.remaining}`);
          emitter.emit('reassembly-timeout', {
            remaining: accumulator.remaining,
            count: accumulator.fragments.length,
          });
          accumulators.delete(id);
        }, timeoutMillis),
      };
      accumulator.fragments[seqno] = data;
      accumulators.set(id, accumulator);
      return;
    }

    // accumulate a fragment
    accumulator.fragments[seqno] = data;
    accumulator.length += data.length;
    if (--accumulator.remaining === 0) {
      log(2, `fragment: assembling id=${id} length=${accumulator.length}`);
      const biggie = Buffer.concat(accumulator.fragments, accumulator.length);
      parseDatagram(biggie);
      clearTimeout(accumulator.timeout);
      accumulators.delete(id);
    }
  }

  return emitter;
}
