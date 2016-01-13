// Copyright (c) 2016, David M. Lee, II
import pcap from 'pcap2';
import { EventEmitter } from 'events';

import log from './log';

export function startCapture({ captureInterface, pcapOptions }) {
  const emitter = new EventEmitter();

  log(1, `capture: ${captureInterface}`);
  log(3, `  options: ${JSON.stringify(pcapOptions)}`);

  const pcapSession = new pcap.Session(captureInterface, pcapOptions);
  pcapSession.on('packet', rawPacket => {
    const packet = pcap.decode.packet(rawPacket);
    log(3, 'capture: captured packet');
    const link = packet.payload;
    const ip = link.payload;
    const udp = ip.payload;
    const data = udp.data;

    emitter.emit('datagram', data);
  });

  return emitter;
}
