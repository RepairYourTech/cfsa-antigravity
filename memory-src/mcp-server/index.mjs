#!/usr/bin/env node

// Deprecated compatibility wrapper.
// The canonical project-local MCP architecture is:
//   client.mjs -> shared daemon.mjs
// This entrypoint forwards stdio traffic to the daemon-backed client so older
// references do not silently fork the architecture.

import "./client.mjs";
