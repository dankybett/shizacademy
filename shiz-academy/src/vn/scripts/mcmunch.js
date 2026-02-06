// MC Munch visual novel script
// Each level is an array of entries: either {speaker, text} or {type:'choice', speaker, options, responses}
const mcmunch = {
  1: [
    { speaker:'mcmunch', text:"Hold up. That boom-bap track was YOU?" },
    { speaker:'player', text:"Yeah?" },
    { speaker:'mcmunch', text:"Bold move." },
    { speaker:'player', text:"Why?" },
    { speaker:'mcmunch', text:"Thats my lane." },
    { speaker:'player', text:"Oh. Sorry?" },
    { speaker:'mcmunch', text:"Relax. Im kidding." },
    { speaker:'mcmunch', text:"Mostly." },
    { speaker:'mcmunch', text:"You ride a beat okay." },
    { speaker:'mcmunch', text:"But your second verse? You flinched." },
    { speaker:'player', text:"Flinched?" },
    { speaker:'mcmunch', text:"Yeah. Like you didnt trust your own line." },
    { speaker:'mcmunch', text:"If youre gonna compete with me, at least swing all the way." },
  ],
  2: [
    { speaker:'mcmunch', text:'Warm up right and you hit cleaner.' },
    { speaker:'mcmunch', text:'(Gift Received: Vocal Warm-Up Mixtape)' },
  ],
  3: [ { speaker:'mcmunch', text:'Keep it steady. Bars breathe.' } ],
  4: [
    { speaker:'mcmunch', text:'Crowds listen when the light hits right.' },
    { speaker:'mcmunch', text:'(Gift Received: Spotlight Snap)' },
  ],
  5: [ { speaker:'mcmunch', text:'Own the room.' } ],
};

export default mcmunch;
