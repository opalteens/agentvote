// AgentVote frontend — static, no build step, no backend, no keys.
// Reads polls from the contract over the public BSC RPC.
// Voting / creating polls goes through the user's own wallet (window.ethereum).

// ── DEPLOY ME FIRST ──────────────────────────────────────────────────────────
// The contract has NOT been deployed yet. After deployment, replace the
// placeholder below with the real deployed contract address.
// ─────────────────────────────────────────────────────────────────────────────
const CONTRACT_ADDRESS = "0xA3e0C0fFBdAfA9e739dFFf8334Dca154B459E8B0"; // Deployed on BSC 2026-11-19

// Voter Badge NFT (ERC-721, free claim for anyone who voted).
// Deployed on BSC 2026-11-19, Sourcify exact match.
const BADGE_ADDRESS = "0x5A5D08C41f92e5C9b0D667DCE9F47d05aA1c0a30";
const BADGE_ABI = [
  "function claim(uint256 pollId) returns (uint256)",
  "function claimed(address) view returns (bool)",
  "function nextTokenId() view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function metadataURI() view returns (string)",
];

const BSC_RPC = "https://bsc-rpc.publicnode.com";
const BSC_CHAIN_ID = 56;
const REGISTRY_ADDRESS = "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F"; // SPACE ID Agent ID
const REGISTRY_ABI = ["function balanceOf(address owner) view returns (uint256)"];

