build:
	@go build -o ./bin/game

run: build
	@./bin/game