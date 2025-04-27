
## General
- Fix all styles to use tailwind
- Game page 

## Lobby
- Should only be allowed to be in one room at a time
- If in a room, and its game has started redirect to that game
- Can Join a room
- can leave a room 
- can transfer ownership of a room to someone else
- Owner can start game


## PLAN
Need websocket service
Need tests for game service
need seedable rng

Need to start porting templates

Get basic game working with the 8 core roles and no specials
    - then tdd your way throug the rest.
    - The ai doesn't like to port files over about 500 LOC