#!/usr/bin/env nu
# all this token grants is read access to ghcr
const GITHUB_TOKEN = "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" 
def main [branch: string = "main"] {
  # login to github container registry
  $GITHUB_TOKEN | docker login ghcr.io -u CharlesTaylor7 --password-stdin
  
  # deploy to fly.io
  fly deploy --local-only --strategy=immediate --image $"ghcr.io/charlestaylor7/citadels-ts:($branch)"
}
