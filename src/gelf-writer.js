// Copyright (c) 2016, David M. Lee, II
import { EventEmitter } from 'events';
import _ from 'lodash';

import log from './log';

export function gelfWriter(
  { filters, fullGelf, write } = { filters: [] }) {
  const emitter = new EventEmitter();

  function filter(message) {
    return _.every(filters, f => f(message));
  }

  emitter.on('gelf', message => {
    const parsed = JSON.parse(message);
    if (!filter(parsed)) {
      log(3, 'filter: discarding message');
      return;
    }

    if (!fullGelf) {
      message = parsed.short_message || parsed.full_message;
    }

    write(message);
  });

  return emitter;
}
