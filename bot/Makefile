.PHONY: run build test lint docker

run:
	go run ./cmd/bot

build:
	go build -o bin/bot ./cmd/bot

test:
	go test ./...

lint:
	go vet ./...
	test -z "$$(gofmt -l .)"

docker:
	docker build -t radar-bot .
