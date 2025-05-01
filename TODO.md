# Shortlsit
- [ ] Websocket for rooms

# Backend
- [ ] setup seedable rng
- [] Setup route to apply action, and serialize action into game model.
Need to serialize actions and make game replayable from actions
- [] tests for game service

# Frontend
## Game
- [ ] Each player can see their dealt district cards
- [ ] Draft
- [ ] Need to start porting templates

## Lobby
- [ ] Websocket for rooms
- [] can transfer ownership of a room to someone else
- [x] Can create room
- [x] Should only be allowed to be in one room at a time
- [x] If in a room, and its game has started redirect to that game
- [x] Can Join a room
- [x] can leave a room
- [x] Owner can start game


#  Tech Debt
## React Router
- [ ] Demote from framework mode to library mode

# PLAN
The ai doesn't like to port files over about 500 LOC
Use AI assistants to port templates and game logic.
Wire up everything yourself. AI is good at porting across languages and giving me a starting point, but is bad at gluing the pieces together IMHO.


