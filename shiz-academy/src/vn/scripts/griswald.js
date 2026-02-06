// Griswald visual novel script lines by level
// Structure mirrors luminaO: array per level with dialogue entries
const griswald = {
  1: [
    { speaker:'griswald', text:"Heard your track." },
    { speaker:'player', text:"Oh. Hi." },
    { speaker:'griswald', text:"You left the distortion in." },
    { speaker:'player', text:"Was that bad?" },
    { speaker:'griswald', text:"No." },
    { speaker:'griswald', text:"It was honest." },
    { speaker:'player', text:"I wasnt sure if it sounded messy." },
    { speaker:'griswald', text:"Messys fine." },
    { speaker:'griswald', text:"Too polished feels like lying." },
    { speaker:'griswald', text:"If youre going to play in the rain, dont complain about getting wet." },
  ],
  2: [
    { speaker:'griswald', text:"Twenty people listening to something rough around the edges." },
    { speaker:'player', text:"You saw?" },
    { speaker:'griswald', text:"Yeah." },
    { speaker:'griswald', text:"Means they werent looking for perfect." },
    { speaker:'player', text:"It still feels small." },
    { speaker:'griswald', text:"Small rooms make louder echoes." },
    { speaker:'griswald', text:"(Beat.)" },
    { speaker:'griswald', text:"Your last track had a line in the second verse." },
    { speaker:'griswald', text:"You almost rushed past it." },
    { speaker:'player', text:"Which line?" },
    { speaker:'griswald', text:"The one about not wanting to be easy to understand." },
    { speaker:'player', text:"You noticed that?" },
    { speaker:'griswald', text:"Yeah." },
    { speaker:'griswald', text:"(Gift Received: Worn Lyric Notebook)" },
    { speaker:'player', text:"A notebook?" },
    { speaker:'griswald', text:"Mines almost full." },
    { speaker:'griswald', text:"Figured you should have one too." },
    { speaker:'player', text:"What for?" },
    { speaker:'griswald', text:"Write things down before you make them impressive." },
    { speaker:'griswald', text:"The first versions usually heavier." },
    { speaker:'griswald', text:"Dont clean it up too fast." },
  ],
  3: [
    { speaker:'griswald', text:"Can I say something without you taking it wrong?" },
    { speaker:'player', text:"Sure." },
    { speaker:'griswald', text:"Last track felt tense." },
    { speaker:'player', text:"Tense how?" },
    { speaker:'griswald', text:"Like you were aiming for the chart instead of the feeling." },
    { type:'choice', speaker:'player', options:[
      'I wanted it to do well.',
      'I was experimenting.',
      'Maybe I was.'
    ], responses:[
      'Nothing wrong with wanting that. Just dont chase it.',
      'Experimentings good. Dont force it.',
      'At least you noticed.'
    ] },
    { speaker:'griswald', text:"The forest doesnt try to be impressive." },
    { speaker:'griswald', text:"It just is." },
    { speaker:'griswald', text:"Your music is better when you stop trying to win." },
  ],
};

export default griswald;
