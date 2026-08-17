# Catalogs are baked in, not bind-mounted, for the same reason redis takes its
# config via flags: the podman machine on Windows only mounts %USERPROFILE%, so
# a bind mount from F:\ would fail. A build context is uploaded over the API and
# sidesteps mounts entirely.
FROM docker.io/trinodb/trino:483

COPY catalog/minio.properties /etc/trino/catalog/minio.properties
