# gelfcap

[GELF][] is an interesting protocol for shipping logs, which both a is a
supported [input for Logstash][logstash-gelf] and an available
[log driver for Docker][docker-gelf]. This can be a nice choice for shipping
Docker logs. Unfortunately, doing so disables the `docker log` command, making
debugging on the Docker host difficult.

Enter [gelfcap][]. This is a Node.js command line application which captures
GELF packets from the network interface, decodes and prints them. This is a
convenient way to tap into the logs being sent from a Docker container, without
having to find them in your log aggregation system.

## Installation

Depending on your system configuration, you may or may not need to run this as
root.

```bash
$ npm install -g gelfcap
```

## Usage

Unfortunately, you may need to run `gelfcap` as root in order to capture packets
from the network interface.

If `mode` is not specified for `--bunyan-format`, it defaults to `short`.

```
  Usage: gelfcap [options]

  Options:

      -h, --help                  output usage information
      -V, --version               output the version number
      -b --bunyan-format [mode]   Parses and displays messages in bunyan format
      -c --container [name]       Filter on Docker container name
         --container-id [id]      Filter on Docker container id
         --full-gelf              Output full gelf contents, instead of just the message
      -i --interface [interface]  Listen on interface (required)
      -p --port [port]            GELF port to sniff on [12201]
      -v --verbose                Bump up logging level

  Bunyan format modes:

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
```

 [GELF]: https://www.graylog.org/resources/gelf/
 [docker-gelf]: https://docs.docker.com/engine/reference/logging/overview/#gelf-options
 [logstash-gelf]: https://www.elastic.co/guide/en/logstash/current/plugins-inputs-gelf.html
 [gelfcap]: https://github.com/building5/gelfcap
