#!/usr/bin/env nu
# all this token grants is read access to my repository
# storing this in the repo is fine, because this literally just grants permission to read the repo, something you are already doing.
const GITHUB_TOKEN = "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" 
def main [branch: string = "main"] {
  # login to github container registry
  $GITHUB_TOKEN | docker login ghcr.io -u CharlesTaylor7 --password-stdin
  # deploy to fly.io
  fly deploy --strategy=immediate -i $"ghcr.io/charlestaylor7/citadels-ts:($branch)"
}
