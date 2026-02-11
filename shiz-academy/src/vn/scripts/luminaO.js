// Lumina-O visual novel script lines by level
// Each level is an array of entries: either {speaker, text} or {type:'choice', speaker, options, responses}
const luminaO = {
  1: [
    { speaker:'lumina', text:"You released something tonight." },
    { speaker:'player', text:"Oh. Hi." },
    { speaker:'lumina', text:"I heard it on Shizy-Fi. '{{snap.songName}}', the Synthwave track." },
    { speaker:'lumina', text:"It felt unguarded." },
    { speaker:'player', text:"Unguarded?" },
    { speaker:'lumina', text:"Like you werent trying to impress anyone." },
    { speaker:'lumina', text:"You just let it exist." },
    { type:'choice', speaker:'player', options:[
      'I almost didnt release it.',
      'I just liked the sound.',
      'I wasnt sure it was good enough.'
    ], responses:[
      'Those are usually the ones worth keeping.',
      'Thats the best reason to make anything.',
      'Good is a moving target. Atmosphere isnt.'
    ] },
    { speaker:'lumina', text:"Do you usually create at night?" },
    { speaker:'player', text:"Sometimes. Its quieter." },
    { speaker:'lumina', text:"Yes. It is." },
    { speaker:'lumina', text:"Send me the next one too. I like hearing what people almost dont release." }
  ],
  2: [
    { speaker:'lumina', text:"Twenty listeners becomes fifty faster than you think." },
    { speaker:'player', text:"You saw that?" },
    { speaker:'lumina', text:"I check the charts more than I admit." },
    { speaker:'lumina', text:"Youre building something. Quietly. Thats my favorite way." },
    { speaker:'player', text:"It still feels small." },
    { speaker:'lumina', text:"Small things glow brighter in the dark." },
    { speaker:'lumina', text:"My first dorm room was unbearably plain." },
    { speaker:'lumina', text:"This helped." },
    { speaker:'lumina', text:"Let your room hum a little." },
    { speaker:'lumina', text:"It makes the dark softer." },
    { speaker:'lumina', text:"And try trusting your first instinct more next week." },
    { speaker:'lumina', text:"You hesitate less than you think." }
  ],
  3: [
    { speaker:'lumina', text:"Can I ask you something?" },
    { speaker:'player', text:"Sure." },
    { speaker:'lumina', text:"Why do you make music?" },
    { type:'choice', speaker:'player', options:[
      'To be heard.',
      'To understand myself.',
      'Im not sure anymore.'
    ], responses:[
      'Being heard is powerful. Just dont forget to listen too.',
      'Thats the honest answer.',
      'Not knowing is still a reason.'
    ] },
    { speaker:'lumina', text:"I started because daytime felt loud." },
    { speaker:'lumina', text:"Too many expectations." },
  ],
  4: [
    { speaker:'lumina', text:"Youre consistent. Thats rare." },
    { speaker:'player', text:"I try." },
    { speaker:'lumina', text:"Try less. Trust more." },
    { speaker:'lumina', text:"Your edges are the point." },
    { speaker:'lumina', text:"Dont sand them off." },
    { speaker:'player', text:"Thats hard." },
    { speaker:'lumina', text:"So is anything worth doing." },
    { speaker:'lumina', text:"Just dont sand off the edges that make it yours." },
  ],
  5: [
    { speaker:'lumina', text:"Top charts are noisy." },
    { speaker:'lumina', text:"But you cut through with {{snap.songName}}." },
    { speaker:'player', text:"It doesnt feel real yet." },
    { speaker:'lumina', text:"It will." },
  ],
  // Wizmas special
  99: [
    { speaker:'lumina', text:'Are you still awake?' },
    { speaker:'player', text:'Its Wizmas. Of course I am.' },
    { speaker:'lumina', text:'The halls are loud.' },
    { speaker:'player', text:'Yeah. They are.' },
    { speaker:'lumina', text:'I like when it gets quiet after.' },
    { speaker:'lumina', text:'Did you leave your desk lamp on again?' },
    { speaker:'player', text:'Maybe.' },
    { speaker:'lumina', text:'(Gift Received: Frosted Glass Jar with Fairy Lights)' },
    { speaker:'player', text:'You sent me a jar?' },
    { speaker:'lumina', text:'Its better than it looks.' },
    { speaker:'player', text:'Thats a bold promise.' },
    { speaker:'lumina', text:'Turn it on.' },
    { speaker:'player', text:'Oh.' },
    { speaker:'lumina', text:'Its softer than overhead light.' },
    { speaker:'lumina', text:'Easier to think in.' },
    { speaker:'player', text:'Its really warm.' },
    { speaker:'lumina', text:'Wizmas doesnt have to be loud to matter.' },
    { speaker:'lumina', text:'Some of the best songs start like this.' },
    { speaker:'lumina', text:'Low light. No pressure. Just glow.' },
    { speaker:'player', text:'Youre very poetic tonight.' },
    { speaker:'lumina', text:'Its the longest night of the year.' },
    { speaker:'lumina', text:'Keep it on when youre writing.' },
    { speaker:'lumina', text:'Even if its just for you.' },
    { speaker:'player', text:'Thanks, Lumina.' },
    { speaker:'lumina', text:'Merry Wizmas.' },
    { speaker:'lumina', text:'Let the room feel smaller. It helps.' },
  ],
};

export default luminaO;
