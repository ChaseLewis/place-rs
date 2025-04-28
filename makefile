init:
	npm install --prefix ./frontend

spacetimedb-start:
	spacetime start --listen-addr 0.0.0.0:3001

spacetimedb-logs:
	spacetime logs place --server http://0.0.0.0:3001

spacetimedb-publish:
	spacetime publish -p ./server place --server http://0.0.0.0:3001 -y

spacetimedb-publish-prod:
	spacetime publish -p ./server place --server http://pixelz.games:3000

spacetimedb-publish-and-clear:
	spacetime publish -p ./server place --server http://0.0.0.0:3001 -y --delete-data

spacetimedb-generate-typescript:
	spacetime generate -p ./server --lang typescript --out-dir frontend/src/spacetimedb -y

build-prod:
	VITE_SPACETIMEDB_URL=wss://pixelz.games/api/ npm run --prefix ./frontend build