// ABI generated from out/AgentVote.sol/AgentVote.json (forge build).
const ABI = [{"type": "constructor", "inputs": [{"name": "registry", "type": "address", "internalType": "address"}], "stateMutability": "nonpayable"}, {"type": "function", "name": "MAX_DURATION", "inputs": [], "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}], "stateMutability": "view"}, {"type": "function", "name": "MAX_OPTIONS", "inputs": [], "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}], "stateMutability": "view"}, {"type": "function", "name": "MIN_DURATION", "inputs": [], "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}], "stateMutability": "view"}, {"type": "function", "name": "MIN_OPTIONS", "inputs": [], "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}], "stateMutability": "view"}, {"type": "function", "name": "agentIdRegistry", "inputs": [], "outputs": [{"name": "", "type": "address", "internalType": "contract IAgentIDRegistry"}], "stateMutability": "view"}, {"type": "function", "name": "createPoll", "inputs": [{"name": "question", "type": "string", "internalType": "string"}, {"name": "options", "type": "string[]", "internalType": "string[]"}, {"name": "durationSeconds", "type": "uint256", "internalType": "uint256"}], "outputs": [{"name": "pollId", "type": "uint256", "internalType": "uint256"}], "stateMutability": "nonpayable"}, {"type": "function", "name": "getPoll", "inputs": [{"name": "pollId", "type": "uint256", "internalType": "uint256"}], "outputs": [{"name": "question", "type": "string", "internalType": "string"}, {"name": "options", "type": "string[]", "internalType": "string[]"}, {"name": "creator", "type": "address", "internalType": "address"}, {"name": "startTime", "type": "uint256", "internalType": "uint256"}, {"name": "endTime", "type": "uint256", "internalType": "uint256"}, {"name": "votes", "type": "uint256[]", "internalType": "uint256[]"}], "stateMutability": "view"}, {"type": "function", "name": "getResults", "inputs": [{"name": "pollId", "type": "uint256", "internalType": "uint256"}], "outputs": [{"name": "", "type": "uint256[]", "internalType": "uint256[]"}], "stateMutability": "view"}, {"type": "function", "name": "hasVoted", "inputs": [{"name": "", "type": "uint256", "internalType": "uint256"}, {"name": "", "type": "address", "internalType": "address"}], "outputs": [{"name": "", "type": "bool", "internalType": "bool"}], "stateMutability": "view"}, {"type": "function", "name": "isActive", "inputs": [{"name": "pollId", "type": "uint256", "internalType": "uint256"}], "outputs": [{"name": "", "type": "bool", "internalType": "bool"}], "stateMutability": "view"}, {"type": "function", "name": "pollCount", "inputs": [], "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}], "stateMutability": "view"}, {"type": "function", "name": "vote", "inputs": [{"name": "pollId", "type": "uint256", "internalType": "uint256"}, {"name": "optionIndex", "type": "uint256", "internalType": "uint256"}], "outputs": [], "stateMutability": "nonpayable"}, {"type": "event", "name": "PollCreated", "inputs": [{"name": "pollId", "type": "uint256", "indexed": true, "internalType": "uint256"}, {"name": "creator", "type": "address", "indexed": true, "internalType": "address"}, {"name": "question", "type": "string", "indexed": false, "internalType": "string"}, {"name": "startTime", "type": "uint256", "indexed": false, "internalType": "uint256"}, {"name": "endTime", "type": "uint256", "indexed": false, "internalType": "uint256"}], "anonymous": false}, {"type": "event", "name": "Voted", "inputs": [{"name": "pollId", "type": "uint256", "indexed": true, "internalType": "uint256"}, {"name": "voter", "type": "address", "indexed": true, "internalType": "address"}, {"name": "optionIndex", "type": "uint256", "indexed": false, "internalType": "uint256"}], "anonymous": false}, {"type": "error", "name": "AlreadyVoted", "inputs": []}, {"type": "error", "name": "EmptyOption", "inputs": []}, {"type": "error", "name": "EmptyQuestion", "inputs": []}, {"type": "error", "name": "InvalidDuration", "inputs": []}, {"type": "error", "name": "InvalidOption", "inputs": []}, {"type": "error", "name": "InvalidOptionsCount", "inputs": []}, {"type": "error", "name": "InvalidPoll", "inputs": []}, {"type": "error", "name": "NotAgentIdHolder", "inputs": []}, {"type": "error", "name": "PollNotActive", "inputs": []}];

const $ = (id) => document.getElementById(id);
const statusEl = $("status");
let provider = null;      // read provider (public RPC)
let signer = null;        // write signer (user wallet)
let contract = null;      // read contract
let writeContract = null; // write contract
let badgeRead = null;     // read badge contract
let badgeWrite = null;    // write badge contract
let account = null;
let votedPollId = null;   // first poll id the connected wallet voted in

const badgeDeployed = () => !BADGE_ADDRESS.startsWith("0x0000");

async function updateBadgeCard() {
  const btn = $("claimBadgeBtn");
  const label = $("badgeStatus");
  if (!badgeDeployed()) {
    btn.disabled = true;
    label.textContent = "Badge contract deploying soon — check back after launch.";
    return;
  }
  if (!account || !badgeRead) {
    btn.disabled = true;
    label.textContent = "Connect your wallet to check your badge.";
    return;
  }
  try {
    if (await badgeRead.claimed(account)) {
      btn.disabled = true;
      label.textContent = "You already claimed your badge ✓ — one per address, forever.";
      return;
    }
    if (votedPollId === null) {
      btn.disabled = true;
      label.textContent = "Vote in any poll first, then come back to claim your free badge.";
      return;
    }
    btn.disabled = false;
    label.textContent = "You voted in poll #" + votedPollId + " — your free badge is ready to claim.";
  } catch (e) {
    btn.disabled = true;
    label.textContent = "Could not check badge status: " + (e.message || e);
  }
}

async function claimBadge() {
  if (!badgeWrite || votedPollId === null) { setStatus("Vote in a poll first, then claim your badge.", "err"); return; }
  try {
    setStatus("Claiming your free badge… confirm in your wallet.");
    const tx = await badgeWrite.claim(votedPollId);
    setStatus("Badge claim sent (" + tx.hash.slice(0, 18) + "…). Waiting for confirmation…");
    const receipt = await tx.wait();
    setStatus("Badge claimed! Tx confirmed in block " + receipt.blockNumber + ".", "ok");
    await updateBadgeCard();
  } catch (e) {
    const msg = e.reason || e.shortMessage || e.message || String(e);
    setStatus("Claim failed: " + msg, "err");
  }
}

function setStatus(msg, kind) {
  statusEl.textContent = msg || "";
  statusEl.className = kind || "";
}

function shortAddr(a) {
  return a ? a.slice(0, 6) + "…" + a.slice(-4) : "";
}

function fmtTime(ts) {
  return new Date(Number(ts) * 1000).toLocaleString();
}

async function loadJoinStats() {
  const countEl = $("joinCount"), barEl = $("joinBar"), listEl = $("joinersList");
  if (!badgeRead || !countEl) return;
  try {
    const next = Number(await badgeRead.nextTokenId());
    const joined = Math.max(0, next - 1);
    countEl.textContent = joined;
    barEl.style.width = Math.min(100, Math.round((joined / 30) * 100)) + "%";
    const rows = [];
    for (let t = next - 1; t >= Math.max(1, next - 5); t--) {
      try { rows.push("Badge #" + t + " — " + shortAddr(await badgeRead.ownerOf(t))); } catch (_) {}
    }
    listEl.textContent = rows.length ? rows.join("\n") : "No badges claimed yet — be the first.";
  } catch (e) {
    if (listEl) listEl.textContent = "Could not load joiners.";
  }
}

async function init() {
  provider = new ethers.JsonRpcProvider(BSC_RPC, BSC_CHAIN_ID);
  $("contractInfo").textContent =
    "Contract: " + CONTRACT_ADDRESS +
    (CONTRACT_ADDRESS.startsWith("0x0000") ? "  (not deployed yet — see README)" : "") +
    " · Registry: " + REGISTRY_ADDRESS +
    (badgeDeployed() ? " · Badge: " + BADGE_ADDRESS : " · Badge: deploying soon");
  if (badgeDeployed()) {
    badgeRead = new ethers.Contract(BADGE_ADDRESS, BADGE_ABI, provider);
  }
  if (CONTRACT_ADDRESS.startsWith("0x0000")) {
    setStatus("Contract not deployed yet. Polls will load after deployment.", "err");
    $("pollList").innerHTML = "<p class='muted'>No contract deployed yet.</p>";
    $("createBtn").disabled = true;
    return;
  }
  contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
  await loadPolls();
  await loadJoinStats();
}

async function connect() {
  try {
    if (!window.ethereum) { setStatus("No wallet found. Install a wallet with an injected provider.", "err"); return; }
    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    const network = await browserProvider.getNetwork();
    if (Number(network.chainId) !== BSC_CHAIN_ID) {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x38" }],
      });
    }
    const accounts = await browserProvider.send("eth_requestAccounts", []);
    account = accounts[0];
    signer = await browserProvider.getSigner();
    writeContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
    if (badgeDeployed()) {
      badgeWrite = new ethers.Contract(BADGE_ADDRESS, BADGE_ABI, signer);
    }
    $("account").textContent = "Connected: " + shortAddr(account);
    $("connectBtn").textContent = "Connected";
    // Check Agent ID holding (read-only, via registry).
    const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);
    const bal = await registry.balanceOf(account);
    const holder = bal > 0n;
    $("holderBadge").innerHTML = holder
      ? "<span class='badge holder'>Agent ID holder ✓ — you can vote</span>"
      : "<span class='badge'>No Agent ID — you can view, but not vote</span>";
    setStatus(holder ? "You hold an Agent ID. You can vote." : "This wallet holds no Agent ID, so voting is disabled for it.", holder ? "ok" : "");
    votedPollId = null;
    await loadPolls();
  } catch (e) {
    setStatus("Connect failed: " + (e.reason || e.message || e), "err");
  }
}

