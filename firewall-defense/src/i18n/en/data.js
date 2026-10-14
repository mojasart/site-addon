// Inglês dos dados, por id (ver TABLES em src/i18n.js)
// Textos que usam constantes viram função (item, id) => campos: assim as
// constantes só são lidas na hora de aplicar (sem problema de ordem de import)
import { ROOT_MONEY, INTEREST, LOAN, BULK_DISCOUNT, DUCK } from '../../data/darknet.js';
import { CASH, FREEZE_TIME, BACKUP_LIVES } from '../../data/consumables.js';
import { HAZARD_PERIOD } from '../../data/terrains.js';
import { STUN_TIME, WARN_TIME } from '../../systems/Hazards.js';
import { SEASONS } from '../../data/maps.js';

const SEASON_NAME = { 'placa-mae': 'Motherboard', 'data-center': 'Data Center', 'cabo-submarino': 'Undersea Cable' };

// Igual ao describe() de data/maps.js, em inglês
function describeMap(map) {
  const parts = [];
  if (map.entries > 1) parts.push(`${map.entries} virus entrances`);
  if (map.loop) parts.push('looping path');
  if (map.theme === 'datacenter') parts.push('electrified zones');
  if (map.theme === 'ocean') parts.push('little land');
  return parts.length ? parts.join(' · ') : 'a single path';
}

