# syntax=docker/dockerfile:1-labs
FROM ghcr.io/alvr/alpine-android:android-36-jdk21

# Install Node.js and Corepack
RUN apk add --no-cache nodejs npm bash curl \
    && npm install -g corepack \
    && corepack enable \
    && corepack prepare pnpm@latest --activate

WORKDIR /app

# deps stage
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY --parents packages/*/package.json .
COPY --parents tooling/*/package.json .

RUN ls -R

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @acme/packager build:dummy

CMD ["tail", "-f", "/dev/null"]
