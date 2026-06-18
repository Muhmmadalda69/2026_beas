# Multi-stage build shared by every microservice. The SERVICE build-arg selects
# which cmd/ binary to compile, so one Dockerfile produces all five images.
FROM golang:1.25-alpine AS build
WORKDIR /src

# Cache dependencies separately from source for faster rebuilds.
COPY go.mod go.sum ./
RUN go mod download

COPY . .
ARG SERVICE
RUN test -n "$SERVICE" || (echo "SERVICE build-arg is required" && exit 1)
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" \
    -o /out/app ./cmd/${SERVICE}

# Minimal runtime: alpine gives us wget for container healthchecks and a shell
# for debugging, while staying small. The service runs as a non-root user.
FROM alpine:3.20
RUN apk add --no-cache ca-certificates wget && \
    adduser -D -u 10001 appuser
COPY --from=build /out/app /usr/local/bin/app
USER appuser
ENTRYPOINT ["/usr/local/bin/app"]
