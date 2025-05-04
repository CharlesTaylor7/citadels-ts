#!/usr/bin/env nu
def main [branch: string = "main"] {
  # login to github container registry
  # const GITHUB_TOKEN = <PAT> 
  # $GITHUB_TOKEN | docker login ghcr.io -u CharlesTaylor7 --password-stdin
  # To login, you need to generate a classic Personal access token with read:pacakges.
  # Github doesn't allow me to push this secret, even though I want to treat my container images as public.
  
  # deploy to fly.io
  fly deploy --local-only --strategy=immediate --image $"ghcr.io/charlestaylor7/citadels-ts:($branch)"
}
