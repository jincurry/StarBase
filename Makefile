.PHONY: dev server worker web migrate-up migrate-down sqlc lint test build docker-build down logs

# --- developer convenience ---------------------------------------------------

dev:
	docker compose up --build

server:
	go run ./cmd/server

worker:
	go run ./cmd/worker

migrate-up:
	go run ./cmd/migrate up

migrate-down:
	go run ./cmd/migrate down

migrate-status:
	go run ./cmd/migrate status

web:
	cd web && npm run dev

build:
	go build -o bin/server ./cmd/server
	go build -o bin/worker ./cmd/worker
	go build -o bin/migrate ./cmd/migrate

test:
	go test ./...

lint:
	go vet ./...

docker-build:
	docker compose build

down:
	docker compose down

logs:
	docker compose logs -f
