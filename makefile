init:
	npm install --prefix ./frontend

spacetimedb-start:
	spacetime start --listen-addr 0.0.0.0:3001

spacetimedb-publish:
	spacetime publish -p ./server place --server http://0.0.0.0:3001 -y

spacetimedb-publish-and-clear:
	spacetime publish -p ./server place --server http://0.0.0.0:3001 -y --delete-data

spacetimedb-generate-typescript:
	spacetime generate -p ./server --lang typescript --out-dir frontend/src/spacetimedb -y