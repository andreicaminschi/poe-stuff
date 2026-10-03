#!/usr/bin/env bash
# WSL mounts libcuda only as libcuda.so.1, in a driver folder whose name changes with the driver.
# Triton links against libcuda.so, so point it at the mounted one, then run the command.
found="$(find /usr/lib/wsl/drivers -name 'libcuda.so.1' 2>/dev/null | head -n 1)"
if [ -n "$found" ]; then
  mkdir -p /opt/libcuda && ln -sf "$found" /opt/libcuda/libcuda.so
fi
exec "$@"
