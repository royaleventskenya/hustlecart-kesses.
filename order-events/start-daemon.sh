#!/bin/bash
# Daemon launcher for the order-events mini-service.
# Uses the classic double-fork pattern so the service survives its parent.
cd /home/z/my-project/mini-services/order-events

# First fork
(
  # Second fork
  (
    exec bun run index.ts > /home/z/my-project/mini-services/order-events/order-events.log 2>&1
  ) &
) &

# Parent exits immediately
exit 0
