// Central quiz data for the game
// Each question references a lore entry via requiredLoreId (string)

const quizData = [
  // Munchkinland (L-MUNCH-32) region questions
  {
    id: 'Q-MUNCH-32-1',
    question: 'What is Munchkinland frequently referred to as due to its rich, arable soil and abundant crops?',
    options: ['The industrial hub of Oz', 'The wild frontier', 'The breadbasket of Oz', 'The wasteland of mud and frogs'],
    correctAnswer: 2,
    requiredLoreId: 'L-MUNCH-32',
    difficulty: 1,
  },
  {
    id: 'Q-MUNCH-32-2',
    question: 'What is the favorite and most prominent color used for houses, fences, and clothing in Munchkinland?',
    options: ['Yellow', 'Red', 'Blue', 'Green'],
    correctAnswer: 2,
    requiredLoreId: 'L-MUNCH-32',
    difficulty: 1,
  },
  {
    id: 'Q-MUNCH-32-3',
    question: 'What is the hereditary title of the ruling family that resides at the Colwen Grounds estate in Munchkinland?',
    options: ['The Eminent Thropp', 'The Ozma Regent', 'The Margreave of Tenmeadows', 'The Commander-General'],
    correctAnswer: 0,
    requiredLoreId: 'L-MUNCH-32',
    difficulty: 2,
  },
  {
    id: 'Q-MUNCH-32-4',
    question: 'What primary grievances led Munchkinland to secede and form the "Free State of Munchkinland"?',
    options: [
      "The Wizard's ban on magic and the closing of Shiz University",
      "Heavy taxation on farm crops and the despoiling of local meetinghouses by the Wizard's soldiers",
      'A border dispute with Gillikin over the lucrative Glikkus emerald mines',
      "The forced relocation of Quadlings into Munchkinland's farming communities",
    ],
    correctAnswer: 1,
    requiredLoreId: 'L-MUNCH-32',
    difficulty: 3,
  },
  {
    id: 'Q-MUNCH-32-5',
    question: 'Who held the Munchkins in cruel bondage and forced them into slavery before Dorothy arrived?',
    options: ['The Wicked Witch of the West', 'Oz, the Great and Terrible', 'The Wicked Witch of the East', 'The Winged Monkeys'],
    correctAnswer: 2,
    requiredLoreId: 'L-MUNCH-32',
    difficulty: 1,
  },
  {
    id: 'Q-MUNCH-32-6',
    question: "What detail of Dorothy's clothing convinces the Munchkins she must be a 'friendly witch'?",
    options: [
      'Her dress is embroidered with silver stars.',
      'Her dress features white checks, and white is the "witch color".',
      'She is wearing a pointed hat similar to the locals.',
      'She wears a green ribbon around her neck.',
    ],
    correctAnswer: 1,
    requiredLoreId: 'L-MUNCH-32',
    difficulty: 1,
  },
  {
    id: 'Q-MUNCH-32-7',
    question: 'What is the name of the harsh, desolate southern district of Munchkinland where the hamlet of Rush Margins is located?',
    options: ['Nest Hardings', 'The Corn Basket', 'Colwen Grounds', 'Wend Hardings'],
    correctAnswer: 3,
    requiredLoreId: 'L-MUNCH-32',
    difficulty: 3,
  },
  {
    id: 'Q-MUNCH-32-8',
    question: "What major infrastructure project did the Eminent Thropp's local militia tear up as an act of resistance against the Emerald City's influence?",
    options: ['The Great Gillikin Railway', 'The Glikkus Canals', 'The Yellow Brick Road', 'The Great Restwater Aqueduct'],
    correctAnswer: 2,
    requiredLoreId: 'L-MUNCH-32',
    difficulty: 3,
  },
  {
    id: 'Q-MUNCH-32-9',
    question: "According to the customs of Colwen Grounds, how is the ruling title of the 'Eminent Thropp' traditionally passed down?",
    options: [
      'Through democratic elections held in Center Munch',
      'Through the female line to the first daughter',
      'To the strongest military commander in the Free State',
      'By direct appointment from the Wizard of Oz',
    ],
    correctAnswer: 1,
    requiredLoreId: 'L-MUNCH-32',
    difficulty: 2,
  },
  {
    id: 'Q-MUNCH-32-10',
    question: 'What is the name of the wealthy Munchkin who hosts Dorothy for the night and explains the local significance of the colors blue and white?',
    options: ['Boq', 'Frexspar', 'Quelala', 'Fiyero'],
    correctAnswer: 0,
    requiredLoreId: 'L-MUNCH-32',
    difficulty: 1,
  },
  // Gilikin (L-GILIKIN-31) region questions
  {
    id: 'Q-GILIKIN-31-1',
    question: 'According to the geographical layout of Oz, where is the province of Gillikin located?',
    options: [
      'In the eastern agricultural flatlands',
      'In the southern marshy badlands',
      'In the northern top section',
      'In the western mountainous frontier',
    ],
    correctAnswer: 2,
    requiredLoreId: 'L-GILIKIN-31',
    difficulty: 2,
  },
  {
    id: 'Q-GILIKIN-31-2',
    question: 'What is the Gillikin region most famous for being full of?',
    options: [
      'Cities, universities, theatres, and industry',
      'Uncharted forests and nomadic tribes',
      'Swamps, mud, and frogs',
      'Endless farmland and round blue-domed houses',
    ],
    correctAnswer: 0,
    requiredLoreId: 'L-GILIKIN-31',
    difficulty: 2,
  },
  {
    id: 'Q-GILIKIN-31-3',
    question: 'Which prestigious institution is located in the major Gillikinese city of Shiz?',
    options: [
      'Colwen Grounds Academy',
      'Shiz University',
      'The Emerald City College of Magic',
      'The Institute of the Unnamed God',
    ],
    correctAnswer: 1,
    requiredLoreId: 'L-GILIKIN-31',
    difficulty: 1,
  },
  {
    id: 'Q-GILIKIN-31-4',
    question:
      'What physical traits are famously characteristic of people of Gillikinese descent (such as the royal Ozma line)?',
    options: [
      'A broad band of forehead, slightly gapped front teeth, and a frenzy of curly blond hair',
      'Sunset-red skin and leathery, frog-like hands',
      'Exceptionally short stature and chubby, rosy cheeks',
      'Skin decorated with elaborate blue diamond tattoos',
    ],
    correctAnswer: 0,
    requiredLoreId: 'L-GILIKIN-31',
    difficulty: 1,
  },
  {
    id: 'Q-GILIKIN-31-5',
    question:
      'Along with their specific physical traits, what emotional temperament is commonly associated with Gillikinese people?',
    options: [
      'Intense shyness and timidity',
      'Unwavering patience and calm',
      'Deep, melancholic sadness',
      'Quick shifts of mood, usually into anger',
    ],
    correctAnswer: 3,
    requiredLoreId: 'L-GILIKIN-31',
    difficulty: 2,
  },
  {
    id: 'Q-GILIKIN-31-6',
    question:
      'Gillikin shares a disputed border with Munchkinland over which specific territory, known for its emerald mines?',
    options: ["The Vinkus", 'The Glikkus', 'Wend Hardings', "Kumbricia's Pass"],
    correctAnswer: 1,
    requiredLoreId: 'L-GILIKIN-31',
    difficulty: 2,
  },
  {
    id: 'Q-GILIKIN-31-7',
    question:
      "Which little market town in rural Gillikin, located near the Pertha Hills, is Galinda's family home?",
    options: ['Frottica', 'Qhoyre', 'Rush Margins', 'Ovvels'],
    correctAnswer: 0,
    requiredLoreId: 'L-GILIKIN-31',
    difficulty: 3,
  },
  {
    id: 'Q-GILIKIN-31-8',
    question: 'According to a traditional Oz nursery rhyme recited by Nanny, "Gillikinese are..." what?',
    options: ['...sweet as apples.', '...sharp as knives.', '...loud as crows.', '...clever as foxes.'],
    correctAnswer: 1,
    requiredLoreId: 'L-GILIKIN-31',
    difficulty: 3,
  },
  {
    id: 'Q-GILIKIN-31-9',
    question:
      'What relatively modern form of transportation runs through Gillikin, causing wealthy Shiz merchants to buy up old dairy farms for country estates?',
    options: ['A system of magical canals', 'A network of hot-air balloon routes', 'The railway line', 'The Great Restwater Aqueduct'],
    correctAnswer: 2,
    requiredLoreId: 'L-GILIKIN-31',
    difficulty: 2,
  },
  {
    id: 'Q-GILIKIN-31-10',
    question:
      'Madame Morrible attempted to secretly recruit Galinda to become the "Adept" of which region?',
    options: ['Munchkinland', 'Quadling Country', 'The Vinkus', 'Gillikin'],
    correctAnswer: 3,
    requiredLoreId: 'L-GILIKIN-31',
    difficulty: 3,
  },
  // Quadling Country (L-QUADLING-33) region questions
  {
    id: 'Q-QUADLING-33-1',
    question:
      'What signature color is used to paint the houses, fences, and bridges of Quadling Country?',
    options: ['Blue', 'Yellow', 'Red', 'Green'],
    correctAnswer: 2,
    requiredLoreId: 'L-QUADLING-33',
    difficulty: 1,
  },
  {
    id: 'Q-QUADLING-33-2',
    question: 'How is the geography of Quadling Country primarily described?',
    options: [
      'An arid, sandy desert',
      'A marshy wasteland of mud, bogs, and feverish airs',
      'A sweeping, ocean-like prairie of tall grass',
      'A majestic, ice-capped mountain range',
    ],
    correctAnswer: 1,
    requiredLoreId: 'L-QUADLING-33',
    difficulty: 1,
  },
  {
    id: 'Q-QUADLING-33-3',
    question:
      "What precious resource did the Emerald City's engineers and military forces aggressively strip-mine from Quadling Country?",
    options: ['Diamonds', 'Emeralds', 'Gold', 'Rubies'],
    correctAnswer: 3,
    requiredLoreId: 'L-QUADLING-33',
    difficulty: 2,
  },
  {
    id: 'Q-QUADLING-33-4',
    question: 'Who was the Good Witch that rules over the Quadlings from a beautiful southern castle?',
    options: ['Lurline', 'Glinda', 'Gayelette', 'Madame Morrible'],
    correctAnswer: 1,
    requiredLoreId: 'L-QUADLING-33',
    difficulty: 1,
  },
  {
    id: 'Q-QUADLING-33-5',
    question:
      'In the Quadling settlement of Ovvels, how do the natives traditionally build their houses?',
    options: [
      'They build round, dome-roofed structures out of blue brick.',
      'They carve elaborate caves into the sides of the mountains.',
      'They construct cabanas suspended in the rubbery limbs of suppletrees over flooded groves.',
      'They live in massive concentric rings of animal-hide tents.',
    ],
    correctAnswer: 2,
    requiredLoreId: 'L-QUADLING-33',
    difficulty: 3,
  },
  {
    id: 'Q-QUADLING-33-6',
    question:
      'What notable physical characteristic is shared by the native Quadling people (such as the glassblower Turtle Heart)?',
    options: [
      'Pale, blue-tinted skin',
      'A broad forehead and curly blond hair',
      'Ruddy, sunset-red skin',
      'Blue diamond patterns tattooed on their faces',
    ],
    correctAnswer: 2,
    requiredLoreId: 'L-QUADLING-33',
    difficulty: 2,
  },
  {
    id: 'Q-QUADLING-33-7',
    question:
      "According to rumor, how did the Wizard's forces retaliate after Quadlings in Qhoyre engaged in a tax revolt and annihilated a military garrison?",
    options: [
      'By unleashing a fleet of flying attack dragons',
      'By poisoning the Great Restwater Aqueduct',
      'By sending in an army of Winged Monkeys',
      'By burning down the surrounding oakhair forest',
    ],
    correctAnswer: 0,
    requiredLoreId: 'L-QUADLING-33',
    difficulty: 3,
  },
  {
    id: 'Q-QUADLING-33-8',
    question:
      'What hostile, armless creatures guard the steep, rocky hill that travelers must cross to enter Quadling Country?',
    options: ['The Kalidahs', 'The Scrow', 'The Hammer-Heads', 'The Yunamata'],
    correctAnswer: 2,
    requiredLoreId: 'L-QUADLING-33',
    difficulty: 3,
  },
  {
    id: 'Q-QUADLING-33-9',
    question:
      'What destructive mission does Liir lead against the Quadling hamlet of Bengda under Commander Cherrystone\'s orders?',
    options: [
      'Stealing their entire harvest of vegetable pearls',
      'Painting their toll bridge with maya flower tar and setting it on fire',
      "Arresting the town's mayor and sending him to Southstairs",
      'Diverting the Waterslip river to flood their homes',
    ],
    correctAnswer: 1,
    requiredLoreId: 'L-QUADLING-33',
    difficulty: 3,
  },
  {
    id: 'Q-QUADLING-33-10',
    question:
      'Who was the traveling Quadling glassblower that befriended Frex and Melena, and was later brutally killed by a mob in Munchkinland?',
    options: ['Turtle Heart', 'Boq', 'Avaric', 'Yackle'],
    correctAnswer: 0,
    requiredLoreId: 'L-QUADLING-33',
    difficulty: 3,
  },
  // Emerald City (L-EMERALD-30) region questions
  {
    id: 'Q-EMERALD-30-1',
    question:
      'What reason does the Guardian of the Gates give for why everyone must wear locked green spectacles in the Emerald City?',
    options: [
      'To hide the fact that the city is actually crumbling and in ruins.',
      'To identify themselves as loyal, tax-paying subjects of the Wizard.',
      'To protect their eyes from being blinded by the brightness and glory of the city.',
      'To magically ward off the spells of the Wicked Witches.',
    ],
    correctAnswer: 2,
    requiredLoreId: 'L-EMERALD-30',
    difficulty: 1,
  },
  {
    id: 'Q-EMERALD-30-2',
    question:
      'What is the name of the inescapable, labyrinthine underground prison located beneath the Emerald City?',
    options: ["Kumbricia's Pass", 'Southstairs', 'The Doddery', 'The Squelch'],
    correctAnswer: 1,
    requiredLoreId: 'L-EMERALD-30',
    difficulty: 2,
  },
  {
    id: 'Q-EMERALD-30-3',
    question:
      'When Dorothy explored the streets of the Emerald City, what kind of currency did the citizens use to buy items like green lemonade and green pop-corn?',
    options: ['Gold florins', 'Silver emeralds', 'Barter tokens', 'Green pennies'],
    correctAnswer: 3,
    requiredLoreId: 'L-EMERALD-30',
    difficulty: 1,
  },
  {
    id: 'Q-EMERALD-30-4',
    question:
      'What is the name of the military police force that operates in the Emerald City?',
    options: ['The Gale Force', 'The Home Guard', 'The Yunamata', 'The Arjiki Tribe'],
    correctAnswer: 0,
    requiredLoreId: 'L-EMERALD-30',
    difficulty: 1,
  },
  {
    id: 'Q-EMERALD-30-5',
    question:
      'Geographically speaking, where is the Emerald City located within the Land of Oz?',
    options: [
      'Exactly in the center of the country',
      'On the eastern border near the deadly desert',
      'In the far northern mountains of Gillikin',
      'In the southern marshlands',
    ],
    correctAnswer: 0,
    requiredLoreId: 'L-EMERALD-30',
    difficulty: 1,
  },
  {
    id: 'Q-EMERALD-30-6',
    question:
      'What is the name of the heavily guarded, fashionable district where the wealthy elite live?',
    options: ['Center Munch', 'Rush Margins', 'Goldhaven', 'The Scalps'],
    correctAnswer: 2,
    requiredLoreId: 'L-EMERALD-30',
    difficulty: 2,
  },
  {
    id: 'Q-EMERALD-30-7',
    question:
      'What did the Wizard reveal to Dorothy and her friends about the true origins of the Emerald City?',
    options: [
      'It was magically grown from a single, giant emerald planted in the center of Oz.',
      'It was originally a unionist monastery that was later expanded into a city.',
      'He ordered the local people to build it after he accidentally arrived from the clouds in a hot-air balloon.',
      'It was built centuries ago by the Fairy Queen Lurline before she left Oz.',
    ],
    correctAnswer: 2,
    requiredLoreId: 'L-EMERALD-30',
    difficulty: 1,
  },
  {
    id: 'Q-EMERALD-30-8',
    question:
      "What covers the broad canopies of the pagoda over the Palace's Throne Room?",
    options: [
      'Intricate silver glass beads',
      'Woven oakhair and vines',
      'Polished Gillikinese bluestone',
      'Hammered scales of gold',
    ],
    correctAnswer: 3,
    requiredLoreId: 'L-EMERALD-30',
    difficulty: 2,
  },
  {
    id: 'Q-EMERALD-30-9',
    question:
      'What major thoroughfare in the Emerald City is described as being filled with the makeshift tents and cardboard homes of the urban poor?',
    options: ['The Yellow Brick Road', 'Mennipin Square', 'Dirt Boulevard', 'The Squelch'],
    correctAnswer: 2,
    requiredLoreId: 'L-EMERALD-30',
    difficulty: 2,
  },
  {
    id: 'Q-EMERALD-30-10',
    question:
      'Who briefly stepped in to govern the Emerald City as a "prime minister pro tem" after the Wizard fled in his hot-air balloon?',
    options: ['Nessarose', 'Lady Glinda', 'Madame Morrible', 'The Scarecrow'],
    correctAnswer: 1,
    requiredLoreId: 'L-EMERALD-30',
    difficulty: 3,
  },
  // The Glikkus (L-GLIKKUS-35) region questions
  {
    id: 'Q-GLIKKUS-35-1',
    question: 'Geographically, where is the Glikkus territory located?',
    options: [
      'In the arid western frontier of the Vinkus',
      'In the northeast, on the border between Gillikin and Munchkinland',
      'Directly south of the Emerald City in Quadling Country',
      'In the exact center of Oz',
    ],
    correctAnswer: 1,
    requiredLoreId: 'L-GLIKKUS-35',
    difficulty: 1,
  },
  {
    id: 'Q-GLIKKUS-35-2',
    question: 'What highly lucrative natural resource is famously mined in the Glikkus?',
    options: ['Rubies', 'Diamonds', 'Emeralds', 'Gold'],
    correctAnswer: 2,
    requiredLoreId: 'L-GLIKKUS-35',
    difficulty: 1,
  },
  {
    id: 'Q-GLIKKUS-35-3',
    question: 'Besides its mines, what other prominent geographical/infrastructure feature is the Glikkus known for?',
    options: [
      'The Great Restwater Aqueduct',
      "Kumbricia's Pass",
      'The Glikkus Canals',
      'The Thousand Year Grasslands',
    ],
    correctAnswer: 2,
    requiredLoreId: 'L-GLIKKUS-35',
    difficulty: 2,
  },
  {
    id: 'Q-GLIKKUS-35-4',
    question:
      'The ownership of the Glikkus territory is the subject of a long-standing political dispute between which two provinces?',
    options: [
      'Munchkinland and Gillikin',
      'Quadling Country and the Vinkus',
      'The Emerald City and the Vinkus',
      'Gillikin and Winkie Country',
    ],
    correctAnswer: 0,
    requiredLoreId: 'L-GLIKKUS-35',
    difficulty: 2,
  },
  {
    id: 'Q-GLIKKUS-35-5',
    question:
      'According to Frex, which historical ruler conquered the Glikkus for a time and commandeered its immense wealth to decorate the capital?',
    options: [
      'Ozma the Bilious',
      'Ozma the Warrior',
      'Ozma the Mendacious',
      'Ozma the Librarian',
    ],
    correctAnswer: 1,
    requiredLoreId: 'L-GLIKKUS-35',
    difficulty: 3,
  },
  {
    id: 'Q-GLIKKUS-35-6',
    question:
      'According to a traditional Oz nursery rhyme recited by Nanny, what cruel behavior is stereotypically attributed to the people of this region?',
    options: [
      '"Glikkuns eat their young"',
      '"Glikkuns swarm in sticky hives"',
      '"Glikkuns beat their ugly wives"',
      '"Glikkuns lead corny lives"',
    ],
    correctAnswer: 2,
    requiredLoreId: 'L-GLIKKUS-35',
    difficulty: 2,
  },
  {
    id: 'Q-GLIKKUS-35-7',
    question:
      'Why did an ambassador from the Glikkus secretly meet with Nessarose at Colwen Grounds?',
    options: [
      'To beg for food supplies during a drought',
      'To demand the return of stolen emeralds',
      'To discuss a mutual defense pact in the event that the Glikkus secedes next',
      'To arrange a marriage between Shell and a Glikkun princess',
    ],
    correctAnswer: 2,
    requiredLoreId: 'L-GLIKKUS-35',
    difficulty: 3,
  },
  {
    id: 'Q-GLIKKUS-35-8',
    question:
      'What kind of heavy footwear did Elphaba wear while walking through the snowy Emerald City, which is compared to the attire of laborers in this region?',
    options: [
      'Fur-lined slippers',
      'Swampcalf hide leggings',
      'Steel-toed boots like those worn by miners in the Glikkus',
      'Silver glass shoes',
    ],
    correctAnswer: 2,
    requiredLoreId: 'L-GLIKKUS-35',
    difficulty: 1,
  },
  {
    id: 'Q-GLIKKUS-35-9',
    question:
      'What was the name of the Glikkun mail-order bride traveling on the Grasstrail Train who left the caravan to marry a toothless widower?',
    options: ['Raraynee', 'Gawnette', 'Letta', 'Perippa'],
    correctAnswer: 0,
    requiredLoreId: 'L-GLIKKUS-35',
    difficulty: 3,
  },
  {
    id: 'Q-GLIKKUS-35-10',
    question:
      "During the time of Munchkinland's secession, what was Shell Thropp rumored to be doing in the Glikkus?",
    options: [
      'Mapping out the Glikkus canals for the Wizard',
      'Undertaking a secret mission, possibly defecting due to the change in government',
      'Strip-mining the remaining emeralds to fund the Free State',
      'Hunting down the surviving members of the Arjiki tribe',
    ],
    correctAnswer: 1,
    requiredLoreId: 'L-GLIKKUS-35',
    difficulty: 2,
  },
  // The Vinkus (L-VINKUS-34) region questions
  {
    id: 'Q-VINKUS-34-1',
    question:
      'What is the local attitude toward the name "Winkie"?',
    options: [
      'It is a title of high honor and nobility.',
      'It is considered an insult by the native inhabitants.',
      'It is only used by the Yunamata tribe.',
      'It is a sacred name meant only for religious ceremonies.',
    ],
    correctAnswer: 1,
    requiredLoreId: 'L-VINKUS-34',
    difficulty: 1,
  },
  {
    id: 'Q-VINKUS-34-2',
    question:
      'What is the name of the towering, ice-sheathed mountain range that separates the Vinkus from the rest of Oz?',
    options: ['The Pertha Hills', 'The Quadling Kells', 'The Scalps', 'The Great Kells'],
    correctAnswer: 3,
    requiredLoreId: 'L-VINKUS-34',
    difficulty: 2,
  },
  {
    id: 'Q-VINKUS-34-3',
    question: 'Fiyero is a prince of which mountain-dwelling, nomadic Vinkus tribe?',
    options: ['The Scrow', 'The Arjiki', 'The Yunamata', 'The Ugabusezi'],
    correctAnswer: 1,
    requiredLoreId: 'L-VINKUS-34',
    difficulty: 2,
  },
  {
    id: 'Q-VINKUS-34-4',
    question:
      'Which Vinkus tribe is ruled by Princess Nastoya and is known as a horse-riding culture that hunts in the Thousand Year Grasslands?',
    options: ['The Scrow', 'The Hammer-Heads', 'The Arjiki', 'The Yunamata'],
    correctAnswer: 0,
    requiredLoreId: 'L-VINKUS-34',
    difficulty: 3,
  },
  {
    id: 'Q-VINKUS-34-5',
    question:
      "What signature color dominates the landscape, castles, and clothing of Winkie Country?",
    options: ['Red', 'Blue', 'Yellow', 'Green'],
    correctAnswer: 2,
    requiredLoreId: 'L-VINKUS-34',
    difficulty: 1,
  },
  {
    id: 'Q-VINKUS-34-6',
    question:
      'Which secretive Vinkus tribe harbors in the forested slopes, lives in tree nests, and is highly skilled with serrated knives?',
    options: ['The Glikkuns', 'The Scrow', 'The Arjiki', 'The Yunamata'],
    correctAnswer: 3,
    requiredLoreId: 'L-VINKUS-34',
    difficulty: 3,
  },
  {
    id: 'Q-VINKUS-34-7',
    question:
      "What was the original purpose of the stone castle of Kiamo Ko before Fiyero's family converted it into a tribal stronghold?",
    options: [
      'It was an ancient unionist mauntery.',
      'It was an Office of Public Works waterworks headquarters.',
      'It was a prison built by the Wizard.',
      'It was an emerald mining facility.',
    ],
    correctAnswer: 1,
    requiredLoreId: 'L-VINKUS-34',
    difficulty: 3,
  },
  {
    id: 'Q-VINKUS-34-8',
    question:
      'What is the name of the high, fertile gorge and valley that serves as the main route through the central Kells into the Vinkus?',
    options: ["Kumbricia's Pass", 'Wend Hardings', 'The Shale Shallows', 'The Disappointments'],
    correctAnswer: 0,
    requiredLoreId: 'L-VINKUS-34',
    difficulty: 3,
  },
  {
    id: 'Q-VINKUS-34-9',
    question:
      'What did the Winkies do for the Tin Woodman after Dorothy freed them from the Wicked Witch?',
    options: [
      'They melted him down to make coins.',
      'They repaired his dents, gave him a solid gold axe-handle, and asked him to rule over them.',
      'They built him a boat to sail back to Munchkinland.',
      'They banished him to the deadly desert.',
    ],
    correctAnswer: 1,
    requiredLoreId: 'L-VINKUS-34',
    difficulty: 1,
  },
  {
    id: 'Q-VINKUS-34-10',
    question:
      'What dark secret is Princess Nastoya of the Scrow hiding beneath her human disguise?',
    options: [
      "She is actually a spy working for the Wizard's Gale Force.",
      'She is a Kumbric Witch who has lived for centuries.',
      'She is a sentient Elephant trapped in a decaying human body by a binding spell.',
      'She is the lost princess Ozma Tippetarius.',
    ],
    correctAnswer: 2,
    requiredLoreId: 'L-VINKUS-34',
    difficulty: 3,
  },
];

export default quizData;