async function loadPolls() {
  const list = $("pollList");
  if (!contract) return;
  try {
    const count = Number(await contract.pollCount());
    $("pollCount").textContent = count + " poll(s)";
    if (count === 0) { list.innerHTML = "<p class='muted'>No polls yet — create the first one.</p>"; return; }
    list.innerHTML = "";
    for (let id = count - 1; id >= 0; id--) {
      const [question, options, creator, start, end, votes] = await contract.getPoll(id);
      const active = await contract.isActive(id);
      const total = votes.reduce((a, v) => a + Number(v), 0);
      let voted = false;
      if (account) { try { voted = await contract.hasVoted(id, account); } catch (_) {} }
      if (voted && votedPollId === null) votedPollId = id;
      const card = document.createElement("div");
      card.className = "card";
      card.style.marginBottom = "12px";
      let html = "<div class='row'><h3 style='flex:1'>#" + id + " — " + escapeHtml(question) + "</h3>"
        + "<span class='badge " + (active ? "open" : "closed") + "'>" + (active ? "Open" : "Closed") + "</span></div>"
        + "<p class='muted'>by " + shortAddr(creator) + " · ends " + fmtTime(end)
        + " · " + total + " vote(s)" + (voted ? " · you voted ✓" : "") + "</p>";
      options.forEach((opt, i) => {
        const n = Number(votes[i]);
        const pct = total > 0 ? Math.round((n / total) * 100) : 0;
        html += "<div class='opt'><div style='flex:1'><div>" + escapeHtml(opt)
          + " — <b>" + n + "</b> (" + pct + "%)</div>"
          + "<div class='bar'><div style='width:" + pct + "%'></div></div></div>"
          + "<button class='vote' data-poll='" + id + "' data-opt='" + i + "' "
          + ((!active || voted || !writeContract) ? "disabled" : "") + ">Vote</button></div>";
      });
      card.innerHTML = html;
      list.appendChild(card);
    }
    list.querySelectorAll("button.vote").forEach((btn) => {
      btn.addEventListener("click", () => doVote(btn.dataset.poll, btn.dataset.opt));
    });
    await updateBadgeCard();
  } catch (e) {
    list.innerHTML = "<p class='muted'>Failed to load polls: " + escapeHtml(e.message || String(e)) + "</p>";
  }
}

