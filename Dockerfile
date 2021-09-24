FROM httpd:2.4

RUN apt update && \
    apt install -y git lua5.2 liblua5.2-dev luarocks libpq-dev && \
    luarocks install luasql-postgres PGSQL_INCDIR=/usr/include/postgresql