export const DATA = {
  towers: {
    hacker: {
      desc: 'Throws keyboards at viruses',
      lore: 'Started out as a curious little nerd. Now takes down any virus with a keyboard throw.',
      upgrades: [
        { name: 'Quick Fingers', desc: 'Throws 30% faster' },
        { name: 'Triple Exploit', desc: 'Throws 3 keyboards at once' },
      ],
    },
    firewall: {
      name: 'Firewall Golem',
      desc: 'Ground slam: a fire wave that burns armored viruses',
      lore: 'Brick by brick, it grows into a wall of fire no malware can cross.',
      upgrades: [
        { name: 'Wall of Fire', desc: 'More range and faster waves' },
        { name: 'Wildfire', desc: 'Viruses catch fire' },
      ],
    },
    pinguim: {
      name: 'Linux Penguin',
      desc: 'Support: no damage, freezes nearby viruses and slows them down',
      lore: 'The open-source mascot. Freezes threats with an icy hug.',
      upgrades: [
        { name: 'AES Encryption', desc: 'Stronger slow' },
        { name: 'Cold Reboot', desc: 'More range and slightly faster waves' },
      ],
    },
    scanner: {
      name: 'NMAP Bot',
      desc: 'Long-range laser: slow, but strong and pierces armor',
      lore: 'Sweeps the whole network with its dish and always aims at the strongest virus.',
      upgrades: [
        { name: 'Piercing Beam', desc: 'The laser goes through and hits up to 2 viruses' },
        { name: 'Mark Target', desc: 'Target takes +25% damage for 2s' },
      ],
    },
    minerador: {
      name: 'Miner',
      desc: 'Mines bitcoins during rounds. Straight to your balance',
      lore: 'From pickaxe to computer: mines the bitcoins that pay for every defense.',
      upgrades: [
        { name: 'Extra GPU', desc: '6 bitcoins per round' },
        { name: 'Sponsorship', desc: 'A random defense gives more bitcoin per kill' },
      ],
    },
    honeypot: {
      desc: 'Bait on the path: viruses stop to attack it until it breaks',
      lore: 'An irresistible pot of honey. Viruses stop to attack it and forget about the server.',
    },
    executivo: {
      name: 'Executive',
      desc: 'Commander: defenses in his radius attack faster and Spyware becomes visible. Power: BURNOUT',
      lore: 'Never wrote a line of code, but demands delivery from everyone. And everyone delivers.',
      upgrades: [
        { name: 'Alignment Meeting', desc: 'More range and defenses in his radius attack 25% faster' },
        { name: 'Stretch Goal', desc: 'BURNOUT lasts 3s longer and recharges 5s faster' },
      ],
    },
  },

  enemies: {
    v1: { name: 'Virus', lore: 'The most basic malware on the network. Harmless alone; in a swarm, it takes down any server.' },
    v2: { name: 'Blue Virus', lore: 'Updated version: faster, and hides a red Virus inside.' },
    v3: { name: 'Green Virus', lore: 'Polymorphic code: changes color to dodge the antivirus. Carries a Blue Virus.' },
    v4: { name: 'Yellow Virus', lore: 'Fast as a zero-day exploit. Inside it comes a Green Virus.' },
    v5: { name: 'Pink Virus', lore: 'The fastest of the family. Each popped layer reveals the one before.' },
    worm: {
      desc: 'Fast: drops viruses along the path while alive',
      lore: 'Spreads through the network on its own, leaving copies of itself along the way.',
    },
    cicada: {
      desc: 'Flying mini-boss: viruses inside her aura take no damage. She lags behind: aim at MOST HP',
      lore: "The internet's most famous puzzle: only the brightest can crack it. Anyone near her gets encrypted and no defense can touch them.",
    },
    spyware: {
      desc: 'Invisible: only shows up in range of the NMAP Bot or the Executive',
      lore: 'Spies on the network unseen. Only the NMAP Bot, scanning ports, or the Executive, watching everything, can reveal it to the other defenses.',
    },
    worm2: {
      name: 'Mutant Worm',
      desc: 'Drops Green Viruses along the path and 2 more when popped',
      lore: 'A Worm that learned to copy itself faster. Leaves a trail of green viruses.',
    },
    worm3: {
      name: 'Polymorphic Worm',
      desc: 'Drops Yellow Viruses along the path and 2 more when popped',
      lore: 'Rewrites its own code with every hop. Antiviruses never recognize it twice.',
    },
    worm4: {
      name: 'King Worm',
      desc: 'Drops Pink Viruses along the path; when popped, becomes 2 Mutant Worms',
      lore: 'The ancestor of all Worms. Wherever it goes, the whole network gets infected.',
    },
    trojan: {
      desc: "Armored: the Hacker's keyboards can't pierce it",
      lore: "Disguised as a legit program and protected by armor: keyboards can't get through.",
    },
    locker: {
      desc: 'Chained mini-boss: drops 2 Trojans',
      lore: 'Locks everything up with heavy chains. When it falls, it frees 2 Trojans.',
    },
    adware: {
      desc: 'Boss: floods the screen with annoying ads',
      lore: 'Came bundled with a "free video player". Now nobody can close its windows.',
    },
    ransomware: {
      desc: 'Boss: encrypts nearby defenses; drops 4 Trojans',
      lore: "Hijacks the server and demands a ransom in bitcoin. The network's final boss.",
    },
  },

  darknet: {
    root: () => ({ name: 'Root Access', desc: `Every level starts with +$${ROOT_MONEY}` }),
    hacker: { name: 'Critical Key', desc: 'Each keyboard has a 5% chance to deal 200% damage' },
    firewall: { name: 'Earthquake', desc: 'Each virus hit by the wave has a 4% chance to be knocked back' },
    pinguim: { name: 'Frozen Kernel', desc: 'Each virus hit by the wave has a 3% chance to freeze for 1s' },
    scanner: { name: 'Calibrated Lens', desc: 'The laser has an 8% chance to pierce and hit 1 more virus' },
    minerador: { name: 'Overclock', desc: 'Each mined bitcoin has a 5% chance to be worth 200%' },
    honeypot: { name: 'Turbo Honey', desc: 'When it breaks, the Honeypot has a 10% chance to come back with 50% life' },
    executivo: { name: 'Overtime', desc: 'Each defense in his radius has a 4% chance to attack again instantly' },
    tap: { name: 'Twitchy Finger', desc: 'Each tap has a 10% chance to deal 200% damage' },

    hacker2: { name: 'Weak Spot', desc: '+5% critical chance' },
    hacker2b: { name: 'Sharp Exploit', desc: '+50% critical damage' },
    hacker2c: { name: 'Zero-Day', desc: "Each keyboard has a 2% chance to pop all of a virus's layers at once, except bosses" },
    hacker3: { name: 'Nervous Fingers', desc: 'Throws 8% faster' },
    hacker3b: { name: 'Long Arm', desc: '+10% range' },
    hacker3c: { name: 'Ctrl+C Ctrl+V', desc: 'Each throw has a 5% chance to fire an extra keyboard at another virus' },

    firewall2: { name: 'Live Ember', desc: 'Each virus hit has a 5% chance to be knocked back' },
    firewall2b: { name: 'High Flame', desc: '+30% fire damage' },
    firewall2c: { name: 'Inferno', desc: 'Fire lasts 1s longer' },
    firewall3: { name: 'Long Wave', desc: '+10% range' },
    firewall3b: { name: 'Quick Pulse', desc: 'Waves 8% faster' },
    firewall3c: { name: 'Eruption', desc: 'Each wave has a 4% chance to come out with 200% range' },

    pinguim2: { name: 'Deep Chill', desc: 'Slow gets 6% stronger' },
    pinguim2b: { name: 'Long Winter', desc: 'Slow lasts 0.3s longer' },
    pinguim2c: { name: 'Shatter', desc: 'A virus popped while frozen has a 10% chance to shatter and hit its neighbors' },
    pinguim3: { name: 'Blizzard', desc: '+6% range' },
    pinguim3b: { name: 'Icy Wind', desc: 'Waves 5% faster' },
    pinguim3c: { name: 'Avalanche', desc: 'Each wave has a 4% chance of another one right after' },
    pinguim4: { name: 'Brittle Ice', desc: 'Frozen viruses become vulnerable and take 5% more damage from all defenses' },

    scanner2: { name: 'Ping of Death', desc: 'Each shot has a 5% chance to deal 300% damage' },
    scanner2b: { name: 'Malformed Packet', desc: '+4% chance to deal 300% damage' },
    scanner2c: { name: 'Overload', desc: '+100% damage on those shots' },
    scanner3: { name: 'Turbo Clock', desc: 'Fires 8% faster' },
    scanner3b: { name: 'Wide Angle', desc: '+8% range' },
    scanner3c: { name: 'Double Scan', desc: 'Each shot has a 6% chance to recharge instantly' },

    minerador2: { name: 'Second-Hand GPU', desc: 'The Miner costs 10% less' },
    minerador2b: { name: 'Parallel Mining', desc: 'Mines 1 more bitcoin per round' },
    minerador2c: { name: 'Resale', desc: 'The Miner sells for full price' },
    minerador2d: () => ({ name: 'Wholesale', desc: `All defenses cost ${BULK_DISCOUNT * 100}% less` }),
    minerador3: { name: 'Rare Block', desc: 'Each bitcoin has a 2% chance to become a block worth 500%' },
    minerador3b: { name: 'Gold Vein', desc: '+4% chance for a bitcoin to be worth 200%' },
    minerador3c: { name: 'Lucky Hash', desc: '+2% rare block chance' },
    minerador4: () => ({
      name: 'Interest',
      desc: `At the start of each round, earn ${INTEREST.rate * 100}% of your saved money (max $${INTEREST.max})`,
    }),
    minerador4b: () => ({ name: 'Loan', desc: `Once per match, you can keep buying down to $${LOAN} in debt` }),
    minerador4c: { name: 'Midas Touch', desc: '5% of viruses come golden and drop $100 when destroyed' },

    honeypot2: { name: 'Reinforced Pot', desc: '+20% life' },
    honeypot2b: { name: 'Crystallized Honey', desc: '+3s duration' },
    honeypot2c: { name: 'Eternal Honey', desc: '+10% chance to come back with 50% life' },
    honeypot3: { name: 'Sticky Honey', desc: 'Each virus that stops at the pot has an 8% chance to leave stuck, 50% slower for 2s' },
    honeypot3b: { name: 'Stinger', desc: 'Each virus that stops at the pot has a 6% chance to lose 1 layer' },
    honeypot3c: { name: 'Beehive', desc: 'When it breaks, the pot has a 5% chance to release bees that pop 1 layer off nearby viruses' },

    executivo2: { name: 'Career Plan', desc: '+3% chance to attack again instantly' },
    executivo2b: { name: 'Open Space', desc: '+8% range' },
    executivo2c: { name: '360° Feedback', desc: 'Defenses in his radius attack 5% faster' },
    executivo3: { name: 'Espresso', desc: 'BURNOUT recharges 2s faster' },
    executivo3b: { name: 'Tight Deadline', desc: 'BURNOUT lasts 1s longer' },
    executivo3c: { name: 'All-Nighter', desc: 'Each BURNOUT has a 10% chance to recharge instantly' },

    tap2: { name: 'Finger Callus', desc: '+20% tap damage' },
    tap2b: { name: 'Double Click', desc: '+8% chance to deal 200% damage' },
    tap2c: { name: 'Ctrl+Alt+Del', desc: "Each tap has a 3% chance to pop all of a virus's layers at once, except bosses" },
    tap3: { name: 'Splash', desc: 'Each tap has a 10% chance to also hit the nearest virus' },
    tap3b: { name: 'Fat Finger', desc: '+8% chance to also hit the nearest virus' },
    tap3c: { name: 'Static Shock', desc: 'Each tap has a 5% chance to make the virus 50% slower for 2s' },

    // secreto (SECRET)
    duck: () => ({
      name: 'Rubber Duck',
      desc: `A little duck follows your matches. Each popped virus has a ${+(DUCK.chance * 100).toFixed(4)}% chance to give ${DUCK.coffee} coffee`,
    }),
  },

  consumables: {
    cash: () => ({ name: 'Extra Bitcoin', desc: `Get $${CASH} instantly` }),
    free: { name: 'Free Defense', desc: 'The next defense you place is free' },
    freeze: () => ({ name: 'Freeze All', desc: `All viruses freeze for ${FREEZE_TIME}s (bosses only slow down)` }),
    lives: () => ({ desc: `+${BACKUP_LIVES} lives` }),
  },

  terrains: {
    road: {
      name: 'Road',
      where: 'ALL SEASONS',
      rows: [
        ['WHO PASSES', 'viruses'],
        ['DEFENSES', 'Honeypot only'],
      ],
      desc: 'The path viruses follow from the portal to the server. Defenses go along its edges; on top of it, only the Honeypot, which works as bait.',
    },
    coins: {
      name: 'Bitcoin Pile',
      where: 'MOTHERBOARD · DATA CENTER',
      rows: [
        ['USED BY', 'Miner'],
        ['PER PILE', '1 defense'],
      ],
      desc: 'The Miner only mines on top of a pile; off it, it sits idle. Any defense can take the tile, but then the pile has no miner. The Undersea Cable has no piles: there, the Miner mines anywhere.',
    },
    hazard: () => ({
      name: 'Electrified Zone',
      where: 'DATA CENTER',
      rows: [
        ['DISCHARGE', `every ${HAZARD_PERIOD}s`],
        ['WARNING', `blinks ${WARN_TIME}s before`],
        ['STUN', `${STUN_TIME}s`],
      ],
      desc: "An electric mat on the floor. On discharge, every defense on it gets stunned: no attacking or mining until it wears off. You can use the tile, but you're better off elsewhere.",
    }),
    water: {
      name: 'Water',
      where: 'UNDERSEA CABLE',
      rows: [
        ['DEFENSES', 'not allowed'],
        ['PLACE THEM', 'on islands'],
      ],
      desc: 'The sea between the islands. No defense can go in the water: look for islands near the path. The Honeypot still goes on the road.',
    },
  },

  seasons: Object.fromEntries(Object.entries(SEASON_NAME).map(([id, name]) => [id, { name }])),

  // Mapas são montados em data/maps.js (nome "Season N" e descrição pelo
  // formato). `difficulty` não é traduzido: é chave de cor (LevelSelectScene DIFF_COLOR)
  maps: (map) =>
    map.bounty
      ? { desc: '5 min on a fixed budget: viruses give no money' }
      : { name: `${SEASON_NAME[SEASONS[map.season].id]} ${map.number}`, desc: describeMap(map) },

  // botão ALVO no painel da defesa (data/towers.js TARGET_MODES)
  targetModes: {
    first: { label: 'FIRST' },
    last: { label: 'LAST' },
    strong: { label: 'STRONGEST' },
    hp: { label: 'MOST HP' },
    fast: { label: 'FASTEST' },
    close: { label: 'CLOSEST' },
  },
};
