FROM golang:1.22-alpine AS build
WORKDIR /src
RUN apk add --no-cache git
COPY go.mod ./
RUN go mod download || true
COPY . .
RUN go mod tidy
RUN CGO_ENABLED=0 go build -o /out/server  ./cmd/server
RUN CGO_ENABLED=0 go build -o /out/worker  ./cmd/worker
RUN CGO_ENABLED=0 go build -o /out/migrate ./cmd/migrate

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tini
WORKDIR /app
COPY --from=build /out/ /usr/local/bin/
EXPOSE 8080
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/usr/local/bin/server"]
