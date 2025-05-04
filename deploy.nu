#!/usr/bin/env nu
def main [branch: string = "main"] {
  let commit = git rev-parse HEAD
  docker build -t citadels --platform linux/amd64 --build-arg COMMIT_SHA=$commit .

  # deploy to fly.io
  fly deploy --local-only --strategy=immediate --image citadels
}