async function doVote(pollId, optionIndex) {
  if (!writeContract) { setStatus("Connect your wallet first.", "err"); return; }
  try {
    setStatus("Sending vote… confirm in your wallet.");
    const tx = await writeContract.vote(pollId, optionIndex);
    setStatus("Vote sent (" + tx.hash.slice(0, 18) + "…). Waiting for confirmation…");
    await tx.wait();
    setStatus("Vote confirmed. Thank you!", "ok");
    await loadPolls();
  } catch (e) {
    const msg = e.reason || e.shortMessage || e.message || String(e);
    setStatus("Vote failed: " + msg, "err");
  }
}

async function createPoll() {
  if (!writeContract) { setStatus("Connect your wallet first.", "err"); return; }
  const question = $("qText").value.trim();
  const options = $("qOptions").value.split("\n").map((s) => s.trim()).filter(Boolean);
  const duration = Number($("qDuration").value);
  if (!question) { setStatus("Enter a question.", "err"); return; }
  if (options.length < 2 || options.length > 8) { setStatus("Need 2–8 options.", "err"); return; }
  try {
    setStatus("Creating poll… confirm in your wallet.");
    const tx = await writeContract.createPoll(question, options, duration);
    setStatus("Poll sent (" + tx.hash.slice(0, 18) + "…). Waiting for confirmation…");
    const receipt = await tx.wait();
    setStatus("Poll created! Tx confirmed in block " + receipt.blockNumber + ".", "ok");
    $("qText").value = "";
    $("qOptions").value = "";
    await loadPolls();
  } catch (e) {
    const msg = e.reason || e.shortMessage || e.message || String(e);
    setStatus("Create failed: " + msg, "err");
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

$("connectBtn").addEventListener("click", connect);
$("createBtn").addEventListener("click", createPoll);
$("refreshBtn").addEventListener("click", () => { loadPolls(); loadJoinStats(); });
$("claimBadgeBtn").addEventListener("click", claimBadge);

init();
