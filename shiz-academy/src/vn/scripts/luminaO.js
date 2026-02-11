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
    { speaker:'lumina', text:'You got a message from me because of Wizmas.' },
    { speaker:'player', text:'I did.' },
    { speaker:'lumina', text:"I dont like loud holidays." },
    { speaker:'lumina', text:'But I brought you something small.' },
    { speaker:'player', text:'A Wizmas gift?' },
    { speaker:'lumina', text:'A lamp filter. Softer color. For late songs.' },
    { speaker:'player', text:'Thank you.' },
    { speaker:'lumina', text:'Keep making the quiet ones.' },
  ],
};

export default luminaO;
