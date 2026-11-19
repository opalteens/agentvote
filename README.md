# AgentVote — one Agent ID, one vote

A Sybil-resistant on-chain voting dApp built for the **Binance Wallet Agent ID
Hackathon** (submission period 2026-11-18 → 2026-12-09 08:00 UTC).

**Status: CODE ONLY — not deployed, no transactions sent, no money spent.**

## The idea

Most on-chain polls are one-token-one-vote (whales win) or one-address-one-vote
(bots win). AgentVote is **one Agent ID, one vote**: only wallets that hold a
Binance Agent ID can vote, and each holder votes at most once per poll.
Identity gating makes the result genuinely Sybil-resistant without any
token, fee, or allowlist.

## How the Agent ID gating works

- The Agent ID registry is the SPACE ID Agent ID ERC-721 on BNB Chain:
  `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`
- The registry address is stored as an `immutable` in the constructor — it
  cannot be changed after deployment.
- `vote()` checks `registry.balanceOf(msg.sender) > 0` and reverts with
  `NotAgentIdHolder()` otherwise. Each wallet can claim at most one Agent ID,
  so one holder = one vote.
- A `hasVoted[pollId][voter]` mapping blocks double voting
  (`AlreadyVoted()`), and votes are only accepted while
  `block.timestamp` is inside the poll window (`PollNotActive()` otherwise).

## Contract

`src/AgentVote.sol` — Solidity ^0.8.20, SPDX MIT, **zero external
dependencies** (only forge-std for tests).

| Function | What it does |
|---|---|
| `createPoll(question, options, durationSeconds)` | Anyone can create a poll. 2–8 options, duration 1 hour–30 days. Emits `PollCreated`. Returns the poll id. |
| `vote(pollId, optionIndex)` | Agent ID holders only, once per poll, while the poll is active. Emits `Voted`. |
| `getPoll(pollId)` | Question, options, creator, start/end time, and current tallies. |
| `getResults(pollId)` | Vote counts per option. |
| `hasVoted(pollId, voter)` | Whether an address already voted in a poll. |
| `isActive(pollId)` | Whether the poll is open for voting. |
| `pollCount()` | Total polls created (also the next poll id). |

## Tests

```bash
forge test
```

15 tests, all passing, no mainnet fork: the registry is faked with
`vm.mockCall` on the real registry address (holders return `balanceOf == 1`,
the non-holder returns `0`). Coverage:

- Poll creation: valid case + reverts for too few / too many options, bad
  duration, empty question, empty option.
- Voting: holder votes once successfully; non-holder reverts; double vote
  reverts (first vote stands); vote after poll end reverts; invalid option
  reverts; invalid poll id reverts.
- Tallies: multiple voters counted correctly; the same voter can vote in
  different polls (one vote per poll, not per voter).

## Frontend

`frontend/` — static HTML + JS, no build step, no backend, no keys.

- `index.html` — dark-styled UI: connect wallet, create-poll form, poll list
  with live results and vote buttons.
- `app.js` — ethers v6 (CDN). Reads polls over the public BSC RPC
  (`https://bsc-rpc.publicnode.com`); writes go through the user's own
  wallet (`window.ethereum`). The contract ABI is embedded from the forge
  build output.
- The contract address is a clearly-marked placeholder
  (`0x0000…0000`, "DEPLOY ME FIRST"). Replace it with the real deployed
  address after deployment.

Serve locally with any static server, e.g. `python3 -m http.server` inside
`frontend/`, then open `http://localhost:8000`.

## Deployment (NOT YET DONE — steps for later)

1. **Fund a deployer wallet** with a small amount of BNB for gas. The
   deployer does not need to hold an Agent ID — only voters do.
2. **Deploy** (from this directory):
   ```bash
   forge script script/Deploy.s.sol:Deploy \
     --rpc-url https://bsc-dataseed.binance.org \
     --broadcast --verify --etherscan-api-key $BSCSCAN_API_KEY
   ```
   The script deploys `AgentVote` with the registry address above. Note the
   deployed contract address from the output.
3. **Verify on BscScan** (or let `--verify` do it): the source is a single
   file with no imports, so verification is the standard "single file" flow
   with compiler 0.8.30, optimizer on (200 runs, Foundry default).
4. **Point the frontend at it**: set `CONTRACT_ADDRESS` in
   `frontend/app.js` to the deployed address, and host `frontend/` somewhere
   public (e.g. GitHub Pages).
5. **Submit to the hackathon** via the official survey before
   2026-12-09 08:00 UTC: project name, website, contract address, and a
   description of how Agent ID is used (access control / identity-gated
   voting).

## What is still missing for the hackathon

- Deployment + BscScan verification (steps above).
- A public website URL for the submission.
- **The hard part: 30 distinct Agent ID addresses must interact with the
  contract during the submission period** (18 Nov – 9 Dec 2026) for project
  eligibility. Building the dApp does not solve distribution — holders have
  to find it and vote.
- The project-award lane is judged on on-chain metrics (Pioneer) and on
  Agent ID application depth / practicality / innovation (Innovation).
  AgentVote's pitch is Sybil-resistant voting as a real-world Agent ID use
  case.

## Repo layout

```
agentid-vote/
├── src/AgentVote.sol        # the contract
├── test/AgentVote.t.sol     # 15 forge tests (mocked registry, no fork)
├── script/Deploy.s.sol      # deployment script (not run)
├── frontend/
│   ├── index.html           # static UI
│   └── app.js               # ethers v6, ABI embedded
├── foundry.toml
└── README.md
```
